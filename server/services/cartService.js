import DatabaseUtils from '../config/db-utils.js';
import { pool } from '../config/database.js';

class CartService {
  // Add item to cart
  static async addToCart(userId, productId, quantity = 1, size = null, color = null) {
    try {
      // Validate product exists and is active
      const product = await DatabaseUtils.findOne('products', { 
        id: productId, 
        is_active: true 
      });
      
      if (!product) {
        throw new Error('Product not found or unavailable');
      }

      // Check if product has enough stock
      if (product.stock_quantity < quantity) {
        throw new Error(`Only ${product.stock_quantity} items available in stock`);
      }

      // Check if item already exists in cart with same specifications
      const existingItem = await pool.query(`
        SELECT * FROM cart_items 
        WHERE user_id = $1 AND product_id = $2 AND 
              COALESCE(size, '') = COALESCE($3, '') AND 
              COALESCE(color, '') = COALESCE($4, '')
      `, [userId, productId, size, color]);

      if (existingItem.rows.length > 0) {
        // Update existing item quantity
        const newQuantity = existingItem.rows[0].quantity + quantity;
        
        // Check stock again for new total quantity
        if (product.stock_quantity < newQuantity) {
          throw new Error(`Only ${product.stock_quantity} items available in stock`);
        }

        const updatedItem = await DatabaseUtils.update('cart_items', 
          { quantity: newQuantity }, 
          { id: existingItem.rows[0].id }
        );

        return {
          success: true,
          cartItem: updatedItem,
          message: 'Cart updated successfully'
        };
      } else {
        // Add new item to cart
        const newItem = await DatabaseUtils.insert('cart_items', {
          user_id: userId,
          product_id: productId,
          quantity,
          size,
          color
        });

        return {
          success: true,
          cartItem: newItem,
          message: 'Item added to cart successfully'
        };
      }
    } catch (error) {
      console.error('Add to cart error:', error.message);
      throw new Error(error.message || 'Failed to add item to cart');
    }
  }

  // Get user's cart items
  static async getCartItems(userId) {
    try {
      const query = `
        SELECT 
          ci.*,
          p.name as product_name,
          p.price as product_price,
          p.image_url as product_image,
          p.stock_quantity as available_stock,
          p.is_active as product_active,
          c.name as category_name
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE ci.user_id = $1
        ORDER BY ci.created_at DESC
      `;

      const result = await pool.query(query, [userId]);
      
      // Calculate totals
      let subtotal = 0;
      const items = result.rows.map(item => {
        const itemTotal = parseFloat(item.product_price) * item.quantity;
        subtotal += itemTotal;
        
        return {
          ...item,
          item_total: itemTotal,
          is_available: item.product_active && item.available_stock >= item.quantity
        };
      });

      return {
        success: true,
        items,
        summary: {
          item_count: items.length,
          total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: subtotal,
          tax: subtotal * 0.1, // 10% tax
          total: subtotal * 1.1
        }
      };
    } catch (error) {
      console.error('Get cart items error:', error.message);
      throw new Error('Failed to fetch cart items');
    }
  }

  // Update cart item quantity
  static async updateCartItem(userId, cartItemId, quantity) {
    try {
      if (quantity <= 0) {
        return await this.removeFromCart(userId, cartItemId);
      }

      // Get cart item with product info
      const query = `
        SELECT ci.*, p.stock_quantity, p.is_active
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.id = $1 AND ci.user_id = $2
      `;

      const result = await pool.query(query, [cartItemId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Cart item not found');
      }

      const cartItem = result.rows[0];

      // Check if product is still active
      if (!cartItem.is_active) {
        throw new Error('Product is no longer available');
      }

      // Check stock availability
      if (cartItem.stock_quantity < quantity) {
        throw new Error(`Only ${cartItem.stock_quantity} items available in stock`);
      }

      // Update quantity
      const updatedItem = await DatabaseUtils.update('cart_items', 
        { quantity }, 
        { id: cartItemId, user_id: userId }
      );

      return {
        success: true,
        cartItem: updatedItem,
        message: 'Cart item updated successfully'
      };
    } catch (error) {
      console.error('Update cart item error:', error.message);
      throw new Error(error.message || 'Failed to update cart item');
    }
  }

  // Remove item from cart
  static async removeFromCart(userId, cartItemId) {
    try {
      const deletedItem = await DatabaseUtils.delete('cart_items', {
        id: cartItemId,
        user_id: userId
      });

      if (!deletedItem) {
        throw new Error('Cart item not found');
      }

      return {
        success: true,
        message: 'Item removed from cart successfully'
      };
    } catch (error) {
      console.error('Remove from cart error:', error.message);
      throw new Error(error.message || 'Failed to remove item from cart');
    }
  }

  // Clear entire cart
  static async clearCart(userId) {
    try {
      await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

      return {
        success: true,
        message: 'Cart cleared successfully'
      };
    } catch (error) {
      console.error('Clear cart error:', error.message);
      throw new Error('Failed to clear cart');
    }
  }

  // Get cart item count for user
  static async getCartCount(userId) {
    try {
      const result = await pool.query(
        'SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE user_id = $1',
        [userId]
      );

      return {
        success: true,
        count: parseInt(result.rows[0].count)
      };
    } catch (error) {
      console.error('Get cart count error:', error.message);
      throw new Error('Failed to get cart count');
    }
  }

  // Validate cart before checkout
  static async validateCart(userId) {
    try {
      const cartResult = await this.getCartItems(userId);
      const { items } = cartResult;

      const issues = [];
      const validItems = [];

      for (const item of items) {
        if (!item.product_active) {
          issues.push({
            item_id: item.id,
            product_name: item.product_name,
            issue: 'Product is no longer available'
          });
        } else if (item.available_stock < item.quantity) {
          issues.push({
            item_id: item.id,
            product_name: item.product_name,
            issue: `Only ${item.available_stock} items available (you have ${item.quantity} in cart)`
          });
        } else {
          validItems.push(item);
        }
      }

      return {
        success: true,
        is_valid: issues.length === 0,
        valid_items: validItems,
        issues,
        summary: {
          total_items: items.length,
          valid_items: validItems.length,
          invalid_items: issues.length
        }
      };
    } catch (error) {
      console.error('Validate cart error:', error.message);
      throw new Error('Failed to validate cart');
    }
  }

  // Move cart items to order (used during checkout)
  static async moveCartToOrder(userId, orderId) {
    try {
      // Get cart items
      const cartResult = await this.getCartItems(userId);
      const { items } = cartResult;

      if (items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Validate cart first
      const validation = await this.validateCart(userId);
      if (!validation.is_valid) {
        throw new Error('Cart contains invalid items. Please review your cart.');
      }

      // Create order items and update stock
      const orderItems = [];
      
      for (const item of validation.valid_items) {
        // Create order item
        const orderItem = await DatabaseUtils.insert('order_items', {
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.product_price,
          total_price: item.item_total,
          product_snapshot: JSON.stringify({
            name: item.product_name,
            price: item.product_price,
            image_url: item.product_image,
            size: item.size,
            color: item.color,
            category: item.category_name
          })
        });

        orderItems.push(orderItem);

        // Update product stock
        await pool.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // Clear cart
      await this.clearCart(userId);

      return {
        success: true,
        order_items: orderItems,
        message: 'Cart items moved to order successfully'
      };
    } catch (error) {
      console.error('Move cart to order error:', error.message);
      throw new Error(error.message || 'Failed to process cart items');
    }
  }

  // Get cart summary for quick display
  static async getCartSummary(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as item_count,
          COALESCE(SUM(ci.quantity), 0) as total_quantity,
          COALESCE(SUM(ci.quantity * p.price), 0) as subtotal
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = $1 AND p.is_active = true
      `;

      const result = await pool.query(query, [userId]);
      const summary = result.rows[0];

      return {
        success: true,
        summary: {
          item_count: parseInt(summary.item_count),
          total_quantity: parseInt(summary.total_quantity),
          subtotal: parseFloat(summary.subtotal),
          tax: parseFloat(summary.subtotal) * 0.1,
          total: parseFloat(summary.subtotal) * 1.1
        }
      };
    } catch (error) {
      console.error('Get cart summary error:', error.message);
      throw new Error('Failed to get cart summary');
    }
  }

  // Merge guest cart with user cart on login
  static async mergeGuestCart(userId, guestCartItems) {
    try {
      const mergeResults = [];

      for (const guestItem of guestCartItems) {
        try {
          const result = await this.addToCart(
            userId,
            guestItem.productId,
            guestItem.quantity,
            guestItem.size,
            guestItem.color
          );
          mergeResults.push({ success: true, productId: guestItem.productId });
        } catch (error) {
          mergeResults.push({ 
            success: false, 
            productId: guestItem.productId, 
            error: error.message 
          });
        }
      }

      return {
        success: true,
        mergeResults,
        message: 'Guest cart merged successfully'
      };
    } catch (error) {
      console.error('Merge guest cart error:', error.message);
      throw new Error('Failed to merge guest cart');
    }
  }

  // Save cart to session (for guest users)
  static saveCartToSession(req, cartItems) {
    try {
      if (!req.session) {
        throw new Error('Session not available');
      }

      req.session.guestCart = cartItems;
      return {
        success: true,
        message: 'Cart saved to session'
      };
    } catch (error) {
      console.error('Save cart to session error:', error.message);
      throw new Error('Failed to save cart to session');
    }
  }

  // Get cart from session (for guest users)
  static getCartFromSession(req) {
    try {
      if (!req.session || !req.session.guestCart) {
        return {
          success: true,
          items: [],
          summary: {
            item_count: 0,
            total_quantity: 0,
            subtotal: 0,
            tax: 0,
            total: 0
          }
        };
      }

      const items = req.session.guestCart;
      let subtotal = 0;
      let totalQuantity = 0;

      items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        totalQuantity += item.quantity;
      });

      return {
        success: true,
        items,
        summary: {
          item_count: items.length,
          total_quantity: totalQuantity,
          subtotal,
          tax: subtotal * 0.1,
          total: subtotal * 1.1
        }
      };
    } catch (error) {
      console.error('Get cart from session error:', error.message);
      throw new Error('Failed to get cart from session');
    }
  }

  // Clean up old cart items (maintenance task)
  static async cleanupOldCartItems(daysOld = 30) {
    try {
      const query = `
        DELETE FROM cart_items 
        WHERE created_at < NOW() - INTERVAL '${daysOld} days'
        RETURNING *
      `;

      const result = await pool.query(query);

      return {
        success: true,
        deletedCount: result.rows.length,
        message: `Cleaned up ${result.rows.length} old cart items`
      };
    } catch (error) {
      console.error('Cleanup old cart items error:', error.message);
      throw new Error('Failed to cleanup old cart items');
    }
  }

  // Get cart statistics for admin
  static async getCartStatistics() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT user_id) as users_with_carts,
          COUNT(*) as total_cart_items,
          AVG(quantity) as avg_quantity_per_item,
          SUM(ci.quantity * p.price) as total_cart_value
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE p.is_active = true
      `;

      const abandonedQuery = `
        SELECT COUNT(DISTINCT user_id) as abandoned_carts
        FROM cart_items ci
        WHERE ci.created_at < NOW() - INTERVAL '7 days'
      `;

      const topProductsQuery = `
        SELECT 
          p.name,
          p.id,
          COUNT(*) as times_added,
          SUM(ci.quantity) as total_quantity
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE p.is_active = true
        GROUP BY p.id, p.name
        ORDER BY times_added DESC
        LIMIT 10
      `;

      const [statsResult, abandonedResult, topProductsResult] = await Promise.all([
        pool.query(statsQuery),
        pool.query(abandonedQuery),
        pool.query(topProductsQuery)
      ]);

      return {
        success: true,
        statistics: {
          ...statsResult.rows[0],
          ...abandonedResult.rows[0],
          top_products: topProductsResult.rows
        }
      };
    } catch (error) {
      console.error('Get cart statistics error:', error.message);
      throw new Error('Failed to fetch cart statistics');
    }
  }

  // Apply discount to cart
  static async applyDiscount(userId, discountCode) {
    try {
      // This would integrate with a discount/coupon system
      // For now, return a placeholder response
      return {
        success: false,
        message: 'Discount system not implemented yet'
      };
    } catch (error) {
      console.error('Apply discount error:', error.message);
      throw new Error('Failed to apply discount');
    }
  }

  // Estimate shipping for cart
  static async estimateShipping(userId, shippingAddress) {
    try {
      const cartResult = await this.getCartItems(userId);
      const { items, summary } = cartResult;

      if (items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Basic shipping calculation (this would integrate with shipping providers)
      let shippingCost = 0;
      const totalWeight = items.reduce((weight, item) => weight + (item.quantity * 0.5), 0); // Assume 0.5kg per item

      if (summary.subtotal >= 100) {
        shippingCost = 0; // Free shipping over $100
      } else if (totalWeight <= 2) {
        shippingCost = 10; // Standard shipping
      } else {
        shippingCost = 15; // Heavy items
      }

      return {
        success: true,
        shipping: {
          cost: shippingCost,
          estimated_days: '3-5',
          method: 'Standard Delivery',
          free_shipping_threshold: 100,
          free_shipping_remaining: Math.max(0, 100 - summary.subtotal)
        }
      };
    } catch (error) {
      console.error('Estimate shipping error:', error.message);
      throw new Error('Failed to estimate shipping');
    }
  }
}

export default CartService;