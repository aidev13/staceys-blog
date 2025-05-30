const api = "http://localhost:3000/api";
const POSTS_PER_PAGE = 5;
let currentPage = 1;
let allPosts = [];

const token = localStorage.getItem("token");

// Elements
const postsDiv = document.getElementById("posts");
const paginationDiv = document.getElementById("paginationControls");
const postForm = document.getElementById("createPostForm");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");

// REGISTER
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await fetch(`${api}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.value,
        email: email.value,
        password: password.value,
      }),
    });
    if (res.ok) window.location.href = "login.html";
    else alert("Register failed");
  });
}

// LOGIN
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await fetch(`${api}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginEmail.value,
        password: loginPassword.value,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      window.location.href = "index.html";
    } else {
      alert(data.message);
    }
  });
}

// Load all posts from API
async function loadPosts() {
  try {
    const res = await fetch(`${api}/posts`);
    if (!res.ok) throw new Error("Failed to fetch posts");
    allPosts = await res.json();
    renderPage(currentPage);
  } catch (err) {
    postsDiv.innerHTML = `<p class="text-red-500">Error loading posts: ${err.message}</p>`;
  }
}

// Render posts for current page
function renderPage(page) {
  currentPage = page;
  const start = (page - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;
  const pagePosts = allPosts.slice(start, end);

  postsDiv.innerHTML = pagePosts
    .map((post, index) => {
      const previewLimit = 150;
      const isLong = post.body.length > previewLimit;
      const previewText = isLong
        ? post.body.slice(0, previewLimit) + "..."
        : post.body;

      return `
    <article class="bg-gray-800 p-6 rounded-lg shadow-md">
      <h3 class="text-xl font-semibold text-teal-400 mb-2">${post.title}</h3>
      <p class="text-gray-300 mb-2 post-body" data-full="${escapeHtml(
        post.body
      )}" data-index="${index}">
        ${escapeHtml(previewText)}
      </p>
      ${
        isLong
          ? `<button class="toggle-btn text-teal-300 hover:underline text-sm mb-4" data-index="${index}">Read more</button>`
          : ""
      }
     <p class="text-xs text-gray-500">
  by ${post.author || "Anon"} on ${new Date(
        post.createdAt
      ).toLocaleDateString()} at ${new Date(post.createdAt).toLocaleTimeString(
        [],
        { hour: "2-digit", minute: "2-digit" }
      )}
</p>

    </article>
    `;
    })
    .join("");

  addToggleListeners();
  renderPagination();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Add expand/collapse toggle listeners
function addToggleListeners() {
  const buttons = document.querySelectorAll(".toggle-btn");
  buttons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-index");
      const postBody = document.querySelector(
        `.post-body[data-index="${idx}"]`
      );
      const fullText = postBody.getAttribute("data-full");

      if (e.target.textContent === "Read more") {
        postBody.textContent = fullText;
        e.target.textContent = "Show less";
      } else {
        const previewLimit = 150;
        const previewText =
          fullText.length > previewLimit
            ? fullText.slice(0, previewLimit) + "..."
            : fullText;
        postBody.textContent = previewText;
        e.target.textContent = "Read more";
      }
    });
  });
}

// Render pagination controls
function renderPagination() {
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  if (totalPages === 0) {
    paginationDiv.innerHTML = "";
    return;
  }

  let buttonsHTML = `
    <button ${currentPage === 1 ? "disabled" : ""}
      onclick="goToPage(${currentPage - 1})"
      class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
    >Prev</button>
  `;

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

  for (let i = startPage; i <= endPage; i++) {
    buttonsHTML += `
      <button
        onclick="goToPage(${i})"
        class="px-3 py-1 rounded transition ${
          currentPage === i ? "bg-teal-600" : "bg-gray-700 hover:bg-gray-600"
        }"
      >
        ${i}
      </button>
    `;
  }

  buttonsHTML += `
    <button ${currentPage === totalPages ? "disabled" : ""}
      onclick="goToPage(${currentPage + 1})"
      class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
    >Next</button>
  `;

  paginationDiv.innerHTML = buttonsHTML;
}

// Pagination navigation
window.goToPage = function (page) {
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  renderPage(page);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// Post creation
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    if (!title || !body) return;

    if (!token) {
      alert("You must be logged in to post.");
      return;
    }

    try {
      const res = await fetch(`${api}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, body }),
      });

      if (!res.ok) throw new Error("Failed to create post");

      postForm.reset();
      await loadPosts();
      goToPage(1);
    } catch (err) {
      alert(err.message);
    }
  });
}

// Initial load
window.addEventListener("DOMContentLoaded", loadPosts);
