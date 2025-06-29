const placeOrderBtn = document.getElementById('place-order-btn');

placeOrderBtn.addEventListener('click', async (e) => {
  e.preventDefault();

  try {
    const response = await fetch('/api/cart');
    const cartData = await response.json();

    if (!cartData.success || cartData.data.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    let subtotal = 0;

    // Calculate subtotal
    cartData.data.forEach(item => {
      subtotal += parseFloat(item.price);
    });

    // Check if all products have product_id in the range 1-24
    const allFreeShipping = cartData.data.every(
      (item) => parseInt(item.product_id, 10) >= 1 && parseInt(item.product_id, 10) <= 24
    );

    // Calculate shipping cost
     const shippingCost = calculateShippingCost(subtotal, cartData.data);
    console.log(shippingCost);
    // Prepare order details
    const orderDetails = {
      orderNumber: Math.floor(Math.random() * 1000000),
      orderDate: new Date().toISOString(),
      email: document.getElementById('email').value,
      firstName: document.getElementById('first-name').value,
      lastName: document.getElementById('last-name').value,
      city: document.getElementById('ship-city').value,
      country: document.getElementById('country').value,
      phone: document.getElementById('phone').value,
      billingStreetAddress: document.getElementById('street-address').value,
      billingState: document.getElementById('state').value,
      billingZip: document.getElementById('zip-code').value,
      differentAddress: document.getElementById('different-address').checked,
      shipStreetAddress: document.getElementById('ship-street-address')?.value || '',
      shipCity: document.getElementById('ship-city')?.value || '',
      shipZip: document.getElementById('ship-zip')?.value || '',
      products: cartData.data.map(item => ({
        name: `${item.name} ${item.mg} x ${item.quantity}`,
        price: `$${(parseFloat(item.price)).toFixed(2)}`
      })),
      shippingCost:`${shippingCost}`,
      total: `$${(subtotal + shippingCost).toFixed(2)}`
    };

    // Save order details to localStorage and redirect
    localStorage.setItem('orderDetails', JSON.stringify(orderDetails));
    window.location.href = './invoice1.html'; // Redirect to invoice
  } catch (error) {
    console.error('Error loading cart:', error);
    alert('Error displaying order summary.');
  }
});

// Calculate shipping cost function
function calculateShippingCost(total, cartItems) {
        // Separate items into free shipping and chargeable shipping categories
        let chargeableTotal = 0;

        cartItems.forEach((item) => {
          const productId = parseInt(item.product_id, 10);
          const price = parseFloat(item.price);

          if (productId > 24) {
            // Add price to chargeable total if product ID is greater than 24
            chargeableTotal += price;
          }
        });

        // Calculate shipping cost based on chargeable total price
        if (chargeableTotal > 300) {
          return 0; // Free shipping for chargeable items above $300
        } else if (chargeableTotal >= 101) {
          return 10; // $10 for chargeable items between $101 and $300
        } else if (chargeableTotal >= 51) {
          return 15; // $15 for chargeable items between $51 and $100
        } else if (chargeableTotal >= 1) {
          return 20; // $20 for chargeable items between $1 and $50
        }

        return 0; // Default to free shipping for invalid amounts
      }