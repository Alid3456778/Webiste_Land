// employee-test.js
import fetch from "node-fetch";

const BASE_URL = "http://localhost:3000"; // Change if running remotely
let passed = 0, failed = 0;

async function testAPI(name, endpoint, options = {}) {
  process.stdout.write(`🧪 Testing ${name} ... `);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (res.ok) {
      console.log("✅ PASS");
      passed++;
    } else {
      console.log("❌ FAIL");
      console.error(`   → Status: ${res.status} ${res.statusText}`);
      console.error(`   → Response:`, data);
      failed++;
    }
  } catch (err) {
    console.log("❌ FAIL");
    console.error(`   → Error: ${err.message}`);
    failed++;
  }
}

(async () => {
  console.log("🚀 Starting Employee API Test Suite\n");

  await testAPI("GET /api/requests", "/api/requests");

  await testAPI("POST /api/products/search", "/api/products/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: 1, name: "Test Product" }),
  });

  await testAPI("PUT /api/products/update/:id", "/api/products/update/1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_description: "Updated by test script" }),
  });

  await testAPI("DELETE /api/products/delete/:id", "/api/products/delete/1", {
    method: "DELETE",
  });

  await testAPI("GET /api/customers/search", "/api/customers/search?firstName=John");

  await testAPI("POST /api/manual-order", "/api/manual-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Test",
      lastName: "Customer",
      email: "test@example.com",
      phone: "1234567890",
      billingStreetAddress: "123 Test Street",
      billingCity: "TestCity",
      billingState: "TS",
      billingZip: "12345",
      country: "Testland",
      shippingCost: 5,
      totalCost: 50,
      cartItems: [{ name: "Test Medicine", mg: "50mg", quantity: 2, price: 25 }],
    }),
  });

  await testAPI("GET /api/order-customer/:id", "/api/order-customer/1");
  await testAPI("GET /api/invoice/:id", "/api/invoice/1");

  console.log("\n🧾 Summary:");
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🔍 Total: ${passed + failed}`);
  console.log("\n✨ API test completed.\n");
})();
