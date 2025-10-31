import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import orderService from '../services/orderService.js';

const router = express.Router();

// Get user orders
router.get('/', authenticateSession, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const result = await orderService.getUserOrders(req.session.userId, page);
        
        res.render('orders/index', {
            title: 'My Orders - AfriGlam',
            orders: result.orders,
            pagination: result.pagination,
            user: { id: req.session.userId }
        });
    } catch (error) {
        console.error('Orders page error:', error);
        res.status(500).render('error', { 
            title: 'Error - AfriGlam',
            message: 'Unable to load orders',
            user: { id: req.session.userId }
        });
    }
});

// Get specific order details
router.get('/:orderId', authenticateSession, async (req, res) => {
    try {
        const orderId = parseInt(req.params.orderId);
        const order = await orderService.getOrderDetails(orderId, req.session.userId);
        
        res.render('orders/details', {
            title: `Order #${order.order_number} - AfriGlam`,
            order,
            user: { id: req.session.userId },
            success: req.query.success === 'true'
        });
    } catch (error) {
        console.error('Order details error:', error);
        res.status(404).render('error', { 
            title: 'Order Not Found - AfriGlam',
            message: 'Order not found or access denied',
            user: { id: req.session.userId }
        });
    }
});

// Cancel order
router.post('/:orderId/cancel', authenticateSession, async (req, res) => {
    try {
        const orderId = parseInt(req.params.orderId);
        await orderService.cancelOrder(orderId, req.session.userId);
        
        res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message || 'Failed to cancel order' 
        });
    }
});

export default router;