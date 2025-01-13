// Selecting elements
const hamburgerMenu = document.getElementById('hamburger-menu');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('close-sidebar');
const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');

// Open Sidebar on Hamburger Click
hamburgerMenu.addEventListener('click', () => {
  sidebar.classList.add('active');
});

// Close Sidebar on Close Button Click
closeSidebar.addEventListener('click', () => {
  sidebar.classList.remove('active');
});

// Search Button Click Event
searchButton.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (query) {
    alert(`Searching for: ${query}`);
    // You can replace the alert with your actual search logic
  } else {
    alert('Please enter a search term.');
  }
});


// Default price values for MG and Quantity
const mgPrices = {
    1: 200,
    2: 400,
    3: 600,
    4: 800,
    5: 1000,
  };
  
  const quantityMultipliers = {
    10: 1,
    30: 3,
    60: 6,
    100: 10,
    140: 14,
  };
  
  // Track selected values
  let selectedMG = 4; // Default MG
  let selectedQuantity = 100; // Default Quantity
  
  // Update the price dynamically
  function updatePrice() {
    const basePrice = mgPrices[selectedMG] || selectedMG * 200; // For custom MG, assume price per MG unit is 200
    const totalPrice = basePrice * (quantityMultipliers[selectedQuantity] || selectedQuantity);
    document.getElementById("price").innerText = `$${totalPrice}/-`;
  }
  
  // Button click handler for MG and Quantity
  function setupButtonGroup(buttonGroup, type) {
    buttonGroup.forEach((button) => {
      button.addEventListener("click", () => {
        buttonGroup.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
  
        if (type === "mg") selectedMG = parseInt(button.getAttribute("data-mg"));
        if (type === "quantity") selectedQuantity = parseInt(button.getAttribute("data-quantity"));
  
        // Clear custom inputs when button is clicked
        if (type === "mg") document.querySelector(".mg-custom").value = "";
        if (type === "quantity") document.querySelector(".quantity-custom").value = "";
  
        updatePrice();
      });
    });
  }
  
  // Handle custom input changes
  function setupCustomInput(inputField, type) {
    inputField.addEventListener("input", () => {
      const value = parseInt(inputField.value);
  
      if (isNaN(value) || value <= 0) return; // Ignore invalid or negative values
  
      if (type === "mg") {
        selectedMG = value;
        // Clear active buttons when using custom input
        document.querySelectorAll(".mg-buttons button").forEach((btn) => btn.classList.remove("active"));
      } else if (type === "quantity") {
        selectedQuantity = value;
        document.querySelectorAll(".quantity-buttons button").forEach((btn) => btn.classList.remove("active"));
      }
  
      updatePrice();
    });
  }
  
  // Initialize
  document.addEventListener("DOMContentLoaded", () => {
    const mgButtons = document.querySelectorAll(".mg-buttons button");
    const quantityButtons = document.querySelectorAll(".quantity-buttons button");
    const customMGInput = document.querySelector(".mg-custom");
    const customQuantityInput = document.querySelector(".quantity-custom");
  
    setupButtonGroup(mgButtons, "mg");
    setupButtonGroup(quantityButtons, "quantity");
  
    setupCustomInput(customMGInput, "mg");
    setupCustomInput(customQuantityInput, "quantity");
  
    updatePrice();
  });

  


  // Toggle FAQ answer visibility
  document.querySelectorAll('.faq-item h3').forEach((header) => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      item.classList.toggle('active'); // Toggle the 'active' class
    });
  });