// posts.js - Posts functionality
import { api, POSTS_PER_PAGE } from './config.js';
import { loadCommentCounts, fetchComments, deleteComment, editPost, deletePost } from './api.js';
import { escapeHtml, formatCommentDisplay, getCurrentUserId } from './utils.js';
import { checkForNewPublicComments, lastCheckedComments, newCommentNotifications, clearNotificationForPost } from './notifications.js';
import { highlightNewCommentsInContainer } from './highlight.js';

// Global variables
export let currentPage = 1;
export let allPosts = [];

const token = localStorage.getItem("token");

// Elements
const postsDiv = document.getElementById("posts");
const paginationDiv = document.getElementById("paginationControls");
const postForm = document.getElementById("createPostForm");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");

export async function loadPosts() {
  try {
    const res = await fetch(`${api}/posts`);
    if (!res.ok) throw new Error("Failed to fetch posts");
    allPosts = (await res.json()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    renderPage(currentPage);

    // Check for new public comments after loading posts
    await checkForNewPublicComments(allPosts, renderPage, currentPage);
  } catch (err) {
    postsDiv.innerHTML = `<p class="text-red-500">Error loading posts: ${err.message}</p>`;
  }
}

// Helper function to show comments for a specific post
async function showCommentsForPost(postId, container) {
  container.innerHTML = `<p class="text-gray-400 text-sm">Loading comments...</p>`;

  const comments = await fetchComments(postId);
  
  const commentsHTML = comments.length
    ? comments
        .map((c) => {
          const { displayName } = formatCommentDisplay(c);
          // Add delete button if user is logged in - ANY logged in user can delete ANY comment
          const deleteButton = token
            ? `<button class="delete-comment-btn text-xs gap-4 text-red-400 hover:text-red-600 ml-2" data-commentid="${c._id}" data-postid="${postId}">Delete</button>`
            : "";

          return `
            <div class="comment border-t border-gray-600 py-2">
              <p class="text-sm text-purple-300 font-semibold flex items-center">
                ${displayName}
                ${deleteButton}
              </p>
              <p class="text-gray-300 text-sm">${escapeHtml(c.text)}</p>
              <p class="text-xs text-gray-500">${new Date(
                c.createdAt
              ).toLocaleString()}</p>
            </div>
          `;
        })
        .join("")
    : `<p class="text-gray-400 text-sm italic">No comments yet.</p>`;

  const formHTML = token
    ? `
    <form class="comment-form mt-4">
      <textarea class="comment-text w-full px-3 py-3 text-sm rounded bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-600" rows="2" placeholder="Write a comment..."></textarea>
      <button type="submit" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 text-sm rounded shadow-md transition-colors duration-200">Post Comment</button>
    </form>
  `
    : `<p class="text-sm text-gray-400 mt-2 italic">Login to post a comment.</p>`;

  container.innerHTML = commentsHTML + formHTML;

  if (token) {
    addCommentListener(container, postId);
    addDeleteCommentListeners(container);
  }
}

// Add delete comment listeners
function addDeleteCommentListeners(container) {
  const deleteButtons = container.querySelectorAll(".delete-comment-btn");
  deleteButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const commentId = e.target.getAttribute("data-commentid");
      const postId = e.target.getAttribute("data-postid");

      if (confirm("Are you sure you want to delete this comment?")) {
        try {
          await deleteComment(commentId, postId);
          // Refresh the comments for this post
          const container = document.getElementById(`comments-for-${postId}`);
          if (container && !container.classList.contains("hidden")) {
            // Re-load and display comments
            showCommentsForPost(postId, container);
          }
          renderPage(currentPage);
        } catch (err) {
          alert("Error deleting comment: " + err.message);
        }
      }
    });
  });
}

// Render posts (updated to include edit and delete buttons)
async function renderPage(page) {
  currentPage = page;
  const start = (page - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;
  const pagePosts = allPosts.slice(start, end);
  const postIds = pagePosts.map((p) => p._id);
  const commentCounts = await loadCommentCounts(postIds);

  postsDiv.innerHTML = pagePosts
    .map((post, index) => {
      const previewLimit = 75;
      const isLong = post.body.length > previewLimit;
      const previewText = isLong
        ? post.body.slice(0, previewLimit) + "..."
        : post.body;
      const count = commentCounts[post._id] || 0;

      // Check if this post has new public comment notifications
      const hasNewComments = newCommentNotifications.has(post._id);
      const notificationBadge = hasNewComments
        ? '<span class="inline-block w-3 h-3 bg-red-500 rounded-full ml-2 animate-pulse"></span>'
        : "";

      // Add edit and delete buttons if user is logged in and it's their post
      const currentUserId = getCurrentUserId();
      const isOwner = token && post.userId === currentUserId;
      
      const editButton = isOwner
        ? `<button class="edit-post-btn text-sm text-yellow-400 hover:text-yellow-300 ml-4" data-postid="${post._id}" data-title="${escapeHtml(post.title)}" data-body="${escapeHtml(post.body)}">Edit</button>`
        : "";
      
      const deleteButton = isOwner
        ? `<button class="delete-post-btn text-sm text-red-400 hover:text-red-300 ml-2" data-postid="${post._id}">Delete</button>`
        : "";

      return `
        <article class="bg-gray-800 p-6 rounded-lg shadow-md mb-6 ${
          hasNewComments ? "border-2 border-blue-400" : ""
        }">
          <h3 class="text-xl font-semibold text-purple-400 mb-2 flex items-center">
            ${escapeHtml(post.title)}${notificationBadge}
            ${
              hasNewComments
                ? '<span class="text-xs text-blue-400 ml-2"> - New Comment</span>'
                : ""
            }
            ${editButton}
            ${deleteButton}
          </h3>
          <p class="text-gray-300 mb-2 post-body" data-full="${escapeHtml(
            post.body
          )}" data-index="${index}">
            ${escapeHtml(previewText)}
          </p>
          ${
            isLong
              ? `<button class="toggle-btn text-purple-300 hover:underline text-sm mb-4" data-index="${index}">Read more</button>`
              : ""
          }
          <p class="text-xs text-gray-500">
            by ${escapeHtml(post.author || "Anon")} on ${new Date(
        post.createdAt
      ).toLocaleDateString()} at ${new Date(post.createdAt).toLocaleTimeString(
        [],
        { hour: "2-digit", minute: "2-digit" }
      )}
          </p>
          <p class="text-sm text-purple-400 mt-2 mb-2">💬 ${count} comment${
        count !== 1 ? "s" : ""
      }</p>
          <button class="show-comments-btn text-sm text-blue-400 hover:underline mb-4" data-postid="${
            post._id
          }">Show Comments</button>
          <div class="comments-container hidden" id="comments-for-${
            post._id
          }"></div>
        </article>
      `;
    })
    .join("");

  addToggleListeners();
  addShowCommentsListeners();
  addEditPostListeners();
  addDeletePostListeners();
  renderPagination();
}

// ===== NEW POST EDIT/DELETE FUNCTIONALITY =====

// Add edit post listeners
function addEditPostListeners() {
  const editButtons = document.querySelectorAll(".edit-post-btn");
  editButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const postId = e.target.getAttribute("data-postid");
      const currentTitle = e.target.getAttribute("data-title");
      const currentBody = e.target.getAttribute("data-body");
      
      showEditModal(postId, currentTitle, currentBody);
    });
  });
}

// Add delete post listeners
function addDeletePostListeners() {
  const deleteButtons = document.querySelectorAll(".delete-post-btn");
  deleteButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const postId = e.target.getAttribute("data-postid");
      
      if (confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
        try {
          await deletePost(postId);
          
          // Remove post from allPosts array
          allPosts = allPosts.filter(post => post._id !== postId);
          
          // Re-render the page
          renderPage(currentPage);
          
          // Show success message
          showSuccessMessage("Post deleted successfully!");
        } catch (err) {
          alert("Error deleting post: " + err.message);
        }
      }
    });
  });
}

// Show edit modal
function showEditModal(postId, currentTitle, currentBody) {
  // Create modal HTML
  const modalHTML = `
    <div id="editModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-purple-400 mb-4">Edit Post</h3>
        <form id="editPostForm">
          <div class="mb-4">
            <label for="editTitle" class="block mb-2 font-medium text-gray-300">Title</label>
            <input type="text" id="editTitle" value="${escapeHtml(currentTitle)}" required
              class="w-full rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 transition" />
          </div>
          <div class="mb-6">
            <label for="editBody" class="block mb-2 font-medium text-gray-300">Content</label>
            <textarea id="editBody" rows="5" required
              class="w-full rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 transition">${escapeHtml(currentBody)}</textarea>
          </div>
          <div class="flex gap-3">
            <button type="submit" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-md transition">
              Save Changes
            </button>
            <button type="button" id="cancelEdit" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 rounded-md transition">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Add event listeners
  const modal = document.getElementById('editModal');
  const editForm = document.getElementById('editPostForm');
  const cancelBtn = document.getElementById('cancelEdit');
  const editTitle = document.getElementById('editTitle');
  const editBody = document.getElementById('editBody');
  
  // Focus on title input
  editTitle.focus();
  editTitle.select();
  
  // Cancel button
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Handle form submission
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newTitle = editTitle.value.trim();
    const newBody = editBody.value.trim();
    
    if (!newTitle || !newBody) {
      alert('Title and content are required.');
      return;
    }
    
    try {
      const updatedPost = await editPost(postId, newTitle, newBody);
      
      // Update the post in allPosts array
      const postIndex = allPosts.findIndex(post => post._id === postId);
      if (postIndex !== -1) {
        allPosts[postIndex] = { ...allPosts[postIndex], ...updatedPost };
      }
      
      // Re-render the page
      renderPage(currentPage);
      
      // Close modal
      modal.remove();
      
      // Show success message
      showSuccessMessage("Post updated successfully!");
    } catch (err) {
      alert("Error updating post: " + err.message);
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', function escapeHandler(e) {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  });
}

// Show success message
function showSuccessMessage(message) {
  const successHTML = `
    <div id="successMessage" class="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
      ${message}
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', successHTML);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    const successMsg = document.getElementById('successMessage');
    if (successMsg) {
      successMsg.remove();
    }
  }, 3000);
}

// Toggle Read More
function addToggleListeners() {
  const buttons = document.querySelectorAll(".toggle-btn");
  buttons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-index");
      const postBody = document.querySelector(
        `.post-body[data-index="${idx}"]`
      );
      const fullText = postBody.getAttribute("data-full");

      if (e.target.textContent === "Read more") {
        postBody.textContent = fullText;
        e.target.textContent = "Show less";
      } else {
        const previewLimit = 75;
        const previewText =
          fullText.length > previewLimit
            ? fullText.slice(0, previewLimit) + "..."
            : fullText;
        postBody.textContent = previewText;
        e.target.textContent = "Read more";
      }
    });
  });
}

// Show Comments (fixed to prevent random closing and properly handle notifications)
function addShowCommentsListeners() {
  const buttons = document.querySelectorAll(".show-comments-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const postId = e.target.getAttribute("data-postid");
      const container = document.getElementById(`comments-for-${postId}`);
      if (!container) return;

      if (!container.classList.contains("hidden")) {
        container.classList.add("hidden");
        e.target.textContent = "Show Comments";
        return;
      }

      // Check if this post has new comment notifications
      const hadNewComments = newCommentNotifications.has(postId);

      // Clear notification for this post when viewing comments
      if (hadNewComments) {
        // Get the last checked time before clearing notifications
        const lastChecked = lastCheckedComments[postId] || 0;
        
        clearNotificationForPost(postId);

        // Update just this post's styling without full re-render
        const postElement = btn.closest("article");
        if (postElement) {
          postElement.classList.remove("border-2", "border-blue-400");

          // Remove notification badge and text
          const title = postElement.querySelector("h3");
          if (title) {
            const badge = title.querySelector(".bg-red-500");
            const notificationText = title.querySelector(".text-blue-400");
            if (badge) badge.remove();
            if (notificationText) notificationText.remove();
          }
        }

        // Show comments first
        container.classList.remove("hidden");
        e.target.textContent = "Hide Comments";
        await showCommentsForPost(postId, container);

        // Then highlight new comments
        highlightNewCommentsInContainer(container, lastChecked);
      } else {
        // Show comments normally if no new notifications
        container.classList.remove("hidden");
        e.target.textContent = "Hide Comments";
        await showCommentsForPost(postId, container);
      }
    });
  });
}

// Submit comment (updated to prevent self-notifications)
function addCommentListener(container, postId) {
  const form = container.querySelector(".comment-form");
  const textarea = form.querySelector(".comment-text");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text) return;

    try {
      const res = await fetch(`${api}/comments/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          source: "dashboard", // Mark as dashboard comment to exclude from notifications
        }),
      });

      if (!res.ok) throw new Error("Failed to post comment");

      // Get the real comment data with the actual _id from the server
      const newComment = await res.json();
      textarea.value = "";

      // Update the lastCheckedComments timestamp to prevent self-notification
      lastCheckedComments[postId] = Date.now();
      localStorage.setItem(
        "lastCheckedComments",
        JSON.stringify(lastCheckedComments)
      );

      // Insert the new comment AT THE TOP of the comments container using REAL comment ID
      container.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="comment border-t border-gray-600 py-2">
          <p class="text-sm text-purple-300 font-semibold flex items-center gap-4">
            You
            <button class="delete-comment-btn text-xs text-red-400 hover:text-red-600" data-commentid="${
              newComment._id
            }" data-postid="${postId}">Delete</button>
          </p>
          <p class="text-gray-300 text-sm">${escapeHtml(text)}</p>
          <p class="text-xs text-gray-500">${new Date().toLocaleString()}</p>
        </div>
        `
      );

      // Add delete listener for the new comment
      addDeleteCommentListeners(container);
    } catch (err) {
      alert("Error posting comment: " + err.message);
    }
  });
}

// Pagination controls (ULTRA COMPACT - max 2 pages, matching public style)
function renderPagination() {
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  if (totalPages <= 1) {
    paginationDiv.innerHTML = "";
    return;
  }

  let buttonsHTML = `
    <button data-page="${currentPage - 1}" ${
    currentPage === 1 ? "disabled" : ""
  }
      class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 border border-gray-700 hover:border-purple-500">
      Prev
    </button>
  `;

  // Ultra compact pagination - max 2 pages
  let startPage, endPage;
  
  if (totalPages <= 2) {
    // Show all if 2 or fewer
    startPage = 1;
    endPage = totalPages;
  } else {
    // Always show exactly 2 pages
    if (currentPage === 1) {
      // At start: [1] [2] ... last
      startPage = 1;
      endPage = 2;
    } else if (currentPage === totalPages) {
      // At end: 1 ... [last-1] [last]
      startPage = totalPages - 1;
      endPage = totalPages;
    } else {
      // In middle: 1 ... [current] [current+1] ... last
      startPage = currentPage;
      endPage = Math.min(totalPages, currentPage + 1);
    }
  }

  // Add first page if not in range
  if (startPage > 1) {
    buttonsHTML += `
      <button data-page="1"
        class="px-4 py-2 rounded-lg transition-colors duration-200 border bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700 hover:border-purple-500">
        1
      </button>
    `;
    if (startPage > 2) {
      buttonsHTML += `<span class="px-2 py-2 text-gray-400">...</span>`;
    }
  }

  // Add the 2 main pages
  for (let i = startPage; i <= endPage; i++) {
    buttonsHTML += `
      <button data-page="${i}"
        class="px-4 py-2 rounded-lg transition-colors duration-200 border ${
          currentPage === i 
            ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-500" 
            : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700 hover:border-purple-500"
        }">
        ${i}
      </button>
    `;
  }

  // Add last page if not in range
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      buttonsHTML += `<span class="px-2 py-2 text-gray-400">...</span>`;
    }
    buttonsHTML += `
      <button data-page="${totalPages}"
        class="px-4 py-2 rounded-lg transition-colors duration-200 border bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700 hover:border-purple-500">
        ${totalPages}
      </button>
    `;
  }

  buttonsHTML += `
    <button data-page="${currentPage + 1}" ${
    currentPage === totalPages ? "disabled" : ""
  }
      class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 border border-gray-700 hover:border-purple-500">
      Next
    </button>
  `;

  paginationDiv.innerHTML = `<div class="flex flex-wrap items-center justify-center gap-2">${buttonsHTML}</div>`;

  paginationDiv.querySelectorAll("button[data-page]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const page = parseInt(btn.getAttribute("data-page"));
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        await renderPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });
}

// Create post form submit
export function initializeCreatePostForm() {
  if (postForm) {
    postForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = titleInput.value.trim();
      const body = bodyInput.value.trim();
      if (!title || !body) {
        alert("Title and body are required.");
        return;
      }

      try {
        const res = await fetch(`${api}/posts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title, body }),
        });
        if (!res.ok) throw new Error("Failed to create post");

        const newPost = await res.json();
        allPosts.unshift(newPost);
        renderPage(1);
        titleInput.value = "";
        bodyInput.value = "";
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        alert("Error creating post: " + err.message);
      }
    });
  }
}