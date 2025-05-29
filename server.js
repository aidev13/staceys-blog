import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'

import postRoutes from './routes/posts.js'
import commentRoutes from './routes/comments.js'
import authRoutes from './routes/auth.js'



dotenv.config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

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
