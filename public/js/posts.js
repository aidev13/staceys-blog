// posts.js - Posts functionality (Security Enhanced)
import { api, POSTS_PER_PAGE } from './config.js';
import { loadCommentCounts, fetchComments, deleteComment } from './api.js';
import { escapeHtml, formatCommentDisplay, getCurrentUserId } from './utils.js';
import { checkForNewPublicComments, lastCheckedComments, newCommentNotifications, clearNotificationForPost } from './notifications.js';
import { highlightNewCommentsInContainer } from './highlight.js';

// Global variables
export let currentPage = 1;
export let allPosts = [];

const token = localStorage.getItem("token");

// Draft auto-save variables
let draftSaveTimeout;
const DRAFT_SAVE_DELAY = 500; // 500ms debounce
const DRAFT_TITLE_KEY = "draftPostTitle";
const DRAFT_BODY_KEY = "draftPostBody";

// Input validation constants
const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 10000;
const MAX_COMMENT_LENGTH = 1000;

// Elements
const postsDiv = document.getElementById("posts");
const paginationDiv = document.getElementById("paginationControls");
const postForm = document.getElementById("createPostForm");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");

// Helper function to get current username from token (with validation)
function getCurrentUsername() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    
    // Basic token expiration check
    if (payload.exp && payload.exp < Date.now() / 1000) {
      localStorage.removeItem('token');
      return null;
    }
    
    return payload.username || null;
  } catch (error) {
    console.error('Invalid token format');
    localStorage.removeItem('token');
    return null;
  }
}

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

// Secure DOM manipulation helper
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

// Safe HTML creation for structured content
function createCommentElement(comment, postId, canDelete = false) {
  const commentDiv = document.createElement('div');
  commentDiv.className = 'comment border-t border-gray-600 py-2';
  
  const headerP = document.createElement('p');
  headerP.className = 'text-sm text-purple-300 font-semibold flex items-center';
  
  const { displayName } = formatCommentDisplay(comment);
  const nameSpan = createElementWithText('span', displayName);
  headerP.appendChild(nameSpan);
  
  // Add delete button if user can delete
  if (canDelete) {
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-comment-btn text-xs gap-4 text-red-400 hover:text-red-600 ml-2';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('data-commentid', comment._id);
    deleteButton.setAttribute('data-postid', postId);
    headerP.appendChild(deleteButton);
  }
  
  const textP = createElementWithFormattedText('p', comment.text, 'text-gray-300 text-sm');
  const timeP = createElementWithText('p', new Date(comment.createdAt).toLocaleString(), 'text-xs text-gray-500');
  
  commentDiv.appendChild(headerP);
  commentDiv.appendChild(textP);
  commentDiv.appendChild(timeP);
  
  return commentDiv;
}

// Draft auto-save functions (with input validation)
function saveDraftToStorage() {
  if (titleInput && bodyInput) {
    try {
      const title = titleInput.value.trim();
      const body = bodyInput.value.trim();
      
      // Validate input lengths before saving
      if (title.length > MAX_TITLE_LENGTH || body.length > MAX_BODY_LENGTH) {
        return; // Don't save invalid drafts
      }
      
      if (title || body) {
        localStorage.setItem(DRAFT_TITLE_KEY, title);
        localStorage.setItem(DRAFT_BODY_KEY, body);
        showDraftSavedIndicator();
      } else {
        clearDraftFromStorage();
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }
}

function debouncedSaveDraft() {
  clearTimeout(draftSaveTimeout);
  draftSaveTimeout = setTimeout(saveDraftToStorage, DRAFT_SAVE_DELAY);
}

function loadDraftFromStorage() {
  if (titleInput && bodyInput) {
    try {
      const savedTitle = localStorage.getItem(DRAFT_TITLE_KEY);
      const savedBody = localStorage.getItem(DRAFT_BODY_KEY);
      
      // Validate loaded content
      if (savedTitle && savedTitle.length <= MAX_TITLE_LENGTH) {
        titleInput.value = savedTitle;
      }
      if (savedBody && savedBody.length <= MAX_BODY_LENGTH) {
        bodyInput.value = savedBody;
      }
      
      if (savedTitle || savedBody) {
        showDraftLoadedIndicator();
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      clearDraftFromStorage();
    }
  }
}

function clearDraftFromStorage() {
  try {
    localStorage.removeItem(DRAFT_TITLE_KEY);
    localStorage.removeItem(DRAFT_BODY_KEY);
    hideDraftIndicator();
  } catch (error) {
    console.error('Error clearing draft:', error);
  }
}

function showDraftSavedIndicator() {
  let indicator = document.getElementById("draftIndicator");
  if (!indicator) {
    indicator = createElementWithText("div", "Draft saved", "text-xs text-green-400 mt-1");
    indicator.id = "draftIndicator";
    if (bodyInput && bodyInput.parentNode) {
      bodyInput.parentNode.insertBefore(indicator, bodyInput.nextSibling);
    }
  } else {
    indicator.textContent = "Draft saved";
    indicator.className = "text-xs text-green-400 mt-1";
  }
  indicator.style.opacity = "1";
  
  setTimeout(() => {
    if (indicator) {
      indicator.style.opacity = "0.5";
    }
  }, 2000);
}

function showDraftLoadedIndicator() {
  let indicator = document.getElementById("draftIndicator");
  if (!indicator) {
    indicator = createElementWithText("div", "Draft restored", "text-xs text-blue-400 mt-1");
    indicator.id = "draftIndicator";
    if (bodyInput && bodyInput.parentNode) {
      bodyInput.parentNode.insertBefore(indicator, bodyInput.nextSibling);
    }
  } else {
    indicator.textContent = "Draft restored";
    indicator.className = "text-xs text-blue-400 mt-1";
  }
  indicator.style.opacity = "1";
  
  setTimeout(() => {
    if (indicator) {
      indicator.style.opacity = "0.5";
    }
  }, 3000);
}

function hideDraftIndicator() {
  const indicator = document.getElementById("draftIndicator");
  if (indicator) {
    indicator.remove();
  }
}

function setupDraftAutoSave() {
  if (titleInput) {
    titleInput.addEventListener("input", debouncedSaveDraft);
    // Add input validation feedback
    titleInput.addEventListener("input", () => {
      if (titleInput.value.length > MAX_TITLE_LENGTH) {
        titleInput.setCustomValidity(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
      } else {
        titleInput.setCustomValidity('');
      }
    });
  }
  if (bodyInput) {
    bodyInput.addEventListener("input", debouncedSaveDraft);
    // Add input validation feedback
    bodyInput.addEventListener("input", () => {
      if (bodyInput.value.length > MAX_BODY_LENGTH) {
        bodyInput.setCustomValidity(`Body must be ${MAX_BODY_LENGTH} characters or less`);
      } else {
        bodyInput.setCustomValidity('');
      }
    });
  }
}

export async function loadPosts() {
  try {
    const res = await fetch(`${api}/posts`);
    if (!res.ok) throw new Error("Failed to fetch posts");
    allPosts = (await res.json()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    renderPage(currentPage);

    await checkForNewPublicComments(allPosts, renderPage, currentPage);
  } catch (err) {
    postsDiv.textContent = `Error loading posts: ${err.message}`;
    postsDiv.className = "text-red-500";
  }
}

// Helper function to show comments for a specific post (SECURE VERSION)
async function showCommentsForPost(postId, container) {
  container.innerHTML = '';
  const loadingP = createElementWithText('p', 'Loading comments...', 'text-gray-400 text-sm');
  container.appendChild(loadingP);

  try {
    const comments = await fetchComments(postId);
    
    // Clear container
    container.innerHTML = '';
    
    if (comments.length === 0) {
      const noCommentsP = createElementWithText('p', 'No comments yet.', 'text-gray-400 text-sm italic');
      container.appendChild(noCommentsP);
    } else {
      comments.forEach(comment => {
        // Add delete button if user is logged in - ANY logged in user can delete ANY comment
        // (preserving original functionality - server should validate)
        const canDelete = !!token;
        
        const commentElement = createCommentElement(comment, postId, canDelete);
        container.appendChild(commentElement);
      });
    }

    // Add comment form
    if (token) {
      const form = createCommentForm(postId);
      container.appendChild(form);
      addCommentListener(container, postId);
      addDeleteCommentListeners(container);
    } else {
      const loginP = createElementWithText('p', 'Login to post a comment.', 'text-sm text-gray-400 mt-2 italic');
      container.appendChild(loginP);
    }
  } catch (error) {
    container.innerHTML = '';
    const errorP = createElementWithText('p', `Error loading comments: ${error.message}`, 'text-red-500 text-sm');
    container.appendChild(errorP);
  }
}

// Create comment form securely
function createCommentForm(postId) {
  const form = document.createElement('form');
  form.className = 'comment-form mt-4';
  
  const textarea = document.createElement('textarea');
  textarea.className = 'comment-text w-full px-3 py-3 text-sm rounded bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-600';
  textarea.rows = 2;
  textarea.placeholder = 'Write a comment...';
  textarea.maxLength = MAX_COMMENT_LENGTH;
  
  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 text-sm rounded shadow-md transition-colors duration-200';
  button.textContent = 'Post Comment';
  
  form.appendChild(textarea);
  form.appendChild(button);
  
  return form;
}

// Add delete comment listeners (with enhanced security)
function addDeleteCommentListeners(container) {
  const deleteButtons = container.querySelectorAll(".delete-comment-btn");
  deleteButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const commentId = e.target.getAttribute("data-commentid");
      const postId = e.target.getAttribute("data-postid");

      if (!commentId || !postId) {
        alert("Invalid comment data");
        return;
      }

      if (confirm("Are you sure you want to delete this comment?")) {
        try {
          await deleteComment(commentId, postId);
          const container = document.getElementById(`comments-for-${postId}`);
          if (container && !container.classList.contains("hidden")) {
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

// Render posts (SECURE VERSION with proper DOM manipulation)
async function renderPage(page) {
  currentPage = page;
  const start = (page - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;
  const pagePosts = allPosts.slice(start, end);
  const postIds = pagePosts.map((p) => p._id);
  const commentCounts = await loadCommentCounts(postIds);

  // Clear posts container
  postsDiv.innerHTML = '';

  pagePosts.forEach((post, index) => {
    const article = createPostElement(post, index, commentCounts);
    postsDiv.appendChild(article);
  });

  addToggleListeners();
  addShowCommentsListeners();
  addEditPostListeners();
  renderPagination();
}

// Create post element securely
function createPostElement(post, index, commentCounts) {
  const article = document.createElement('article');
  const previewLimit = 75;
  const isLong = post.body.length > previewLimit;
  const previewText = isLong ? post.body.slice(0, previewLimit) + "..." : post.body;
  const count = commentCounts[post._id] || 0;
  const hasNewComments = newCommentNotifications.has(post._id);
  
  article.className = `bg-gray-800 p-6 rounded-lg shadow-md mb-6 ${hasNewComments ? "border-2 border-blue-400" : ""}`;
  
  // Header div
  const headerDiv = document.createElement('div');
  headerDiv.className = 'flex items-start justify-between mb-2';
  
  // Title container
  const titleContainer = document.createElement('div');
  titleContainer.className = 'flex items-center';
  
  const titleH3 = createElementWithText('h3', post.title, 'text-xl font-semibold text-purple-400');
  titleContainer.appendChild(titleH3);
  
  if (hasNewComments) {
    const badge = document.createElement('span');
    badge.className = 'inline-block w-3 h-3 bg-red-500 rounded-full ml-2 animate-pulse';
    titleContainer.appendChild(badge);
    
    const newCommentText = createElementWithText('span', ' - New Comment', 'text-xs text-blue-400 ml-2');
    titleContainer.appendChild(newCommentText);
  }
  
  headerDiv.appendChild(titleContainer);
  
  // Edit button (server validation required)
  const currentUsername = getCurrentUsername();
  if (token && post.author === currentUsername) {
    const editButton = document.createElement('button');
    editButton.className = 'edit-post-btn text-yellow px-3 py-1 rounded text-sm font-medium transition-colors duration-200';
    editButton.textContent = 'Edit';
    editButton.setAttribute('data-postid', post._id);
    editButton.setAttribute('data-title', post.title);
    editButton.setAttribute('data-body', post.body);
    headerDiv.appendChild(editButton);
  }
  
  article.appendChild(headerDiv);
  
  // Post body
  const bodyP = createElementWithFormattedText('p', previewText, 'text-gray-300 mb-2 post-body');
  bodyP.setAttribute('data-full', post.body);
  bodyP.setAttribute('data-index', index.toString());
  article.appendChild(bodyP);
  
  // Read more button
  if (isLong) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-btn text-purple-300 hover:underline text-sm mb-4';
    toggleBtn.textContent = 'Read more';
    toggleBtn.setAttribute('data-index', index.toString());
    article.appendChild(toggleBtn);
  }
  
  // Author and date
  const authorP = createElementWithText('p', 
    `by ${post.author || "Anon"} on ${new Date(post.createdAt).toLocaleDateString()} at ${new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    'text-xs text-gray-500'
  );
  article.appendChild(authorP);
  
  // Comment count
  const commentCountP = createElementWithText('p', 
    `💬 ${count} comment${count !== 1 ? "s" : ""}`,
    'text-sm text-purple-400 mt-2 mb-2'
  );
  article.appendChild(commentCountP);
  
  // Show comments button
  const showCommentsBtn = document.createElement('button');
  showCommentsBtn.className = 'show-comments-btn text-sm text-blue-400 hover:underline mb-4';
  showCommentsBtn.textContent = 'Show Comments';
  showCommentsBtn.setAttribute('data-postid', post._id);
  article.appendChild(showCommentsBtn);
  
  // Comments container
  const commentsContainer = document.createElement('div');
  commentsContainer.className = 'comments-container hidden';
  commentsContainer.id = `comments-for-${post._id}`;
  article.appendChild(commentsContainer);
  
  return article;
}

// Add edit post listeners (with enhanced validation)
function addEditPostListeners() {
  const editButtons = document.querySelectorAll(".edit-post-btn");
  editButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Prevent event bubbling that might interfere with other listeners
      e.preventDefault();
      e.stopPropagation();
      
      const postId = e.target.getAttribute("data-postid");
      const title = e.target.getAttribute("data-title");
      const body = e.target.getAttribute("data-body");
      
      if (!postId || !title || !body) {
        alert("Invalid post data");
        return;
      }
      
      // Double-check ownership client-side (server must validate)
      const currentUsername = getCurrentUsername();
      if (!currentUsername) {
        alert("Please log in to edit posts");
        return;
      }
      
      showEditForm(postId, title, body);
    });
  });
}

// Edit post functionality (SECURE VERSION)
function showEditForm(postId, currentTitle, currentBody) {
  const postElement = document.querySelector(`[data-postid="${postId}"]`).closest('article');
  
  postElement.style.display = 'none';
  
  const editForm = document.createElement('div');
  editForm.className = 'edit-form bg-gray-800 p-6 rounded-lg shadow-md mb-6 border border-gray-700';
  
  // Create form elements securely
  const titleH3 = createElementWithText('h3', 'Edit Post', 'text-xl font-semibold text-purple-400 mb-6');
  editForm.appendChild(titleH3);
  
  const form = document.createElement('form');
  form.className = 'edit-post-form space-y-6';
  
  // Title section
  const titleDiv = document.createElement('div');
  const titleLabel = createElementWithText('label', 'Post Title', 'block text-sm font-medium text-gray-300 mb-2');
  titleLabel.setAttribute('for', `edit-title-${postId}`);
  
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.id = `edit-title-${postId}`;
  titleInput.className = 'edit-title w-full px-4 py-3 rounded bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600';
  titleInput.placeholder = 'Enter your post title...';
  titleInput.value = currentTitle;
  titleInput.maxLength = MAX_TITLE_LENGTH;
  titleInput.required = true;
  
  titleDiv.appendChild(titleLabel);
  titleDiv.appendChild(titleInput);
  
  // Body section
  const bodyDiv = document.createElement('div');
  const bodyLabel = createElementWithText('label', 'Post Content', 'block text-sm font-medium text-gray-300 mb-2');
  bodyLabel.setAttribute('for', `edit-body-${postId}`);
  
  const bodyTextarea = document.createElement('textarea');
  bodyTextarea.id = `edit-body-${postId}`;
  bodyTextarea.rows = 8;
  bodyTextarea.className = 'edit-body w-full px-4 py-3 rounded bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-600';
  bodyTextarea.placeholder = "What's on your mind?";
  bodyTextarea.value = currentBody;
  bodyTextarea.maxLength = MAX_BODY_LENGTH;
  bodyTextarea.required = true;
  
  bodyDiv.appendChild(bodyLabel);
  bodyDiv.appendChild(bodyTextarea);
  
  // Buttons
  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'flex gap-4';
  
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 text-sm rounded shadow-md transition-colors duration-200';
  submitBtn.textContent = 'Update Post';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'cancel-edit bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 text-sm rounded transition-colors duration-200';
  cancelBtn.textContent = 'Cancel';
  
  buttonsDiv.appendChild(submitBtn);
  buttonsDiv.appendChild(cancelBtn);
  
  form.appendChild(titleDiv);
  form.appendChild(bodyDiv);
  form.appendChild(buttonsDiv);
  
  editForm.appendChild(form);
  
  postElement.parentNode.insertBefore(editForm, postElement);
  
  form.addEventListener('submit', (e) => handleEditSubmit(e, postId, editForm, postElement));
  cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    cancelEdit(editForm, postElement);
  });
  
  titleInput.focus();
}

async function handleEditSubmit(event, postId, editForm, originalPost) {
  event.preventDefault();
  
  const titleInput = editForm.querySelector('.edit-title');
  const bodyInput = editForm.querySelector('.edit-body');
  const submitBtn = editForm.querySelector('button[type="submit"]');
  
  try {
    const title = validateInput(titleInput.value, MAX_TITLE_LENGTH, 'Title');
    const body = validateInput(bodyInput.value, MAX_BODY_LENGTH, 'Body');
    
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Updating...';
    submitBtn.disabled = true;
    
    const response = await fetch(`${api}/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, body })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update post');
    }
    
    const updatedPost = await response.json();
    
    const postIndex = allPosts.findIndex(p => p._id === postId);
    if (postIndex !== -1) {
      allPosts[postIndex] = { ...allPosts[postIndex], ...updatedPost };
    }
    
    cancelEdit(editForm, originalPost);
    showSuccessMessage('✅ Post updated successfully!');
    renderPage(currentPage);
    
  } catch (error) {
    console.error('Error updating post:', error);
    alert('Error updating post: ' + error.message);
    
    submitBtn.textContent = 'Update Post';
    submitBtn.disabled = false;
  }
}

function cancelEdit(editForm, originalPost) {
  editForm.remove();
  originalPost.style.display = 'block';
}

function showSuccessMessage(message) {
  const notification = createElementWithText('div', message, 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300');
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Toggle Read More
function addToggleListeners() {
  const buttons = document.querySelectorAll(".toggle-btn");
  buttons.forEach((button) => {
    button.addEventListener("click", (e) => {
      // Prevent event bubbling that might interfere with other listeners
      e.preventDefault();
      e.stopPropagation();
      
      const idx = e.target.getAttribute("data-index");
      const postBody = document.querySelector(`.post-body[data-index="${idx}"]`);
      
      if (!postBody) return;
      
      const fullText = postBody.getAttribute("data-full");
      if (!fullText) return;

      if (e.target.textContent === "Read more") {
        postBody.textContent = fullText;
        postBody.style.whiteSpace = 'pre-wrap'; // Preserve formatting for full text
        e.target.textContent = "Show less";
      } else {
        const previewLimit = 75;
        const previewText = fullText.length > previewLimit
          ? fullText.slice(0, previewLimit) + "..."
          : fullText;
        postBody.textContent = previewText;
        postBody.style.whiteSpace = 'pre-wrap'; // Preserve formatting for preview text
        e.target.textContent = "Read more";
      }
    });
  });
}

// Show Comments (with enhanced security)
function addShowCommentsListeners() {
  const buttons = document.querySelectorAll(".show-comments-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      // Prevent event bubbling that might interfere with other listeners
      e.preventDefault();
      e.stopPropagation();
      
      const postId = e.target.getAttribute("data-postid");
      if (!postId) return;
      
      const container = document.getElementById(`comments-for-${postId}`);
      if (!container) return;

      if (!container.classList.contains("hidden")) {
        container.classList.add("hidden");
        e.target.textContent = "Show Comments";
        return;
      }

      const hadNewComments = newCommentNotifications.has(postId);

      if (hadNewComments) {
        const lastChecked = lastCheckedComments[postId] || 0;
        clearNotificationForPost(postId);

        const postElement = btn.closest("article");
        if (postElement) {
          postElement.classList.remove("border-2", "border-blue-400");

          const title = postElement.querySelector("h3");
          if (title) {
            const badge = title.parentElement.querySelector(".bg-red-500");
            const notificationText = title.parentElement.querySelector(".text-blue-400");
            if (badge) badge.remove();
            if (notificationText) notificationText.remove();
          }
        }

        container.classList.remove("hidden");
        e.target.textContent = "Hide Comments";
        await showCommentsForPost(postId, container);
        highlightNewCommentsInContainer(container, lastChecked);
      } else {
        container.classList.remove("hidden");
        e.target.textContent = "Hide Comments";
        await showCommentsForPost(postId, container);
      }
    });
  });
}

// Submit comment (SECURE VERSION with validation)
function addCommentListener(container, postId) {
  const form = container.querySelector(".comment-form");
  const textarea = form.querySelector(".comment-text");

  // Add real-time validation
  textarea.addEventListener("input", () => {
    if (textarea.value.length > MAX_COMMENT_LENGTH) {
      textarea.setCustomValidity(`Comment must be ${MAX_COMMENT_LENGTH} characters or less`);
    } else {
      textarea.setCustomValidity('');
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    try {
      const text = validateInput(textarea.value, MAX_COMMENT_LENGTH, 'Comment');
      
      const res = await fetch(`${api}/comments/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          source: "dashboard",
        }),
      });

      if (!res.ok) throw new Error("Failed to post comment");

      const newComment = await res.json();
      textarea.value = "";

      lastCheckedComments[postId] = Date.now();
      localStorage.setItem("lastCheckedComments", JSON.stringify(lastCheckedComments));

      // Create and insert new comment element securely
      const newCommentElement = createCommentElement({
        _id: newComment._id,
        text: text,
        author: getCurrentUsername(),
        createdAt: new Date().toISOString()
      }, postId, true);

      // Insert at the beginning
      const firstComment = container.querySelector('.comment');
      if (firstComment) {
        container.insertBefore(newCommentElement, firstComment);
      } else {
        const form = container.querySelector('.comment-form');
        container.insertBefore(newCommentElement, form);
      }

      addDeleteCommentListeners(container);
    } catch (err) {
      alert("Error posting comment: " + err.message);
    }
  });
}

// PAGINATION RENDER (SECURE VERSION)

function renderPagination() {
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  if (totalPages <= 1) {
    paginationDiv.innerHTML = "";
    return;
  }

  // Clear pagination container
  paginationDiv.innerHTML = '';
  
  const paginationContainer = document.createElement('div');
  paginationContainer.className = 'flex flex-wrap items-center justify-center gap-2';

  // Previous button
  const prevButton = document.createElement('button');
  prevButton.className = 'px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 border border-gray-700 hover:border-purple-500';
  prevButton.textContent = 'Prev';
  prevButton.disabled = currentPage === 1;
  prevButton.setAttribute('data-page', (currentPage - 1).toString());
  paginationContainer.appendChild(prevButton);

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
    pageButton.setAttribute('data-page', page.toString());
    paginationContainer.appendChild(pageButton);
    
    // Add ellipsis if there's a gap to the next page
    if (nextPage && nextPage > page + 1) {
      const ellipsis = createElementWithText('span', '...', 'px-2 py-2 text-gray-400');
      paginationContainer.appendChild(ellipsis);
    }
  }

  // Next button
  const nextButton = document.createElement('button');
  nextButton.className = 'px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 border border-gray-700 hover:border-purple-500';
  nextButton.textContent = 'Next';
  nextButton.disabled = currentPage === totalPages;
  nextButton.setAttribute('data-page', (currentPage + 1).toString());
  paginationContainer.appendChild(nextButton);

  paginationDiv.appendChild(paginationContainer);

  // Add event listeners securely
  paginationContainer.querySelectorAll("button[data-page]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      // Prevent event bubbling and default behavior
      e.preventDefault();
      e.stopPropagation();
      
      const pageStr = btn.getAttribute("data-page");
      const page = parseInt(pageStr, 10);
      
      // Validate page number
      if (!isNaN(page) && page >= 1 && page <= totalPages && page !== currentPage) {
        await renderPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });
}

// Create post form submit (SECURE VERSION with enhanced validation)
export function initializeCreatePostForm() {
  if (postForm) {
    // Load any existing draft when the form is initialized
    loadDraftFromStorage();
    
    // Setup auto-save functionality
    setupDraftAutoSave();
    
    postForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      try {
        const title = validateInput(titleInput.value, MAX_TITLE_LENGTH, 'Title');
        const body = validateInput(bodyInput.value, MAX_BODY_LENGTH, 'Body');

        const submitButton = postForm.querySelector('button[type="submit"]');
        const originalText = submitButton ? submitButton.textContent : '';
        
        if (submitButton) {
          submitButton.textContent = '⏳ Creating...';
          submitButton.disabled = true;
        }

        const res = await fetch(`${api}/posts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title, body }),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to create post");
        }

        const newPost = await res.json();
        allPosts.unshift(newPost);
        renderPage(1);
        
        titleInput.value = "";
        bodyInput.value = "";
        
        // Clear the draft from localStorage after successful post creation
        clearDraftFromStorage();
        
        showSuccessMessage('✅ Post created successfully!');
        window.scrollTo({ top: 0, behavior: "smooth" });
        
        // Reset button
        if (submitButton) {
          submitButton.textContent = originalText;
          submitButton.disabled = false;
        }
        
      } catch (err) {
        console.error('Error creating post:', err);
        alert("Error creating post: " + err.message);
        
        // Reset button on error
        const submitButton = postForm.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.textContent = 'Create Post';
          submitButton.disabled = false;
        }
      }
    });
  }
}