import express from "express";
import mongoose from "mongoose";
import Post from "../models/Post.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// GET all posts
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Error fetching posts" });
  }
});

// POST a new post (auth required)
router.post("/", verifyToken, async (req, res) => {
  try {
    const newPost = new Post({
      ...req.body,
      author: req.user.username, // from token
      userId: req.user._id, // Store userId for ownership checks
      likes: [] // Initialize likes array for new posts
    });
    const saved = await newPost.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: "Error saving post" });
  }
});

// ===== NEW EDIT/DELETE ENDPOINTS =====

// PUT edit a post (auth required + ownership check)
router.put("/:postId", verifyToken, async (req, res) => {
  const { postId } = req.params;
  const { title, body } = req.body;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ error: "Invalid postId" });
  }

  if (!title || !body) {
    return res.status(400).json({ error: "Title and body are required" });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check ownership
    if (post.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only edit your own posts" });
    }

    // Update the post
    post.title = title;
    post.body = body;
    post.updatedAt = new Date();

    const updatedPost = await post.save();
    res.json(updatedPost);
  } catch (err) {
    console.error("Error editing post:", err);
    res.status(500).json({ error: "Failed to edit post" });
  }
});

// DELETE a post (auth required + ownership check)
router.delete("/:postId", verifyToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ error: "Invalid postId" });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check ownership
    if (post.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only delete your own posts" });
    }

    await Post.findByIdAndDelete(postId);
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Error deleting post:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// ===== EXISTING LIKE FUNCTIONALITY =====

// POST toggle like on a post
router.post("/:postId/like", verifyToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ error: "Invalid postId" });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Initialize likes array if it doesn't exist
    if (!post.likes) {
      post.likes = [];
    }

    // Check if user already liked this post
    const userLikedIndex = post.likes.findIndex(
      (like) => like.toString() === userId.toString()
    );

    let userLiked;
    if (userLikedIndex > -1) {
      // User already liked, so unlike
      post.likes.splice(userLikedIndex, 1);
      userLiked = false;
    } else {
      // User hasn't liked, so like
      post.likes.push(userId);
      userLiked = true;
    }

    await post.save();

    res.json({
      likes: post.likes.length,
      userLiked,
      postId
    });
  } catch (err) {
    console.error("Error toggling post like:", err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

// GET likes for a specific post
router.get("/:postId/likes", async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?._id; // Optional user from token

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ error: "Invalid postId" });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const likes = post.likes || [];
    const userLiked = userId ? likes.some(like => like.toString() === userId.toString()) : false;

    res.json({
      likes: likes.length,
      userLiked,
      postId
    });
  } catch (err) {
    console.error("Error getting post likes:", err);
    res.status(500).json({ error: "Failed to get likes" });
  }
});

// POST batch get likes for multiple posts
router.post("/likes/batch", async (req, res) => {
  const { postIds } = req.body;
  const userId = req.user?._id; // Optional user from token

  if (!Array.isArray(postIds)) {
    return res.status(400).json({ error: "postIds must be an array" });
  }

  const validIds = postIds.filter(id => mongoose.Types.ObjectId.isValid(id));

  try {
    const posts = await Post.find({ _id: { $in: validIds } });
    
    const likesData = {};
    posts.forEach(post => {
      const likes = post.likes || [];
      const userLiked = userId ? likes.some(like => like.toString() === userId.toString()) : false;
      
      likesData[post._id] = {
        likes: likes.length,
        userLiked,
        postId: post._id
      };
    });

    res.json(likesData);
  } catch (err) {
    console.error("Error getting batch post likes:", err);
    res.status(500).json({ error: "Failed to get batch likes" });
  }
});

export default router;