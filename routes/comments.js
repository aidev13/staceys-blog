import express from "express";
import mongoose from "mongoose";
import Comment from "../models/Comment.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// GET comment counts for multiple posts
router.get("/counts", async (req, res) => {
  try {
    const postIds = req.query.postIds?.split(",") || [];
    const validIds = postIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));

    const counts = await Comment.aggregate([
      { $match: { postId: { $in: objectIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]);

    res.json(counts);
  } catch (err) {
    console.error("Error in /counts:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET all comments for a post
router.get("/:postId", async (req, res) => {
  const { postId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ error: "Invalid postId" });
  }

  try {
    const comments = await Comment.find({ postId }).sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    console.error("Error getting comments:", err);
    res.status(500).json({ error: "Failed to get comments" });
  }
});

// POST a new comment
router.post("/:postId", async (req, res, next) => {
  const { postId } = req.params;
  const hasAuth = req.headers.authorization?.startsWith("Bearer ");

  if (hasAuth) {
    return verifyToken(req, res, () =>
      handleCommentPost(req, res, postId, true)
    );
  } else {
    return handleCommentPost(req, res, postId, false);
  }
});

// DELETE a comment
router.delete("/:commentId", verifyToken, async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    return res.status(400).json({ error: "Invalid commentId" });
  }

  try {
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Delete the comment (any authenticated user can delete any comment)
    await Comment.findByIdAndDelete(commentId);

    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// Helper to handle comment posting
async function handleCommentPost(req, res, postId, isDashboard) {
  const { text, username } = req.body;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ error: "Invalid postId" });
  }

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  if (isDashboard) {
    if (!user || !user.username) {
      return res
        .status(401)
        .json({ error: "Unauthorized: username missing from token" });
    }
  } else {
    if (!username) {
      return res
        .status(400)
        .json({ error: "Username is required for public comments" });
    }
  }

  const commentData = {
    postId,
    text,
    username: isDashboard ? user.username : username,
  };

  try {
    const newComment = new Comment(commentData);
    const saved = await newComment.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error saving comment:", err);
    res.status(500).json({ error: "Failed to save comment" });
  }
}

export default router;
