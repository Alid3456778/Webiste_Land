

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
    cartData.data.forEach(item => {
      subtotal += parseFloat(item.price) ;
    });

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
        price: `$${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}`
      })),
      shippingCost: '$50.00',
      total: `$${(subtotal + 50).toFixed(2)}`
    };

    localStorage.setItem('orderDetails', JSON.stringify(orderDetails));
    window.location.href = './invoice1.html'; // redirect to invoice
  } catch (error) {
    console.error('Error loading cart:', error);
    alert('Error displaying order summary.');
  }
});

