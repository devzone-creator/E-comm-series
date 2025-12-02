import express from 'express';
import inventoryService from '../services/inventoryService.js';
import { authenticateSession } from '../middleware/auth.js';

const router = express.Router();

// Get inventory
router.get('/inventory', async (req, res) => {
    try {
        const inventory = await inventoryService.getInventory();
        res.json({ inventory });
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update stock quantity (admin only)
router.put('/inventory/:productId', authenticateSession, async (req, res) => {
    try {
        const { stock_quantity } = req.body;
        
        if (stock_quantity === undefined) {
            return res.status(400).json({ error: 'Stock quantity is required' });
        }

        const updated = await inventoryService.updateStock(req.params.productId, stock_quantity);
        res.json({ message: 'Stock updated', inventory: updated });
    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get low stock products
router.get('/inventory/low-stock', async (req, res) => {
    try {
        const threshold = req.query.threshold || 10;
        const products = await inventoryService.getLowStockProducts(threshold);
        res.json({ products });
    } catch (error) {
        console.error('Get low stock error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
