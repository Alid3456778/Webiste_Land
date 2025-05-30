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
      `INSERT INTO customers (
        first_name,last_name,email,phone,company_name,country,
        street_address,apartment,city,state,zip_code
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (email) DO UPDATE SET phone=EXCLUDED.phone
        RETURNING id`,
        [firstName, lastName, email, phone, companyName || null, country,
          billingStreetAddress, apartment || null,
          billingCity, billingState, billingZip]
        );
        const userId = userRes.rows[0].id;
        console.log(userId);

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


// Endpoint to get invoice data by order ID
app.get('/api/invoice/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {
    // Fetch order details
    const orderResult = await pool.query(
      `SELECT o.order_id, o.order_date, o.total, u.first_name, u.last_name, 
              u.email, u.phone, u.billing_address, u.billing_city, u.billing_state, 
              u.billing_zip, u.shipping_address, u.shipping_city, u.shipping_state, 
              u.shipping_zip 
       FROM orders o
       JOIN users u ON o.user_id = u.user_id
       WHERE o.order_id = $1`,
      [orderId]
    );

    const order = orderResult.rows[0];

    // Fetch order items
    const itemsResult = await pool.query(
      `SELECT product_name, price 
       FROM order_items 
       WHERE order_id = $1`,
      [orderId]
    );

    const items = itemsResult.rows;

    res.json({ order, items });
  } catch (err) {
    console.error('Error fetching invoice data:', err);
    res.status(500).json({ error: 'Failed to fetch invoice data' });
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

app.post('/api/set_products', async (req, res) => {
  const {
    category_id,
    product_name,
    product_description,
    trade_names,
    ingredients,
    manufactured_by,
    packaging_details,
    how_to_use,
    drug_interaction,
    side_effects,
    warnings_precautions,
    withdrawal_symptoms,
    drug_abuse,
    storage,
    primary_img,
    additional_img1,
    additional_img2,
    additional_img3,
    additional_img4,
    additional_img5,
    additional_img6,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO products (
    category_id, product_name, product_description, trade_names, ingredients, manufacturer, packaging,
    usage_instructions, drug_interaction, side_effects,safety, withdrawal_symptoms, drug_abuse, storage,
    image_url, addtional_img1, addtional_img2, addtional_img3, addtional_img4, addtional_img5, addtional_img6
)VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *`,
      [
        category_id,
        product_name,
        product_description,
        trade_names,
        ingredients,
        manufactured_by,
        packaging_details,
        how_to_use,
        drug_interaction,
        side_effects,
        warnings_precautions,
        withdrawal_symptoms,
        drug_abuse,
        storage,
        primary_img,
        additional_img1,
        additional_img2,
        additional_img3,
        additional_img4,
        additional_img5,
        additional_img6,
      ]
    );

    res.json({ success: true, message: 'Product saved successfully!', product: result.rows[0] });
  } catch (err) {
    console.error('Error saving product:', err);
    res.status(500).json({ success: false, error: err.message });
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

// Endpoint to fetch requests
app.get('/api/requests', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders'); // Adjust query for your table schema
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to delete a request
// app.delete('/api/requests/:id', (req, res) => {
//   const { id } = req.params;
//   const { order_id } = req.body;
//   console.log("id",id,"order id",order_id)
//   try {
//         // Delete related order_items first
//      pool.query('DELETE FROM order_items WHERE order_id = $1', [order_id]);

//     // Then delete the order
//      pool.query('DELETE FROM orders WHERE user_id = $1 AND id = $2', [id, order_id]);
// res.json({ message: 'Request deleted successfully' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });
// DELETE /api/requests/:orderId
app.delete('/api/requests/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) delete all items for that order
    await client.query(
      'DELETE FROM order_items WHERE order_id = $1',
      [orderId]
    );

    // 2) delete the order itself
    await client.query(
      'DELETE FROM orders WHERE order_id = $1',
      [orderId]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Order and its items deleted.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting request:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});


// Endpoint to fetch order items by order_id
app.get('/api/order-items/:order_id', async (req, res) => {
  const { order_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1', 
      [order_id]
    ); // Adjust query for your schema
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET customer by ID
app.get('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const result = await pool.query(
      `SELECT * FROM customers WHERE id = $1`, [id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
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

app.get('/employee', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'employee.html'));
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
