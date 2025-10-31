import express from 'express';
import CartService from '../services/cartService.js';
import DatabaseUtils from '../config/db-utils.js';
import { 
  unifiedAuthenticate, 
  authenticateSession 
} from '../middleware/auth.js';

const router = express.Router();

// API Routes (JSON responses)

// POST /api/cart/add - Add item to cart
router.post('/api/cart/add', unifiedAuthenticate, async (req, res) => {
  try {
    const { productId, quantity = 1, size = null, color = null } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
      });
    }

    const result = await CartService.addToCart(req.user.id, productId, quantity, size, color);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/cart - Get cart items
router.get('/api/cart', unifiedAuthenticate, async (req, res) => {
  try {
    const result = await CartService.getCartItems(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// PUT /api/cart/:itemId - Update cart item quantity
router.put('/api/cart/:itemId', unifiedAuthenticate, async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity cannot be negative'
      });
    }

    const result = await CartService.updateCartItem(req.user.id, req.params.itemId, quantity);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// DELETE /api/cart/:itemId - Remove item from cart
router.delete('/api/cart/:itemId', unifiedAuthenticate, async (req, res) => {
  try {
    const result = await CartService.removeFromCart(req.user.id, req.params.itemId);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// DELETE /api/cart - Clear entire cart
router.delete('/api/cart', unifiedAuthenticate, async (req, res) => {
  try {
    const result = await CartService.clearCart(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/cart/count - Get cart item count
router.get('/api/cart/count', unifiedAuthenticate, async (req, res) => {
  try {
    const result = await CartService.getCartCount(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/cart/summary - Get cart summary
router.get('/api/cart/summary', unifiedAuthenticate, async (req, res) => {
  try {
    const result = await CartService.getCartSummary(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/cart/validate - Validate cart before checkout
router.post('/api/cart/validate', unifiedAuthenticate, async (req, res) => {
  try {
    const result = await CartService.validateCart(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Web Routes (HTML responses)

// GET /cart - Cart page
router.get('/cart', async (req, res) => {
  try {
    let cartData = { items: [], summary: { item_count: 0, total_quantity: 0, subtotal: 0, tax: 0, total: 0 } };
    let user = null;

    // Get user if logged in
    if (req.session && req.session.userId) {
      user = await DatabaseUtils.findOne('users', { id: req.session.userId });
      
      if (user) {
        try {
          cartData = await CartService.getCartItems(user.id);
        } catch (error) {
          console.error('Error fetching cart:', error);
        }
      }
    }

    res.render('cart/index', {
      title: 'Shopping Cart - AfriGlam',
      user,
      cart: cartData,
      isLoggedIn: !!user
    });
  } catch (error) {
    console.error('Cart page error:', error);
    res.render('cart/index', {
      title: 'Shopping Cart - AfriGlam',
      user: null,
      cart: { items: [], summary: { item_count: 0, total_quantity: 0, subtotal: 0, tax: 0, total: 0 } },
      isLoggedIn: false
    });
  }
});

// POST /cart/add - Add to cart (web form)
router.post('/cart/add', authenticateSession, async (req, res) => {
  try {
    const { productId, quantity = 1, size = null, color = null, redirect = '/cart' } = req.body;

    if (!productId) {
      return res.redirect(`${redirect}?error=Product not found`);
    }

    await CartService.addToCart(req.session.userId, productId, parseInt(quantity), size, color);
    res.redirect(`${redirect}?success=Item added to cart`);
  } catch (error) {
    const redirect = req.body.redirect || '/cart';
    res.redirect(`${redirect}?error=${encodeURIComponent(error.message)}`);
  }
});

// POST /cart/update/:itemId - Update cart item (web form)
router.post('/cart/update/:itemId', authenticateSession, async (req, res) => {
  try {
    const { quantity } = req.body;
    
    await CartService.updateCartItem(req.session.userId, req.params.itemId, parseInt(quantity));
    res.redirect('/cart?success=Cart updated');
  } catch (error) {
    res.redirect(`/cart?error=${encodeURIComponent(error.message)}`);
  }
});

// POST /cart/remove/:itemId - Remove from cart (web form)
router.post('/cart/remove/:itemId', authenticateSession, async (req, res) => {
  try {
    await CartService.removeFromCart(req.session.userId, req.params.itemId);
    res.redirect('/cart?success=Item removed from cart');
  } catch (error) {
    res.redirect(`/cart?error=${encodeURIComponent(error.message)}`);
  }
});

// POST /cart/clear - Clear cart (web form)
router.post('/cart/clear', authenticateSession, async (req, res) => {
  try {
    await CartService.clearCart(req.session.userId);
    res.redirect('/cart?success=Cart cleared');
  } catch (error) {
    res.redirect(`/cart?error=${encodeURIComponent(error.message)}`);
  }
});

// GET /cart/add - Redirect to cart (handles login redirects)
router.get('/cart/add', (req, res) => {
  res.redirect('/cart');
});

export default router;