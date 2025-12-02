import express from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:userId/items', authenticate, async (req, res) => {
  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: parseInt(req.params.userId) },
      include: { product: true }
    });
    res.json(cartItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:userId/items', authenticate, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = parseInt(req.params.userId);

    const existingItem = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId: parseInt(productId) } }
    });

    let cartItem;
    if (existingItem) {
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + parseInt(quantity) },
        include: { product: true }
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: { userId, productId: parseInt(productId), quantity: parseInt(quantity) },
        include: { product: true }
      });
    }

    res.status(201).json(cartItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:userId/items/:productId', authenticate, async (req, res) => {
  try {
    const { quantity } = req.body;
    const cartItem = await prisma.cartItem.update({
      where: {
        userId_productId: {
          userId: parseInt(req.params.userId),
          productId: parseInt(req.params.productId)
        }
      },
      data: { quantity: parseInt(quantity) },
      include: { product: true }
    });
    res.json(cartItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:userId/items/:productId', authenticate, async (req, res) => {
  try {
    await prisma.cartItem.delete({
      where: {
        userId_productId: {
          userId: parseInt(req.params.userId),
          productId: parseInt(req.params.productId)
        }
      }
    });
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:userId/clear', authenticate, async (req, res) => {
  try {
    await prisma.cartItem.deleteMany({ where: { userId: parseInt(req.params.userId) } });
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
