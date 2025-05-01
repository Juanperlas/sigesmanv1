/**
 * Navbar and Topbar functionality
 */
document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarClose = document.getElementById("sidebarClose");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const searchToggle = document.getElementById("searchToggle");
  const mobileSearchBar = document.getElementById("mobileSearchBar");
  const closeSearch = document.getElementById("closeSearch");
  const body = document.body;

  // Toggle sidebar on mobile
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("show");
      sidebarOverlay.classList.toggle("show");
      body.style.overflow = sidebar.classList.contains("show") ? "hidden" : "";
    });
  }

  // Close sidebar on mobile
  if (sidebarClose) {
    sidebarClose.addEventListener("click", () => {
      sidebar.classList.remove("show");
      sidebarOverlay.classList.remove("show");
      body.style.overflow = "";
    });
  }

  // Close sidebar when clicking overlay
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", () => {
      sidebar.classList.remove("show");
      sidebarOverlay.classList.remove("show");
      body.style.overflow = "";
    });
  }

  // Toggle mobile search bar
  if (searchToggle) {
    searchToggle.addEventListener("click", () => {
      mobileSearchBar.classList.add("show");
    });
  }

  // Close mobile search bar
  if (closeSearch) {
    closeSearch.addEventListener("click", () => {
      mobileSearchBar.classList.remove("show");
    });
  }

  // Toggle sidebar collapsed state on desktop
  const toggleSidebarCollapsed = () => {
    body.classList.toggle("sidebar-collapsed");

    // Save preference in localStorage
    if (body.classList.contains("sidebar-collapsed")) {
      localStorage.setItem("sidebar-collapsed", "true");
    } else {
      localStorage.setItem("sidebar-collapsed", "false");
    }
  };

  // Desktop sidebar toggle
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", (e) => {
      if (window.innerWidth >= 992) {
        e.preventDefault();
        toggleSidebarCollapsed();
      }
    });
  }

  // Check for saved sidebar state
  const savedSidebarState = localStorage.getItem("sidebar-collapsed");
  if (savedSidebarState === "true") {
    body.classList.add("sidebar-collapsed");
  }

  // Add tooltip titles to menu items for collapsed sidebar
  const menuLinks = document.querySelectorAll(".sidebar-menu-link");
  menuLinks.forEach((link) => {
    const title = link.querySelector("span")?.textContent;
    if (title) {
      link.setAttribute("data-title", title);
    }
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    if (window.innerWidth < 992) {
      sidebar.classList.remove("show");
      sidebarOverlay.classList.remove("show");
      body.style.overflow = "";
    }
  });

  // Initialize Bootstrap tooltips
  if (
    typeof bootstrap !== "undefined" &&
    typeof bootstrap.Tooltip === "function"
  ) {
    const tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.map(
      (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
    );
  }

  // Add active class to parent menu item if submenu item is active
  const activeSubmenuItem = document.querySelector(
    ".sidebar-submenu-item.active"
  );
  if (activeSubmenuItem) {
    const parentMenuItem = activeSubmenuItem.closest(".sidebar-menu-item");
    if (parentMenuItem) {
      parentMenuItem.classList.add("active");
    }
  }
});
