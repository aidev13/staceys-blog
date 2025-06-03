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

// Middleware - Enhanced CORS for both local and production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://staceys-blog.onrender.com'] 
    : [
        'http://localhost:3000', 
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500', 
        'http://localhost:5501',
        'http://127.0.0.1:5501',
        'http://localhost:8080',
        'http://127.0.0.1:8080'
      ],
  credentials: true
}))
app.use(express.json())
app.use('/dist', express.static('dist'))

// Serve static files
app.use(express.static('public'))

// Serve your main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Routes
app.use('/api/posts', postRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/auth', authRoutes)

// DB Connection & Server - Fixed for Render deployment
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI
const port = process.env.PORT || 3000

mongoose.connect(mongoUri)
  .then(() => {
    app.listen(port, '0.0.0.0', () => {  // Added '0.0.0.0' for Render
      console.log(`🚀 Server running on port ${port}`)
      console.log(`🗄️  Database: ${mongoUri.includes('localhost') ? 'Local MongoDB' : 'MongoDB Atlas'}`)
    })
  })
  .catch(err => console.error('❌ MongoDB connection error:', err))