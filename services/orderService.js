import db from '../config/db-utils.js';
import CartService from './cartService.js';
import InventoryService from './inventoryService.js';

class OrderService {
  // Create new order from cart with validation
  static async createOrder(userId, orderData) {
    try {
      const { shippingAddress, paymentMethod, notes = null } = orderData;

      if (!shippingAddress || !paymentMethod) {
        throw new Error('Shipping address and payment method are required');
      }

      return await db.transaction(async (client) => {
        // Get user's cart
        const cartResult = await client.query(
          'SELECT * FROM carts WHERE user_id = $1 AND status = $2',
          [userId, 'active']
        );

        if (cartResult.rows.length === 0) {
          throw new Error('No active cart found');
        }

        const cart = cartResult.rows[0];

        // Get cart items with product details
        const itemsResult = await client.query(
          `SELECT ci.*, p.name, p.price, p.stock_quantity, p.is_active
           FROM cart_items ci
           JOIN products p ON ci.product_id = p.id
           WHERE ci.cart_id = $1`,
          [cart.id]
        );

        if (itemsResult.rows.length === 0) {
          throw new Error('Cart is empty');
        }

        const cartItems = itemsResult.rows;

        // Validate stock availability
        for (const item of cartItems) {
          if (!item.is_active) {
            throw new Error(`Product ${item.name} is no longer available`);
          }
          if (item.stock_quantity < item.quantity) {
            throw new Error(`Insufficient stock for ${item.name}`);
          }
        }

        // Calculate totals
        const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxRate = 0.1; // 10% tax
        const taxAmount = subtotal * taxRate;
        const shippingAmount = subtotal >= 100 ? 0 : 15; // Free shipping over $100
        const totalAmount = subtotal + taxAmount + shippingAmount;

        // Generate order number
        const orderNumber = await this.generateOrderNumber();

        // Create order
        const orderResult = await client.query(
          `INSERT INTO orders (user_id, order_number, status, payment_status, subtotal, 
           tax_amount, shipping_amount, total_amount, shipping_address, payment_method, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) RETURNING *`,
          [userId, orderNumber, 'pending', 'pending', subtotal, taxAmount, shippingAmount, 
           totalAmount, JSON.stringify(shippingAddress), paymentMethod, notes]
        );

        const order = orderResult.rows[0];

        // Create order items and reserve stock
        for (const item of cartItems) {
          // Create order item
          await client.query(
            `INSERT INTO order_items (order_id, product_id, quantity, price, size, color, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [order.id, item.product_id, item.quantity, item.price, item.size, item.color]
          );

          // Reserve stock
          await client.query(
            'UPDATE products SET reserved_quantity = COALESCE(reserved_quantity, 0) + $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }

        // Clear cart
        await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
        await client.query('UPDATE carts SET status = $1, updated_at = NOW() WHERE id = $2', ['completed', cart.id]);

        return {
          success: true,
          order,
          message: 'Order created successfully'
        };
      });
    } catch (error) {
      console.error('Create order error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to create order'
      };
    }
  }

  // Update order status with validation
  static async updateOrderStatus(orderId, status, notes = null, userId = null) {
    try {
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid order status');
      }

      return await db.transaction(async (client) => {
        // Get current order
        let query = 'SELECT * FROM orders WHERE id = $1';
        let params = [orderId];
        
        if (userId) {
          query += ' AND user_id = $2';
          params.push(userId);
        }

        const orderResult = await client.query(query, params);
        
        if (orderResult.rows.length === 0) {
          throw new Error('Order not found');
        }

        const currentOrder = orderResult.rows[0];

        // Validate status transition
        if (!this.isValidStatusTransition(currentOrder.status, status)) {
          throw new Error(`Cannot change status from ${currentOrder.status} to ${status}`);
        }

        // Handle cancellation - restore stock
        if (status === 'cancelled' && currentOrder.status !== 'cancelled') {
          await this.restoreOrderStock(client, orderId);
        }

        // Update order
        const updateResult = await client.query(
          `UPDATE orders SET status = $1, status_updated_at = NOW(), updated_at = NOW()
           ${notes ? ', notes = $3' : ''} WHERE id = $2 RETURNING *`,
          notes ? [status, orderId, notes] : [status, orderId]
        );

        return {
          success: true,
          order: updateResult.rows[0],
          message: `Order status updated to ${status}`
        };
      });
    } catch (error) {
      console.error('Update order status error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to update order status'
      };
    }
  }

  // Cancel order with stock restoration
  static async cancelOrder(orderId, reason = null, userId = null) {
    try {
      return await db.transaction(async (client) => {
        // Get order
        let query = 'SELECT * FROM orders WHERE id = $1';
        let params = [orderId];
        
        if (userId) {
          query += ' AND user_id = $2';
          params.push(userId);
        }

        const orderResult = await client.query(query, params);
        
        if (orderResult.rows.length === 0) {
          throw new Error('Order not found');
        }

        const order = orderResult.rows[0];

        if (order.status === 'cancelled') {
          throw new Error('Order is already cancelled');
        }

        if (['shipped', 'delivered'].includes(order.status)) {
          throw new Error('Cannot cancel shipped or delivered orders');
        }

        // Restore stock
        await this.restoreOrderStock(client, orderId);

        // Update order status
        await client.query(
          `UPDATE orders SET status = $1, cancellation_reason = $2, 
           status_updated_at = NOW(), updated_at = NOW() WHERE id = $3`,
          ['cancelled', reason, orderId]
        );

        return {
          success: true,
          message: 'Order cancelled successfully'
        };
      });
    } catch (error) {
      console.error('Cancel order error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to cancel order'
      };
    }
  }

  // Get order by ID with items
  static async getOrderById(orderId, userId = null) {
    try {
      let query = `
        SELECT o.*, u.first_name, u.last_name, u.email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = $1
      `;
      let params = [orderId];

      if (userId) {
        query += ' AND o.user_id = $2';
        params.push(userId);
      }

      const orderResult = await db.query(query, params);
      
      if (orderResult.rows.length === 0) {
        return {
          success: false,
          error: 'Order not found'
        };
      }

      const order = orderResult.rows[0];

      // Get order items
      const itemsResult = await db.query(
        `SELECT oi.*, p.name as product_name, p.images
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [orderId]
      );

      return {
        success: true,
        order: {
          ...order,
          items: itemsResult.rows
        }
      };
    } catch (error) {
      console.error('Get order error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get order'
      };
    }
  }

  // Get user orders with pagination
  static async getUserOrders(userId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const ordersResult = await db.query(
        `SELECT o.*, COUNT(oi.id) as item_count
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         WHERE o.user_id = $1
         GROUP BY o.id
         ORDER BY o.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const countResult = await db.query(
        'SELECT COUNT(*) as total FROM orders WHERE user_id = $1',
        [userId]
      );

      return {
        success: true,
        orders: ordersResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      };
    } catch (error) {
      console.error('Get user orders error:', error.message);
      return {
        success: false,
        error: 'Failed to get user orders'
      };
    }
  }

  // Get all orders for admin with filters
  static async getAllOrders(page = 1, limit = 20, status = null) {
    try {
      const offset = (page - 1) * limit;
      let whereClause = '';
      let params = [limit, offset];

      if (status) {
        whereClause = 'WHERE o.status = $3';
        params.push(status);
      }

      const query = `
        SELECT o.*, u.first_name, u.last_name, u.email, COUNT(oi.id) as item_count
        FROM orders o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        ${whereClause}
        GROUP BY o.id, u.first_name, u.last_name, u.email
        ORDER BY o.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const ordersResult = await db.query(query, params);

      const countQuery = `SELECT COUNT(*) as total FROM orders o ${whereClause}`;
      const countParams = status ? [status] : [];
      const countResult = await db.query(countQuery, countParams);

      return {
        success: true,
        orders: ordersResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      };
    } catch (error) {
      console.error('Get all orders error:', error.message);
      return {
        success: false,
        error: 'Failed to get orders'
      };
    }
  }

  // Get order statistics
  static async getOrderStatistics() {
    try {
      const statsResult = await db.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as average_order_value
        FROM orders 
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      return {
        success: true,
        stats: statsResult.rows[0]
      };
    } catch (error) {
      console.error('Get order statistics error:', error.message);
      return {
        success: false,
        error: 'Failed to get order statistics'
      };
    }
  }

  // Helper methods
  static async generateOrderNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp.slice(-8)}-${random}`;
  }

  static isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': [],
      'cancelled': []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  static async restoreOrderStock(client, orderId) {
    // Get order items
    const itemsResult = await client.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
      [orderId]
    );

    // Restore stock for each item
    for (const item of itemsResult.rows) {
      await client.query(
        `UPDATE products 
         SET reserved_quantity = GREATEST(COALESCE(reserved_quantity, 0) - $1, 0)
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }
  }
}

export default OrderService;