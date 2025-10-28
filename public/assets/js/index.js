
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = "68987257-808e-403d-a06c-35b3ec18c3ef";
      (function () {
        var d = document;
        var s = d.createElement("script");
        s.src = "https://client.crisp.chat/l.js";
        s.async = 1;
        d.getElementsByTagName("head")[0].appendChild(s);
      })();

      // No. of items in cart
      document.addEventListener("DOMContentLoaded", async () => {
        const cartCountSpan = document.querySelector(".cart-badge");

        try {
          // Fetch the cart count for the logged-in user
          const response = await fetch("/api/cart/count");
          const result = await response.json();

          if (result.success) {
            const cartCount = result.count;
            if (cartCount > 0) {
              cartCountSpan.textContent = cartCount;
              cartCountSpan.style.display = "inline-block";
            }
          } else {
            console.error("Failed to fetch cart count:", result.message);
          }
        } catch (error) {
          console.error("Error fetching cart count:", error);
        }
      });

      // Initialize hero search functionality
      document.addEventListener("DOMContentLoaded", function () {
        initHeroSearch();
        buildProductSearch();
      });

      function initHeroSearch() {
        fetch("/products")
          .then((res) => res.json())
          .then((products) => {
            const heroSearchInput = document.querySelector(".search-input");
            const heroSearchButton = document.querySelector(".search-submit");
            const heroSuggestionBox =
              document.getElementById("hero-suggestions");

            if (!heroSearchInput || !heroSearchButton) return;

            // Real-time suggestions for hero search
            heroSearchInput.addEventListener("input", () => {
              const query = heroSearchInput.value.trim().toLowerCase();
              heroSuggestionBox.innerHTML = "";

              if (!query) {
                heroSuggestionBox.style.display = "none";
                return;
              }

              const matches = products.filter((product) =>
                product.product_name.toLowerCase().includes(query)
              );

              if (matches.length > 0) {
                matches.forEach((product) => {
                  const li = document.createElement("li");

                  const img = document.createElement("img");
                  img.src = product.image_url || "assets/image/default.png";
                  img.alt = product.product_name;
                  img.style.width = "50px";
                  img.style.height = "50px";
                  img.style.objectFit = "cover";
                  img.style.marginRight = "10px";
                  img.style.borderRadius = "5px";

                  const span = document.createElement("span");
                  span.textContent = product.product_name;

                  li.appendChild(img);
                  li.appendChild(span);

                  li.onclick = () => {
                    window.location.href = `product_overview.html?product_ID=${product.product_id}`;
                  };

                  heroSuggestionBox.appendChild(li);
                });
                heroSuggestionBox.style.display = "block";
              } else {
                heroSuggestionBox.style.display = "none";
              }
            });

            // Hide suggestions when clicking outside
            document.addEventListener("click", (e) => {
              if (!e.target.closest(".search-container")) {
                heroSuggestionBox.style.display = "none";
              }
            });

            // Handle search
            function handleHeroSearch() {
              const query = heroSearchInput.value.trim();
              const matchingProduct = products.find(
                (product) =>
                  product.product_name.toLowerCase() === query.toLowerCase()
              );

              if (matchingProduct) {
                window.location.href = `product_overview.html?product_ID=${matchingProduct.product_id}`;
              } else if (query) {
                alert("No exact matching product found.");
              }
            }

            // Button click and Enter key handling
            heroSearchButton.addEventListener("click", handleHeroSearch);
            heroSearchInput.addEventListener("keydown", (event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleHeroSearch();
              }
            });
          })
          .catch((error) => {
            console.error("Error fetching products for hero search:", error);
          });
      }

      // Header search functionality
      async function buildProductSearch() {
        try {
          const response = await fetch(`/products`);
          const products = await response.json();

          const searchInput = document.getElementById("search-input");
          const searchButton = document.querySelector(".search-btn");
          const suggestionBox = document.getElementById("suggestions");

          if (!searchInput || !searchButton) return;

          // Real-time suggestions
          searchInput.addEventListener("input", () => {
            const query = searchInput.value.trim().toLowerCase();
            suggestionBox.innerHTML = "";

            if (!query) {
              suggestionBox.style.display = "none";
              return;
            }

            const matches = products.filter((product) =>
              product.product_name.toLowerCase().includes(query)
            );

            if (matches.length > 0) {
              matches.forEach((product) => {
                const li = document.createElement("li");

                const img = document.createElement("img");
                img.src = product.image_url || "assets/image/default.png";
                img.alt = product.product_name;
                img.className = "suggestion-image";
                img.style.width = "50px";
                img.style.height = "50px";
                img.style.objectFit = "cover";
                img.style.marginRight = "10px";
                img.style.borderRadius = "5px";

                const span = document.createElement("span");
                span.textContent = product.product_name;

                li.appendChild(img);
                li.appendChild(span);

                li.onclick = () => {
                  searchInput.value = product.product_name;
                  suggestionBox.style.display = "none";
                  handleSearch();
                };

                suggestionBox.appendChild(li);
              });
              suggestionBox.style.display = "block";
            } else {
              suggestionBox.style.display = "none";
            }
          });

          // Hide suggestions when clicking outside
          document.addEventListener("click", (e) => {
            if (!e.target.closest(".search")) {
              suggestionBox.style.display = "none";
            }
          });

          // Search and redirect if exact match found
          function handleSearch() {
            const query = searchInput.value.trim();
            const matchingProduct = products.find(
              (product) => product.product_name === query
            );

            if (matchingProduct) {
              window.location.href = `product_overview.html?product_ID=${matchingProduct.product_id}`;
            } else {
              alert("No matching product found.");
            }
          }

          // Button click or Enter = search
          searchButton.addEventListener("click", handleSearch);
          searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSearch();
            }
          });

          // Filtering product cards (if present on page)
          const productCards = document.querySelectorAll(".product");
          function filterProducts() {
            const query = searchInput.value.trim().toLowerCase();

            productCards.forEach((product) => {
              const productName = product.dataset.name.toLowerCase();
              product.style.display = productName.includes(query)
                ? "block"
                : "none";
            });
          }

          searchInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
              event.preventDefault();
              filterProducts();
            }
          });

          searchButton.addEventListener("click", filterProducts);
        } catch (error) {
          console.error("Error fetching products:", error);
        }
      }

      // DRAG-TO-SCROLL FOR CATEGORIES (Updated selector)
      const carousel = document.querySelector(".categories-grid");
      if (carousel) {
        let isDown = false,
          startX,
          scrollLeft;

        carousel.addEventListener("mousedown", (e) => {
          isDown = true;
          carousel.classList.add("active");
          startX = e.pageX - carousel.offsetLeft;
          scrollLeft = carousel.scrollLeft;
        });

        carousel.addEventListener("mouseleave", () => {
          isDown = false;
          carousel.classList.remove("active");
        });

        carousel.addEventListener("mouseup", () => {
          isDown = false;
          carousel.classList.remove("active");
        });

        carousel.addEventListener("mousemove", (e) => {
          if (!isDown) return;
          e.preventDefault();
          const x = e.pageX - carousel.offsetLeft;
          const walk = (x - startX) * 1;
          carousel.scrollLeft = scrollLeft - walk;
        });
      }
    