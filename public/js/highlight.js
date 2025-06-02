// highlight.js - Comment highlighting functionality

// CSS styles for highlighting - injected once
let stylesInjected = false;

function injectHighlightStyles() {
  if (stylesInjected) return;
  
  const style = document.createElement('style');
  style.textContent = `
    .highlight-new-comment {
      background-color: rgba(59, 130, 246, 0.3) !important; /* Light blue */
      border-left: 4px solid #3b82f6 !important;
      transition: background-color 0.3s ease, border-left 0.3s ease;
    }
    
    .highlight-fade-out {
      background-color: transparent !important;
      border-left: 4px solid transparent !important;
      transition: background-color 0.5s ease, border-left 0.5s ease;
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

// Highlight new comments in a post
export function highlightNewComments(postId, lastCheckedTime) {
  // Inject styles if not already done
  injectHighlightStyles();
  
  // Find all comments in this post
  const container = document.getElementById(`comments-for-${postId}`);
  if (!container) return;
  
  const comments = container.querySelectorAll('.comment');
  
  comments.forEach(comment => {
    // Find the timestamp element
    const timestampElement = comment.querySelector('.text-xs.text-gray-500');
    if (!timestampElement) return;
    
    // Parse the timestamp from the comment
    const timestampText = timestampElement.textContent;
    const commentDate = new Date(timestampText);
    
    // Check if this comment is newer than the last checked time
    if (commentDate.getTime() > lastCheckedTime) {
      // Add highlight class
      comment.classList.add('highlight-new-comment');
      
      // Remove highlight after 3 seconds with fade effect
      setTimeout(() => {
        comment.classList.remove('highlight-new-comment');
        comment.classList.add('highlight-fade-out');
        
        // Remove fade class after transition completes
        setTimeout(() => {
          comment.classList.remove('highlight-fade-out');
        }, 500); // Match the CSS transition duration
      }, 3000);
    }
  });
}

// Alternative function to highlight specific comment elements directly
export function highlightCommentElements(commentElements, lastCheckedTime) {
  injectHighlightStyles();
  
  commentElements.forEach(comment => {
    const timestampElement = comment.querySelector('.text-xs.text-gray-500');
    if (!timestampElement) return;
    
    const timestampText = timestampElement.textContent;
    const commentDate = new Date(timestampText);
    
    if (commentDate.getTime() > lastCheckedTime) {
      comment.classList.add('highlight-new-comment');
      
      setTimeout(() => {
        comment.classList.remove('highlight-new-comment');
        comment.classList.add('highlight-fade-out');
        
        setTimeout(() => {
          comment.classList.remove('highlight-fade-out');
        }, 500);
      }, 3000);
    }
  });
}

// Function to highlight all new comments (can be called when comments load)
export function highlightNewCommentsInContainer(container, lastCheckedTime) {
  injectHighlightStyles();
  
  if (!container) return;
  
  // Small delay to ensure DOM is ready
  setTimeout(() => {
    const comments = container.querySelectorAll('.comment');
    highlightCommentElements(comments, lastCheckedTime);
  }, 100);
}