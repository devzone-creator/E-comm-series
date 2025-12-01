import express from 'express';
import checkoutService from '../services/checkoutService.js';
import cartService from '../services/cartService.js';
import { authenticateSession } from '../middleware/auth.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET || '', { apiVersion: '2022-11-15' });

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

        // Validate payment method
        if (!payment || !payment.method) {
            throw new Error('Payment method is required');
        }

        // Create order record (status: pending)
        const orderData = { shipping, payment };
        const order = await checkoutService.createOrder(req.session.userId, orderData);

        // Only Stripe is supported for payments in this release
        if (payment.method !== 'stripe') {
            throw new Error('Unsupported payment method');
        }

        // Prepare Stripe Checkout Session
        if (!process.env.STRIPE_SECRET) {
            throw new Error('STRIPE_SECRET is not configured');
        }

        // Build line items from cart
        const cartResult = await cartService.getCartItems(req.session.userId);
        const line_items = cartResult.items.map(item => ({
            price_data: {
                currency: process.env.CURRENCY?.toLowerCase() || 'ngn',
                product_data: { name: item.product_name },
                unit_amount: Math.round(parseFloat(item.product_price) * 100)
            },
            quantity: item.quantity
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`}/orders/${order.orderId}?success=true`,
            cancel_url: `${process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`}/checkout?canceled=true`,
            metadata: {
                orderId: order.orderId,
                orderNumber: order.orderNumber
            }
        });

        // Check if this is an API request (SPA) vs browser form request
        const isApiRequest = req.headers['accept']?.includes('application/json') || 
                            req.headers['x-requested-with'] === 'XMLHttpRequest';
        
        if (isApiRequest) {
            // Return JSON for SPA/fetch-based clients
            return res.json({ url: session.url });
        } else {
            // Browser form submission: redirect directly
            return res.redirect(303, session.url);
        }

    } catch (error) {
        console.error('Checkout process error:', error);
        
        // Check if this is an API request to decide response format
        const isApiRequest = req.headers['accept']?.includes('application/json') || 
                            req.headers['x-requested-with'] === 'XMLHttpRequest';
        
        if (isApiRequest) {
            return res.status(400).json({ error: error.message || 'Unable to process order' });
        } else {
            res.redirect(`/checkout?error=${encodeURIComponent(error.message || 'Unable to process order')}`);
        }
    }
});

export default router;
