require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path'); // ✅ Import path module

const app = express();
const PORT = 3000;

// Connect to PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, "public"))); // ✅ This now works

// Define a route for the homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Serve static files from "public" folder BEFORE defining routes
app.use(express.static(path.join(__dirname, "public")));

// Route to handle form submission
app.post('/products', async (req, res) => {
    try {
        const { 
            category_id, category_name, product_name, product_description, trade_names,
            ingredients, manufactured_by, packaging_details, how_to_use, drug_interaction,
            side_effects, warnings_precautions, withdrawal_symptoms, drug_abuse, storage
        } = req.body;

        const result = await pool.query(
            `INSERT INTO products (category_id, category_name, product_name, product_description, trade_names,
                ingredients, manufactured_by, packaging_details, how_to_use, drug_interaction,
                side_effects, warnings_precautions, withdrawal_symptoms, drug_abuse, storage)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
            [category_id, category_name, product_name, product_description, trade_names,
                ingredients, manufactured_by, packaging_details, how_to_use, drug_interaction,
                side_effects, warnings_precautions, withdrawal_symptoms, drug_abuse, storage]
        );

        res.status(201).json({ success: true, product: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// Route to fetch products
app.get('/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Define a route for the homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
