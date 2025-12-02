import express from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check admin role
const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.get('/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const totalProducts = await prisma.product.count();
    const totalOrders = await prisma.order.count();
    const totalUsers = await prisma.user.count();
    const totalRevenue = await prisma.order.aggregate({ _sum: { totalAmount: true } });

    res.json({
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue: totalRevenue._sum.totalAmount || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders', authenticate, isAdmin, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { user: true, orderItems: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/orders/:id/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
      include: { orderItems: { include: { product: true } } }
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
