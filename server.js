// server.js

const express = require('express');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// PostgreSQL configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'postsql',
  port: 5432,
});

// Create carts table with name and image_url
pool.query(`
  CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    name VARCHAR(100),
    quantity VARCHAR(20) DEFAULT '1',
    mg VARCHAR(20),
    price VARCHAR(20),
    image_url VARCHAR(255),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`, (err) => {
  if (err) {
    console.error('Error creating carts table:', err);
  } else {
    console.log('Carts table is ready.');
  }
});

// Middleware to assign session cookie
app.use((req, res, next) => {
  if (!req.cookies.sessionId) {
    const sessionId = uuidv4();
    res.cookie('sessionId', sessionId, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
    req.cookies.sessionId = sessionId;
  }
  next();
});

// DELETE endpoint to remove an item from the cart
app.delete('/remove-from-cart', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const { productId } = req.body;
  if (!sessionId || !productId) {
    return res.status(400).json({ success: false, message: 'Missing productId or session' });
  }
  try {
    await pool.query('DELETE FROM carts WHERE session_id = $1 AND product_id = $2', [sessionId, productId]);
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// POST: Add item to cart
app.post('/add-to-cart', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const { productId, name, quantity, mg, price, image_url } = req.body;

  if (!productId) {
    return res.status(400).json({ success: false, message: 'Product ID is required' });
  }

  try {
    await pool.query(
      'INSERT INTO carts (session_id, product_id, name, quantity, mg, price, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [sessionId, productId, name || null, quantity || '1', mg || null, price || null, image_url || null]
    );
    res.json({ success: true, message: 'Product added to cart' });
  } catch (error) {
    console.error('Error inserting cart data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET: Fetch cart items
app.get('/api/cart', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'Session not found' });
  }
  try {
    const result = await pool.query('SELECT * FROM carts WHERE session_id = $1', [sessionId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching cart data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Page routes
app.get('/product_overview', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product_overview.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
