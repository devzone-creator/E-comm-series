import express from 'express';
import authService from '../services/authService.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        const user = await authService.register({ email, password, name });
        req.session.userId = user.id;
        
        res.json({ message: 'User registered successfully', user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await authService.login(email, password);
        req.session.userId = user.id;
        
        res.json({ message: 'Logged in successfully', user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: error.message });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.json({ message: 'Logged out successfully' });
    });
});

// Get current user
router.get('/me', (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ userId: req.session.userId });
});

export default router;
