// utils.js - Utility functions
// Escape HTML
export function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ObjectId validation
export function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

// Helper function to format display name
export function formatCommentDisplay(comment) {
  let displayName;

  if (!comment.username || comment.username.trim() === "") {
    displayName = "Anonymous";
  } else {
    displayName = escapeHtml(comment.username);
  }

  return { displayName, badgeHtml: "" };
}

// Get current user ID (you'll need to decode this from the token or store it during login)
export function getCurrentUserId() {
  // This is a simplified version - in a real app, you'd decode the JWT token
  // For now, we'll assume the userId is stored in localStorage during login
  return localStorage.getItem("userId");
}

// Mobile menu toggle
export function initializeMobileMenu() {
  document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("navToggle");
    const menu = document.getElementById("navMenu");

    toggleBtn.addEventListener("click", () => {
      menu.classList.toggle("hidden");
      toggleBtn.setAttribute("aria-expanded", !menu.classList.contains("hidden"));
    });
  });
}

// DateTime functions
export function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now.toLocaleDateString(undefined, options);
  document.getElementById("datetime").textContent = `${date} • ${time}`;
}

export function startDateTimeUpdates() {
  updateDateTime();
  setInterval(updateDateTime, 1000);
}