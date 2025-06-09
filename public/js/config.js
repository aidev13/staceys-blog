// config.js - Configuration constants
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.startsWith('192.168.') ||
                window.location.port; // Any port usually means local dev

export const api = isLocal 
  ? "http://localhost:3000/api"
  : "https://staceys-blog.onrender.com/api";
export const POSTS_PER_PAGE = 5;