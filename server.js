import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Test database connection on startup
testConnection();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(morgan('dev'));

app.get('/', async (req, res) => {
    try{
        console.log('Server is running ... Waiting for the magic to happen');
        res.render('index', {title: 'AfriGlam'});
    } catch(err){
        console.err('Server failed', err);
    };
});

app.get('/shop', async (req, res) => {
    try{
        console.log('Redirecting to shop page ....');
        res.render('shop', {title: 'AfriGlam'});
    } catch(err){
        console.err('Server failed', err);
    };
});

app.get('/about', async (req, res) => {
    try{
        console.log('Redirecting to About page ....');
        res.render('about', {title: 'AfriGlam'});
    } catch(err){
        console.err('Server failed', err);
    };
})

app.get('/cart', async (req, res) => {
    try{
        console.log('Redirecting to cart page ....');
        res.render('cart', {title: 'AfriGlam'});
    } catch(err){
        console.err('Server failed', err);
    };
})

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
})