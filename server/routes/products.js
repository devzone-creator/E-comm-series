import express from 'express';
import { validationResult } from 'express-validator';
import ProductService from '../services/productService.js';
import DatabaseUtils from '../config/db-utils.js';
import { 
  validateProductData, 
  validateStockData,
  handleValidationErrors
} from '../utils/validation.js';
import { 
  unifiedAuthenticate, 
  authenticateSession, 
  requireAdmin 
} from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { uploadProductImage } from '../middleware/fileUpload.js';

const router = express.Router();

async function renderProductForm(req, res, options) {
  const {
    title, user, product, categories, error, errors, formData
  } = options;

  return res.render('admin/products/form', {
    title,
    user,
    product,
    categories,
    error,
    errors,
    formData
  });
}

const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD || '5', 10);


// API Routes (JSON responses)

// GET /api/products - Get all products with filters
router.get('/api/products', asyncHandler(async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 12,
    category: req.query.category,
    search: req.query.search,
    sortBy: req.query.sortBy || 'created_at',
    sortOrder: req.query.sortOrder || 'DESC',
    isActive: req.query.isActive !== 'false'
  };

  const result = await ProductService.getAllProducts(options);
  res.json(result);
}));

// GET /api/products/:id - Get single product
router.get('/api/products/:id', asyncHandler(async (req, res) => {
  const result = await ProductService.getProductById(req.params.id);
  res.json(result);
}));

// POST /api/products - Create product (Admin only)
router.post('/api/products', unifiedAuthenticate, requireAdmin, validateProductData, handleValidationErrors, asyncHandler(async (req, res) => {
  const result = await ProductService.createProduct(req.body);
  res.status(201).json(result);
}));

// PUT /api/products/:id - Update product (Admin only)
router.put('/api/products/:id', unifiedAuthenticate, requireAdmin, validateProductData, handleValidationErrors, asyncHandler(async (req, res) => {
  const result = await ProductService.updateProduct(req.params.id, req.body);
  res.json(result);
}));

// DELETE /api/products/:id - Delete product (Admin only)
router.delete('/api/products/:id', unifiedAuthenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await ProductService.deleteProduct(req.params.id);
  res.json(result);
}));

// PUT /api/products/:id/stock - Update stock (Admin only)
router.put('/api/products/:id/stock', unifiedAuthenticate, requireAdmin, validateStockData, handleValidationErrors, asyncHandler(async (req, res) => {
  const { quantity, operation = 'set' } = req.body;
  const result = await ProductService.updateStock(req.params.id, quantity, operation);
  res.json(result);
}));

// GET /api/products/category/:categoryId - Get products by category
router.get('/api/products/category/:categoryId', asyncHandler(async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 12
  };
  const result = await ProductService.getProductsByCategory(req.params.categoryId, options);
  res.json(result);
}));

// GET /api/products/admin/low-stock - Get low stock products (Admin only)
router.get('/api/products/admin/low-stock', unifiedAuthenticate, requireAdmin, asyncHandler(async (req, res) => {
  const threshold = parseInt(req.query.threshold) || LOW_STOCK_THRESHOLD;
  const result = await ProductService.getLowStockProducts(threshold);
  res.json(result);
}));

// Web Routes (HTML responses)

// GET /admin/products - Admin products management page
router.get('/admin/products', authenticateSession, requireAdmin, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const search = req.query.search || '';
  const category = req.query.category || '';

  const options = {
    page,
    limit: 10,
    search,
    category,
    isActive: null // Show all products for admin
  };

  const productsResult = await ProductService.getAllProducts(options);
  const categories = await DatabaseUtils.findMany('categories', { is_active: true });

  res.render('admin/products/index', {
    title: 'Manage Products - AfriGlam Admin',
    user: req.user,
    products: productsResult.products,
    pagination: productsResult.pagination,
    categories,
    filters: { search, category }
  });
}));

// GET /admin/products/new - Add new product page
router.get('/admin/products/new', authenticateSession, requireAdmin, asyncHandler(async (req, res) => {
  const categories = await DatabaseUtils.findMany('categories', { is_active: true });

  res.render('admin/products/form', {
    title: 'Add New Product - AfriGlam Admin',
    user: req.user,
    product: null,
    categories,
    error: null,
    errors: {},
    formData: {}
  });
}));

// POST /admin/products/new - Create new product
router.post('/admin/products/new', authenticateSession, requireAdmin, uploadProductImage, validateProductData, asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const categories = await DatabaseUtils.findMany('categories', { is_active: true });
    return renderProductForm(req, res, {
      title: 'Add New Product - AfriGlam Admin', user: req.user, product: null, categories,
      error: 'Please fix the errors below',
      errors: errors.mapped(),
      formData: req.body
    });
  }

  // Parse JSON fields and handle image upload
  const productData = { ...req.body };
  
  // Handle uploaded image
  if (req.file) {
      productData.imageUrl = `/uploads/products/${req.file.filename}`;
  }
  
  try {
    productData.sizes = req.body.sizes ? JSON.parse(req.body.sizes) : [];
  } catch (error) {
    productData.sizes = [];
  }

  try {
    productData.colors = req.body.colors ? JSON.parse(req.body.colors) : [];
  } catch (error) {
    productData.colors = [];
  }

  await ProductService.createProduct(productData);
  res.redirect('/admin/products?success=Product created successfully');
}));


// GET /admin/products/:id/edit - Edit product page
router.get('/admin/products/:id/edit', authenticateSession, requireAdmin, asyncHandler(async (req, res) => {
  const productResult = await ProductService.getProductById(req.params.id);
  const categories = await DatabaseUtils.findMany('categories', { is_active: true });

  res.render('admin/products/form', { title: 'Edit Product - AfriGlam Admin', user: req.user, product: productResult.product, categories, error: null, errors: {}, formData: productResult.product });
}));
// POST /admin/products/:id/edit - Update product
router.post('/admin/products/:id/edit', authenticateSession, requireAdmin, uploadProductImage, validateProductData, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const productResult = await ProductService.getProductById(req.params.id);
    const categories = await DatabaseUtils.findMany('categories', { is_active: true });
    return res.render('admin/products/form', {
      title: 'Edit Product - AfriGlam Admin',
      user: req.user,
      product: productResult.product,
      categories,
      error: 'Please fix the errors below',
      errors: errors.mapped(),
      formData: req.body
    });
  }

  // Parse JSON fields and handle image upload
  const updateData = { ...req.body };
  
  // Handle uploaded image
  if (req.file) {
    updateData.imageUrl = `/uploads/products/${req.file.filename}`;
  }
  
    try {
        updateData.sizes = req.body.sizes ? JSON.parse(req.body.sizes) : [];
    } catch (error) {
        updateData.sizes = [];
  }
    try {
        updateData.colors = req.body.colors ? JSON.parse(req.body.colors) : [];
    } catch (error) {
        updateData.colors = [];
  }

  await ProductService.updateProduct(req.params.id, updateData);
}));

// GET /product/:id - Product details page
router.get('/product/:id', asyncHandler(async (req, res) => {
  const productResult = await ProductService.getProductById(req.params.id);
  
  if (!productResult.success) {
    return res.status(404).render('error', {
      title: 'Product Not Found - AfriGlam',
      message: 'The product you are looking for does not exist.',
      user: req.user
    });
  }

  res.render('products/details', {
    title: `${productResult.product.name} - AfriGlam`,
    product: productResult.product,
    user: req.user,
    isLoggedIn: !!req.user
  });
}));

// GET /api/categories - Get categories
router.get('/api/categories', asyncHandler(async (req, res) => {
  const categories = await DatabaseUtils.findMany('categories', { is_active: true });
  res.json({ 
    success: true, 
    categories: categories.map(cat => ({ id: cat.id, name: cat.name }))
  });
}));

export default router;