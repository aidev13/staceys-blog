// app.js - Main application initialization
import { initializeMobileMenu, startDateTimeUpdates } from './utils.js';
import { initializeRegisterForm, initializeLoginForm } from './auth.js';
import { loadPosts, initializeCreatePostForm } from './posts.js';

// Mobile menu toggle
initializeMobileMenu();

// Initialize authentication forms
initializeRegisterForm();
initializeLoginForm();

// Initialize create post form
initializeCreatePostForm();

// DateTime updates
startDateTimeUpdates();

// Initial load
const postsDiv = document.getElementById("posts");
if (postsDiv) loadPosts();