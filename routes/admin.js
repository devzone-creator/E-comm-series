import express from 'express';
import DatabaseUtils from '../config/db-utils.js';
import { authenticateSession } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is admin
const requireAdminSession = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.redirect('/login');
    }

    const user = await DatabaseUtils.findOne('users', { id: req.session.userId });
    if (!user) {
      // Clear invalid session
      req.session.destroy(() => {});
      return res.redirect('/login');
    }
    
    if (user.role !== 'admin') {
      return res.redirect('/dashboard');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    // If it's a database connection error, show error page instead of redirect loop
    if (error.message.includes('Connection terminated') || error.message.includes('ECONNRESET')) {
      return res.render('error', { 
        title: 'Database Error - AfriGlam',
        error: 'Database connection issue. Please try again in a moment.' 
      });
    }
    res.redirect('/login');
  }
};

// Admin Dashboard
router.get('/admin/dashboard', requireAdminSession, async (req, res) => {
  try {
    // Get dashboard statistics
    const stats = {
      totalUsers: await DatabaseUtils.count('users'),
      totalProducts: await DatabaseUtils.count('products'),
      totalOrders: await DatabaseUtils.count('orders'),
      totalCategories: await DatabaseUtils.count('categories')
    };

    // Get recent orders
    const recentOrders = await DatabaseUtils.findMany('orders', {}, {
      orderBy: 'created_at DESC',
      limit: 5
    });

    // Get low stock products
    const lowStockProducts = await DatabaseUtils.query(`
      SELECT * FROM products 
      WHERE stock_quantity <= 5 AND is_active = true 
      ORDER BY stock_quantity ASC 
      LIMIT 5
    `);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - AfriGlam',
      user: req.user,
      stats,
      recentOrders,
      lowStockProducts: lowStockProducts.rows
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.render('error', { 
      title: 'Error - AfriGlam',
      error: 'Failed to load dashboard' 
    });
  }
});

// Admin Users Management
router.get('/admin/users', requireAdminSession, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const users = await DatabaseUtils.findMany('users', {}, {
      orderBy: 'created_at DESC',
      limit,
      offset
    });

    const totalUsers = await DatabaseUtils.count('users');
    const totalPages = Math.ceil(totalUsers / limit);

    res.render('admin/users', {
      title: 'Manage Users - AfriGlam Admin',
      user: req.user,
      users,
      pagination: {
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.render('error', { 
      title: 'Error - AfriGlam',
      error: 'Failed to load users' 
    });
  }
});

// Admin Orders Management
router.get('/admin/orders', requireAdminSession, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';

    let conditions = {};
    if (status) {
      conditions.status = status;
    }

    const orders = await DatabaseUtils.findMany('orders', conditions, {
      orderBy: 'created_at DESC',
      limit,
      offset
    });

    const totalOrders = await DatabaseUtils.count('orders', conditions);
    const totalPages = Math.ceil(totalOrders / limit);

    res.render('admin/orders', {
      title: 'Manage Orders - AfriGlam Admin',
      user: req.user,
      orders,
      currentStatus: status,
      pagination: {
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Admin orders error:', error);
    res.render('error', { 
      title: 'Error - AfriGlam',
      error: 'Failed to load orders' 
    });
  }
});

// Update order status
router.post('/admin/orders/:id/status', requireAdminSession, async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.redirect('/admin/orders?error=Invalid status');
    }

    await DatabaseUtils.update('orders', { status }, { id: orderId });
    res.redirect('/admin/orders?success=Order status updated');
  } catch (error) {
    console.error('Update order status error:', error);
    res.redirect('/admin/orders?error=Failed to update order status');
  }
});

// Admin Inventory Management
router.get('/admin/inventory', requireAdminSession, async (req, res) => {
  try {
    res.render('admin/inventory', {
      title: 'Manage Inventory - AfriGlam Admin',
      user: req.user,
    });
  } catch (error) {
    console.error('Admin inventory error:', error);
    res.render('error', { 
      title: 'Error - AfriGlam',
      error: 'Failed to load inventory page' 
    });
  }
});

export default router;