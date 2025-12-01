import express from 'express';
import Stripe from 'stripe';
import DatabaseUtils from '../config/db-utils.js';
import EmailService from '../services/emailService.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET || '', { apiVersion: '2022-11-15' });

// Stripe webhook endpoint
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!req.rawBody) {
    console.error('Raw body missing for Stripe webhook');
    return res.status(400).send('Raw body required');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata || {};
    const orderId = metadata.orderId;
    const orderNumber = metadata.orderNumber;

    try {
      // Find order and update status
      const order = orderId ? await DatabaseUtils.findOne('orders', { id: orderId }) : await DatabaseUtils.findOne('orders', { order_number: orderNumber });
      if (!order) {
        console.warn('Order not found for webhook metadata', metadata);
        return res.status(200).send('Order not found');
      }

      await DatabaseUtils.update('orders', { payment_status: 'paid', status: 'confirmed' }, { id: order.id });

      // Send receipt emails
      try {
        const customer = order.user_id ? await DatabaseUtils.findOne('users', { id: order.user_id }) : null;
        const shopEmail = process.env.STORE_EMAIL || process.env.ADMIN_EMAIL || 'owner@afriglam.com';
        const subject = `Payment received — Order ${order.order_number}`;
        const html = `<p>We received payment for order <strong>${order.order_number}</strong>.</p><p>Amount: <strong>${(session.amount_total || 0) / 100}</strong> ${session.currency || ''}</p><p>Transaction id: <strong>${session.payment_intent}</strong></p>`;

        if (customer && customer.email) await EmailService.sendSimpleEmail(customer.email, subject, html);
        await EmailService.sendSimpleEmail(shopEmail, subject, html);
      } catch (emailErr) {
        console.error('Failed to send receipt emails:', emailErr.message);
      }
    } catch (err) {
      console.error('Failed to handle checkout.session.completed webhook:', err.message);
      return res.status(500).send('Webhook handling failed');
    }
  }

  res.status(200).json({ received: true });
});

export default router;
