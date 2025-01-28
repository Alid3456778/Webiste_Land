document.querySelectorAll('.remove-btn').forEach((button) => {
    button.addEventListener('click', (e) => {
      const item = e.target.closest('.cart-item');
      item.remove();
      updateBillSummary();
    });
  });
  
  document.getElementById('update-cart-btn').addEventListener('click', updateBillSummary);
  
  document.getElementById('add-products-btn').addEventListener('click', () => {
    alert('Redirecting to the shop page...');
    window.location.href = './categories.html'; // Replace with the actual shop page URL
  });
  
  function updateBillSummary() {
    const cartItems = document.querySelectorAll('.cart-item');
    let subtotal = 0;
  
    cartItems.forEach((item) => {
      const priceText = item.querySelector('.product-details p:nth-child(3)').innerText;
      const price = parseFloat(priceText.replace('Price: ₹', ''));
      const quantity = parseInt(item.querySelector('input').value, 10);
      subtotal += price * quantity;
    });
  
    const tax = subtotal * 0.05;
    const total = subtotal + tax;
  
    document.querySelector('.bill-summary .bill-item:nth-child(1) p:last-child').innerText = `₹${subtotal.toFixed(2)}`;
    document.querySelector('.bill-summary .bill-item:nth-child(2) p:last-child').innerText = `₹${tax.toFixed(2)}`;
    document.querySelector('.bill-summary .bill-item.total p:last-child').innerText = `₹${total.toFixed(2)}`;
  }


  
  //this code is for the cart quantity increase , decrease icon and make the change in price
  function updateTotalPrice(input) {
    const unitPrice = parseFloat(input.getAttribute("data-price")); // Get the unit price
    const quantity = parseInt(input.value); 
    const totalPriceElement = input.closest('.product-detail-2').querySelector('.total-price');
    totalPriceElement.textContent = (unitPrice * quantity).toFixed(2); 
  }

  // Function to increase quantity
  function increaseQuantity(button) {
    const input = button.previousElementSibling; // Get the input field
    let currentValue = parseInt(input.value);
    input.value = currentValue + 1; // Increase quantity
    updateTotalPrice(input); // Update total price
  }

  // Function to decrease quantity
  function decreaseQuantity(button) {
    const input = button.nextElementSibling; // Get the input field
    let currentValue = parseInt(input.value);
    if (currentValue > 1) { // Prevent going below 1
      input.value = currentValue - 1; // Decrease quantity
      updateTotalPrice(input); // Update total price
    }
  }