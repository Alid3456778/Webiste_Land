function changeMainImage(imageSrc) {
    const mainImage = document.getElementById('main-image');
    mainImage.src = imageSrc;
  }
  
// Function to add product to cart
function addToCart(product) {
  const cart = JSON.parse(localStorage.getItem('cart')) || []; // Get existing cart or initialize an empty array
  const existingProduct = cart.find((item) => item.id === product.id);

  if (existingProduct) {
    // Update quantity if the product already exists in the cart
    existingProduct.qty += product.qty;
  } else {
    cart.push(product); // Add new product to the cart
  }

  localStorage.setItem('cart', JSON.stringify(cart)); // Save updated cart to localStorage
  alert('Product added to cart!');
}

// Add event listeners to "Add To Cart" buttons
document.querySelectorAll('.add-to-cart-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const product = {
      id: parseInt(button.dataset.id, 10), // Unique product ID
      mg: button.dataset.mg,
      qty: parseInt(button.dataset.qty, 10), // Quantity
      description: button.dataset.description,
      price: parseFloat(button.dataset.price) // Price
    };

    addToCart(product); // Call the function to add product to the cart
  });
});


// Function to show the hidden div
function showDiv() {
  const formDiv = document.getElementById('formDiv');
  formDiv.style.display = 'block'; // Show the div
}