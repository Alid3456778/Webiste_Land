(function () {
  function ensureToastElement() {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast hidden";
      toast.setAttribute("aria-live", "polite");
      toast.setAttribute("aria-atomic", "true");
      document.body.appendChild(toast);
    }
    return toast;
  }

  let toastTimer = null;

  window.showToast = function showToast(message, options) {
    const opts = options || {};
    const timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : 2500;

    const toast = ensureToastElement();
    toast.textContent = message;
    toast.classList.remove("hidden");

    // Force reflow so transition applies reliably when toggling classes quickly.
    // eslint-disable-next-line no-unused-expressions
    toast.offsetHeight;
    toast.classList.add("show");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.classList.add("hidden"), 220);
    }, timeoutMs);
  };

  function setupFooterToTopButtons() {
    document.querySelectorAll(".footer").forEach((footer) => {
      const bottom = footer.querySelector(".footer-bottom") || footer;
      if (!bottom.querySelector(".footer-top-btn")) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "footer-top-btn";
        btn.textContent = "Back to top";
        bottom.prepend(btn);
      }
    });

    document.querySelectorAll(".footer-top-btn").forEach((btn) => {
      if (btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", () => {
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
          window.scrollTo(0, 0);
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupFooterToTopButtons();
  });
})();
