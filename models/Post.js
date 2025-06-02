import mongoose from 'mongoose'

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  author: String,
  createdAt: { type: Date, default: Date.now },
  likes: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
}]
})

export default mongoose.model('Post', postSchema)
