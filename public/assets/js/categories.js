// Filter medicines by category
// function filterCategory() {
//     const category = document.getElementById('categories').value;
//     const medicines = document.querySelectorAll('.medicine-card');
  
//     medicines.forEach((medicine) => {
//       if (category === 'all' || medicine.classList.contains(category)) {
//         medicine.style.display = 'flex';
//       } else {
//         medicine.style.display = 'none';
//       }
//     });
//   }
  
  // Search for medicines
  function searchMedicines() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const medicines = document.querySelectorAll('.medicine-card');
    console.log(query);
    medicines.forEach((medicine) => {
      if (medicine.textContent.toLowerCase().includes(query)) {
        medicine.style.display = 'flex';
      } else {
        medicine.style.display = 'none';
       
      }
    });
  }

  // function searchMedicines() {
  //   const query = document.getElementById('searchInput').value.toLowerCase();
  //   const medicines = document.querySelectorAll('.medicine-card');
  //   let found = false; // To track if any medicine matches the query
  
  //   medicines.forEach((medicine) => {
  //     if (medicine.textContent.toLowerCase().includes(query)) {
  //       medicine.style.display = 'flex'; // Show matching medicine
  //       found = true;
  //     } else {
  //       medicine.style.display = 'none'; // Hide non-matching medicine
  //     }
  //   });
  
  //   const tableBody = document.getElementById("product-grid");
  //   if (!found) {
  //     tableBody.innerHTML = `<p>No medicines found with the name "${query}".</p>`;
  //   } else {
  //     // If medicines are found, ensure the "No medicines found" message is removed
  //     const noMedicinesMessage = tableBody.querySelector('p');
  //     if (noMedicinesMessage) {
  //       noMedicinesMessage.remove();
  //     }
  //   }
  // }
  

  
  