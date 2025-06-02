// api.js - API functions
import { api } from './config.js';
import { isValidObjectId } from './utils.js';

// Load comment counts
export async function loadCommentCounts(postIds) {
  const validIds = postIds.filter(isValidObjectId);
  if (validIds.length === 0) return {};

  try {
    const res = await fetch(
      `${api}/comments/counts?postIds=${validIds.join(",")}`
    );
    if (!res.ok)
      throw new Error(`Failed to load comment counts: ${res.statusText}`);
    const data = await res.json();
    const counts = {};
    data.forEach(({ _id, count }) => {
      counts[_id] = count;
    });
    return counts;
  } catch (err) {
    console.error(err);
    return {};
  }
}

// Fetch comments (updated to show all comments including public ones)
export async function fetchComments(postId) {
  if (!isValidObjectId(postId)) return [];
  try {
    const res = await fetch(`${api}/comments/${postId}`);
    if (!res.ok) throw new Error("Failed to fetch comments");
    const comments = await res.json();

    // Sort comments by creation date (newest first) to show recent public comments
    return comments.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  } catch (err) {
    console.error("Error fetching comments:", err);
    return [];
  }
}

// Delete comment function
export async function deleteComment(commentId, postId) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${api}/comments/${commentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to delete comment");

    return true;
  } catch (err) {
    console.error("Error deleting comment:", err);
    throw err;
  }
}