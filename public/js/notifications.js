// notifications.js - Notification system
import { fetchComments } from './api.js';

// Notification system for new public comments
export let lastCheckedComments = JSON.parse(
  localStorage.getItem("lastCheckedComments") || "{}"
);
export let newCommentNotifications = new Set();

// Update header notification count
function updateHeaderNotification() {
  const headerNotification = document.getElementById("headerNotification");
  if (headerNotification) {
    const count = newCommentNotifications.size;
    headerNotification.textContent = count > 0 ? count.toString() : "";
  }
}

// Check for new public comments
export async function checkForNewPublicComments(allPosts, renderPage, currentPage) {
  if (!allPosts.length) return;

  let hasNewNotifications = false; // Track if we found any new notifications

  try {
    for (const post of allPosts) {
      const comments = await fetchComments(post._id);
      // Only include comments that are explicitly marked as 'public' or have no source field
      // Exclude any comments marked as 'dashboard'
      const publicComments = comments.filter(
        (c) => c.source === "public" || (!c.source && c.source !== "dashboard")
      );

      if (publicComments.length > 0) {
        const lastChecked = lastCheckedComments[post._id] || 0;
        const newPublicComments = publicComments.filter(
          (c) => new Date(c.createdAt).getTime() > lastChecked
        );

        if (newPublicComments.length > 0) {
          // Only mark as having new notifications if this post didn't already have them
          if (!newCommentNotifications.has(post._id)) {
            hasNewNotifications = true;
          }
          newCommentNotifications.add(post._id);
          console.log(
            `New public comment detected for post ${post._id}:`,
            newPublicComments
          );
        }
      }
    }

    // Update header notification count
    updateHeaderNotification();

    // Only re-render if we found genuinely new notifications
    if (hasNewNotifications) {
      renderPage(currentPage);
    }
  } catch (err) {
    console.error("Error checking for new comments:", err);
  }
}

// Export function to update header when notifications are cleared
export function clearNotificationForPost(postId) {
  newCommentNotifications.delete(postId);
  lastCheckedComments[postId] = Date.now();
  localStorage.setItem(
    "lastCheckedComments",
    JSON.stringify(lastCheckedComments)
  );
  updateHeaderNotification();
}