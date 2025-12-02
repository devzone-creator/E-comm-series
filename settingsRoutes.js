import express from 'express';
import prisma from '../config/database.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    let settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          id: 1,
          heroImage: 'https://placehold.co/1920x1080',
          collection1Image: 'https://placehold.co/600x400',
          collection2Image: 'https://placehold.co/600x400',
          collection3Image: 'https://placehold.co/600x400'
        }
      });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/', authenticate, isAdmin, upload.fields([
  { name: 'heroImage', maxCount: 1 },
  { name: 'collection1Image', maxCount: 1 },
  { name: 'collection2Image', maxCount: 1 },
  { name: 'collection3Image', maxCount: 1 }
]), async (req, res) => {
  try {
    const updateData = {};

    for (const field of ['heroImage', 'collection1Image', 'collection2Image', 'collection3Image']) {
      if (req.files && req.files[field]) {
        const file = req.files[field][0];
        try {
          const result = await cloudinary.uploader.upload(file.path, { 
            folder: 'musti-ecommerce/site-images',
            resource_type: 'auto'
          });
          updateData[field] = result.secure_url;
          fs.unlinkSync(file.path);
        } catch (cloudinaryError) {
          updateData[field] = `http://localhost:5000/uploads/${file.filename}`;
        }
      }
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: updateData,
      create: {
        id: 1,
        ...updateData
      }
    });

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
