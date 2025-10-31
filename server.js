import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import session from 'express-session';
import { testConnection } from './config/database.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import checkoutRoutes from './routes/checkout.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import inventoryRoutes from './routes/inventory.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { securityHeaders, sanitizeInput, generalLimiter, authLimiter } from './middleware/security.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Test database connection on startup
testConnection();

// Security middleware
app.use(securityHeaders);
app.use(generalLimiter);
app.use(sanitizeInput);

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Routes
app.use('/api/auth', authLimiter); // Rate limit auth endpoints
app.use('/', authRoutes);
app.use('/', productRoutes);
app.use('/', cartRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/orders', orderRoutes);
app.use('/', adminRoutes);
app.use('/api', inventoryRoutes);

// Favicon route
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Health check route
app.get('/health', async (req, res) => {
    try {
        const { pool } = await import('./config/database.js');
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', database: 'disconnected', error: error.message, timestamp: new Date().toISOString() });
    }
});

// Public routes
app.get('/', async (req, res) => {
   try {
        console.log('Server is running ... Waiting for the magic to happen');
        res.render('index', {
            title: 'AfriGlam',
            user: req.session?.userId ? { id: req.session.userId } : null
        });
    } catch (err) {
        console.error('Server failed', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/shop', async (req, res) => {
    try {
        console.log('Redirecting to shop page ....');
        res.render('shop', {
            title: 'AfriGlam',
            user: req.session?.userId ? { id: req.session.userId } : null
        });
    } catch (err) {
        console.error('Server failed', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/about', async (req, res) => {
    try {
        console.log('Redirecting to About page ....');
        res.render('about', {
            title: 'AfriGlam',
            user: req.session?.userId ? { id: req.session.userId } : null
        });
    } catch (err) {
        console.error('Server failed', err);
        res.status(500).send('Internal Server Error');
    }
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
})