
import express from 'express';
import { unifiedAuthenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import InventoryService from '../services/inventoryService.js';

const router = express.Router();

// GET /api/inventory - Get all inventory with filters
router.get('/api/inventory', unifiedAuthenticate, requireAdmin, asyncHandler(async (req, res) => {
    const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        search: req.query.search,
        sortBy: req.query.sortBy || 'stock_quantity',
        sortOrder: req.query.sortOrder || 'ASC',
    };

    const result = await InventoryService.getInventory(options);
    res.json(result);
}));

// GET /api/inventory/stats - Get inventory statistics
router.get('/api/inventory/stats', unifiedAuthenticate, requireAdmin, asyncHandler(async (req, res) => {
    const result = await InventoryService.getInventoryStats();
    res.json(result);
}));

// GET /api/inventory/low-stock - Get low stock products
router.get('/api/inventory/low-stock', unifiedAuthenticate, requireAdmin, asyncHandler(async (req, res) => {
    const threshold = parseInt(req.query.threshold) || 10;
    const result = await InventoryService.getLowStockProducts(threshold);
    res.json(result);
}));

// PUT /api/inventory/:productId/stock - Update stock for a product
router.put('/api/inventory/:productId/stock', unifiedAuthenticate, requireAdmin, asyncHandler(async (req, res) => {
    const { quantity, operation = 'set', reason = 'manual adjustment' } = req.body;
    const { productId } = req.params;

    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
        return res.status(400).json({ success: false, error: 'Quantity must be an integer.' });
    }

    const result = await InventoryService.updateStock(productId, quantity, operation, reason);
    res.json(result);
}));

export default router;
