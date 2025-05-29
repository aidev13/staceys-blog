import express from 'express'
import Comment from '../models/Comment.js'

const router = express.Router()

// Get comments for a post
router.get('/:postId', async (req, res) => {
  const comments = await Comment.find({ postId: req.params.postId }).sort({ createdAt: -1 })
  res.json(comments)
})

// Add comment (no auth)
router.post('/:postId', async (req, res) => {
  const { username, text } = req.body
  const newComment = new Comment({
    postId: req.params.postId,
    username,
    text
  })
  const saved = await newComment.save()
  res.status(201).json(saved)
})

export default router
