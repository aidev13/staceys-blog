import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  username: String,
  text: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
})

export default mongoose.model('Comment', commentSchema)
