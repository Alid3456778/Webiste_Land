// Filter medicines by category
function filterCategory() {
    const category = document.getElementById('categories').value;
    const medicines = document.querySelectorAll('.medicine-card');
  
    medicines.forEach((medicine) => {
      if (category === 'all' || medicine.classList.contains(category)) {
        medicine.style.display = 'block';
      } else {
        medicine.style.display = 'none';
      }
    });
  }
  
  // Search for medicines
  function searchMedicines() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const medicines = document.querySelectorAll('.medicine-card');
  
    medicines.forEach((medicine) => {
      if (medicine.textContent.toLowerCase().includes(query)) {
        medicine.style.display = 'block';
      } else {
        medicine.style.display = 'none';
      }
    });
  }
  