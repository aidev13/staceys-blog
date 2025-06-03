// config.js - Configuration constants
export const api = window.location.hostname === 'localhost' 
  ? "http://localhost:3000/api"
  : "https://staceys-blog.onrender.com/api";
export const POSTS_PER_PAGE = 5;