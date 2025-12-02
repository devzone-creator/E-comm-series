import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import prisma from './config/database.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import checkoutRoutes from './routes/checkout.js';
import adminRoutes from './routes/admin.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { securityHeaders, sanitizeInput, generalLimiter, authLimiter } from './middleware/security.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Test database connection on startup
if (process.env.NODE_ENV !== 'test') {
    prisma.$connect().catch(err => console.error('Database connection failed:', err));
}

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security middleware
app.use(securityHeaders);
app.use(generalLimiter);
app.use(sanitizeInput);

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(morgan('dev'));
// Capture raw body for webhook signature verification and parse JSON/urlencoded bodies
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test_secret' : undefined),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/admin', adminRoutes);

// Favicon route
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Health check route
app.get('/health', async (req, res) => {
    if (process.env.NODE_ENV === 'test') {
        return res.json({ status: 'healthy', database: 'skipped-for-test', timestamp: new Date().toISOString() });
    }

    try {
        await prisma.$queryRaw`SELECT 1`;
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

// Only start the server when not running tests. Tests will import `app` directly.
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
    });
}

export default app;