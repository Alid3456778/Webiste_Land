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


  // Toggle FAQ answer visibility
  document.querySelectorAll('.faq-item h3').forEach((header) => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      item.classList.toggle('active'); // Toggle the 'active' class
    });
  });





   // Get all MG buttons
   const mgButtons = document.querySelectorAll('.mg-button');
            
   // Function to update the table
   const updateTable = (selectedMg) => {
     const rows = document.querySelectorAll('.product-table tbody tr');
     rows.forEach((row) => {
       // Update MG column
       row.querySelector('td:first-child').textContent = `${selectedMg}mg`;
 
       // Dynamically change prices based on MG
       const oldPriceElement = row.querySelector('.old-price');
       const newPriceElement = row.querySelector('.new-price');
 
       // Example logic to calculate prices based on MG
       const qty = parseInt(row.querySelector('td:nth-child(2)').textContent, 10);
       const basePrice = selectedMg * 3; // Example base price multiplier
       const perPillPrice = (basePrice / qty).toFixed(2);
 
       oldPriceElement.textContent = `$${(basePrice * 1.2).toFixed(2)}`; // Example markup
       newPriceElement.textContent = `$${perPillPrice} PER PILL`;
 
       // Update total price column
       row.querySelector('td:nth-child(4)').textContent = (basePrice * qty).toFixed(2);
     });
   };
 
   // Add click event to all MG buttons
   mgButtons.forEach((button) => {
     button.addEventListener('click', () => {
       // Remove active class from all buttons
       mgButtons.forEach((btn) => btn.classList.remove('active'));
 
       // Add active class to the clicked button
       button.classList.add('active');
 
       // Get the selected MG value
       const selectedMg = button.dataset.mg;
 
       // Update the table with the selected MG
       updateTable(selectedMg);
     });
   });
 
   // Initialize with default active button
   https://lh3.googleusercontent.com/d/1duiTewov1jsyyUaEnuGboshwFlHtLt3A


   document.addEventListener("DOMContentLoaded", () => {
    const carouselContainer = document.querySelector(".carousel-container");
    const images = document.querySelectorAll(".carousel-container img");
    const leftArrow = document.querySelector(".arrow.left");
    const rightArrow = document.querySelector(".arrow.right");
  
    let currentIndex = 0;
    const imageCount = images.length;
    const imageWidth = images[0].clientWidth;
  
    // Move to a specific slide
    const moveToSlide = (index) => {
      carouselContainer.style.transform = `translateX(-${index * 100}%)`;
    };
  
    // Handle left arrow click
    leftArrow.addEventListener("click", () => {
      currentIndex = (currentIndex === 0) ? imageCount - 1 : currentIndex - 1;
      moveToSlide(currentIndex);
    });
  
    // Handle right arrow click
    rightArrow.addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % imageCount;
      moveToSlide(currentIndex);
    });
  
    // Auto-scroll every 3 seconds
    setInterval(() => {
      currentIndex = (currentIndex + 1) % imageCount;
      moveToSlide(currentIndex);
    }, 7000);
  });


  // Toggle visibility of reviews
document.querySelectorAll(".toggle-review").forEach((button) => {
  button.addEventListener("click", (e) => {
    const reviewText = e.target.parentElement.nextElementSibling.nextElementSibling;
    if (reviewText.classList.contains("hidden")) {
      reviewText.classList.remove("hidden");
      reviewText.classList.add("visible");
      e.target.textContent = "Hide Review ▲";
    } else {
      reviewText.classList.remove("visible");
      reviewText.classList.add("hidden");
      e.target.textContent = "Show Review ▼";
    }
  });
});
