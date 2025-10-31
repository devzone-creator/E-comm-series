import { pool } from './database.js';
import bcrypt from 'bcrypt';

class DatabaseSeeder {
  async seedAdminUser() {
    try {
      // Check if admin user already exists
      const existingAdmin = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        ['admin@afriglam.com']
      );

      if (existingAdmin.rows.length > 0) {
        console.log('✅ Admin user already exists');
        return;
      }

      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const result = await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email
      `, [
        'admin@afriglam.com',
        hashedPassword,
        'Admin',
        'User',
        'admin'
      ]);

      console.log('✅ Admin user created:', result.rows[0]);
    } catch (error) {
      console.error('❌ Error seeding admin user:', error.message);
      throw error;
    }
  }

  async seedCategories() {
    try {
      const categories = [
        {
          name: 'Traditional Dresses',
          description: 'Beautiful traditional African dresses for all occasions',
          image_url: '/images/categories/dresses.jpg'
        },
        {
          name: 'Kente Cloth',
          description: 'Authentic Kente cloth and accessories',
          image_url: '/images/categories/kente.jpg'
        },
        {
          name: 'Dashiki',
          description: 'Colorful dashiki shirts and tops',
          image_url: '/images/categories/dashiki.jpg'
        },
        {
          name: 'Accessories',
          description: 'Traditional jewelry, bags, and accessories',
          image_url: '/images/categories/accessories.jpg'
        }
      ];

      for (const category of categories) {
        const existing = await pool.query(
          'SELECT id FROM categories WHERE name = $1',
          [category.name]
        );

        if (existing.rows.length === 0) {
          await pool.query(`
            INSERT INTO categories (name, description, image_url)
            VALUES ($1, $2, $3)
          `, [category.name, category.description, category.image_url]);
          
          console.log(`✅ Category created: ${category.name}`);
        }
      }
    } catch (error) {
      console.error('❌ Error seeding categories:', error.message);
      throw error;
    }
  }

  async seedSampleProducts() {
    try {
      // Get category IDs
      const categoriesResult = await pool.query('SELECT id, name FROM categories');
      const categories = {};
      categoriesResult.rows.forEach(cat => {
        categories[cat.name] = cat.id;
      });

      const products = [
        {
          name: 'Royal Kente Dress',
          description: 'Elegant traditional dress made with authentic Kente cloth',
          price: 150.00,
          category_id: categories['Traditional Dresses'],
          stock_quantity: 10,
          sku: 'RKD001',
          image_url: 'https://placehold.co/400x400/8B4513/FFFFFF?text=Kente+Dress',
          sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
          colors: JSON.stringify(['Gold/Black', 'Red/Gold', 'Blue/Gold'])
        },
        {
          name: 'Classic Dashiki Shirt',
          description: 'Comfortable and stylish dashiki shirt for everyday wear',
          price: 45.00,
          category_id: categories['Dashiki'],
          stock_quantity: 25,
          sku: 'CDS001',
          image_url: 'https://placehold.co/400x400/FF6B35/FFFFFF?text=Dashiki+Shirt',
          sizes: JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']),
          colors: JSON.stringify(['Blue', 'Red', 'Green', 'Yellow'])
        }
      ];

      for (const product of products) {
        const existing = await pool.query(
          'SELECT id FROM products WHERE sku = $1',
          [product.sku]
        );

        if (existing.rows.length === 0) {
          await pool.query(`
            INSERT INTO products (name, description, price, category_id, stock_quantity, sku, image_url, sizes, colors)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            product.name,
            product.description,
            product.price,
            product.category_id,
            product.stock_quantity,
            product.sku,
            product.image_url,
            product.sizes,
            product.colors
          ]);
          
          console.log(`✅ Product created: ${product.name}`);
        }
      }
    } catch (error) {
      console.error('❌ Error seeding products:', error.message);
      throw error;
    }
  }

  async runAllSeeders() {
    try {
      console.log('🌱 Starting database seeding...');
      
      await this.seedAdminUser();
      await this.seedCategories();
      await this.seedSampleProducts();
      
      console.log('✅ Database seeding completed successfully');
    } catch (error) {
      console.error('❌ Database seeding failed:', error.message);
      throw error;
    }
  }
}

export default DatabaseSeeder;