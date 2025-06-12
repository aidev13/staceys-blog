// public-app.js - Modular public page application (Security Enhanced)
import { api, POSTS_PER_PAGE } from './config.js';
import { loadCommentCounts, fetchComments } from './api.js';
import { escapeHtml, initializeMobileMenu, startDateTimeUpdates } from './utils.js';

// Global variables
let currentPage = 1;
let allPosts = [];

// Input validation constants
const MAX_USERNAME_LENGTH = 50;
const MAX_COMMENT_LENGTH = 1000;

// Public notification system (simplified - just tracks when comments are added)
let lastPublicActivity = {};

// Safe localStorage operations
function safeGetFromStorage(key, defaultValue = {}) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage: ${error.message}`);
    return defaultValue;
  }
}

function safeSetToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage: ${error.message}`);
    return false;
  }
}

// Initialize with safe localStorage access
lastPublicActivity = safeGetFromStorage("lastPublicActivity", {});

// Initialize mobile menu and datetime
initializeMobileMenu();
startDateTimeUpdates();

// Enhanced input validation
function validateInput(text, maxLength, fieldName) {
  if (!text || typeof text !== 'string') {
    throw new Error(`${fieldName} is required`);
  }
  
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
  
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or less`);
  }
  
  return trimmed;
}

// Helper to check valid MongoDB ObjectId
function isValidObjectId(id) {
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
}

// Secure DOM manipulation helpers
function createElementWithText(tagName, text, className = '') {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

// Special helper for preserving text formatting (line breaks, paragraphs, etc.)
function createElementWithFormattedText(tagName, text, className = '') {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) element.className = className;
  // Preserve whitespace and line breaks like in a textarea
  element.style.whiteSpace = 'pre-wrap';
  return element;
}

function createPostElement(post, commentCount) {
  const postDiv = document.createElement('div');
  postDiv.className = 'bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 hover:border-purple-500 transition-colors duration-300';
  postDiv.id = `post-${post._id}`;

  // Header section
  const headerDiv = document.createElement('div');
  headerDiv.className = 'flex items-start justify-between gap-4 mb-4';

  const titleH3 = createElementWithText('h3', post.title, 'text-xl font-semibold text-purple-400 leading-tight flex-1');
  
  const createdAt = new Date(post.createdAt).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  
  const timeSpan = createElementWithText('span', createdAt, 'text-xs text-gray-400 whitespace-nowrap mt-1');

  headerDiv.appendChild(titleH3);
  headerDiv.appendChild(timeSpan);

  // Preview text
  const previewText = post.body.split(". ").slice(0, 2).join(". ") + "...";
  const previewP = createElementWithFormattedText('p', previewText, 'text-gray-300 leading-relaxed mb-4');
  previewP.id = `preview-${post._id}`;

  // Footer section
  const footerDiv = document.createElement('div');
  footerDiv.className = 'flex items-center justify-between pt-2 border-t border-gray-700';

  const readMoreBtn = document.createElement('button');
  readMoreBtn.id = `readMoreBtn-${post._id}`;
  readMoreBtn.className = 'text-sm text-purple-400 hover:text-purple-300 hover:underline transition-colors duration-200';
  readMoreBtn.textContent = 'Read More/Comment';
  readMoreBtn.addEventListener('click', () => expandPost(post._id));

  const commentSpan = createElementWithText('span', 
    `💬 ${commentCount} comment${commentCount !== 1 ? "s" : ""}`,
    'text-sm text-gray-400'
  );

  footerDiv.appendChild(readMoreBtn);
  footerDiv.appendChild(commentSpan);

  // Assemble the post
  postDiv.appendChild(headerDiv);
  postDiv.appendChild(previewP);
  postDiv.appendChild(footerDiv);

  return postDiv;
}

async function loadPosts() {
  try {
    const res = await fetch(`${api}/posts`);
    if (!res.ok) throw new Error("Failed to fetch posts");
    
    allPosts = await res.json();
    
    // Validate post data
    allPosts = allPosts.filter(post => 
      post && 
      typeof post._id === 'string' && 
      typeof post.title === 'string' && 
      typeof post.body === 'string'
    );
    
    renderPage(currentPage);
  } catch (error) {
    console.error('Error loading posts:', error);
    const container = document.getElementById("postsContainer");
    if (container) {
      container.innerHTML = '';
      const errorP = createElementWithText('p', `Error loading posts: ${error.message}`, 'text-red-500 text-center p-4');
      container.appendChild(errorP);
    }
  }
}

async function renderPage(page) {
  try {
    const start = (page - 1) * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const pagePosts = allPosts.slice(start, end);
    const postIds = pagePosts.map((post) => post._id);
    const commentCounts = await loadCommentCounts(postIds);

    const postsContainer = document.getElementById("postsContainer");
    if (!postsContainer) return;

    // Clear container
    postsContainer.innerHTML = '';

    // Create post elements securely
    pagePosts.forEach(post => {
      const count = commentCounts[post._id] || 0;
      const postElement = createPostElement(post, count);
      postsContainer.appendChild(postElement);
    });

    renderPagination();
  } catch (error) {
    console.error('Error rendering page:', error);
  }
}

function renderPagination() {
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const container = document.getElementById("paginationControls");
  
  if (!container) return;
  
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  // Clear container
  container.innerHTML = '';
  
  const paginationDiv = document.createElement('div');
  paginationDiv.className = 'flex flex-wrap items-center justify-center gap-2';

  // Previous button
  const prevButton = document.createElement('button');
  prevButton.className = 'px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 border border-gray-700 hover:border-purple-500';
  prevButton.textContent = 'Prev';
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener('click', () => goToPage(currentPage - 1));
  paginationDiv.appendChild(prevButton);

  // Page buttons
  let pagesToShow = [];
  
  if (totalPages <= 4) {
    // Show all pages if 4 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pagesToShow.push(i);
    }
  } else {
    // More than 4 pages - show strategic 4 pages
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
  }
  
  // Render the pages with ellipsis
  for (let i = 0; i < pagesToShow.length; i++) {
    const page = pagesToShow[i];
    const nextPage = pagesToShow[i + 1];
    
    // Add the page button
    const pageButton = document.createElement('button');
    pageButton.className = `px-4 py-2 rounded-lg transition-colors duration-200 border ${
      currentPage === page
        ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
        : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700 hover:border-purple-500"
    }`;
    pageButton.textContent = page.toString();
    pageButton.addEventListener('click', () => goToPage(page));
    paginationDiv.appendChild(pageButton);
    
    // Add ellipsis if there's a gap to the next page
    if (nextPage && nextPage > page + 1) {
      const ellipsis = createElementWithText('span', '...', 'px-2 py-2 text-gray-400');
      paginationDiv.appendChild(ellipsis);
    }
  }

  // Next button
  const nextButton = document.createElement('button');
  nextButton.className = 'px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 border border-gray-700 hover:border-purple-500';
  nextButton.textContent = 'Next';
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener('click', () => goToPage(currentPage + 1));
  paginationDiv.appendChild(nextButton);

  container.appendChild(paginationDiv);
}

// Secure pagination function
function goToPage(page) {
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  
  // Validate page number
  if (!Number.isInteger(page) || page < 1 || page > totalPages || page === currentPage) {
    return;
  }
  
  currentPage = page;
  renderPage(currentPage);
  
  const venmo_box = document.getElementById("venmo");
  if (venmo_box) {
    venmo_box.scrollIntoView({ behavior: "smooth" });
  }
}

// Create comment element securely
function createCommentElement(comment) {
  const commentDiv = document.createElement('div');
  commentDiv.className = 'border-l-4 border-gray-600 pl-3 mb-2 text-sm';

  const headerDiv = document.createElement('div');
  
  const usernameStrong = createElementWithText('strong', comment.username || "Anon", 'text-purple-300');
  
  const separator = createElementWithText('span', ' • ', '');
  
  const commentTimeFormat = (date) =>
    new Date(date).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    
  const timeSpan = createElementWithText('span', commentTimeFormat(comment.createdAt), 'text-gray-400 text-xs');

  headerDiv.appendChild(usernameStrong);
  headerDiv.appendChild(separator);
  headerDiv.appendChild(timeSpan);

  const textP = createElementWithFormattedText('p', comment.text, '');

  commentDiv.appendChild(headerDiv);
  commentDiv.appendChild(textP);

  return commentDiv;
}

// Secure modal creation
async function expandPost(postId) {
  if (!isValidObjectId(postId)) {
    console.error('Invalid post ID');
    return;
  }

  try {
    const post = allPosts.find((p) => p._id === postId);
    if (!post) {
      throw new Error('Post not found');
    }

    const comments = await fetchComments(postId);
    
    const modalBody = document.getElementById("modalBody");
    if (!modalBody) return;

    // Clear modal body
    modalBody.innerHTML = '';

    // Create modal content securely
    const titleH3 = createElementWithText('h3', post.title, 'text-2xl font-semibold text-purple-400 mb-4');
    modalBody.appendChild(titleH3);

    const bodyP = createElementWithFormattedText('p', post.body, 'text-gray-300 mb-4');
    modalBody.appendChild(bodyP);

    const commentTimeFormat = (date) =>
      new Date(date).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    const authorP = createElementWithText('p', 
      `by ${post.author || "Anon"} • ${commentTimeFormat(post.createdAt)}`,
      'text-xs text-gray-500 mb-4'
    );
    modalBody.appendChild(authorP);

    // Divider
    const hr = document.createElement('hr');
    hr.className = 'border-gray-700 mb-5';
    modalBody.appendChild(hr);

    // Comments section
    const commentsDiv = document.createElement('div');
    const commentsH4 = createElementWithText('h4', 'Comments', 'text-sm text-purple-300 mb-3');
    commentsDiv.appendChild(commentsH4);

    if (comments.length === 0) {
      const noCommentsP = createElementWithText('p', 'No comments yet.', 'text-gray-500 text-sm');
      commentsDiv.appendChild(noCommentsP);
    } else {
      comments.forEach(comment => {
        const commentElement = createCommentElement(comment);
        commentsDiv.appendChild(commentElement);
      });
    }

    modalBody.appendChild(commentsDiv);

    // Comment form
    const form = createCommentForm(postId);
    modalBody.appendChild(form);

    const modalOverlay = document.getElementById("modalOverlay");
    if (modalOverlay) {
      modalOverlay.classList.remove("hidden");
    }

  } catch (error) {
    console.error('Error expanding post:', error);
    alert('Error loading post details. Please try again.');
  }
}

// Create comment form securely
function createCommentForm(postId) {
  const form = document.createElement('form');
  form.className = 'mt-6 space-y-3';

  // Username input
  const usernameInput = document.createElement('input');
  usernameInput.name = 'username';
  usernameInput.className = 'w-full px-3 py-2 text-sm rounded bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 mb-2';
  usernameInput.placeholder = 'Your name';
  usernameInput.maxLength = MAX_USERNAME_LENGTH;

  // Comment textarea
  const textArea = document.createElement('textarea');
  textArea.name = 'text';
  textArea.className = 'w-full px-3 py-3 text-sm rounded bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-600';
  textArea.placeholder = 'Write a comment...';
  textArea.required = true;
  textArea.maxLength = MAX_COMMENT_LENGTH;

  // Submit button
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 text-sm rounded shadow-md transition-colors duration-200';
  submitButton.textContent = 'Post Comment';

  form.appendChild(usernameInput);
  form.appendChild(textArea);
  form.appendChild(submitButton);

  // Add form validation and submit handler
  textArea.addEventListener('input', () => {
    if (textArea.value.length > MAX_COMMENT_LENGTH) {
      textArea.setCustomValidity(`Comment must be ${MAX_COMMENT_LENGTH} characters or less`);
    } else {
      textArea.setCustomValidity('');
    }
  });

  usernameInput.addEventListener('input', () => {
    if (usernameInput.value.length > MAX_USERNAME_LENGTH) {
      usernameInput.setCustomValidity(`Username must be ${MAX_USERNAME_LENGTH} characters or less`);
    } else {
      usernameInput.setCustomValidity('');
    }
  });

  form.addEventListener('submit', (event) => postComment(postId, form, event));

  return form;
}

function closeModal() {
  const modalOverlay = document.getElementById("modalOverlay");
  const modalBody = document.getElementById("modalBody");
  
  if (modalOverlay) {
    modalOverlay.classList.add("hidden");
  }
  if (modalBody) {
    modalBody.innerHTML = "";
  }
}

// Secure comment posting function
async function postComment(postId, form, event) {
  event.preventDefault();

  if (!isValidObjectId(postId)) {
    alert("Invalid post ID");
    return false;
  }

  try {
    const usernameInput = form.querySelector('input[name="username"]');
    const textInput = form.querySelector('textarea[name="text"]');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!textInput || !usernameInput || !submitButton) {
      throw new Error("Form elements not found");
    }

    // Validate inputs
    const username = usernameInput.value.trim() || "Anonymous";
    const text = validateInput(textInput.value, MAX_COMMENT_LENGTH, 'Comment');
    
    // Validate username if provided
    if (username !== "Anonymous") {
      validateInput(username, MAX_USERNAME_LENGTH, 'Username');
    }

    const data = {
      username: username,
      text: text,
      source: "public", // Mark as public comment
    };

    // Show loading state
    const originalText = submitButton.textContent;
    submitButton.textContent = '⏳ Posting...';
    submitButton.disabled = true;

    const response = await fetch(`${api}/comments/${postId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to post comment");
    }

    // Clear form
    textInput.value = "";
    usernameInput.value = "";

    // Track that public activity happened (for internal use)
    lastPublicActivity[postId] = Date.now();
    safeSetToStorage("lastPublicActivity", lastPublicActivity);

    // Refresh modal content
    await expandPost(postId);

    // Update inline comment count
    try {
      const counts = await loadCommentCounts([postId]);
      const count = counts[postId] || 0;
      const postElement = document.getElementById(`post-${postId}`);
      if (postElement) {
        const countElem = postElement.querySelector('span.text-gray-400');
        if (countElem && countElem.textContent.includes("comment")) {
          countElem.textContent = `💬 ${count} comment${count !== 1 ? "s" : ""}`;
        }
      }
    } catch (countError) {
      console.error('Error updating comment count:', countError);
    }

    // Reset button state
    submitButton.textContent = originalText;
    submitButton.disabled = false;

  } catch (err) {
    console.error("Error posting comment:", err);
    alert("Error posting comment: " + err.message);
    
    // Reset button state on error
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'Post Comment';
      submitButton.disabled = false;
    }
  }

  return false;
}

// Make functions global so they can be called from other parts of the app
window.goToPage = goToPage;
window.expandPost = expandPost;
window.closeModal = closeModal;
window.postComment = postComment;

// Load posts when page loads
loadPosts();