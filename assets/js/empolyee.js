const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const path = require('path');

// Middleware
app.use(cors({ origin: 'http://localhost:3000' })); // Allow requests from the React frontend
app.use(bodyParser.json());
app.use(helmet());

// PostgreSQL Database Connection
const pool = new Pool({
    user: 'your_user',
    host: 'your_host',
    database: 'your_database',
    password: 'your_password',
    port: 5432,
});

// JWT Secret Key
const JWT_SECRET = 'your_jwt_secret_key';

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

// Routes

// 1. Authentication Middleware
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// 2. Authentication Endpoints
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM employees WHERE email = $1 AND password = $2',
            [email, password]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const user = result.rows[0];
        const token = jwt.sign({ id: user.employee_id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. Products CRUD Endpoints
// Get all products
app.get('/products', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add a product
app.post('/products', authenticateToken, async (req, res) => {
    const { category_id, product_name, product_description, trade_names, ingredients, manufactured_by, packaging_details, how_to_use, drug_interaction, side_effects, warnings_precautions, withdrawal_symptoms, drug_abuse, storage } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (category_id, product_name, product_description, trade_names, ingredients, manufactured_by, packaging_details, how_to_use, drug_interaction, side_effects, warnings_precautions, withdrawal_symptoms, drug_abuse, storage) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
            [category_id, product_name, product_description, trade_names, ingredients, manufactured_by, packaging_details, how_to_use, drug_interaction, side_effects, warnings_precautions, withdrawal_symptoms, drug_abuse, storage]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a product
app.put('/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { category_id, product_name, product_description, trade_names, ingredients, manufactured_by, packaging_details, how_to_use, drug_interaction, side_effects, warnings_precautions, withdrawal_symptoms, drug_abuse, storage } = req.body;
    try {
        const result = await pool.query(
            'UPDATE products SET category_id = $1, product_name = $2, product_description = $3, trade_names = $4, ingredients = $5, manufactured_by = $6, packaging_details = $7, how_to_use = $8, drug_interaction = $9, side_effects = $10, warnings_precautions = $11, withdrawal_symptoms = $12, drug_abuse = $13, storage = $14 WHERE product_id = $15 RETURNING *',
            [category_id, product_name, product_description, trade_names, ingredients, manufactured_by, packaging_details, how_to_use, drug_interaction, side_effects, warnings_precautions, withdrawal_symptoms, drug_abuse, storage, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a product
app.delete('/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM products WHERE product_id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Catch-all handler to serve React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Server Start
const PORT = 5000; // Change backend port if needed
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
