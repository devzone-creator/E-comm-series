import express from 'express';
import orderService from '../services/orderService.js';
import { authenticateSession } from '../middleware/auth.js';

const router = express.Router();

// Get user's orders
router.get('/', authenticateSession, async (req, res) => {
    try {
        const orders = await orderService.getUserOrders(req.session.userId);
        res.json({ orders });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get order by ID
router.get('/:id', authenticateSession, async (req, res) => {
    try {
        const order = await orderService.getOrderById(req.params.id);
        
        // Check authorization
        if (order.user_id !== req.session.userId && !req.session.isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ order });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all orders (admin only)
router.get('/admin/all', async (req, res) => {
    try {
        const orders = await orderService.getAllOrders();
        res.json({ orders });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
