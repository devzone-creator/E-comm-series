import db from '../config/db-utils.js';

class CartSessionService {
  // Create or get cart for user session
  static async getOrCreateCart(userId, sessionId = null) {
    try {
      let cart;
      
      if (userId) {
        // For logged-in users, find cart by user_id
        const result = await db.query(
          'SELECT * FROM carts WHERE user_id = $1 AND status = $2',
          [userId, 'active']
        );
        cart = result.rows[0];
      } else if (sessionId) {
        // For guest users, find cart by session_id
        const result = await db.query(
          'SELECT * FROM carts WHERE session_id = $1 AND status = $2',
          [sessionId, 'active']
        );
        cart = result.rows[0];
      }

      // Create new cart if none exists
      if (!cart) {
        const insertResult = await db.query(
          `INSERT INTO carts (user_id, session_id, status, created_at, updated_at) 
           VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
          [userId || null, sessionId || null, 'active']
        );
        cart = insertResult.rows[0];
      }

      return {
        success: true,
        cart
      };
    } catch (error) {
      console.error('Get or create cart error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get or create cart'
      };
    }
  }

  // Merge guest cart with user cart on login
  static async mergeGuestCartWithUserCart(userId, sessionId) {
    try {
      return await db.transaction(async (client) => {
        // Get guest cart
        const guestCartResult = await client.query(
          'SELECT * FROM carts WHERE session_id = $1 AND status = $2',
          [sessionId, 'active']
        );
        const guestCart = guestCartResult.rows[0];

        if (!guestCart) {
          return { success: true, message: 'No guest cart to merge' };
        }

        // Get or create user cart
        let userCartResult = await client.query(
          'SELECT * FROM carts WHERE user_id = $1 AND status = $2',
          [userId, 'active']
        );
        let userCart = userCartResult.rows[0];

        if (!userCart) {
          // Create user cart
          const createResult = await client.query(
            `INSERT INTO carts (user_id, status, created_at, updated_at) 
             VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
            [userId, 'active']
          );
          userCart = createResult.rows[0];
        }

        // Get guest cart items
        const guestItemsResult = await client.query(
          'SELECT * FROM cart_items WHERE cart_id = $1',
          [guestCart.id]
        );
        const guestItems = guestItemsResult.rows;

        // Merge items into user cart
        for (const item of guestItems) {
          // Check if item already exists in user cart
          const existingItemResult = await client.query(
            `SELECT * FROM cart_items 
             WHERE cart_id = $1 AND product_id = $2 AND size = $3 AND color = $4`,
            [userCart.id, item.product_id, item.size, item.color]
          );
          const existingItem = existingItemResult.rows[0];

          if (existingItem) {
            // Update quantity
            await client.query(
              `UPDATE cart_items 
               SET quantity = quantity + $1, updated_at = NOW() 
               WHERE id = $2`,
              [item.quantity, existingItem.id]
            );
          } else {
            // Add new item
            await client.query(
              `INSERT INTO cart_items (cart_id, product_id, quantity, price, size, color, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
              [userCart.id, item.product_id, item.quantity, item.price, item.size, item.color]
            );
          }
        }

        // Delete guest cart and items
        await client.query('DELETE FROM cart_items WHERE cart_id = $1', [guestCart.id]);
        await client.query('DELETE FROM carts WHERE id = $1', [guestCart.id]);

        // Update user cart timestamp
        await client.query(
          'UPDATE carts SET updated_at = NOW() WHERE id = $1',
          [userCart.id]
        );

        return {
          success: true,
          message: 'Guest cart merged successfully',
          cartId: userCart.id
        };
      });
    } catch (error) {
      console.error('Merge cart error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to merge carts'
      };
    }
  }

  // Transfer cart from session to user on login
  static async transferCartToUser(userId, sessionId) {
    try {
      const result = await db.query(
        `UPDATE carts 
         SET user_id = $1, session_id = NULL, updated_at = NOW() 
         WHERE session_id = $2 AND status = $3 RETURNING *`,
        [userId, sessionId, 'active']
      );

      if (result.rows.length === 0) {
        return { success: true, message: 'No cart to transfer' };
      }

      return {
        success: true,
        message: 'Cart transferred successfully',
        cart: result.rows[0]
      };
    } catch (error) {
      console.error('Transfer cart error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to transfer cart'
      };
    }
  }

  // Persist cart for logged-in user
  static async persistUserCart(userId, cartData) {
    try {
      return await db.transaction(async (client) => {
        // Get or create user cart
        let cartResult = await client.query(
          'SELECT * FROM carts WHERE user_id = $1 AND status = $2',
          [userId, 'active']
        );
        let cart = cartResult.rows[0];

        if (!cart) {
          const createResult = await client.query(
            `INSERT INTO carts (user_id, status, created_at, updated_at) 
             VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
            [userId, 'active']
          );
          cart = createResult.rows[0];
        }

        // Clear existing cart items
        await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);

        // Add new cart items
        for (const item of cartData.items || []) {
          await client.query(
            `INSERT INTO cart_items (cart_id, product_id, quantity, price, size, color, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
            [cart.id, item.product_id, item.quantity, item.price, item.size || null, item.color || null]
          );
        }

        // Update cart timestamp
        await client.query(
          'UPDATE carts SET updated_at = NOW() WHERE id = $1',
          [cart.id]
        );

        return {
          success: true,
          message: 'Cart persisted successfully',
          cartId: cart.id
        };
      });
    } catch (error) {
      console.error('Persist cart error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to persist cart'
      };
    }
  }

  // Synchronize cart across sessions
  static async synchronizeCart(userId, sessionCart) {
    try {
      // Get user's persistent cart
      const userCartResult = await this.getOrCreateCart(userId);
      if (!userCartResult.success) {
        return userCartResult;
      }

      const userCart = userCartResult.cart;

      // Get user cart items
      const itemsResult = await db.query(
        `SELECT ci.*, p.name as product_name, p.price as current_price 
         FROM cart_items ci 
         JOIN products p ON ci.product_id = p.id 
         WHERE ci.cart_id = $1`,
        [userCart.id]
      );

      return {
        success: true,
        cart: {
          ...userCart,
          items: itemsResult.rows
        }
      };
    } catch (error) {
      console.error('Synchronize cart error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to synchronize cart'
      };
    }
  }

  // Clean up expired carts
  static async cleanupExpiredCarts(expirationHours = 24) {
    try {
      const expirationTime = new Date(Date.now() - expirationHours * 60 * 60 * 1000);
      
      return await db.transaction(async (client) => {
        // Get expired carts
        const expiredCartsResult = await client.query(
          `SELECT id FROM carts 
           WHERE status = $1 AND updated_at < $2 AND user_id IS NULL`,
          ['active', expirationTime]
        );

        const expiredCartIds = expiredCartsResult.rows.map(row => row.id);

        if (expiredCartIds.length === 0) {
          return { success: true, message: 'No expired carts to clean up' };
        }

        // Delete cart items
        await client.query(
          'DELETE FROM cart_items WHERE cart_id = ANY($1)',
          [expiredCartIds]
        );

        // Delete carts
        const deleteResult = await client.query(
          'DELETE FROM carts WHERE id = ANY($1)',
          [expiredCartIds]
        );

        return {
          success: true,
          message: `Cleaned up ${deleteResult.rowCount} expired carts`
        };
      });
    } catch (error) {
      console.error('Cleanup expired carts error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to cleanup expired carts'
      };
    }
  }

  // Get cart with items by cart ID
  static async getCartWithItems(cartId) {
    try {
      // Get cart
      const cartResult = await db.query(
        'SELECT * FROM carts WHERE id = $1',
        [cartId]
      );
      const cart = cartResult.rows[0];

      if (!cart) {
        return {
          success: false,
          error: 'Cart not found'
        };
      }

      // Get cart items with product details
      const itemsResult = await db.query(
        `SELECT ci.*, p.name as product_name, p.price as current_price, p.stock_quantity,
                p.images, p.is_active
         FROM cart_items ci 
         JOIN products p ON ci.product_id = p.id 
         WHERE ci.cart_id = $1 AND p.is_active = true`,
        [cartId]
      );

      return {
        success: true,
        cart: {
          ...cart,
          items: itemsResult.rows
        }
      };
    } catch (error) {
      console.error('Get cart with items error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get cart with items'
      };
    }
  }

  // Update cart expiration
  static async updateCartExpiration(cartId) {
    try {
      const result = await db.query(
        'UPDATE carts SET updated_at = NOW() WHERE id = $1 RETURNING *',
        [cartId]
      );

      return {
        success: true,
        cart: result.rows[0]
      };
    } catch (error) {
      console.error('Update cart expiration error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to update cart expiration'
      };
    }
  }
}

export default CartSessionService;