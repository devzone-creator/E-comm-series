import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import session from 'express-session';
import { testConnection } from './config/database.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Test database connection on startup
testConnection();

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
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Routes
app.use('/', authRoutes);

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

app.get('/cart', async (req, res) => {
    try {
        console.log('Redirecting to cart page ....');
        res.render('cart', {
            title: 'AfriGlam',
            user: req.session?.userId ? { id: req.session.userId } : null
        });
    } catch (err) {
        console.error('Server failed', err);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
})