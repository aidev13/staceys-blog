import express from "express";
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
    });
    const saved = await newPost.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: "Error saving post" });
  }
});

export default router;
