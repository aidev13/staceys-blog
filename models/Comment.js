import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  likes: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
}]
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

export default mongoose.model('Comment', commentSchema);
