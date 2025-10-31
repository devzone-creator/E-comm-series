import express from 'express';
import checkoutService from '../services/checkoutService.js';
import cartService from '../services/cartService.js';
import { authenticateSession } from '../middleware/auth.js';

const router = express.Router();

// Checkout page
router.get('/', authenticateSession, async (req, res) => {
    try {
        const cartResult = await cartService.getCartItems(req.session.userId);
        const { items } = cartResult;
        
        if (items.length === 0) {
            return res.redirect('/cart?error=empty');
        }

        const totals = await checkoutService.calculateOrderTotals(req.session.userId);
        
        res.render('checkout/index', {
            title: 'Checkout - AfriGlam',
            cartItems: items,
            totals,
            user: { id: req.session.userId }
        });
    } catch (error) {
        console.error('Checkout page error:', error);
        res.redirect('/cart?error=checkout_failed');
    }
});

// Process checkout
router.post('/process', authenticateSession, async (req, res) => {
    try {
        const { shipping, payment } = req.body;

        // Validate shipping address
        checkoutService.validateShippingAddress(shipping);

        // Validate payment info (basic validation)
        if (!payment.method || !payment.cardNumber || !payment.expiryDate || !payment.cvv) {
            throw new Error('All payment fields are required');
        }

        // Create order
        const orderData = {
            shipping,
            payment
        };

        const order = await checkoutService.createOrder(req.session.userId, orderData);

        res.redirect(`/orders/${order.orderId}?success=true`);

    } catch (error) {
        console.error('Checkout process error:', error);
        res.redirect(`/checkout?error=${encodeURIComponent(error.message || 'Unable to process order')}`);
    }
});

export default router;
      