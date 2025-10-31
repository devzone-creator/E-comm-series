import { pool } from '../config/database.js';
import cartService from './cartService.js';
import DatabaseUtils from '../config/db-utils.js';

class CheckoutService {
    // Calculate order totals
    static async calculateOrderTotals(userId) {
        try {
            const cartResult = await cartService.getCartItems(userId);
            const { items, summary } = cartResult;
            
            const shipping = summary.subtotal > 100 ? 0 : 10; // Free shipping over $100
            const total = summary.subtotal + summary.tax + shipping;

            return {
                subtotal: parseFloat(summary.subtotal.toFixed(2)),
                tax: parseFloat(summary.tax.toFixed(2)),
                shipping: parseFloat(shipping.toFixed(2)),
                total: parseFloat(total.toFixed(2))
            };
        } catch (error) {
            throw new Error('Failed to calculate order totals: ' + error.message);
        }
    }

    // Validate shipping address
    static validateShippingAddress(shipping) {
        const required = ['firstName', 'lastName', 'address', 'city', 'state', 'zipCode', 'country'];
        
        for (const field of required) {
            if (!shipping[field] || shipping[field].trim() === '') {
                throw new Error(`${field} is required`);
            }
        }

        // Basic zip code validation
        if (!/^\d{5}(-\d{4})?$/.test(shipping.zipCode)) {
            throw new Error('Invalid zip code format');
        }

        return true;
    }

    // Create order
    static async createOrder(userId, orderData) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Validate cart
            const cartValidation = await cartService.validateCart(userId);
            if (!cartValidation.is_valid) {
                throw new Error('Cart contains invalid items. Please review your cart.');
            }

            const { valid_items } = cartValidation;
            
            if (valid_items.length === 0) {
                throw new Error('Cart is empty');
            }

            // Calculate totals
            const totals = await this.calculateOrderTotals(userId);

            // Generate order number
            const orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();

            // Create order
            const orderResult = await client.query(`
                INSERT INTO orders (
                    user_id, order_number, status, subtotal, tax, shipping, total,
                    shipping_first_name, shipping_last_name, shipping_address,
                    shipping_city, shipping_state, shipping_zip_code, shipping_country,
                    payment_method, created_at, updated_at
                ) VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
                RETURNING id
            `, [
                userId, orderNumber, totals.subtotal, totals.tax, totals.shipping, totals.total,
                orderData.shipping.firstName, orderData.shipping.lastName, orderData.shipping.address,
                orderData.shipping.city, orderData.shipping.state, orderData.shipping.zipCode, 
                orderData.shipping.country, orderData.payment.method
            ]);

            const orderId = orderResult.rows[0].id;

            // Move cart items to order (this handles stock updates and order items creation)
            await cartService.moveCartToOrder(userId, orderId);

            await client.query('COMMIT');

            return {
                orderId,
                orderNumber,
                total: totals.total
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Process payment (placeholder - integrate with actual payment gateway)
    static async processPayment(paymentData, amount) {
        try {
            // This is a placeholder for payment processing
            // In a real application, you would integrate with Stripe, PayPal, etc.
            
            // Basic validation
            if (!paymentData.cardNumber || !paymentData.expiryDate || !paymentData.cvv) {
                throw new Error('Invalid payment information');
            }

            // Simulate payment processing
            const success = Math.random() > 0.1; // 90% success rate for demo
            
            if (!success) {
                throw new Error('Payment failed. Please try again.');
            }

            return {
                success: true,
                transactionId: 'txn_' + Date.now(),
                amount
            };

        } catch (error) {
            throw new Error('Payment processing failed: ' + error.message);
        }
    }
}

export default CheckoutService;