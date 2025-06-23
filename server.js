// server.js

const express = require("express");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");
const { Pool } = require("pg");
const path = require("path");
const bcrypt = require("bcrypt"); // For password hashing comparison
const jwt = require("jsonwebtoken"); // For generating authentication tokens
require("dotenv").config();
// const { use } = require("react");

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// PostgreSQL configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use connection string from the environment
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,   
});

// Middleware to assign session cookie
app.use((req, res, next) => {
  if (!req.cookies.sessionId) {
    const sessionId = uuidv4();
    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    req.cookies.sessionId = sessionId;
  }
  next();
});

// DELETE endpoint to remove an item from the cart
app.delete("/remove-from-cart", async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const { productId } = req.body;
  if (!sessionId || !productId) {
    return res
      .status(400)
      .json({ success: false, message: "Missing productId or session" });
  }
  try {
    await pool.query(
      "DELETE FROM carts WHERE session_id = $1 AND product_id = $2",
      [sessionId, productId]
    );
    res.json({ success: true, message: "Item removed from cart" });
  } catch (error) {
    console.error("Error removing cart item:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST: Add item to cart
app.post("/add-to-cart", async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const { productId, name, quantity, mg, price, image_url } = req.body;
  console.log(name);
  if (!productId) {
    return res
      .status(400)
      .json({ success: false, message: "Product ID is required" });
  }
  console.log(req.body);

  try {
    await pool.query(
      "INSERT INTO carts (session_id, product_id, name, quantity, mg, price, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        sessionId,
        productId,
        name || null,
        quantity || "1",
        mg || null,
        price || null,
        image_url || null,
      ]
    );
    res.json({ success: true, message: "Product added to cart" });
  } catch (error) {
    console.error("Error inserting cart data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET: Fetch cart items
app.get("/api/cart", async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (!sessionId) {
    return res
      .status(400)
      .json({ success: false, message: "Session not found" });
  }
  try {
    const result = await pool.query(
      "SELECT * FROM carts WHERE session_id = $1",
      [sessionId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching cart data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/checkout — save user + order + items
app.post("/api/checkout", async (req, res) => {
  const {
    firstName,
    lastName,
    phone,
    email,
    companyName,
    country,
    billingStreetAddress,
    apartment,
    billingCity,
    billingState,
    billingZip,
    cartItems,
    shippingCost,
    totalCost,
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
      [
        firstName,
        lastName,
        email,
        phone,
        companyName || null,
        country,
        billingStreetAddress,
        apartment || null,
        billingCity,
        billingState,
        billingZip,
      ]
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
        item.price,
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
app.get("/api/invoice/:orderId", async (req, res) => {
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
    console.error("Error fetching invoice data:", err);
    res.status(500).json({ error: "Failed to fetch invoice data" });
  }
});

const JWT_SECRET = "3db7f92394dfb627bdbe12fbfc34f63b2f9c2296da88c4c3dfbf9eb48b8a5e29a81f1df435ad8abfe3dc9a4edcd45f71d8fb5e38d6c93ed2f5f8451b5b9e2565";

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Input validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    // Check if the user exists in the database
    const result = await pool.query('SELECT * FROM employee_login WHERE username = $1', [username]);
    
    // Debug logging - log the actual rows data
    // console.log('Query result rows:', result.rows);
    // console.log('Number of rows found:', result.rows.length);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    // console.log('User found:', { id: user.id, username: user.username });
    // console.log('User Password ',user.password);
    // Compare the password with the hashed password in the database
    // const isPasswordValid = await bcrypt.compare(password, user.password);
    // console.log('Password validation result:', isPasswordValid);
    let isPasswordValid ;
    if(password === user.password){
       isPasswordValid = true;
      
    }
    else{
       isPasswordValid = false;
    }
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Create a JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username }, 
      JWT_SECRET, 
      { expiresIn: '1h' }
    );

    // Return the token to the client
    res.json({ 
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
    
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/product?product_ID=5
app.get("/api/product", async (req, res) => {
  const { product_ID } = req.query;
  if (!product_ID) return res.status(400).json({ error: "product_ID missing" });

  try {
    // 1) fetch the main product row
    const prodRes = await pool.query(
      "SELECT * FROM products WHERE product_id = $1",
      [product_ID]
    );
    if (!prodRes.rows.length)
      return res.status(404).json({ error: "not found" });

    // 2) fetch its variants
    const varRes = await pool.query(
      "SELECT * FROM product_variants WHERE product_id = $1",
      [product_ID]
    );

    // 3) return both
    res.json({
      product: prodRes.rows[0],
      variants: varRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

// GET all variants for a product
app.get('/api/variants/:productId', async (req, res) => {
  const { productId } = req.params;
  const { rows } = await pool.query(
    `SELECT * FROM product_variants WHERE product_id = $1 ORDER BY variation_id`,
    [productId]
  );
  res.json(rows);
});

// PUT update one variant
app.put('/api/variants/:id', async (req, res) => {
  const { id } = req.params;
  const { unit_type, unit_value, qty, price_per_pill, price_per_box, delivery_time } = req.body;
  await pool.query(
    `UPDATE product_variants
     SET unit_type=$1, unit_value=$2, qty=$3, price_per_pill=$4, price_per_box=$5, delivery_time=$6
     WHERE variation_id=$7`,
    [unit_type, unit_value, qty, price_per_pill, price_per_box, delivery_time, id]
  );
  res.json({ success: true });
});

// POST a brand‑new variant
app.post('/api/variants', async (req, res) => {
  const { product_id, unit_type, unit_value, qty, price_per_pill, price_per_box, delivery_time } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO product_variants
      (product_id, unit_type, unit_value, qty, price_per_pill, price_per_box, delivery_time)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [product_id, unit_type, unit_value, qty, price_per_pill, price_per_box, delivery_time]
  );
  res.json(rows[0]);
});

// DELETE a single variation by its variation_id
app.delete('/api/variants/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM product_variants WHERE variation_id = $1',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Variation not found' });
    }
    res.json({ message: 'Variation deleted' });
  } catch (err) {
    console.error('Error deleting variation:', err);
    res.status(500).json({ error: 'Failed to delete variation' });
  }
});


// Update product endpoint
app.put('/api/products/update/:id', async (req, res) => {
  const { id } = req.params; // Product ID from URL
  const updates = req.body; // Updated fields from request body

  try {
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    // Build dynamic SQL query
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

    const query = `UPDATE products SET ${setClause} WHERE product_id = $${fields.length + 1}`;
    values.push(id);

    // Execute query
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found or no changes made.' });
    }

    res.json({ message: 'Product updated successfully.' });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});




app.post("/api/products/search", async (req, res) => {
  const { id, name } = req.body;

  console.log(name);
  try {
    if (!id && !name) {
      return res
        .status(400)
        .json({ error: "Please provide either Product ID or Product Name." });
    }

    let query;
    let values;

    if (id) {
      query = "SELECT * FROM products WHERE product_id = $1  ";
      values = [id];
    } else {
      query = "SELECT * FROM products WHERE LOWER(product_name) = LOWER($1)";
      values = [name];
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found." });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: "Failed to fetch product." });
  }
});

app.post("/api/set_products", async (req, res) => {
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
      )`,
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

    res.json({
      success: true,
      message: "Product saved successfully!",
      product: result.rows[0],
    });
  } catch (err) {
    console.error("Error saving product:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/products/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Replace with your database query logic
    const result = await db.query("DELETE FROM products WHERE product_id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// API to fetch products based on category
app.get("/products", async (req, res) => {
  const categoryID = req.query.categoryID || "all";
  try {
    let query;
    let params = [];
    if (categoryID === "all") {
      query = "SELECT * FROM products ORDER BY product_name";
    } else {
      query = "SELECT * FROM products WHERE category_id = $1 ORDER BY product_name";
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
app.get("/api/requests", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM orders"); // Adjust query for your table schema
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/requests/:orderId
app.delete("/api/requests/:orderId", async (req, res) => {
  const { orderId } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) delete all items for that order
    await client.query("DELETE FROM order_items WHERE order_id = $1", [
      orderId,
    ]);

    // 2) delete the order itself
    await client.query("DELETE FROM orders WHERE order_id = $1", [orderId]);

    await client.query("COMMIT");
    res.json({ success: true, message: "Order and its items deleted." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error deleting request:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// Endpoint to fetch order items by order_id
app.get("/api/order-items/:order_id", async (req, res) => {
  const { order_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM order_items WHERE order_id = $1",
      [order_id]
    ); // Adjust query for your schema
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET customer by ID
app.get("/api/customers/:id", async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const result = await pool.query("SELECT * FROM customers WHERE id = $1", [
      id,
    ]);
    if (!result.rows.length) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Page routes
app.get("/product_overview", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "product_overview.html"));
});

app.get("/cart", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cart.html"));
});

app.get("/employee", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "employee.html"));
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
