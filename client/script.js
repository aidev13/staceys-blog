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

// Mobile menu toggle
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");

  toggleBtn.addEventListener("click", () => {
    menu.classList.toggle("hidden");
    toggleBtn.setAttribute("aria-expanded", !menu.classList.contains("hidden"));
  });
});

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
      localStorage.setItem("IsLoggedIn", true);
      window.location.href = "index.html";
    } else {
      alert(data.message);
    }
  });
}

// Load all posts
async function loadPosts() {
  try {
    const res = await fetch(`${api}/posts`);
    if (!res.ok) throw new Error("Failed to fetch posts");
    allPosts = (await res.json()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    renderPage(currentPage);
  } catch (err) {
    postsDiv.innerHTML = `<p class="text-red-500">Error loading posts: ${err.message}</p>`;
  }
}

// Escape HTML
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ObjectId validation
function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

// Load comment counts
async function loadCommentCounts(postIds) {
  const validIds = postIds.filter(isValidObjectId);
  if (validIds.length === 0) return {};

  try {
    const res = await fetch(
      `${api}/comments/counts?postIds=${validIds.join(",")}`
    );
    if (!res.ok)
      throw new Error(`Failed to load comment counts: ${res.statusText}`);
    const data = await res.json();
    const counts = {};
    data.forEach(({ _id, count }) => {
      counts[_id] = count;
    });
    return counts;
  } catch (err) {
    console.error(err);
    return {};
  }
}

// Fetch comments
async function fetchComments(postId) {
  if (!isValidObjectId(postId)) return [];
  try {
    const res = await fetch(`${api}/comments/${postId}`);
    if (!res.ok) throw new Error("Failed to fetch comments");
    return await res.json();
  } catch (err) {
    console.error("Error fetching comments:", err);
    return [];
  }
}

// Render posts
async function renderPage(page) {
  currentPage = page;
  const start = (page - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;
  const pagePosts = allPosts.slice(start, end);
  const postIds = pagePosts.map((p) => p._id);
  const commentCounts = await loadCommentCounts(postIds);

  postsDiv.innerHTML = pagePosts
    .map((post, index) => {
      const previewLimit = 150;
      const isLong = post.body.length > previewLimit;
      const previewText = isLong
        ? post.body.slice(0, previewLimit) + "..."
        : post.body;
      const count = commentCounts[post._id] || 0;

      return `
        <article class="bg-gray-800 p-6 rounded-lg shadow-md mb-6">
          <h3 class="text-xl font-semibold text-purple-400 mb-2">${escapeHtml(
            post.title
          )}</h3>
          <p class="text-gray-300 mb-2 post-body" data-full="${escapeHtml(
            post.body
          )}" data-index="${index}">
            ${escapeHtml(previewText)}
          </p>
          ${
            isLong
              ? `<button class="toggle-btn text-purple-300 hover:underline text-sm mb-4" data-index="${index}">Read more</button>`
              : ""
          }
          <p class="text-xs text-gray-500">
            by ${escapeHtml(post.author || "Anon")} on ${new Date(
        post.createdAt
      ).toLocaleDateString()} at ${new Date(post.createdAt).toLocaleTimeString(
        [],
        { hour: "2-digit", minute: "2-digit" }
      )}
          </p>
          <p class="text-sm text-purple-400 mt-2 mb-2">💬 ${count} comment${
        count !== 1 ? "s" : ""
      }</p>
          <button class="show-comments-btn text-sm text-blue-400 hover:underline mb-4" data-postid="${
            post._id
          }">Show Comments</button>
          <div class="comments-container hidden" id="comments-for-${
            post._id
          }"></div>
        </article>
      `;
    })
    .join("");

  addToggleListeners();
  addShowCommentsListeners();
  renderPagination();
}

// Toggle Read More
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

// Show Comments
function addShowCommentsListeners() {
  const buttons = document.querySelectorAll(".show-comments-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const postId = e.target.getAttribute("data-postid");
      const container = document.getElementById(`comments-for-${postId}`);
      if (!container) return;

      if (!container.classList.contains("hidden")) {
        container.classList.add("hidden");
        e.target.textContent = "Show Comments";
        return;
      }

      container.innerHTML = `<p class="text-gray-400 text-sm">Loading comments...</p>`;
      container.classList.remove("hidden");
      e.target.textContent = "Hide Comments";

      const comments = await fetchComments(postId);
      const commentsHTML = comments.length
        ? comments
            .map(
              (c) => `
            <div class="comment border-t border-gray-600 py-2">
              <p class="text-sm text-purple-300 font-semibold">${escapeHtml(
                c.username
              )}</p>
              <p class="text-gray-300 text-sm">${escapeHtml(c.text)}</p>
              <p class="text-xs text-gray-500">${new Date(
                c.createdAt
              ).toLocaleString()}</p>
            </div>
          `
            )
            .join("")
        : `<p class="text-gray-400 text-sm italic">No comments yet.</p>`;

      const formHTML = token
        ? `
        <form class="comment-form mt-4">
          <textarea class="comment-text w-full p-2 rounded bg-gray-700 text-white mb-2" rows="2" placeholder="Write a comment..."></textarea>
          <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">Post Comment</button>
        </form>
      `
        : `<p class="text-sm text-gray-400 mt-2 italic">Login to post a comment.</p>`;

      container.innerHTML = commentsHTML + formHTML;

      if (token) addCommentListener(container, postId);
    });
  });
}

// Submit comment
function addCommentListener(container, postId) {
  const form = container.querySelector(".comment-form");
  const textarea = form.querySelector(".comment-text");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text) return;

    try {
      const res = await fetch(`${api}/comments/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Failed to post comment");
      textarea.value = "";

      // Insert the new comment AT THE TOP of the comments container
      container.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="comment border-t border-gray-600 py-2">
          <p class="text-sm text-purple-300 font-semibold">You</p>
          <p class="text-gray-300 text-sm">${escapeHtml(text)}</p>
          <p class="text-xs text-gray-500">${new Date().toLocaleString()}</p>
        </div>
        `
      );
    } catch (err) {
      alert("Error posting comment: " + err.message);
    }
  });
}

// Pagination controls
function renderPagination() {
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  let buttonsHTML = `
    <button data-page="${currentPage - 1}" ${
    currentPage === 1 ? "disabled" : ""
  }
      class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
      Prev
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    buttonsHTML += `
      <button data-page="${i}"
        class="px-3 py-1 rounded transition ${
          currentPage === i ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"
        }">
        ${i}
      </button>
    `;
  }

  buttonsHTML += `
    <button data-page="${currentPage + 1}" ${
    currentPage === totalPages ? "disabled" : ""
  }
      class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
      Next
    </button>
  `;

  paginationDiv.innerHTML = buttonsHTML;

  paginationDiv.querySelectorAll("button[data-page]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const page = parseInt(btn.getAttribute("data-page"));
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        await renderPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });
}

// Create post form submit
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    if (!title || !body) {
      alert("Title and body are required.");
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

      const newPost = await res.json();
      allPosts.unshift(newPost);
      renderPage(1);
      titleInput.value = "";
      bodyInput.value = "";
    } catch (err) {
      alert("Error creating post: " + err.message);
    }
  });
}

// Initial load
if (postsDiv) loadPosts();
