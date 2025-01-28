// Toggle the Shipping Address Form
const differentAddressCheckbox = document.getElementById('different-address');
const shippingAddressForm = document.getElementById('shipping-address-form');

differentAddressCheckbox.addEventListener('change', () => {
  if (differentAddressCheckbox.checked) {
    shippingAddressForm.style.display = 'block';
  } else {
    shippingAddressForm.style.display = 'none';
  }
});

// Handle Place Order Button
const placeOrderBtn = document.getElementById('place-order-btn');
const checkoutForm = document.getElementById('checkout-form');

placeOrderBtn.addEventListener('click', (e) => {
  e.preventDefault();

  const formData = new FormData(checkoutForm);
  const orderDetails = {};

  // Extract form data into orderDetails object
  formData.forEach((value, key) => {
    orderDetails[key] = value;
  });

  // Handle "Ship to a different address?" checkbox
  const differentAddressChecked = document.getElementById('different-address').checked;

  if (differentAddressChecked) {
    orderDetails.differentAddress = true;
    orderDetails.shipStreetAddress = document.getElementById('ship-street-address').value;
    orderDetails.shipCity = document.getElementById('ship-city').value;
    orderDetails.shipZip = document.getElementById('ship-zip').value;
  } else {
    orderDetails.differentAddress = false;
  }

  // Add static order details (e.g., product details and totals)
  orderDetails.products = [
    { name: 'Codeine 200mg x 1', price: '₹200.00' },
    { name: 'Codeine 200mg x 1', price: '₹200.00' },
  ];
  orderDetails.shippingCost = '₹50.00';
  orderDetails.total = '₹250.00';

  // Store order details in localStorage
  localStorage.setItem('orderDetails', JSON.stringify(orderDetails));

  // Redirect to the invoice page
  window.location.href = './invoice.html';
});
