import DatabaseUtils from '../config/db-utils.js';
import { pool } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';

class ProductService {
  // Get all products with pagination and filters
  static async getAllProducts(options = {}) {
    try {
      const {
        page = 1,
        limit = 12,
        category = null,
        search = null,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        isActive = true
      } = options;

      // Whitelist allowed sort columns to prevent SQL injection
      const allowedSortColumns = ['created_at', 'name', 'price', 'stock_quantity'];
      const allowedSortOrders = ['ASC', 'DESC'];
      
      const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const safeSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (isActive !== null) {
        whereConditions.push(`p.is_active = $${paramIndex}`);
        queryParams.push(isActive);
        paramIndex++;
      }

      if (category) {
        whereConditions.push(`c.name ILIKE $${paramIndex}`);
        queryParams.push(`%${category}%`);
        paramIndex++;
      }

      if (search) {
        whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex + 1})`);
        queryParams.push(`%${search}%`, `%${search}%`);
        paramIndex += 2;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Main query
      const query = `
        SELECT 
          p.*,
          c.name as category_name,
          c.id as category_id
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereClause}
        ORDER BY p.${safeSortBy} ${safeSortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      return {
        success: true,
        products: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get products error:', error.message);
      throw new Error('Failed to fetch products');
    }
  }

  // Get single product by ID
  static async getProductById(productId) {
    try {
      const query = `
        SELECT 
          p.*,
          c.name as category_name,
          c.id as category_id
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1
      `;

      const result = await pool.query(query, [productId]);

      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }

      return {
        success: true,
        product: result.rows[0]
      };
    } catch (error) {
      console.error('Get product error:', error.message);
      throw new Error(error.message || 'Failed to fetch product');
    }
  }

  // Create new product with image upload support
  static async createProduct(productData, imageFiles = []) {
    try {
      const {
        name,
        description,
        price,
        categoryId,
        stockQuantity = 0,
        sku,
        sizes = [],
        colors = []
      } = productData;

      // Validate required fields
      if (!name || !price || !categoryId) {
        throw new Error('Name, price, and category are required');
      }

      // Validate data types and ranges
      const parsedPrice = parseFloat(price);
      const parsedStock = parseInt(stockQuantity);
      
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        throw new Error('Price must be a valid positive number');
      }
      
      if (isNaN(parsedStock) || parsedStock < 0) {
        throw new Error('Stock quantity must be a valid non-negative number');
      }

      // Validate name length
      if (name.length < 2 || name.length > 255) {
        throw new Error('Product name must be between 2 and 255 characters');
      }

      // Check if SKU already exists
      if (sku) {
        const existingSku = await DatabaseUtils.findOne('products', { sku });
        if (existingSku) {
          throw new Error('SKU already exists');
        }
      }

      // Verify category exists and is active
      const category = await DatabaseUtils.findOne('categories', { id: categoryId, is_active: true });
      if (!category) {
        throw new Error('Category not found or inactive');
      }

      // Process image uploads
      const processedImages = await this.processImageUploads(imageFiles);
      const mainImageUrl = processedImages.length > 0 ? processedImages[0] : null;

      // Validate and process sizes/colors
      const validatedSizes = this.validateSizes(sizes);
      const validatedColors = this.validateColors(colors);

      const newProduct = await DatabaseUtils.insert('products', {
        name: name.trim(),
        description: description ? description.trim() : null,
        price: parsedPrice,
        category_id: categoryId,
        stock_quantity: parsedStock,
        sku: sku ? sku.trim().toUpperCase() : null,
        image_url: mainImageUrl,
        images: JSON.stringify(processedImages),
        sizes: JSON.stringify(validatedSizes),
        colors: JSON.stringify(validatedColors),
        is_active: true,
        is_featured: false
      });

      return {
        success: true,
        product: newProduct,
        message: 'Product created successfully'
      };
    } catch (error) {
      console.error('Create product error:', error.message);
      throw new Error(error.message || 'Failed to create product');
    }
  }

  // Update product with image upload support
  static async updateProduct(productId, updateData, imageFiles = []) {
    try {
      const {
        name,
        description,
        price,
        categoryId,
        stockQuantity,
        sku,
        sizes,
        colors,
        isActive,
        isFeatured,
        removeImages = []
      } = updateData;

      // Check if product exists
      const existingProduct = await DatabaseUtils.findOne('products', { id: productId });
      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // Validate data types if provided
      if (price !== undefined) {
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          throw new Error('Price must be a valid positive number');
        }
      }

      if (stockQuantity !== undefined) {
        const parsedStock = parseInt(stockQuantity);
        if (isNaN(parsedStock) || parsedStock < 0) {
          throw new Error('Stock quantity must be a valid non-negative number');
        }
      }

      // Validate name length if provided
      if (name !== undefined && (name.length < 2 || name.length > 255)) {
        throw new Error('Product name must be between 2 and 255 characters');
      }

      // Check if SKU already exists (excluding current product)
      if (sku && sku !== existingProduct.sku) {
        const existingSku = await pool.query(
          'SELECT id FROM products WHERE sku = $1 AND id != $2',
          [sku, productId]
        );
        if (existingSku.rows.length > 0) {
          throw new Error('SKU already exists');
        }
      }

      // Verify category exists and is active if provided
      if (categoryId) {
        const category = await DatabaseUtils.findOne('categories', { id: categoryId, is_active: true });
        if (!category) {
          throw new Error('Category not found or inactive');
        }
      }

      // Handle image updates
      let currentImages = [];
      try {
        currentImages = JSON.parse(existingProduct.images || '[]');
      } catch (e) {
        currentImages = [];
      }

      // Remove specified images
      if (removeImages.length > 0) {
        for (const imageToRemove of removeImages) {
          await this.removeImage(imageToRemove);
          currentImages = currentImages.filter(img => img !== imageToRemove);
        }
      }

      // Process new image uploads
      const newImages = await this.processImageUploads(imageFiles);
      const allImages = [...currentImages, ...newImages];
      const mainImageUrl = allImages.length > 0 ? allImages[0] : null;

      // Build update object
      const updateFields = {};
      if (name !== undefined) updateFields.name = name.trim();
      if (description !== undefined) updateFields.description = description ? description.trim() : null;
      if (price !== undefined) updateFields.price = parseFloat(price);
      if (categoryId !== undefined) updateFields.category_id = categoryId;
      if (stockQuantity !== undefined) updateFields.stock_quantity = parseInt(stockQuantity);
      if (sku !== undefined) updateFields.sku = sku ? sku.trim().toUpperCase() : null;
      if (sizes !== undefined) updateFields.sizes = JSON.stringify(this.validateSizes(sizes));
      if (colors !== undefined) updateFields.colors = JSON.stringify(this.validateColors(colors));
      if (isActive !== undefined) updateFields.is_active = isActive;
      if (isFeatured !== undefined) updateFields.is_featured = isFeatured;
      
      // Update images if there were changes
      if (imageFiles.length > 0 || removeImages.length > 0) {
        updateFields.images = JSON.stringify(allImages);
        updateFields.image_url = mainImageUrl;
      }

      const updatedProduct = await DatabaseUtils.update('products', updateFields, { id: productId });

      return {
        success: true,
        product: updatedProduct,
        message: 'Product updated successfully'
      };
    } catch (error) {
      console.error('Update product error:', error.message);
      throw new Error(error.message || 'Failed to update product');
    }
  }

  // Delete product (soft delete)
  static async deleteProduct(productId) {
    try {
      const existingProduct = await DatabaseUtils.findOne('products', { id: productId });
      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // Soft delete by setting is_active to false
      await DatabaseUtils.update('products', { is_active: false }, { id: productId });

      return {
        success: true,
        message: 'Product deleted successfully'
      };
    } catch (error) {
      console.error('Delete product error:', error.message);
      throw new Error(error.message || 'Failed to delete product');
    }
  }

  // Search products with advanced filtering
  static async searchProducts(searchOptions = {}) {
    try {
      const {
        query: searchQuery,
        category,
        minPrice,
        maxPrice,
        inStock = null,
        sizes = [],
        colors = [],
        sortBy = 'created_at',
        sortOrder = 'DESC',
        page = 1,
        limit = 12
      } = searchOptions;

      const offset = (page - 1) * limit;
      let whereConditions = ['p.is_active = true'];
      let queryParams = [];
      let paramIndex = 1;

      // Text search
      if (searchQuery) {
        whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex + 1})`);
        queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
        paramIndex += 2;
      }

      // Category filter
      if (category) {
        whereConditions.push(`p.category_id = $${paramIndex}`);
        queryParams.push(category);
        paramIndex++;
      }

      // Price range
      if (minPrice !== undefined) {
        whereConditions.push(`p.price >= $${paramIndex}`);
        queryParams.push(parseFloat(minPrice));
        paramIndex++;
      }

      if (maxPrice !== undefined) {
        whereConditions.push(`p.price <= $${paramIndex}`);
        queryParams.push(parseFloat(maxPrice));
        paramIndex++;
      }

      // Stock filter
      if (inStock === true) {
        whereConditions.push('p.stock_quantity > 0');
      } else if (inStock === false) {
        whereConditions.push('p.stock_quantity = 0');
      }

      // Size filter
      if (sizes.length > 0) {
        const sizeConditions = sizes.map((_, index) => `p.sizes::jsonb ? $${paramIndex + index}`);
        whereConditions.push(`(${sizeConditions.join(' OR ')})`);
        queryParams.push(...sizes);
        paramIndex += sizes.length;
      }

      // Color filter
      if (colors.length > 0) {
        const colorConditions = colors.map((_, index) => `p.colors::jsonb ? $${paramIndex + index}`);
        whereConditions.push(`(${colorConditions.join(' OR ')})`);
        queryParams.push(...colors);
        paramIndex += colors.length;
      }

      const whereClause = whereConditions.join(' AND ');
      
      // Validate sort parameters
      const allowedSortColumns = ['created_at', 'name', 'price', 'stock_quantity'];
      const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

      const query = `
        SELECT 
          p.*,
          c.name as category_name,
          c.id as category_id
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE ${whereClause}
        ORDER BY p.${safeSortBy} ${safeSortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const result = await pool.query(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        WHERE ${whereClause}
      `;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      return {
        success: true,
        products: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Search products error:', error.message);
      throw new Error('Failed to search products');
    }
  }

  // Update stock quantity
  static async updateStock(productId, quantity, operation = 'set') {
    try {
      const product = await DatabaseUtils.findOne('products', { id: productId });
      if (!product) {
        throw new Error('Product not found');
      }

      let newQuantity;
      switch (operation) {
        case 'add':
          newQuantity = product.stock_quantity + quantity;
          break;
        case 'subtract':
          newQuantity = product.stock_quantity - quantity;
          break;
        case 'set':
        default:
          newQuantity = quantity;
          break;
      }

      if (newQuantity < 0) {
        throw new Error('Stock quantity cannot be negative');
      }

      const updatedProduct = await DatabaseUtils.update('products', 
        { stock_quantity: newQuantity }, 
        { id: productId }
      );

      return {
        success: true,
        product: updatedProduct,
        message: 'Stock updated successfully'
      };
    } catch (error) {
      console.error('Update stock error:', error.message);
      throw new Error(error.message || 'Failed to update stock');
    }
  }

  // Get low stock products
  static async getLowStockProducts(threshold = 5) {
    try {
      const query = `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.stock_quantity <= $1 AND p.is_active = true
        ORDER BY p.stock_quantity ASC
      `;

      const result = await pool.query(query, [threshold]);

      return {
        success: true,
        products: result.rows
      };
    } catch (error) {
      console.error('Get low stock products error:', error.message);
      throw new Error('Failed to fetch low stock products');
    }
  }

  // Get featured products
  static async getFeaturedProducts(limit = 8) {
    try {
      const query = `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = true AND p.is_featured = true
        ORDER BY p.created_at DESC
        LIMIT $1
      `;

      const result = await pool.query(query, [limit]);

      return {
        success: true,
        products: result.rows
      };
    } catch (error) {
      console.error('Get featured products error:', error.message);
      throw new Error('Failed to fetch featured products');
    }
  }

  // Toggle product featured status
  static async toggleFeatured(productId) {
    try {
      const product = await DatabaseUtils.findOne('products', { id: productId });
      if (!product) {
        throw new Error('Product not found');
      }

      const newFeaturedStatus = !product.is_featured;
      const updatedProduct = await DatabaseUtils.update('products', 
        { is_featured: newFeaturedStatus }, 
        { id: productId }
      );

      return {
        success: true,
        product: updatedProduct,
        message: `Product ${newFeaturedStatus ? 'featured' : 'unfeatured'} successfully`
      };
    } catch (error) {
      console.error('Toggle featured error:', error.message);
      throw new Error(error.message || 'Failed to toggle featured status');
    }
  }

  // Get related products
  static async getRelatedProducts(productId, limit = 4) {
    try {
      const product = await DatabaseUtils.findOne('products', { id: productId });
      if (!product) {
        throw new Error('Product not found');
      }

      const query = `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = $1 AND p.id != $2 AND p.is_active = true
        ORDER BY RANDOM()
        LIMIT $3
      `;

      const result = await pool.query(query, [product.category_id, productId, limit]);

      return {
        success: true,
        products: result.rows
      };
    } catch (error) {
      console.error('Get related products error:', error.message);
      throw new Error('Failed to fetch related products');
    }
  }

  // Check product availability
  static async checkAvailability(productId, quantity = 1) {
    try {
      const product = await DatabaseUtils.findOne('products', { id: productId });
      if (!product) {
        throw new Error('Product not found');
      }

      if (!product.is_active) {
        return {
          success: false,
          available: false,
          message: 'Product is not available'
        };
      }

      if (product.stock_quantity < quantity) {
        return {
          success: true,
          available: false,
          message: 'Insufficient stock',
          availableQuantity: product.stock_quantity
        };
      }

      return {
        success: true,
        available: true,
        message: 'Product is available',
        availableQuantity: product.stock_quantity
      };
    } catch (error) {
      console.error('Check availability error:', error.message);
      throw new Error(error.message || 'Failed to check product availability');
    }
  }

  // Get product statistics for admin dashboard
  static async getProductStats() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_products,
          COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock,
          COUNT(CASE WHEN stock_quantity <= 5 AND stock_quantity > 0 THEN 1 END) as low_stock,
          AVG(price) as average_price,
          SUM(stock_quantity) as total_stock_value
        FROM products
      `;

      const categoryQuery = `
        SELECT 
          c.name as category_name,
          c.id,
          COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
        WHERE c.is_active = true
        GROUP BY c.id, c.name
        ORDER BY product_count DESC
      `;

      const [statsResult, categoryResult] = await Promise.all([
        pool.query(statsQuery),
        pool.query(categoryQuery)
      ]);

      return {
        success: true,
        stats: statsResult.rows[0],
        categoryBreakdown: categoryResult.rows
      };
    } catch (error) {
      console.error('Get product stats error:', error.message);
      throw new Error('Failed to fetch product statistics');
    }
  }

  // Helper method to process image uploads
  static async processImageUploads(imageFiles) {
    if (!imageFiles || imageFiles.length === 0) {
      return [];
    }

    const processedImages = [];
    const uploadDir = 'public/uploads/products';

    // Ensure upload directory exists
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }

    for (const file of imageFiles) {
      try {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
          throw new Error(`Invalid file type: ${file.mimetype}`);
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error('File size exceeds 5MB limit');
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = path.extname(file.originalname);
        const filename = `product_${timestamp}_${randomString}${extension}`;

        const filepath = path.join(uploadDir, filename);

        // Save file
        await fs.writeFile(filepath, file.buffer);

        // Store relative path for database
        const relativePath = `/uploads/products/${filename}`;
        processedImages.push(relativePath);
      } catch (error) {
        console.error('Image upload error:', error.message);
        // Continue with other images even if one fails
      }
    }

    return processedImages;
  }

  // Helper method to remove image file
  static async removeImage(imagePath) {
    try {
      if (imagePath && imagePath.startsWith('/uploads/')) {
        const fullPath = path.join('public', imagePath);
        await fs.unlink(fullPath);
      }
    } catch (error) {
      // Don't throw error as this is cleanup
      console.error('Failed to remove image:', error.message);
    }
  }

  // Helper method to validate sizes
  static validateSizes(sizes) {
    if (!Array.isArray(sizes)) {
      return [];
    }

    const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    return sizes.filter(size => {
      const upperSize = size.toString().toUpperCase();
      return validSizes.includes(upperSize) || /^\d+$/.test(size); // Allow numeric sizes too
    }).map(size => size.toString().trim());
  }

  // Helper method to validate colors
  static validateColors(colors) {
    if (!Array.isArray(colors)) {
      return [];
    }

    return colors.filter(color => {
      const colorStr = color.toString().trim();
      return colorStr.length > 0 && colorStr.length <= 50;
    }).map(color => color.toString().trim());
  }
}

export default ProductService;