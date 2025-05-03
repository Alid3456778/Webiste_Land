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
// const placeOrderBtn = document.getElementById('place-order-btn');
// const checkoutForm = document.getElementById('checkout-form');

// placeOrderBtn.addEventListener('click', (e) => {
//   e.preventDefault();

//   const formData = new FormData(checkoutForm);
//   const orderDetails = {};

//   // Extract form data into orderDetails object
//   formData.forEach((value, key) => {
//     orderDetails[key] = value;
//   });

//   // Handle "Ship to a different address?" checkbox
//   const differentAddressChecked = document.getElementById('different-address').checked;

//   if (differentAddressChecked) {
//     orderDetails.differentAddress = true;
//     orderDetails.shipStreetAddress = document.getElementById('ship-street-address').value;
//     orderDetails.shipCity = document.getElementById('ship-city').value;
//     orderDetails.shipZip = document.getElementById('ship-zip').value;
//   } else {
//     orderDetails.differentAddress = false;
//   }

//   // Add static order details (e.g., product details and totals)
//   orderDetails.products = [
//     { name: 'Codeine 200mg x 1', price: '$200.00' },
//     { name: 'Codeine 200mg x 1', price: '$200.00' },
//   ];
//   orderDetails.shippingCost = '$50.00';
//   orderDetails.total = '$250.00';

//   // Store order details in localStorage
//   localStorage.setItem('orderDetails', JSON.stringify(orderDetails));

//   // Redirect to the invoice page
//   window.location.href = './invoice.html';
// });


// document.getElementById("place-order-btn").addEventListener("click", function () {
//   // Show the popup div
//   const popup = document.getElementById("popup-div");
//   popup.style.display = "flex";

//   // Close the popup when clicking outside the content
//   popup.addEventListener("click", function (e) {
//     if (e.target === popup) {
//       popup.style.display = "none";
//     }
//   });
// });

// document.getElementById("download-btn").addEventListener("click", function () {
//   // Simulate a file download
//   const link = document.createElement("a");
//   link.href = "https://example.com/your-receipt.pdf"; // Replace with your file URL
//   link.download = "receipt.pdf";
//   link.click();
// });

const placeOrderBtn = document.getElementById('place-order-btn');
const popupDiv = document.getElementById('popup-div');
const closePopupBtn = document.getElementById('close-popup-btn');

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
      phone: document.getElementById('phone').value,
      billingStreetAddress: document.getElementById('street-address').value,
      apartment: document.getElementById('apartment').value,
      billingCity: document.getElementById('city').value,
      billingState: document.getElementById('state').value,
      billingZip: document.getElementById('zip-code').value,
      country: document.getElementById('country').value,
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


// placeOrderBtn.addEventListener('click', async (e) => {
//   e.preventDefault();

//   try {
//     const response = await fetch('/api/cart'); // fetch current session's cart
//     const cartData = await response.json();

//     if (!cartData.success || cartData.data.length === 0) {
//       alert('Your cart is empty!');
//       return;
//     }

//     let subtotal = 0;
//     cartData.data.forEach(item => {
//       subtotal += parseFloat(item.price) * parseInt(item.quantity);
//     });

//     const orderDetails = {
//       orderNumber: 'Generating...', // This will be updated after real order placement
//       date: new Date().toLocaleDateString(),
//       email: document.getElementById('email').value,
//       total: `$${(subtotal).toFixed(2)}`,
//       products: cartData.data.map(item => ({
//         name: `${item.name} ${item.mg} x ${item.quantity}`,
//         price: `$${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}`
//       }))
//     };

//   // Populate the popup with order details
//   document.getElementById('order-number').textContent = orderDetails.orderNumber;
//   document.getElementById('order-date').textContent = orderDetails.date;
//   document.getElementById('order-email').textContent = orderDetails.email;
//   document.getElementById('order-total').textContent = orderDetails.total;

//   const invoiceDetails = document.getElementById('invoice-details');
//   invoiceDetails.innerHTML = ''; // Clear previous data if any

//   orderDetails.products.forEach((product) => {
//     const productElement = document.createElement('p');
//     productElement.textContent = `${product.name} - ${product.price}`;
//     invoiceDetails.appendChild(productElement);
//   });

//   // Show the popup
//   popupDiv.style.display = 'flex';
// } catch (error) {
//   console.error('Error loading cart:', error);
//   alert('Error displaying order summary.');
// }
// });

closePopupBtn.addEventListener('click', () => {
  popupDiv.style.display = 'none';
});

// Close the popup when clicking outside the content
popupDiv.addEventListener('click', (e) => {
  if (e.target === popupDiv) {
    popupDiv.style.display = 'none';
  }
});
