// public-app.js - Modular public page application
import { api, POSTS_PER_PAGE } from './config.js';
import { loadCommentCounts, fetchComments } from './api.js';
import { escapeHtml, initializeMobileMenu, startDateTimeUpdates } from './utils.js';

// Global variables
let currentPage = 1;
let allPosts = [];

// Public notification system (simplified - just tracks when comments are added)
let lastPublicActivity = JSON.parse(
  localStorage.getItem("lastPublicActivity") || "{}"
);

// Initialize mobile menu and datetime
initializeMobileMenu();
startDateTimeUpdates();

// Helper to check valid MongoDB ObjectId
function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

async function loadPosts() {
  const res = await fetch(`${api}/posts`);
  allPosts = await res.json();
  renderPage(currentPage);
  
  // DON'T update notification timestamps - let the dashboard handle notifications
  // The public page should NOT interfere with dashboard notification tracking
}

async function renderPage(page) {
  const start = (page - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;
  const pagePosts = allPosts.slice(start, end);
  const postIds = pagePosts.map((post) => post._id);
  const commentCounts = await loadCommentCounts(postIds);

  const postsHTML = pagePosts
    .map((post) => {
      const previewText = post.body.split(". ").slice(0, 2).join(". ") + "...";
      const createdAt = new Date(post.createdAt).toLocaleString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const count = commentCounts[post._id] || 0;

      return `
                <div class="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 hover:border-purple-500 transition-colors duration-300" id="post-${
                  post._id
                }">
                    <!-- Header with title and timestamp -->
                    <div class="flex items-start justify-between gap-4 mb-4">
                        <h3 class="text-xl font-semibold text-purple-400 leading-tight flex-1">
                            ${escapeHtml(post.title)}
                        </h3>
                        <span class="text-xs text-gray-400 whitespace-nowrap mt-1">
                            ${createdAt}
                        </span>
                    </div>
                    
                    <!-- Preview text -->
                    <p class="text-gray-300 leading-relaxed mb-4" id="preview-${
                      post._id
                    }">
                        ${escapeHtml(previewText)}
                    </p>
                    
                    <!-- Footer with actions -->
                    <div class="flex items-center justify-between pt-2 border-t border-gray-700">
                        <button id="readMoreBtn-${
                          post._id
                        }" onclick="expandPost('${post._id}')" 
                            class="text-sm text-purple-400 hover:text-purple-300 hover:underline transition-colors duration-200">
                            Read More/Comment
                        </button>
                        <span class="text-sm text-gray-400">
                            💬 ${count} comment${count !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>
            `;
    })
    .join("");

  document.getElementById("postsContainer").innerHTML = postsHTML;
  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const container = document.getElementById("paginationControls");
  
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let buttonsHTML = `
        <button ${currentPage === 1 ? "disabled" : ""}
            onclick="goToPage(${currentPage - 1})"
            class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 border border-gray-700 hover:border-purple-500">
            Prev
        </button>
    `;

  // Maximum 4 page buttons with smart layout
  if (totalPages <= 4) {
    // Show all pages if 4 or fewer
    for (let i = 1; i <= totalPages; i++) {
      buttonsHTML += `
              <button
                  onclick="goToPage(${i})"
                  class="px-4 py-2 rounded-lg transition-colors duration-200 border ${
                    currentPage === i
                      ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700 hover:border-purple-500"
                  }"
              >
                  ${i}
              </button>
          `;
    }
  } else {
    // More than 4 pages - show strategic 4 pages
    let pagesToShow = [];
    
    if (currentPage <= 2) {
      // Near start: [1] [2] [...] [last]
      pagesToShow = [1, 2];
      if (totalPages > 3) {
        pagesToShow.push(totalPages);
      }
    } else if (currentPage >= totalPages - 1) {
      // Near end: [1] [...] [last-1] [last]
      pagesToShow = [1, totalPages - 1, totalPages];
    } else {
      // In middle: [1] [current] [...] [last] or [1] [...] [current] [last]
      pagesToShow = [1, currentPage, totalPages];
    }
    
    // Remove duplicates and sort
    pagesToShow = [...new Set(pagesToShow)].sort((a, b) => a - b);
    
    // Render the pages with ellipsis
    for (let i = 0; i < pagesToShow.length; i++) {
      const page = pagesToShow[i];
      const nextPage = pagesToShow[i + 1];
      
      // Add the page button
      buttonsHTML += `
              <button
                  onclick="goToPage(${page})"
                  class="px-4 py-2 rounded-lg transition-colors duration-200 border ${
                    currentPage === page
                      ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700 hover:border-purple-500"
                  }"
              >
                  ${page}
              </button>
          `;
      
      // Add ellipsis if there's a gap to the next page
      if (nextPage && nextPage > page + 1) {
        buttonsHTML += `<span class="px-2 py-2 text-gray-400">...</span>`;
      }
    }
  }

  buttonsHTML += `
        <button ${currentPage === totalPages ? "disabled" : ""}
            onclick="goToPage(${currentPage + 1})"
            class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 border border-gray-700 hover:border-purple-500">
            Next
        </button>
    `;

  container.innerHTML = `<div class="flex flex-wrap items-center justify-center gap-2">${buttonsHTML}</div>`;
}


// Make functions global so onclick handlers work
window.goToPage = function(page) {
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderPage(currentPage);
  const venmo_box = document.getElementById("venmo");
  if (venmo_box) {
    venmo_box.scrollIntoView({ behavior: "smooth" });
  }
}

// Open post in modal
window.expandPost = async function(postId) {
  const post = allPosts.find((p) => p._id === postId);
  const comments = await fetchComments(postId);

  const commentTimeFormat = (date) =>
    new Date(date).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const commentsHTML = comments.length
    ? comments
        .map(
          (c) => `
                    <div class="border-l-4 border-gray-600 pl-3 mb-2 text-sm">
                        <div><strong class="text-purple-300">${
                          escapeHtml(c.username) || "Anon"
                        }</strong> • <span class="text-gray-400 text-xs">${commentTimeFormat(
            c.createdAt
          )}</span></div>
                        <p>${escapeHtml(c.text)}</p>
                    </div>`
        )
        .join("")
    : `<p class="text-gray-500 text-sm">No comments yet.</p>`;

  const fullHTML = `
<!-- Title -->
<h3 class="text-2xl font-semibold text-purple-400 mb-4">${escapeHtml(post.title)}</h3>

<!-- Body -->
<p class="text-gray-300 mb-4">${escapeHtml(post.body)}</p>

<!-- Author + Time -->
<p class="text-xs text-gray-500 mb-4">
  by ${escapeHtml(post.author) || "Anon"} • ${commentTimeFormat(post.createdAt)}
</p>

<!-- Divider -->
<hr class="border-gray-700 mb-5" />

<!-- Comments Section -->
<div>
  <h4 class="text-sm text-purple-300 mb-3">Comments</h4>
  ${commentsHTML}
</div>

<!-- Comment Form -->
<form onsubmit="return postComment('${postId}', this, event)" class="mt-6 space-y-3">
  <input
  name="username"
  class="w-full px-3 py-2 text-sm rounded bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 mb-2"
  placeholder="Your name"
/>
<textarea
  name="text"
  class="w-full px-3 py-3 text-sm rounded bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-600"
  placeholder="Write a comment..."
  required
></textarea>

  <button
    class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 text-sm rounded shadow-md transition-colors duration-200"
  >
    Post Comment
  </button>
</form>
    `;

  document.getElementById("modalBody").innerHTML = fullHTML;
  document.getElementById("modalOverlay").classList.remove("hidden");
}

window.closeModal = function() {
  document.getElementById("modalOverlay").classList.add("hidden");
  document.getElementById("modalBody").innerHTML = "";
}

// Updated postComment - DON'T interfere with dashboard notifications
window.postComment = async function(postId, form, event) {
  event.preventDefault();

  const data = {
    username: form.username.value.trim() || "Anonymous",
    text: form.text.value.trim(),
    source: "public", // Mark as public comment
  };

  if (!data.text) {
    alert("Please enter a comment.");
    return false;
  }

  try {
    await fetch(`${api}/comments/${postId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    form.text.value = "";
    form.username.value = "";

    // Track that public activity happened (for internal use)
    lastPublicActivity[postId] = Date.now();
    localStorage.setItem("lastPublicActivity", JSON.stringify(lastPublicActivity));

    // DON'T update lastCheckedComments - let the dashboard handle this
    // This way, new public comments will show as notifications in the dashboard

    await expandPost(postId); // Refresh modal content

    // Update inline comment count
    const counts = await loadCommentCounts([postId]);
    const count = counts[postId] || 0;
    const countElem = document.querySelector(
      `#post-${postId} span.text-gray-400`
    );
    if (countElem && countElem.textContent.includes("comment")) {
      countElem.textContent = `💬 ${count} comment${count !== 1 ? "s" : ""}`;
    }

  } catch (err) {
    console.error("Error posting comment:", err);
    alert("Error posting comment. Please try again.");
  }

  return false;
}

// Load posts when page loads
loadPosts();