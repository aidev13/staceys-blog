// likes.js - Like system for posts and comments
import { api } from './config.js';

const token = localStorage.getItem("token");

// CSS styles for like buttons - injected once
let likesStylesInjected = false;

function injectLikesStyles() {
  if (likesStylesInjected) return;
  
  const style = document.createElement('style');
  style.textContent = `
    .like-button {
      background: none;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s ease;
      font-size: 12px;
    }
    
    .like-button:hover {
      background-color: rgba(239, 68, 68, 0.1);
    }
    
    .like-button.liked {
      color: #ef4444;
    }
    
    .like-button.not-liked {
      color: #9ca3af;
    }
    
    .like-button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    
    .like-heart {
      transition: transform 0.2s ease;
    }
    
    .like-button.liked .like-heart {
      transform: scale(1.2);
    }
    
    .like-animation {
      animation: likeAnimation 0.3s ease;
    }
    
    @keyframes likeAnimation {
      0% { transform: scale(1); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
  likesStylesInjected = true;
}

// Like a post
export async function likePost(postId) {
  if (!token) {
    alert("Please login to like posts");
    return null;
  }

  try {
    const res = await fetch(`${api}/posts/${postId}/like`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to like post");
    return await res.json();
  } catch (err) {
    console.error("Error liking post:", err);
    return null;
  }
}

// Like a comment
export async function likeComment(commentId) {
  if (!token) {
    alert("Please login to like comments");
    return null;
  }

  try {
    const res = await fetch(`${api}/comments/${commentId}/like`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to like comment");
    return await res.json();
  } catch (err) {
    console.error("Error liking comment:", err);
    return null;
  }
}

// Get post likes
export async function getPostLikes(postId) {
  try {
    const res = await fetch(`${api}/posts/${postId}/likes`);
    if (!res.ok) return { likes: 0, userLiked: false };
    return await res.json();
  } catch (err) {
    console.error("Error getting post likes:", err);
    return { likes: 0, userLiked: false };
  }
}

// Get comment likes
export async function getCommentLikes(commentId) {
  try {
    const res = await fetch(`${api}/comments/${commentId}/likes`);
    if (!res.ok) return { likes: 0, userLiked: false };
    return await res.json();
  } catch (err) {
    console.error("Error getting comment likes:", err);
    return { likes: 0, userLiked: false };
  }
}

// Create like button HTML for posts
export function createPostLikeButton(postId, likesCount = 0, userLiked = false) {
  injectLikesStyles();
  
  const heartIcon = userLiked ? "❤️" : "🤍";
  const likedClass = userLiked ? "liked" : "not-liked";
  
  return `
    <button class="like-button post-like-btn ${likedClass}" data-postid="${postId}" ${!token ? 'disabled' : ''}>
      <span class="like-heart">${heartIcon}</span>
      <span class="like-count">${likesCount}</span>
    </button>
  `;
}

// Create like button HTML for comments
export function createCommentLikeButton(commentId, likesCount = 0, userLiked = false) {
  injectLikesStyles();
  
  const heartIcon = userLiked ? "❤️" : "🤍";
  const likedClass = userLiked ? "liked" : "not-liked";
  
  return `
    <button class="like-button comment-like-btn ${likedClass}" data-commentid="${commentId}" ${!token ? 'disabled' : ''}>
      <span class="like-heart">${heartIcon}</span>
      <span class="like-count">${likesCount}</span>
    </button>
  `;
}

// Add click listeners for post like buttons
export function addPostLikeListeners(container = document) {
  const likeButtons = container.querySelectorAll('.post-like-btn');
  likeButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!token) return;
      
      const postId = btn.getAttribute('data-postid');
      const heartSpan = btn.querySelector('.like-heart');
      const countSpan = btn.querySelector('.like-count');
      
      // Disable button during request
      btn.disabled = true;
      
      // Add animation
      heartSpan.classList.add('like-animation');
      setTimeout(() => heartSpan.classList.remove('like-animation'), 300);
      
      const result = await likePost(postId);
      
      if (result) {
        // Update UI
        const newHeart = result.userLiked ? "❤️" : "🤍";
        const newClass = result.userLiked ? "liked" : "not-liked";
        const oldClass = result.userLiked ? "not-liked" : "liked";
        
        heartSpan.textContent = newHeart;
        countSpan.textContent = result.likes;
        btn.classList.remove(oldClass);
        btn.classList.add(newClass);
      }
      
      // Re-enable button
      btn.disabled = false;
    });
  });
}

// Add click listeners for comment like buttons
export function addCommentLikeListeners(container = document) {
  const likeButtons = container.querySelectorAll('.comment-like-btn');
  likeButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!token) return;
      
      const commentId = btn.getAttribute('data-commentid');
      const heartSpan = btn.querySelector('.like-heart');
      const countSpan = btn.querySelector('.like-count');
      
      // Disable button during request
      btn.disabled = true;
      
      // Add animation
      heartSpan.classList.add('like-animation');
      setTimeout(() => heartSpan.classList.remove('like-animation'), 300);
      
      const result = await likeComment(commentId);
      
      if (result) {
        // Update UI
        const newHeart = result.userLiked ? "❤️" : "🤍";
        const newClass = result.userLiked ? "liked" : "not-liked";
        const oldClass = result.userLiked ? "not-liked" : "liked";
        
        heartSpan.textContent = newHeart;
        countSpan.textContent = result.likes;
        btn.classList.remove(oldClass);
        btn.classList.add(newClass);
      }
      
      // Re-enable button
      btn.disabled = false;
    });
  });
}

// Load likes for multiple posts (for efficient loading)
export async function loadPostsLikes(postIds) {
  if (!postIds.length) return {};
  
  try {
    const res = await fetch(`${api}/posts/likes/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ postIds })
    });
    
    if (!res.ok) return {};
    return await res.json();
  } catch (err) {
    console.error("Error loading posts likes:", err);
    return {};
  }
}

// Load likes for multiple comments
export async function loadCommentsLikes(commentIds) {
  if (!commentIds.length) return {};
  
  try {
    const res = await fetch(`${api}/comments/likes/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ commentIds })
    });
    
    if (!res.ok) return {};
    return await res.json();
  } catch (err) {
    console.error("Error loading comments likes:", err);
    return {};
  }
}