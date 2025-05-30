import express from 'express'
import mongoose from 'mongoose'
import Comment from '../models/Comment.js'

const router = express.Router()

router.get('/counts', async (req, res) => {
  try {
    const postIds = req.query.postIds?.split(',') || [];

    // Validate ObjectId strings first
    const validIds = postIds.filter(id => mongoose.Types.ObjectId.isValid(id));

    // Convert valid IDs to ObjectId instances
  const objectIds = validIds.map(id => new mongoose.Types.ObjectId(id));


    const counts = await Comment.aggregate([
      { $match: { postId: { $in: objectIds } } },
      { $group: { _id: '$postId', count: { $sum: 1 } } }
    ]);

    res.json(counts);
  } catch (err) {
    console.error('Error in /counts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get comments for a single post
router.get('/:postId', async (req, res) => {
  const { postId } = req.params
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ error: 'Invalid postId' })
  }

  try {
    const comments = await Comment.find({ postId }).sort({ createdAt: -1 })
    res.json(comments)
  } catch (err) {
    console.error('Error getting comments:', err)
    res.status(500).json({ error: 'Failed to get comments' })
  }
})

// Add comment (no auth)
router.post('/:postId', async (req, res) => {
  const { postId } = req.params
  const { username, text } = req.body

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ error: 'Invalid postId' })
  }
  if (!username || !text) {
    return res.status(400).json({ error: 'Username and text are required' })
  }

  try {
    const newComment = new Comment({ postId, username, text })
    const saved = await newComment.save()
    res.status(201).json(saved)
  } catch (err) {
    console.error('Error saving comment:', err)
    res.status(500).json({ error: 'Failed to save comment' })
  }
})

export default router
