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
// pool.query(`
//   CREATE TABLE IF NOT EXISTS carts (
//     id SERIAL PRIMARY KEY,
//     session_id VARCHAR(255) NOT NULL,
//     product_id VARCHAR(50) NOT NULL,
//     name VARCHAR(100),
//     quantity VARCHAR(20) DEFAULT '1',
//     mg VARCHAR(20),
//     price VARCHAR(20),
//     image_url VARCHAR(255),
//     added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//   );
// `, (err) => {
//   if (err) {
//     console.error('Error creating carts table:', err);
//   } else {
//     console.log('Carts table is ready.');
//   }
// });

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
 console.log(name);
  if (!productId) {
    return res.status(400).json({ success: false, message: 'Product ID is required' });
  }
  console.log(req.body);

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


// // add in server.js
// // checkout API
// app.post('/api/checkout', async (req, res) => {
//   const client = await pool.connect();
//   try {
//     const {
//       firstName,
//       lastName,
//       phone,
//       email,
//       companyName,
//       country,
//       streetAddress,
//       apartment,
//       city,
//       state,
//       zipCode,
//       differentAddress,
//       shippingAddress
//     } = req.body;

//     // Create or fetch user
//     let userResult = await client.query(
//       `INSERT INTO users (first_name, last_name, email, phone, address, country, role)
//        VALUES ($1, $2, $3, $4, $5, $6, 'Client')
//        ON CONFLICT (email) DO UPDATE SET phone = $4 RETURNING user_id`,
//       [firstName, lastName, email, phone, streetAddress, country]
//     );
//     const userId = userResult.rows[0].user_id;

//     const orderResult = await client.query(
//       `INSERT INTO orders (client_id, total_amount, payment_status)
//        VALUES ($1, $2, $3) RETURNING order_id, created_at`,
//       [userId, totalAmount, totalAmount <= 200 ? 'Pay Later' : 'Paid']
//     );

//     const orderId = orderResult.rows[0].order_id;

//     // Fetch cart items for the session
//     const cartItemsResult = await client.query(
//       'SELECT * FROM carts WHERE session_id = $1',
//       [req.cookies.sessionId]
//     );
    
//     let totalAmount = 0;
//     for (const item of cartItemsResult.rows) {
//       const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
//       totalAmount += itemTotal;
    
//       await client.query(
//         `INSERT INTO order_items (order_id, variation_id, quantity, price)
//          VALUES ($1, $2, $3, $4)`,
//         [orderId, item.product_id, item.quantity, itemTotal]
//       );
//     }
    
//     // Clear cart after order placed
//     await client.query('DELETE FROM carts WHERE session_id = $1', [req.cookies.sessionId]);
    
    
//         return res.status(200).json({
//           orderNumber: orderId,
//           orderDate: orderResult.rows[0].created_at,
//           email,
//           totalAmount
//         });
//       } catch (err) {
//         console.error('Error in checkout:', err);
//         res.status(500).json({ message: 'Internal Server Error' });
//       } finally {
//         client.release();
//       }
//     });
    
// POST /api/checkout — save user + order + items
app.post("/api/checkout", async (req, res) => {
  const {
    firstName, lastName, phone, email, companyName,
    country, billingStreetAddress, apartment,
    billingCity, billingState, billingZip,
    cartItems, shippingCost, totalCost
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) insert or find user
    const userRes = await client.query(
      `INSERT INTO users (
         first_name,last_name,email,phone,company,country,
         street,apartment,city,state,zip_code
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (email) DO UPDATE SET phone=EXCLUDED.phone
       RETURNING user_id`,
      [firstName, lastName, email, phone, companyName || null, country,
       billingStreetAddress, apartment || null,
       billingCity, billingState, billingZip]
    );
    const userId = userRes.rows[0].user_id;

    // 2) insert order
    const orderRes = await client.query(
      `INSERT INTO orders (user_id, total_amount, shipping)
       VALUES ($1,$2,$3) RETURNING order_id`,
      [userId, totalCost, shippingCost]
    );
    const orderId = orderRes.rows[0].order_id;

    // 3) insert items
    const insertItemText = `
      INSERT INTO order_items
        (order_id, product_id, name, mg, quantity, price)
      VALUES ($1,$2,$3,$4,$5,$6)
    `;
    for (const item of cartItems) {
      await client.query(insertItemText, [
        orderId,
        item.product_id,
        item.name,
        item.mg,
        item.quantity,
        item.price
      ]);
    }

    await client.query("COMMIT");
    res.json({ success: true, orderId });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Checkout error:", e);
    res.status(500).json({ success: false, error: "Server error" });
  } finally {
    client.release();
  }
});

// assume you already have `const pool = new Pool({...})`

// in server.js, after your other routes:

// GET /api/product?product_ID=5
app.get('/api/product', async (req, res) => {
  const { product_ID } = req.query;
  if (!product_ID) return res.status(400).json({ error: 'product_ID missing' });

  try {
    // 1) fetch the main product row
    const prodRes = await pool.query(
      `SELECT * FROM products WHERE product_id = $1`,
      [product_ID]
    );
    if (!prodRes.rows.length) return res.status(404).json({ error: 'not found' });

    // 2) fetch its variants
    const varRes = await pool.query(
      `SELECT * FROM product_variants WHERE product_id = $1`,
      [product_ID]
    );
    
    // 3) return both
    res.json({
      product:  prodRes.rows[0],
      variants: varRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});



// API to fetch products based on category
app.get("/products", async (req, res) => {
  const categoryID = req.query.categoryID || "all";
  try {
    let query;
    let params = [];
    if (categoryID === "all") {
      query = "SELECT * FROM products";
    } else {
      query = "SELECT * FROM products WHERE category_id = $1";
      params = [categoryID];
    }

    const result = await pool.query(query, params);
    
    res.json(result.rows);

  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API to fetch product prices
app.get("/product-prices", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM product_variants");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching product prices:", error);
    res.status(500).json({ error: "Internal server error" });
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
