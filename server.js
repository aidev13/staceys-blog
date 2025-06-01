import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import postRoutes from './routes/posts.js'
import commentRoutes from './routes/comments.js'
import authRoutes from './routes/auth.js'

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use('/dist', express.static('dist'))

// Serve static files (if you have HTML files in a public folder)
app.use(express.static('public'))

// Serve your main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
  // Or wherever your HTML file is located
})

// Routes
app.use('/api/posts', postRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/auth', authRoutes)

// DB Connection & Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT, () =>
      console.log(`🚀 Server running on port ${process.env.PORT}`)
    )
  })
  .catch(err => console.error('❌ MongoDB connection error:', err))