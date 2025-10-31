import DatabaseUtils from '../config/db-utils.js';
import { pool } from '../config/database.js';

class InventoryService {
  // Get all inventory with pagination and filters
  static async getInventory(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = null,
        sortBy = 'stock_quantity',
        sortOrder = 'ASC',
      } = options;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      if (search) {
        whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex + 1})`);
        queryParams.push(`%${search}%`, `%${search}%`);
        paramIndex += 2;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const query = `
        SELECT p.id, p.name, p.sku, p.stock_quantity, p.price, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      return {
        success: true,
        inventory: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get inventory error:', error.message);
      throw new Error('Failed to fetch inventory');
    }
  }

  // Get current stock level for a product
  static async getStockLevel(productId) {
    try {
      const product = await DatabaseUtils.findOne('products', { id: productId });
      if (!product) {
        return {
          success: false,
          error: 'Product not found'
        };
      }

      return {
        success: true,
        stockQuantity: product.stock_quantity
      };
    } catch (error) {
      console.error('Get stock level error:', error.message);
      return {
        success: false,
        error: 'Failed to get stock level'
      };
    }
  }

  // Increment stock
  static async incrementStock(productId, quantity) {
    if (quantity <= 0) {
      return {
        success: false,
        error: 'Quantity must be positive'
      };
    }

    return this.updateStock(productId, quantity, 'add');
  }

  // Decrement stock
  static async decrementStock(productId, quantity) {
    if (quantity <= 0) {
      return {
        success: false,
        error: 'Quantity must be positive'
      };
    }

    const currentStock = await this.getStockLevel(productId);
    if (!currentStock.success) {
      return currentStock;
    }

    if (currentStock.stockQuantity < quantity) {
      return {
        success: false,
        error: 'Insufficient stock'
      };
    }

    return this.updateStock(productId, quantity, 'subtract');
  }

  // Set stock to specific quantity
  static async setStock(productId, quantity) {
    if (quantity < 0) {
      return {
        success: false,
        error: 'Stock quantity cannot be negative'
      };
    }

    return this.updateStock(productId, quantity, 'set');
  }

  // Base update stock method with operation tracking
  static async updateStock(productId, quantity, operation = 'set', reason = 'manual') {
    try {
      const product = await DatabaseUtils.findOne('products', { id: productId });
      if (!product) {
        return {
          success: false,
          error: 'Product not found'
        };
      }

      let newQuantity;
      let changeAmount = 0;

      switch (operation) {
        case 'add':
          newQuantity = product.stock_quantity + quantity;
          changeAmount = quantity;
          break;
        case 'subtract':
          newQuantity = Math.max(0, product.stock_quantity - quantity);
          changeAmount = -Math.min(quantity, product.stock_quantity);
          break;
        case 'set':
        default:
          newQuantity = quantity;
          changeAmount = quantity - product.stock_quantity;
          break;
      }

      // Update product stock
      await DatabaseUtils.update('products', { stock_quantity: newQuantity }, { id: productId });

      // Log inventory movement
      await DatabaseUtils.insert('inventory_movements', {
        product_id: productId,
        movement_type: operation,
        quantity_change: changeAmount,
        previous_quantity: product.stock_quantity,
        new_quantity: newQuantity,
        reason,
        created_at: new Date()
      });

      return {
        success: true,
        previousQuantity: product.stock_quantity,
        newQuantity,
        changeAmount,
        message: 'Stock updated successfully'
      };
    } catch (error) {
      console.error('Update stock error:', error.message);
      throw new Error(error.message || 'Failed to update stock');
    }
  }

  // Get low stock products with threshold
  static async getLowStockProducts(threshold = 5) {
    try {
      const query = `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.stock_quantity <= $1 AND p.is_active = true
        ORDER BY p.stock_quantity ASC, p.name ASC
      `;

      const result = await pool.query(query, [threshold]);

      return {
        success: true,
        products: result.rows,
        count: result.rows.length
      };
    } catch (error) {
      console.error('Get low stock products error:', error.message);
      throw new Error('Failed to fetch low stock products');
    }
  }

  // Get out of stock products
  static async getOutOfStockProducts() {
    try {
      const query = `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.stock_quantity = 0 AND p.is_active = true
        ORDER BY p.name ASC
      `;

      const result = await pool.query(query);

      return {
        success: true,
        products: result.rows,
        count: result.rows.length
      };
    } catch (error) {
      console.error('Get out of stock products error:', error.message);
      throw new Error('Failed to fetch out of stock products');
    }
  }

  // Check stock availability for multiple products
  static async checkStockAvailability(items) {
    try {
      const results = [];

      for (const item of items) {
        const { productId, quantity } = item;
        const product = await DatabaseUtils.findOne('products', { id: productId });

        if (!product) {
          results.push({
            productId,
            available: false,
            message: 'Product not found'
          });
          continue;
        }

        if (!product.is_active) {
          results.push({
            productId,
            available: false,
            message: 'Product is inactive'
          });
          continue;
        }

        const available = product.stock_quantity >= quantity;
        results.push({
          productId,
          available,
          requestedQuantity: quantity,
          availableQuantity: product.stock_quantity,
          message: available ? 'Available' : 'Insufficient stock'
        });
      }

      return {
        success: true,
        results,
        allAvailable: results.every(r => r.available)
      };
    } catch (error) {
      console.error('Check stock availability error:', error.message);
      throw new Error('Failed to check stock availability');
    }
  }

  // Reserve stock for order processing
  static async reserveStock(items, orderId = null) {
    try {
      const reservations = [];

      for (const item of items) {
        const { productId, quantity } = item;
        
        // Check availability first
        const availability = await this.checkStockAvailability([{ productId, quantity }]);
        if (!availability.results[0].available) {
          throw new Error(`Insufficient stock for product ${productId}`);
        }

        // Reserve stock by reducing quantity
        await this.updateStock(productId, quantity, 'subtract', `Reserved for order ${orderId || 'pending'}`);
        
        // Log reservation
        await DatabaseUtils.insert('stock_reservations', {
          product_id: productId,
          quantity: quantity,
          order_id: orderId,
          status: 'active',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          created_at: new Date()
        });

        reservations.push({
          productId,
          quantity,
          orderId
        });
      }

      return {
        success: true,
        reservations,
        message: 'Stock reserved successfully'
      };
    } catch (error) {
      console.error('Reserve stock error:', error.message);
      throw new Error(error.message || 'Failed to reserve stock');
    }
  }

  // Get inventory statistics
  static async getInventoryStats() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as in_stock_products,
          COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock_products,
          COUNT(CASE WHEN stock_quantity <= 5 AND stock_quantity > 0 THEN 1 END) as low_stock_products,
          SUM(stock_quantity) as total_stock_units,
          SUM(stock_quantity * price) as total_stock_value,
          AVG(stock_quantity) as average_stock_per_product
        FROM products
        WHERE is_active = true
      `;

      const result = await pool.query(statsQuery);

      return {
        success: true,
        stats: result.rows[0]
      };
    } catch (error) {
      console.error('Get inventory stats error:', error.message);
      throw new Error('Failed to fetch inventory statistics');
    }
  }
}

export default InventoryService;