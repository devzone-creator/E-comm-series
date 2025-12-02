import express from 'express';
import prisma from '../config/database.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, stockQuantity } = req.body;
    let imageUrl = null;

    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, { 
          folder: 'musti-ecommerce',
          resource_type: 'auto'
        });
        imageUrl = result.secure_url;
        fs.unlinkSync(req.file.path);
        console.log('✅ Image uploaded to Cloudinary:', imageUrl);
      } catch (cloudinaryError) {
        console.log('⚠️ Cloudinary upload failed, using local storage:', cloudinaryError.message);
        imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stockQuantity: stockQuantity ? parseInt(stockQuantity) : null,
        imageUrl
      }
    });

    res.status(201).json(product);
  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticate, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, stockQuantity } = req.body;
    const updateData = { name, description, price: parseFloat(price), stockQuantity: stockQuantity ? parseInt(stockQuantity) : null };

    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, { folder: 'musti-ecommerce' });
        updateData.imageUrl = result.secure_url;
        fs.unlinkSync(req.file.path);
      } catch (cloudinaryError) {
        updateData.imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
      }
    }

    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });

    res.json(product);
  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
