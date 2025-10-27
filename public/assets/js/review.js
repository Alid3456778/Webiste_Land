// ============================
// INTERACTIVE STAR REVIEW SYSTEM
// ============================
// let selectedRating = 0;

// function setupStarRating() {
//   const stars = document.querySelectorAll("#star-rating span");

//   stars.forEach((star) => {
//     star.addEventListener("mouseenter", () => {
//       resetStars();
//       highlightStars(star.dataset.value);
//     });

//     star.addEventListener("mouseleave", () => {
//       resetStars();
//       highlightStars(selectedRating);
//     });

//     star.addEventListener("click", () => {
//       selectedRating = star.dataset.value;
//       highlightStars(selectedRating);
//     });
//   });

//   function highlightStars(value) {
//     stars.forEach((s) => {
//       s.classList.toggle("selected", s.dataset.value <= value);
//     });
//   }

//   function resetStars() {
//     stars.forEach((s) => s.classList.remove("selected"));
//   }
// }

// // ============================
// // LOAD & SUBMIT REVIEWS
// // ============================
// async function loadReviews(productId) {
//   const reviewList = document.getElementById("review-list");
//   reviewList.innerHTML = "<p>Loading reviews...</p>";

//   try {
//     const response = await fetch(`/api/reviews/${productId}`);
//     const result = await response.json();

//     if (!result.success || result.reviews.length === 0) {
//       reviewList.innerHTML = "<p>No reviews yet. Be the first to write one!</p>";
//       return;
//     }

//     reviewList.innerHTML = result.reviews
//       .map(
//         (r) => `
//         <div class="review-card">
//           <strong>${r.name}</strong> 
//           <span>${"⭐".repeat(r.rating)}</span>
//           <p>${r.review_text}</p>
//           <small>${new Date(r.created_at).toLocaleDateString()}</small>
//         </div>`
//       )
//       .join("");
//   } catch (err) {
//     console.error("Error loading reviews:", err);
//     reviewList.innerHTML = "<p>Error loading reviews.</p>";
//   }
// }

// async function handleReviewSubmit(event) {
//   event.preventDefault();
//   const urlParams = new URLSearchParams(window.location.search);
//   const product_id = urlParams.get("product_ID");

//   const name = document.getElementById("review-name").value.trim();
//   const email = document.getElementById("review-email").value.trim();
//   const review_text = document.getElementById("review-text").value.trim();

//   if (!name || !email || !review_text || selectedRating === 0) {
//     alert("Please fill all fields and select a star rating!");
//     return;
//   }

//   try {
//     const response = await fetch("/api/reviews", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         product_id,
//         name,
//         email,
//         rating: selectedRating,
//         review_text,
//       }),
//     });

//     const result = await response.json();
//     if (result.success) {
//       alert("Review submitted successfully!");
//       document.getElementById("reviewForm").reset();
//       selectedRating = 0;
//       setupStarRating(); // Reset stars
//       loadReviews(product_id);
//     } else {
//       alert(result.message);
//     }
//   } catch (err) {
//     console.error("Error submitting review:", err);
//     alert("Error submitting review");
//   }
// }

// // Initialize review system
// document.addEventListener("DOMContentLoaded", () => {
//   const urlParams = new URLSearchParams(window.location.search);
//   const productId = urlParams.get("product_ID");
//   if (productId) loadReviews(productId);
//   setupStarRating();

//   const form = document.getElementById("reviewForm");
//   if (form) form.addEventListener("submit", handleReviewSubmit);
// });

// ============================
// STAR REVIEW + AVERAGE DISPLAY SYSTEM
// ============================
let selectedRating = 0;

// Setup the interactive review stars in the review form
function setupStarRating() {
  const stars = document.querySelectorAll("#star-rating span");
  if (!stars.length) return;

  stars.forEach((star) => {
    star.addEventListener("mouseenter", () => {
      resetStars();
      highlightStars(star.dataset.value);
    });

    star.addEventListener("mouseleave", () => {
      resetStars();
      highlightStars(selectedRating);
    });

    star.addEventListener("click", () => {
      selectedRating = star.dataset.value;
      highlightStars(selectedRating);
    });
  });

  function highlightStars(value) {
    stars.forEach((s) => {
      s.classList.toggle("selected", s.dataset.value <= value);
    });
  }

  function resetStars() {
    stars.forEach((s) => s.classList.remove("selected"));
  }
}

// ============================
// LOAD REVIEWS + UPDATE AVERAGE
// ============================
async function loadReviews(productId) {
  const reviewList = document.getElementById("review-list");
  const ratingStars = document.querySelectorAll("#rating span[data-value]");
  const ratingCount = document.querySelector("#rating .rating__count");

  reviewList.innerHTML = "<p>Loading reviews...</p>";

  try {
    const response = await fetch(`/api/reviews/${productId}`);
    const result = await response.json();

    if (!result.success || result.reviews.length === 0) {
      reviewList.innerHTML = "<p>No reviews yet. Be the first to write one!</p>";
      // Reset average rating display
      ratingStars.forEach((s) => (s.style.color = "#ccc"));
      ratingCount.textContent = "(0 reviews)";
      return;
    }

    // ✅ Calculate average rating
    const totalReviews = result.reviews.length;
    const avgRating =
      result.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    // ✅ Update average stars display
    ratingStars.forEach((star) => {
      const starValue = parseInt(star.dataset.value);
      if (starValue <= Math.round(avgRating)) {
        star.style.color = "#FFD700"; // Gold for filled stars
      } else {
        star.style.color = "#ccc"; // Gray for unfilled
      }
    });

    // ✅ Update review count text
    ratingCount.textContent = `(${totalReviews} reviews)`;

    // ✅ Show reviews below
    reviewList.innerHTML = result.reviews
      .map(
        (r) => `
        <div class="review-card">
          <strong>${r.name}</strong> 
          <span>${"⭐".repeat(r.rating)}</span>
          <p>${r.review_text}</p>
          <small>${new Date(r.created_at).toLocaleDateString()}</small>
        </div>`
      )
      .join("");
  } catch (err) {
    console.error("Error loading reviews:", err);
    reviewList.innerHTML = "<p>Error loading reviews.</p>";
  }
}

// ============================
// HANDLE REVIEW SUBMIT
// ============================
async function handleReviewSubmit(event) {
  event.preventDefault();
  const urlParams = new URLSearchParams(window.location.search);
  const product_id = urlParams.get("product_ID");

  const name = document.getElementById("review-name").value.trim();
  const email = document.getElementById("review-email").value.trim();
  const review_text = document.getElementById("review-text").value.trim();

  if (!name || !email || !review_text || selectedRating === 0) {
    alert("Please fill all fields and select a star rating!");
    return;
  }

  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id,
        name,
        email,
        rating: selectedRating,
        review_text,
      }),
    });

    const result = await response.json();
    if (result.success) {
      alert("Review submitted successfully!");
      document.getElementById("reviewForm").reset();
      selectedRating = 0;
      setupStarRating();
      loadReviews(product_id); // reload and refresh average
    } else {
      alert(result.message);
    }
  } catch (err) {
    console.error("Error submitting review:", err);
    alert("Error submitting review");
  }
}

// ============================
// INITIALIZE ON PAGE LOAD
// ============================
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("product_ID");
  if (productId) loadReviews(productId);
  setupStarRating();

  const form = document.getElementById("reviewForm");
  if (form) form.addEventListener("submit", handleReviewSubmit);
});
