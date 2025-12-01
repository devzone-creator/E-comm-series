import { pool } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const dummyProducts = [
  {
    name: 'African Print Dress',
    description: 'Beautiful traditional African print dress with vibrant colors and elegant design. Perfect for special occasions.',
    price: 89.99,
    category: 'Dresses',
    stock_quantity: 25,
    image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop',
    is_active: true
  },
  {
    name: 'Kente Cloth Headwrap',
    description: 'Authentic Kente cloth headwrap with traditional patterns. Handwoven with premium quality materials.',
    price: 34.99,
    category: 'Accessories',
    stock_quantity: 50,
    image_url: 'https://images.unsplash.com/photo-1582142306909-195724d33c9f?w=400&h=400&fit=crop',
    is_active: true
  },
  {
    name: 'Dashiki Shirt',
    description: 'Classic Dashiki shirt with intricate embroidery. Comfortable cotton fabric in various colors.',
    price: 45.99,
    category: 'Shirts',
    stock_quantity: 30,
    image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
    is_active: true
  },
  {
    name: 'Ankara Skirt',
    description: 'Stylish Ankara print skirt with modern cut. Perfect for both casual and formal wear.',
    price: 52.99,
    category: 'Skirts',
    stock_quantity: 20,
    image_url: 'https://images.unsplash.com/photo-1583743089695-4b816a340f82?w=400&h=400&fit=crop',
    is_active: true
  },
  {
    name: 'Beaded Necklace Set',
    description: 'Handcrafted beaded necklace and earring set. Made with authentic African beads and materials.',
    price: 28.99,
    category: 'Jewelry',
    stock_quantity: 40,
    image_url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
    is_active: true
  },
  {
    name: 'African Print Blazer',
    description: 'Professional blazer with African print lining. Perfect for business and formal occasions.',
    price: 125.99,
    category: 'Blazers',
    stock_quantity: 15,
    image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop',
    is_active: true
  },
  {
    name: 'Mud Cloth Bag',
    description: 'Authentic mud cloth tote bag. Spacious and durable with traditional Malian patterns.',
    price: 67.99,
    category: 'Bags',
    stock_quantity: 18,
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    is_active: true
  },
  {
    name: 'Cowrie Shell Bracelet',
    description: 'Beautiful cowrie shell bracelet with adjustable cord. Symbol of prosperity and protection.',
    price: 19.99,
    category: 'Jewelry',
    stock_quantity: 60,
    image_url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
    is_active: true
  },
  {
    name: 'Kente Stole',
    description: 'Graduation or ceremonial Kente stole with authentic patterns. Perfect for special ceremonies.',
    price: 78.99,
    category: 'Accessories',
    stock_quantity: 12,
    image_url: 'https://images.unsplash.com/photo-1582142306909-195724d33c9f?w=400&h=400&fit=crop',
    is_active: true
  },
  {
    name: 'African Print Pants',
    description: 'Comfortable wide-leg pants with vibrant African print. Perfect for casual and semi-formal wear.',
    price: 58.99,
    category: 'Pants',
    stock_quantity: 22,
    image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop',
    is_active: true
  }
];

async function seedProducts() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting to seed products...');
    
    // First, create categories if they don't exist
    const categories = [...new Set(dummyProducts.map(p => p.category))];
    
    for (const categoryName of categories) {
      await client.query(`
        INSERT INTO categories (name, description, is_active, created_at, updated_at)
        VALUES ($1, $2, true, NOW(), NOW())
        ON CONFLICT (name) DO NOTHING
      `, [categoryName, `${categoryName} category`]);
    }
    
    console.log(`✅ Created ${categories.length} categories`);
    
    // Get category IDs
    const categoryResult = await client.query('SELECT id, name FROM categories');
    const categoryMap = {};
    categoryResult.rows.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });
    
    // Insert products
    let insertedCount = 0;
    
    for (const product of dummyProducts) {
      try {
        await client.query(`
          INSERT INTO products (
            name, description, price, category_id, stock_quantity, 
            image_url, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [
          product.name,
          product.description,
          product.price,
          categoryMap[product.category],
          product.stock_quantity,
          product.image_url,
          product.is_active
        ]);
        insertedCount++;
      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⚠️  Product "${product.name}" already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }
    
    console.log(`✅ Successfully inserted ${insertedCount} products`);
    console.log('🎉 Product seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the seeder
seedProducts()
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });