// server.js

const express = require("express");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");
const { Pool } = require("pg");
const path = require("path");
const bcrypt = require("bcrypt"); // For password hashing comparison
const jwt = require("jsonwebtoken"); // For generating authentication tokens
require("dotenv").config();
const nodemailer = require("nodemailer");
// const fetch = require("node-fetch");
const axios = require("axios");
 

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// PostgreSQL configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use connection string from the environment
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

const JWT_SECRET2 = process.env.JWT_SECRET;


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
  const { id } = req.body;

  try {
    const result = await pool.query("DELETE FROM carts WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, message: "Product removed successfully" });
  } catch (err) {
    console.error("Error removing product from cart:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST: Add item to cart
app.post("/add-to-cart", async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const { productId, categoryId, name, quantity, mg, price, image_url } =
    req.body;
  console.log(name);
  if (!productId) {
    return res
      .status(400)
      .json({ success: false, message: "Product ID is required" });
  }
  console.log(req.body);

  try {
    await pool.query(
      "INSERT INTO carts (session_id, product_id, name, quantity, mg, price, image_url,category_id) VALUES ($1, $2, $3, $4, $5, $6, $7,$8)",
      [
        sessionId,
        productId,
        name || null,
        quantity || "1",
        mg || null,
        price || null,
        image_url || null,
        categoryId,
      ]
    );
    res.json({ success: true, message: "Product added to cart" });
  } catch (error) {
    console.error("Error inserting cart data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/cart/count", async (req, res) => {
  try {
    const userId = req.cookies.sessionId; // Assume the user ID is available in the request
    const result = await pool.query(
      "SELECT COUNT(*) AS count FROM carts WHERE session_id = $1",
      [userId]
    );
    const count = result.rows[0].count;

    res.json({ success: true, count });
  } catch (err) {
    console.error("Error fetching cart count:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
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

// ========================================
// UPDATED /api/checkout endpoint
// ========================================

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
  
  console.log("Checkout data received:", req.body);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Insert or update customer in customers table (master record)
    // This updates to keep latest contact info
    const userRes = await client.query(
      `INSERT INTO customers (
        first_name, last_name, email, phone, company_name, country,
        street_address, apartment, city, state, zip_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (email) 
      DO UPDATE SET 
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        company_name = EXCLUDED.company_name,
        country = EXCLUDED.country,
        street_address = EXCLUDED.street_address,
        apartment = EXCLUDED.apartment,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip_code = EXCLUDED.zip_code
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

    // 2) ✅ Insert order WITH customer snapshot
    // This preserves the customer data as it was at order time
    const orderRes = await client.query(
      `INSERT INTO orders (
        user_id, 
        total_amount, 
        shipping,
        customer_first_name,
        customer_last_name,
        customer_email,
        customer_phone,
        customer_company,
        customer_country,
        customer_street_address,
        customer_apartment,
        customer_city,
        customer_state,
        customer_zip_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING order_id`,
      [
        userId,
        totalCost,
        shippingCost,
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
    const orderId = orderRes.rows[0].order_id;

    // 3) Insert order items
    const insertItemText = `
      INSERT INTO order_items
        (order_id, product_id, name, mg, quantity, price)
      VALUES ($1, $2, $3, $4, $5, $6)
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

    // Send email
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.zoho.in",
        port: 465,
        secure: true,
        auth: {
          user: "orderconfirmation@mclandpharma.com",
          pass: "YFc3HfTpMu5S",
        },
      });

      const mailOptions = {
        from: '"Mcland Pharma" <orderconfirmation@mclandpharma.com>',
        to: email,
        subject: "Order Confirmation - Mcland Pharma",
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Order Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { font-weight: bold; font-size: 16px; }
        .footer { background-color: #f8f9fa; padding: 15px; margin-top: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Order Confirmation - Mcland Pharma</h1>
        <p>Thank you for your order, ${firstName} ${lastName}!</p>
    </div>
    <div class="content">
        <p>Your order has been successfully placed and is being processed.</p>
        <h2>Customer Information</h2>
        <table>
            <tr><td><strong>Name:</strong></td><td>${firstName} ${lastName}</td></tr>
            <tr><td><strong>Phone:</strong></td><td>${phone}</td></tr>
            <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
            <tr><td><strong>Address:</strong></td><td>${billingStreetAddress}, ${billingCity}, ${billingState}, ${billingZip}, ${country}</td></tr>
            
        </table>
        <h2>Order Summary</h2>
        <table>
            <thead>
                <tr>
                    <th>Product Name</th>
                    <th>Strength (mg)</th>
                    <th>Quantity</th>
                    <th>Price</th>
                </tr>
            </thead>
            <tbody>
                ${cartItems.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.mg}</td>
                        <td>${item.quantity}</td>
                        <td>$${parseFloat(item.price).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="total">
            <p>Shipping Cost: $${parseFloat(shippingCost).toFixed(2)}</p>
            <p>Total Amount: $${parseFloat(totalCost).toFixed(2)}</p>
        </div>
    </div>
    <div class="footer">
        <h3>Contact Information</h3>
        <p><strong>Phone:</strong> +1 209 593 7171</p>
        <p><strong>WhatsApp:</strong> +91 887 920 1044</p>
        <p><strong>Email:</strong> customerinfo2024@gmail.com</p>
        <p><em>This is an automated confirmation email.</em></p>
        <p>© ${new Date().getFullYear()} Mcland Pharma. All rights reserved.</p>
    </div>
</body>
</html>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({
        success: true,
        message: "Order placed and email sent successfully!",
        orderId: orderId,
        userId: userId
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      res.json({
        success: true,
        message: "Order placed successfully, but email notification failed.",
        orderId: orderId,
        userId: userId
      });
    }

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Checkout error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Server error during checkout",
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// ========================================
// NEW ENDPOINT: Get order with customer snapshot (with fallback)
// ========================================

app.get("/api/order-customer/:orderId", async (req, res) => {
  const { orderId } = req.params;
  
  try {
    // First, try to get customer data from order snapshot columns
    const orderResult = await pool.query(
      `SELECT 
        order_id,
        user_id,
        customer_first_name,
        customer_last_name,
        customer_email,
        customer_phone,
        customer_company,
        customer_country,
        customer_street_address,
        customer_apartment,
        customer_city,
        customer_state,
        customer_zip_code
      FROM orders 
      WHERE order_id = $1`,
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];

    // ✅ Check if order has snapshot data (customer_first_name exists means snapshot exists)
    if (order.customer_first_name && order.customer_last_name) {
      // Order has snapshot data - use it
      console.log(`Order ${orderId}: Using snapshot data`);
      return res.json({
        order_id: order.order_id,
        user_id: order.user_id,
        first_name: order.customer_first_name,
        last_name: order.customer_last_name,
        email: order.customer_email,
        phone: order.customer_phone,
        company_name: order.customer_company,
        country: order.customer_country,
        street_address: order.customer_street_address,
        apartment: order.customer_apartment,
        city: order.customer_city,
        state: order.customer_state,
        zip_code: order.customer_zip_code,
        data_source: 'snapshot'  // For debugging
      });
    } else {
      // ✅ No snapshot data - fallback to customers table
      console.log(`Order ${orderId}: No snapshot found, using customers table (user_id: ${order.user_id})`);
      
      const customerResult = await pool.query(
        `SELECT * FROM customers WHERE id = $1`,
        [order.user_id]
      );

      if (customerResult.rows.length === 0) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const customer = customerResult.rows[0];
      
      return res.json({
        order_id: order.order_id,
        user_id: order.user_id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone: customer.phone,
        company_name: customer.company_name,
        country: customer.country,
        street_address: customer.street_address,
        apartment: customer.apartment,
        city: customer.city,
        state: customer.state,
        zip_code: customer.zip_code,
        data_source: 'customers_table'  // For debugging
      });
    }
    
  } catch (err) {
    console.error("Error fetching order customer data:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ========================================
// UPDATE YOUR MODAL FUNCTION IN employee.html
// ========================================

app.post("/api/manual-order", async (req, res) => {
  const {
    userId,
    firstName,
    lastName,
    email,
    phone,
    billingStreetAddress,
    billingCity,
    billingState,
    billingZip,
    country,
    shippingCost,
    totalCost,
    cartItems
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let finalUserId = userId;

    // ✅ If no ID or invalid, create a new customer
    if (!finalUserId) {
      const newCustomer = await client.query(
        `INSERT INTO customers 
         (first_name, last_name, email, phone, street_address, city, state, zip_code, country)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [firstName, lastName, email, phone, billingStreetAddress, billingCity, billingState, billingZip, country]
      );
      finalUserId = newCustomer.rows[0].id;
    } else {
      // ✅ Update existing customer info
      await client.query(
        `UPDATE customers SET 
          first_name=$1, last_name=$2, email=$3, phone=$4,
          street_address=$5, city=$6, state=$7, zip_code=$8, country=$9
         WHERE id=$10`,
        [firstName, lastName, email, phone, billingStreetAddress, billingCity, billingState, billingZip, country, finalUserId]
      );
    }

    // ✅ Create the order
    const orderRes = await client.query(
      `INSERT INTO orders (
        user_id, total_amount, shipping,
        customer_first_name, customer_last_name, customer_email, customer_phone,
        customer_street_address, customer_city, customer_state, customer_zip_code, customer_country
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING order_id`,
      [finalUserId, totalCost, shippingCost, firstName, lastName, email, phone, billingStreetAddress, billingCity, billingState, billingZip, country]
    );

    const orderId = orderRes.rows[0].order_id;

    // ✅ Add all medicines
    for (const item of cartItems) {
      await client.query(
        `INSERT INTO order_items (order_id, name, mg, quantity, price) VALUES ($1,$2,$3,$4,$5)`,
        [orderId, item.name, item.mg, item.quantity, item.price]
      );
    }

    await client.query("COMMIT");

    // ✅ Send confirmation email
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.in",
      port: 465,
      secure: true,
      auth: { user: "orderconfirmation@mclandpharma.com", pass: "YFc3HfTpMu5S" },
    });

    // Send email
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.zoho.in",
        port: 465,
        secure: true,
        auth: {
          user: "orderconfirmation@mclandpharma.com",
          pass: "YFc3HfTpMu5S",
        },
      });

      const mailOptions = {
        from: '"Mcland Pharma" <orderconfirmation@mclandpharma.com>',
        to: email,
        subject: "Order Confirmation - Mcland Pharma",
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Order Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { font-weight: bold; font-size: 16px; }
        .footer { background-color: #f8f9fa; padding: 15px; margin-top: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Order Confirmation - Mcland Pharma</h1>
        <p>Thank you for your order, ${firstName} ${lastName}!</p>
    </div>
    <div class="content">
        <p>Your order has been successfully placed and is being processed.</p>
        <h2>Customer Information</h2>
        <table>
            <tr><td><strong>Name:</strong></td><td>${firstName} ${lastName}</td></tr>
            <tr><td><strong>Phone:</strong></td><td>${phone}</td></tr>
            <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
            <tr><td><strong>Address:</strong></td><td>${billingStreetAddress}, ${billingCity}, ${billingState}, ${billingZip}, ${country}</td></tr>
            
        </table>
        <h2>Order Summary</h2>
        <table>
            <thead>
                <tr>
                    <th>Product Name</th>
                    <th>Strength (mg)</th>
                    <th>Quantity</th>
                    <th>Price</th>
                </tr>
            </thead>
            <tbody>
                ${cartItems.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.mg}</td>
                        <td>${item.quantity}</td>
                        <td>$${parseFloat(item.price).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="total">
            <p>Shipping Cost: $${parseFloat(shippingCost).toFixed(2)}</p>
            <p>Total Amount: $${parseFloat(totalCost).toFixed(2)}</p>
        </div>
    </div>
    <div class="footer">
        <h3>Contact Information</h3>
        <p><strong>Phone:</strong> +1 209 593 7171</p>
        <p><strong>WhatsApp:</strong> +91 887 920 1044</p>
        <p><strong>Email:</strong> customerinfo2024@gmail.com</p>
        <p><em>This is an automated confirmation email.</em></p>
        <p>© ${new Date().getFullYear()} Mcland Pharma. All rights reserved.</p>
    </div>
</body>
</html>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({
        success: true,
        message: "Order placed and email sent successfully!",
        orderId: orderId,
        userId: userId
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      res.json({
        success: true,
        message: "Order placed successfully, but email notification failed.",
        orderId: orderId,
        userId: userId
      });
    }

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Manual order error:", err);
    res.status(500).json({ success: false, message: "Error creating manual order" });
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

const JWT_SECRET = JWT_SECRET2;
;

app.get("/api/order-customer/:orderId", async (req, res) => {
  const { orderId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT 
        order_id,
        user_id,
        customer_first_name AS first_name,
        customer_last_name AS last_name,
        customer_email AS email,
        customer_phone AS phone,
        customer_company AS company_name,
        customer_country AS country,
        customer_street_address AS street_address,
        customer_apartment AS apartment,
        customer_city AS city,
        customer_state AS state,
        customer_zip_code AS zip_code
      FROM orders 
      WHERE order_id = $1`,
      [orderId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching order customer data:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    // Check if the user exists in the database
    const result = await pool.query(
      "SELECT * FROM employee_login WHERE username = $1",
      [username]
    );

    // Debug logging - log the actual rows data
    // console.log('Query result rows:', result.rows);
    // console.log('Number of rows found:', result.rows.length);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = result.rows[0];
    // console.log('User found:', { id: user.id, username: user.username });
    // console.log('User Password ',user.password);
    // Compare the password with the hashed password in the database
    // const isPasswordValid = await bcrypt.compare(password, user.password);
    // console.log('Password validation result:', isPasswordValid);
    let isPasswordValid;
    if (password === user.password) {
      isPasswordValid = true;
    } else {
      isPasswordValid = false;
    }
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Create a JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Return the token to the client
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ error: "Internal server error" });
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
app.get("/api/variants/:productId", async (req, res) => {
  const { productId } = req.params;
  const { rows } = await pool.query(
    `SELECT * FROM product_variants WHERE product_id = $1 ORDER BY variation_id`,
    [productId]
  );
  res.json(rows);
});

// PUT update one variant
app.put("/api/variants/:id", async (req, res) => {
  const { id } = req.params;
  const {
    unit_type,
    unit_value,
    qty,
    price_per_pill,
    price_per_box,
    delivery_time,
  } = req.body;
  await pool.query(
    `UPDATE product_variants
     SET unit_type=$1, unit_value=$2, qty=$3, price_per_pill=$4, price_per_box=$5, delivery_time=$6
     WHERE variation_id=$7`,
    [
      unit_type,
      unit_value,
      qty,
      price_per_pill,
      price_per_box,
      delivery_time,
      id,
    ]
  );
  res.json({ success: true });
});

// POST a brand‑new variant
app.post("/api/variants", async (req, res) => {
  const {
    product_id,
    unit_type,
    unit_value,
    qty,
    price_per_pill,
    price_per_box,
    delivery_time,
  } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO product_variants
      (product_id, unit_type, unit_value, qty, price_per_pill, price_per_box, delivery_time)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      product_id,
      unit_type,
      unit_value,
      qty,
      price_per_pill,
      price_per_box,
      delivery_time,
    ]
  );
  res.json(rows[0]);
});

// DELETE a single variation by its variation_id
app.delete("/api/variants/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM product_variants WHERE variation_id = $1",
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Variation not found" });
    }
    res.json({ message: "Variation deleted" });
  } catch (err) {
    console.error("Error deleting variation:", err);
    res.status(500).json({ error: "Failed to delete variation" });
  }
});

// Update product endpoint
app.put("/api/products/update/:id", async (req, res) => {
  const { id } = req.params; // Product ID from URL
  const updates = req.body; // Updated fields from request body

  try {
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update." });
    }

    // Build dynamic SQL query
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(", ");

    const query = `UPDATE products SET ${setClause} WHERE product_id = $${
      fields.length + 1
    }`;
    values.push(id);

    // Execute query
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Product not found or no changes made." });
    }

    res.json({ message: "Product updated successfully." });
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: "Internal server error." });
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
  console.log("Received ID for deletion:", id); // Debug log

  if (isNaN(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Product ID" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM products WHERE product_id = $1",
      [id]
    );
    console.log("Query Result:", result); // Debug log

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
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
      query =
        "SELECT * FROM products WHERE category_id = $1 ORDER BY product_name";
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



app.get("/api/requests", async (req, res) => {
  try {
    //  console.log("Fetching requests...");
    const result = await pool.query(`
      SELECT 
        *
      FROM orders 
      ORDER BY created_at DESC ;
    `);
    // console.log("Orders sample:", result.rows[0]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching requests:", err);
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

// Robust search endpoint: search by firstName and/or lastName
app.get("/api/customers/search", async (req, res) => {
  const firstNameRaw = (req.query.firstName || "").trim();
  const lastNameRaw = (req.query.lastName || "").trim();

  if (!firstNameRaw && !lastNameRaw) {
    return res.status(400).json({ success: false, message: "Provide firstName or lastName (or both)" });
  }

  try {
    // Build dynamic conditions & params for orders table
    const orderWhereClauses = [];
    const orderParams = [];

    if (firstNameRaw && lastNameRaw) {
      orderParams.push(`%${firstNameRaw} ${lastNameRaw}%`);
      orderWhereClauses.push("(COALESCE(customer_first_name,'') || ' ' || COALESCE(customer_last_name,'')) ILIKE $" + orderParams.length);
    }
    if (firstNameRaw) {
      orderParams.push(`%${firstNameRaw}%`);
      orderWhereClauses.push("(COALESCE(customer_first_name,'') ILIKE $" + orderParams.length + " OR COALESCE(customer_last_name,'') ILIKE $" + orderParams.length + ")");
    }
    if (lastNameRaw) {
      orderParams.push(`%${lastNameRaw}%`);
      orderWhereClauses.push("(COALESCE(customer_first_name,'') ILIKE $" + orderParams.length + " OR COALESCE(customer_last_name,'') ILIKE $" + orderParams.length + ")");
    }

    const orderQuery = `
      SELECT DISTINCT
        COALESCE(customer_first_name, '') AS first_name,
        COALESCE(customer_last_name, '') AS last_name,
        user_id,
        customer_email AS email,
        customer_phone AS phone
      FROM orders
      WHERE ${orderWhereClauses.join(" OR ")}
      LIMIT 200
    `;

    const orderResult = await pool.query(orderQuery, orderParams);

    // Build dynamic conditions & params for customers table
    const custWhereClauses = [];
    const custParams = [];

    if (firstNameRaw && lastNameRaw) {
      custParams.push(`%${firstNameRaw} ${lastNameRaw}%`);
      custWhereClauses.push("(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) ILIKE $" + custParams.length);
    }
    if (firstNameRaw) {
      custParams.push(`%${firstNameRaw}%`);
      custWhereClauses.push("(COALESCE(first_name,'') ILIKE $" + custParams.length + " OR COALESCE(last_name,'') ILIKE $" + custParams.length + ")");
    }
    if (lastNameRaw) {
      custParams.push(`%${lastNameRaw}%`);
      custWhereClauses.push("(COALESCE(first_name,'') ILIKE $" + custParams.length + " OR COALESCE(last_name,'') ILIKE $" + custParams.length + ")");
    }

    const custQuery = `
      SELECT
        COALESCE(first_name, '') AS first_name,
        COALESCE(last_name, '') AS last_name,
        id AS user_id,
        email,
        phone
      FROM customers
      WHERE ${custWhereClauses.join(" OR ")}
      LIMIT 200
    `;
    const custResult = await pool.query(custQuery, custParams);

    // Combine results and deduplicate by "name-id"
    const combined = [...orderResult.rows, ...custResult.rows];
    const seen = new Set();
    const unique = [];

    combined.forEach((r) => {
      const fname = (r.first_name || "").trim();
      const lname = (r.last_name || "").trim();
      const id = r.user_id === null || r.user_id === undefined ? "" : String(r.user_id);
      const key = `${fname} ${lname}-${id}`.trim();

      if (!seen.has(key)) {
        seen.add(key);
        unique.push({
          first_name: fname,
          last_name: lname,
          user_id: id,
          email: r.email || null,
          phone: r.phone || null,
          source: r.user_id && r.email ? "orders/customers" : (r.email ? "customers" : "orders") // advisory
        });
      }
    });

    return res.json({ success: true, count: unique.length, data: unique });
  } catch (err) {
    console.error("Error in /api/customers/search:", err.stack || err);
    return res.status(500).json({ success: false, message: "Server error", details: err.message });
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

// 🚨 Retry route → clears cookie and re-checks
app.post("/retry", (req, res) => {
  res.clearCookie("vpn_blocked");
  // console.log("User requested retry → cookie cleared");
  res.redirect("/"); // Send back to homepage (or any safe route)
});

// Add this endpoint to your server.js file (before the "Start server" section)

// GET: Customer Order Tracking - Complete customer data with all orders
app.get("/api/customer-tracking/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // 1) Fetch customer details
    const customerResult = await pool.query(
      "SELECT * FROM customers WHERE id = $1",
      [userId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Customer not found" 
      });
    }

    const customer = customerResult.rows[0];

    // 2) Fetch all orders for this customer with timestamps
    const ordersResult = await pool.query(
      `SELECT *
       FROM orders 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    const orders = ordersResult.rows;

    // 3) For each order, fetch its items
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const itemsResult = await pool.query(
          `SELECT *
           FROM order_items 
           WHERE order_id = $1`,
          [order.order_id]
        );

        return {
          ...order,
          items: itemsResult.rows,
          itemCount: itemsResult.rows.length,
        };
      })
    );

    // 4) Calculate total lifetime value
    const totalSpent = orders.reduce(
      (sum, order) => sum + parseFloat(order.total_amount || 0),
      0
    );

    // 5) Return complete data
    res.json({
      success: true,
      data: {
        customer,
        orders: ordersWithItems,
        totalOrders: orders.length,
        totalSpent: totalSpent.toFixed(2),
      },
    });
  } catch (error) {
    console.error("Error fetching customer tracking data:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});




// PUT: Update payment status for an order
app.put("/api/orders/:orderId/payment-status", async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid payment status" 
    });
  }

  try {
    const query = status === 'completed'
      ? `UPDATE orders 
         SET payment_status = $1, payment_date = CURRENT_TIMESTAMP 
         WHERE order_id = $2 
         RETURNING *`
      : `UPDATE orders 
         SET payment_status = $1 
         WHERE order_id = $2 
         RETURNING *`;

    const result = await pool.query(query, [status, orderId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    res.json({ 
      success: true, 
      message: `Payment status updated to '${status}'`,
      order: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});

// GET: Get payment status for an order
app.get("/api/orders/:orderId/payment-status", async (req, res) => {
  const { orderId } = req.params;

  try {
    const result = await pool.query(
      `SELECT order_id, payment_status, payment_date, total_amount 
       FROM orders 
       WHERE order_id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    res.json({ 
      success: true, 
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});


 

app.post("/api/orders/:orderId/send-tracking", async (req, res) => {
  const { orderId } = req.params;
  const { trackingNumber, userId } = req.body;

  try {

   // Fetch customer email from Postgres
    const result = await pool.query(
      "SELECT email, first_name FROM customers WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const customer = result.rows[0];
    const email = customer.email;
    const name = customer.first_name;

    // Email Setup for Zoho Mail
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.in",
      port: 465,
      secure: true,
      auth: {
        user: "orderconfirmation@mclandpharma.com",
        pass: "YFc3HfTpMu5S",
      },
    });

    // Send email
    await transporter.sendMail({
      from: '"Mcland Pharma" <orderconfirmation@mclandpharma.com>',
      to: email,
      subject: "Your Order has been Shipped",
      text: `Hello ${name},\n\nYour order #${orderId} has been shipped.\nTracking Number: ${trackingNumber}\n\nThank you for shopping with us!`,
    });

    res.json({ success: true, message: "Tracking email sent successfully" });
  } catch (err) {
    console.error("Error sending tracking email:", err);
    res.status(500).json({ success: false, message: "Error sending email" });
  }
});



// PUT /api/orders/:orderId/status - Update order status
app.put("/api/orders/:orderId/status", async (req, res) => {
  const { orderId } = req.params;
  const { status, payment_status } = req.body;
  
  // Use either status or payment_status (for backward compatibility)
  const newStatus = status || payment_status;
  
  // Validate status
  const validStatuses = ['pending', 'paid', 'process', 'tracking', 'delivered', 'completed'];
  if (!validStatuses.includes(newStatus)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
    });
  }

  try {
    const result = await pool.query(
      `UPDATE orders 
       SET payment_status = $1
       WHERE order_id = $2
       RETURNING *`,
      [newStatus, orderId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    console.log(`✅ Order #${orderId} status updated to: ${newStatus}`);

    res.json({ 
      success: true, 
      message: `Order status updated to ${newStatus}`,
      order: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update order status',
      error: err.message 
    });
  }
});

// ============================
// REVIEWS API ENDPOINTS
// ============================

// POST: Add a review
// app.post("/api/reviews", async (req, res) => {
//   const { product_id, name, email, rating, review_text } = req.body;

//   if (!product_id || !name || !email || !rating || !review_text) {
//     return res.status(400).json({ success: false, message: "All fields required" });
//   }

//   try {
//     await pool.query(
//       `INSERT INTO reviews (product_id, name, email, rating, review_text)
//        VALUES ($1, $2, $3, $4, $5)`,
//       [product_id, name, email, rating, review_text]
//     );
//     res.json({ success: true, message: "Review submitted successfully" });
//   } catch (err) {
//     console.error("Error inserting review:", err);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// // GET: Fetch reviews for a product
// app.get("/api/reviews/:productId", async (req, res) => {
//   const { productId } = req.params;
//   try {
//     const result = await pool.query(
//       `SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC`,
//       [productId]
//     );
//     res.json({ success: true, reviews: result.rows });
//   } catch (err) {
//     console.error("Error fetching reviews:", err);
//     res.status(500).json({ success: false, message: "Failed to fetch reviews" });
//   }
// });

// ✅ POST: Add a review (with verified purchase check)
app.post("/api/reviews", async (req, res) => {
  const { product_id, name, email, rating, review_text } = req.body;

  if (!product_id || !name || !email || !rating || !review_text) {
    return res
      .status(400)
      .json({ success: false, message: "All fields required" });
  }

  try {
    // ✅ Check if email exists in both 'customers' and 'orders'
    const customerCheck = await pool.query(
      `SELECT id FROM customers WHERE email = $1`,
      [email]
    );
    const orderCheck = await pool.query(
      `SELECT order_id FROM orders WHERE customer_email = $1`,
      [email]
    );

    const isVerified =
      customerCheck.rows.length > 0 && orderCheck.rows.length > 0;

    // ✅ Insert the review (include verified field)
    await pool.query(
      `INSERT INTO reviews (product_id, name, email, rating, review_text, verified)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [product_id, name, email, rating, review_text, isVerified]
    );

    res.json({
      success: true,
      verified: isVerified,
      message: isVerified
        ? "Review added and verified as purchase!"
        : "Review added successfully (unverified).",
    });
  } catch (err) {
    console.error("Error inserting review:", err);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

app.get("/api/reviews/:productId", async (req, res) => {
  const { productId } = req.params;
  try {
    const result = await pool.query(
      `SELECT name, rating, review_text, verified, created_at
       FROM reviews
       WHERE product_id = $1
       ORDER BY created_at DESC`,
      [productId]
    );
    res.json({ success: true, reviews: result.rows });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch reviews" });
  }
});

app.get("/api/reviews", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT name, rating, review_text, verified
       FROM reviews
       ORDER BY created_at DESC
       LIMIT 10`
    );
    res.json({ success: true, reviews: result.rows });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
});


// ============================
// DATABASE BACKUP ROUTES
// ============================
// Add these routes to your existing server.js file
// Required dependencies (add to top of server.js if not present):
// const archiver = require('archiver');
// const { format } = require('date-fns');

const archiver = require('archiver');

// Helper function to format date for filenames
function getBackupTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

// ============================
// ROUTE 1: Download ALL formats (SQL + JSON + CSV ZIP)
// ============================
app.get("/api/backup/full/:Prop", async (req, res) => {
  const timestamp = getBackupTimestamp();
  // console.log('Backup Prop:', req.params.Prop);
  const Prop = req.params.Prop;
  if(Prop !== process.env.BACKUP){
    return res.status(403).json({ 
      success: false, 
      error: 'Unauthorized access' 
    });
  }
else{
  try {
    console.log('🔄 Starting full database backup...');
    
    // Set response headers for zip download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=mcland_pharma_backup_${timestamp}.zip`);
    
    // Create zip archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    // Handle archive errors
    archive.on('error', (err) => {
      console.error('❌ Archive error:', err);
      throw err;
    });
    
    // Pipe archive to response
    archive.pipe(res);
    
    // === 1. Generate SQL Dump ===
    const sqlDump = await generateSQLDump();
    archive.append(sqlDump, { name: `backup_${timestamp}.sql` });
    
    // === 2. Generate JSON Backup ===
    const jsonBackup = await generateJSONBackup();
    archive.append(JSON.stringify(jsonBackup, null, 2), { name: `backup_${timestamp}.json` });
    
    // === 3. Generate CSV Files ===
    const csvData = await generateCSVBackup();
    Object.keys(csvData).forEach(tableName => {
      archive.append(csvData[tableName], { name: `csv/${tableName}_${timestamp}.csv` });
    });
    
    // Finalize the archive
    await archive.finalize();
    
    console.log('✅ Full backup completed successfully');
    
  } catch (error) {
    console.error('❌ Backup error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: 'Backup failed', 
        details: error.message 
      });
    }
  }
  }
});

// ============================
// ROUTE 2: Download SQL Only
// ============================
app.get("/api/backup/sql", async (req, res) => {
  const timestamp = getBackupTimestamp();
  
  try {
    console.log('🔄 Generating SQL backup...');
    
    const sqlDump = await generateSQLDump();
    
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename=backup_${timestamp}.sql`);
    res.send(sqlDump);
    
    console.log('✅ SQL backup completed');
    
  } catch (error) {
    console.error('❌ SQL backup error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'SQL backup failed', 
      details: error.message 
    });
  }
});

// ============================
// ROUTE 3: Download JSON Only
// ============================
app.get("/api/backup/json", async (req, res) => {
  const timestamp = getBackupTimestamp();
  
  try {
    console.log('🔄 Generating JSON backup...');
    
    const jsonBackup = await generateJSONBackup();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup_${timestamp}.json`);
    res.json(jsonBackup);
    
    console.log('✅ JSON backup completed');
    
  } catch (error) {
    console.error('❌ JSON backup error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'JSON backup failed', 
      details: error.message 
    });
  }
});

// ============================
// ROUTE 4: Download CSV ZIP Only
// ============================
app.get("/api/backup/csv", async (req, res) => {
  const timestamp = getBackupTimestamp();
  
  try {
    console.log('🔄 Generating CSV backup...');
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=csv_backup_${timestamp}.zip`);
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);
    
    const csvData = await generateCSVBackup();
    Object.keys(csvData).forEach(tableName => {
      archive.append(csvData[tableName], { name: `${tableName}.csv` });
    });
    
    await archive.finalize();
    
    console.log('✅ CSV backup completed');
    
  } catch (error) {
    console.error('❌ CSV backup error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: 'CSV backup failed', 
        details: error.message 
      });
    }
  }
});

// ============================
// HELPER FUNCTIONS
// ============================

// Generate SQL dump
async function generateSQLDump() {
  const tables = [
    'customers',
    'orders', 
    'order_items',
    'products',
    'product_variants',
    'carts',
    'reviews',
    'employee_login'
  ];
  
  let sqlDump = `-- McLand Pharma Database Backup\n`;
  sqlDump += `-- Generated: ${new Date().toISOString()}\n`;
  sqlDump += `-- Database: ${process.env.DATABASE_URL ? 'Production' : 'Development'}\n\n`;
  sqlDump += `SET client_encoding = 'UTF8';\n`;
  sqlDump += `SET standard_conforming_strings = on;\n\n`;
  
  for (const table of tables) {
    try {
      sqlDump += `\n-- ============================\n`;
      sqlDump += `-- Table: ${table}\n`;
      sqlDump += `-- ============================\n\n`;
      
      // Drop table
      sqlDump += `DROP TABLE IF EXISTS ${table} CASCADE;\n\n`;
      
      // Get table structure with detailed column information
      const structureResult = await pool.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      
      if (structureResult.rows.length === 0) {
        sqlDump += `-- Warning: No structure found for table ${table}\n\n`;
        continue;
      }
      
      // Build CREATE TABLE statement
      sqlDump += `CREATE TABLE ${table} (\n`;
      
      const columnDefs = structureResult.rows.map((col, index) => {
        let def = `  ${col.column_name} `;
        
        // Data type with length/precision
        if (col.character_maximum_length) {
          def += `${col.data_type}(${col.character_maximum_length})`;
        } else if (col.numeric_precision) {
          def += `${col.data_type}(${col.numeric_precision}${col.numeric_scale ? ',' + col.numeric_scale : ''})`;
        } else {
          def += col.data_type;
        }
        
        // NOT NULL constraint
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }
        
        // Default value
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        
        return def;
      });
      
      sqlDump += columnDefs.join(',\n');
      
      // Get primary key constraint
      const pkResult = await pool.query(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = $1 
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position;
      `, [table]);
      
      if (pkResult.rows.length > 0) {
        const pkColumns = pkResult.rows.map(r => r.column_name).join(', ');
        sqlDump += `,\n  PRIMARY KEY (${pkColumns})`;
      }
      
      sqlDump += `\n);\n\n`;
      
      // Get all data from table
      const dataResult = await pool.query(`SELECT * FROM ${table}`);
      
      if (dataResult.rows.length > 0) {
        const columns = Object.keys(dataResult.rows[0]);
        
        sqlDump += `-- Data for ${table}\n`;
        
        dataResult.rows.forEach(row => {
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            if (typeof val === 'number') return val;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'string') {
              // Escape single quotes and backslashes
              const escaped = val.replace(/\\/g, '\\\\').replace(/'/g, "''");
              return `'${escaped}'`;
            }
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return `'${val}'`;
          });
          
          sqlDump += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        });
        
        sqlDump += `\n`;
      } else {
        sqlDump += `-- No data in ${table}\n\n`;
      }
      
      // Get indexes (excluding primary key)
      const indexResult = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = $1
          AND indexname NOT LIKE '%_pkey'
        ORDER BY indexname;
      `, [table]);
      
      if (indexResult.rows.length > 0) {
        sqlDump += `-- Indexes for ${table}\n`;
        indexResult.rows.forEach(idx => {
          sqlDump += `${idx.indexdef};\n`;
        });
        sqlDump += `\n`;
      }
      
      // Get foreign keys
      const fkResult = await pool.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1;
      `, [table]);
      
      if (fkResult.rows.length > 0) {
        sqlDump += `-- Foreign keys for ${table}\n`;
        fkResult.rows.forEach(fk => {
          sqlDump += `ALTER TABLE ${table} ADD CONSTRAINT ${fk.constraint_name} `;
          sqlDump += `FOREIGN KEY (${fk.column_name}) `;
          sqlDump += `REFERENCES ${fk.foreign_table_name}(${fk.foreign_column_name});\n`;
        });
        sqlDump += `\n`;
      }
      
    } catch (err) {
      console.error(`Error backing up table ${table}:`, err);
      sqlDump += `-- Error backing up table ${table}: ${err.message}\n\n`;
    }
  }
  
  sqlDump += `\n-- Backup completed successfully\n`;
  sqlDump += `-- Total tables: ${tables.length}\n`;
  
  return sqlDump;
}

// Generate JSON backup
async function generateJSONBackup() {
  const tables = [
    'customers',
    'orders',
    'order_items', 
    'products',
    'product_variants',
    'carts',
    'reviews',
    'employee_login'
  ];
  
  const backup = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0',
      database: 'mcland_pharma'
    },
    tables: {}
  };
  
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT * FROM ${table}`);
      backup.tables[table] = {
        count: result.rows.length,
        data: result.rows
      };
    } catch (err) {
      console.error(`Error backing up table ${table}:`, err);
      backup.tables[table] = {
        error: err.message
      };
    }
  }
  
  return backup;
}

// Generate CSV backup
async function generateCSVBackup() {
  const tables = [
    'customers',
    'orders',
    'order_items',
    'products', 
    'product_variants',
    'carts',
    'reviews',
    'employee_login'
  ];
  
  const csvFiles = {};
  
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT * FROM ${table}`);
      
      if (result.rows.length === 0) {
        csvFiles[table] = `No data in ${table} table\n`;
        continue;
      }
      
      // Get column headers
      const headers = Object.keys(result.rows[0]);
      let csv = headers.join(',') + '\n';
      
      // Add rows
      result.rows.forEach(row => {
        const values = headers.map(header => {
          const val = row[header];
          if (val === null) return '';
          if (typeof val === 'string') {
            // Escape quotes and wrap in quotes if contains comma
            const escaped = val.replace(/"/g, '""');
            return val.includes(',') || val.includes('\n') ? `"${escaped}"` : escaped;
          }
          if (val instanceof Date) return val.toISOString();
          return val;
        });
        csv += values.join(',') + '\n';
      });
      
      csvFiles[table] = csv;
      
    } catch (err) {
      console.error(`Error backing up table ${table}:`, err);
      csvFiles[table] = `Error: ${err.message}\n`;
    }
  }
  
  return csvFiles;
}

// ============================
// ROUTE 5: Backup Status/Info
// ============================
app.get("/api/backup/info", async (req, res) => {
  try {
    const tables = [
      'customers',
      'orders',
      'order_items',
      'products',
      'product_variants',
      'carts',
      'reviews',
      'employee_login'
    ];
    
    const tableInfo = {};
    
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      tableInfo[table] = parseInt(result.rows[0].count);
    }
    
    res.json({
      success: true,
      database: 'mcland_pharma',
      timestamp: new Date().toISOString(),
      tables: tableInfo,
      totalRecords: Object.values(tableInfo).reduce((a, b) => a + b, 0),
      availableFormats: ['full', 'sql', 'json', 'csv'],
      routes: {
        full: '/api/backup/full',
        sql: '/api/backup/sql',
        json: '/api/backup/json',
        csv: '/api/backup/csv',
        info: '/api/backup/info'
      }
    });
    
  } catch (error) {
    console.error('Error getting backup info:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get backup info',
      details: error.message 
    });
  }
});


//Middleware to block VPN users
async function blockVPN(req, res, next) {
  try {
    // If cookie already says blocked → deny immediately
    if (req.cookies.vpn_blocked === "true") {
      //return res.status(403).send("Not allowed (VPN detected)");
      return res.sendFile(path.join(__dirname, "public", "restricted.html"));
    }

    // Get client IP
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

      console.log("Client IP:", clientIp);
    // Check with ip-api
    const response = await axios.get(
      `http://ip-api.com/json/${clientIp}?fields=proxy,hosting`
    );

    const data = response.data;

    if (data.proxy || data.hosting) {
      // Set cookie for 1 day
      res.cookie("vpn_blocked", "true", { maxAge: 24 * 60 * 60 * 1000 });
       return res.status(403).send("Not allowed (VPN detected)");
      //return res.sendFile(path.join(__dirname, "public", "restricted.html"));
    }

    next();
  } catch (error) {
    console.error("VPN check failed:", error.message);
    next();
  }
}

app.use(blockVPN);

app.use(cookieParser());

// Middleware to block VPN users
async function blockVPN(req, res, next) {
  try {
    // 🚨 If cookie already says blocked → deny immediately
    if (req.cookies.vpn_blocked === "true") {
      return res.sendFile(path.join(__dirname, "public", "restricted.html"));
    }

    // 🚨 If cookie already says valid user → allow immediately (skip API check)
    if (req.cookies.valid_user === "true") {
      console.log("Trusted valid user → skipping VPN check");
      return next();
    }

    // Get client IP
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    console.log("Client IP:", clientIp);

    // Check with ip-api
    const response = await axios.get(
      `http://ip-api.com/json/${clientIp}?fields=proxy,hosting`
    );

    const data = response.data;

    if (data.proxy && data.hosting) {
      // 🚨 VPN detected → block + set cookie
      res.cookie("vpn_blocked", "true", { maxAge: 24 * 60 * 60 * 1000 });
      return res.status(403).send("Not allowed (VPN detected)");
      // return res.sendFile(path.join(__dirname, "public", "restricted.html"));
    }

    // 🚨 If user is clean → set valid_user cookie for 1 day
    res.cookie("valid_user", "true", { maxAge: 24 * 60 * 60 * 1000 });

    next();
  } catch (error) {
    console.error("VPN check failed:", error.message);
    next();
  }
}

app.use(blockVPN);

// // ✅ Move cookieParser BEFORE any middleware that uses cookies
// // app.use(express.json());
// // app.use(cookieParser());

// // ============================================
// // IN-MEMORY CACHE FOR IP CHECKS
// // ============================================
// const ipCache = new Map();
// const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
// const MAX_CACHE_SIZE = 10000; // Prevent memory overflow

// // Clean old cache entries periodically
// setInterval(() => {
//   const now = Date.now();
//   for (const [ip, data] of ipCache.entries()) {
//     if (now - data.timestamp > CACHE_DURATION) {
//       ipCache.delete(ip);
//     }
//   }
// }, 60 * 60 * 1000); // Every hour

// // ============================================
// // RATE LIMITER FOR API CALLS
// // ============================================
// let apiCallCount = 0;
// let lastResetTime = Date.now();
// const MAX_API_CALLS_PER_MINUTE = 40; // Stay under ip-api's 45/min limit

// function canMakeApiCall() {
//   const now = Date.now();
  
//   // Reset counter every minute
//   if (now - lastResetTime > 60000) {
//     apiCallCount = 0;
//     lastResetTime = now;
//   }
  
//   if (apiCallCount >= MAX_API_CALLS_PER_MINUTE) {
//     console.warn("⚠️ API rate limit reached, allowing request without check");
//     return false;
//   }
  
//   apiCallCount++;
//   return true;
// }

// // ============================================
// // IP WHITELIST (for your employees)
// // ============================================
// const EMPLOYEE_IPS = new Set([
//   // Add your office/employee IP addresses here
//   // "203.0.113.0",
//   // "198.51.100.0",
// ]);

// // ============================================
// // ROUTES TO SKIP VPN CHECK
// // ============================================
// const SKIP_VPN_CHECK_PATHS = [
//   '/assets/',
//   '/favicon.ico',
//   '/robots.txt',
//   '/sitemap.xml',
//   '/restricted.html',
//   '/retry'
// ];

// function shouldSkipVpnCheck(path) {
//   return SKIP_VPN_CHECK_PATHS.some(skipPath => path.startsWith(skipPath));
// }

// // ============================================
// // OPTIMIZED VPN BLOCKING MIDDLEWARE
// // ============================================
// async function blockVPN(req, res, next) {
//   try {
//     // ✅ Skip VPN check for static assets and specific routes
//     if (shouldSkipVpnCheck(req.path)) {
//       return next();
//     }

//     // ✅ If already blocked → deny immediately
//     if (req.cookies.vpn_blocked === "true") {
//       return res.sendFile(path.join(__dirname, "public", "restricted.html"));
//     }

//     // ✅ If already validated → allow immediately
//     if (req.cookies.valid_user === "true") {
//       return next();
//     }

//     // Get client IP
//     const clientIp = (req.headers["x-forwarded-for"]?.split(",")[0] || 
//                       req.socket.remoteAddress || 
//                       req.connection.remoteAddress).trim();

//     // ✅ Skip localhost/development IPs
//     if (clientIp === "::1" || clientIp === "127.0.0.1" || clientIp.startsWith("192.168.")) {
//       res.cookie("valid_user", "true", { maxAge: 24 * 60 * 60 * 1000 });
//       return next();
//     }

//     // ✅ Check employee whitelist
//     if (EMPLOYEE_IPS.has(clientIp)) {
//       res.cookie("valid_user", "true", { maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days for employees
//       return next();
//     }

//     // ✅ Check cache first
//     const cached = ipCache.get(clientIp);
//     if (cached) {
//       const age = Date.now() - cached.timestamp;
      
//       if (age < CACHE_DURATION) {
//         if (cached.isVpn) {
//           res.cookie("vpn_blocked", "true", { maxAge: 24 * 60 * 60 * 1000 });
//           return res.sendFile(path.join(__dirname, "public", "restricted.html"));
//         } else {
//           res.cookie("valid_user", "true", { maxAge: 24 * 60 * 60 * 1000 });
//           return next();
//         }
//       } else {
//         // Cache expired, remove it
//         ipCache.delete(clientIp);
//       }
//     }

//     // ✅ Check if we can make an API call (rate limiting)
//     if (!canMakeApiCall()) {
//       console.warn(`⚠️ Rate limit reached, allowing ${clientIp} without check`);
//       return next();
//     }

//     // ✅ Make API call with timeout
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

//     const response = await axios.get(
//       `http://ip-api.com/json/${clientIp}?fields=proxy,hosting,status,message`,
//       { 
//         signal: controller.signal,
//         timeout: 5000
//       }
//     );
    
//     clearTimeout(timeoutId);

//     const data = response.data;

//     // Check if API request was successful
//     if (data.status === "fail") {
//       console.error(`❌ IP API failed for ${clientIp}: ${data.message}`);
//       return next(); // Allow on API failure
//     }

//     const isVpn = data.proxy === true || data.hosting === true;

//     // ✅ Store in cache
//     if (ipCache.size < MAX_CACHE_SIZE) {
//       ipCache.set(clientIp, {
//         isVpn,
//         timestamp: Date.now()
//       });
//     }

//     if (isVpn) {
//       console.log(`🚫 VPN/Proxy detected: ${clientIp}`);
//       res.cookie("vpn_blocked", "true", { maxAge: 24 * 60 * 60 * 1000 });
//       return res.sendFile(path.join(__dirname, "public", "restricted.html"));
//     }

//     // ✅ Valid user
//     console.log(`✅ Valid user: ${clientIp}`);
//     res.cookie("valid_user", "true", { maxAge: 24 * 60 * 60 * 1000 });
//     next();

//   } catch (error) {
//     // ✅ Handle errors gracefully
//     if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
//       console.error("⏱️ VPN check timeout:", error.message);
//     } else if (error.message.includes('aborted')) {
//       console.error("⏱️ VPN check aborted (timeout)");
//     } else {
//       console.error("❌ VPN check failed:", error.message);
//     }
    
//     // Allow request on error (fail-open approach)
//     next();
//   }
// }

// // ✅ Apply VPN blocking middleware
// app.use(blockVPN);

// // ============================================
// // RETRY ROUTE (Clear blocked cookie)
// // ============================================
// app.post("/retry", (req, res) => {
//   const clientIp = (req.headers["x-forwarded-for"]?.split(",")[0] || 
//                     req.socket.remoteAddress).trim();
  
//   // Clear from cache
//   ipCache.delete(clientIp);
  
//   // Clear cookies
//   res.clearCookie("vpn_blocked");
//   res.clearCookie("valid_user");
  
//   console.log(`🔄 Retry requested for ${clientIp}`);
//   res.redirect("/");
// });

// // ============================================
// // ADMIN ENDPOINT: View Cache Stats
// // ============================================
// app.get("/admin/vpn-stats", (req, res) => {
//   // Add authentication here in production!
  
//   res.json({
//     cacheSize: ipCache.size,
//     maxCacheSize: MAX_CACHE_SIZE,
//     apiCallsThisMinute: apiCallCount,
//     maxApiCallsPerMinute: MAX_API_CALLS_PER_MINUTE,
//     cachedIPs: Array.from(ipCache.keys()).length,
//     employeeIPs: EMPLOYEE_IPS.size
//   });
// });

// // ============================================
// // ADMIN ENDPOINT: Clear Cache
// // ============================================
// app.post("/admin/clear-cache", (req, res) => {
//   // Add authentication here in production!
  
//   ipCache.clear();
//   apiCallCount = 0;
  
//   res.json({ success: true, message: "Cache cleared" });
// });

// // ============================================
// // ADMIN ENDPOINT: Add Employee IP
// // ============================================
// app.post("/admin/add-employee-ip", (req, res) => {
//   // Add authentication here in production!
  
//   const { ip } = req.body;
//   if (!ip) {
//     return res.status(400).json({ error: "IP address required" });
//   }
  
//   EMPLOYEE_IPS.add(ip);
//   res.json({ success: true, message: `IP ${ip} added to whitelist` });
// });


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
