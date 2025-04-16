// add in frontend logics
// checkout.js
document.getElementById('place-order-btn').addEventListener('click', async function (event) {
  event.preventDefault();

  const formData = {
    firstName: document.getElementById('first-name').value,
    lastName: document.getElementById('last-name').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    companyName: document.getElementById('company-name').value,
    country: document.getElementById('country').value,
    streetAddress: document.getElementById('street-address').value,
    apartment: document.getElementById('apartment').value,
    city: document.getElementById('city').value,
    state: document.getElementById('state').value,
    zipCode: document.getElementById('zip-code').value,
    differentAddress: document.getElementById('different-address').checked,
    shippingAddress: {
      streetAddress: document.getElementById('ship-street-address')?.value || '',
      city: document.getElementById('ship-city')?.value || '',
      zipCode: document.getElementById('ship-zip')?.value || ''
    }
  };

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const result = await response.json();
    if (response.ok) {
      document.getElementById('order-number').textContent = result.orderNumber;
      document.getElementById('order-date').textContent = result.orderDate;
      document.getElementById('order-email').textContent = result.email;
      document.getElementById('order-total').textContent = `₹${result.totalAmount}`;
      document.getElementById('popup-div').style.display = 'flex';
    } else {
      alert('Checkout failed: ' + result.message);
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Something went wrong. Please try again later.');
  }
});
