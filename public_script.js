// Mobile menu toggle
const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");

navToggle.addEventListener("click", () => {
  if (navMenu.classList.contains("hidden")) {
    navMenu.classList.remove("hidden");
    navMenu.classList.add("flex");
  } else {
    navMenu.classList.add("hidden");
    navMenu.classList.remove("flex");
  }
});

function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now.toLocaleDateString(undefined, options);
  document.getElementById("datetime").textContent = `${date} • ${time}`;
}

updateDateTime();
setInterval(updateDateTime, 1000);

const api = "http://localhost:3000/api";
const POSTS_PER_PAGE = 5;
let currentPage = 1;
let allPosts = [];

// Helper to check valid MongoDB ObjectId
function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

// Fetch comment counts for posts
async function loadCommentCounts(postIds) {
  const validIds = postIds.filter(isValidObjectId);
  if (validIds.length === 0) return {};

  try {
    const res = await fetch(
      `${api}/comments/counts?postIds=${validIds.join(",")}`
    );
    if (!res.ok) throw new Error("Failed to load comment counts");
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

async function loadPosts() {
  const res = await fetch(`${api}/posts`);
  allPosts = await res.json();
  renderPage(currentPage);
}

async function renderPage(page) {
  const start = (page - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;
  const pagePosts = allPosts.slice(start, end);
  const postIds = pagePosts.map((post) => post._id);
  const commentCounts = await loadCommentCounts(postIds);

  const postsHTML = pagePosts
    .map((post) => {
      const previewText = post.body.split(". ").slice(0, 2).join(". ") + "...";
      const createdAt = new Date(post.createdAt).toLocaleString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const count = commentCounts[post._id] || 0;

      return `
        <div class="bg-gray-800 p-5 rounded-lg shadow-md relative" id="post-${
          post._id
        }">
          <div class="absolute top-3 right-4 text-xs text-gray-500 select-none">
            ${createdAt}
          </div>
          <h3 class="text-xl font-semibold text-purple-400 mb-2">${
            post.title
          }</h3>
          <p class="text-gray-300 mb-2" id="preview-${
            post._id
          }">${previewText}</p>
          <button id="readMoreBtn-${post._id}" onclick="expandPost('${
        post._id
      }')" class="text-sm text-purple-300 hover:underline">
            Read More/Comment
          </button>
          <p class="text-sm text-purple-400 mt-1">💬 ${count} comment${
        count !== 1 ? "s" : ""
      }</p>
        </div>
      `;
    })
    .join("");

  document.getElementById("postsContainer").innerHTML = postsHTML;
  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const container = document.getElementById("paginationControls");

  let buttonsHTML = `
    <button ${currentPage === 1 ? "disabled" : ""}
      onclick="goToPage(${currentPage - 1})"
      class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
      Prev
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    buttonsHTML += `
      <button
        onclick="goToPage(${i})"
        class="px-3 py-1 rounded transition ${
          currentPage === i ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"
        }"
      >
        ${i}
      </button>
    `;
  }

  buttonsHTML += `
    <button ${currentPage === totalPages ? "disabled" : ""}
      onclick="goToPage(${currentPage + 1})"
      class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
      Next
    </button>
  `;

  container.innerHTML = buttonsHTML;
}

function goToPage(page) {
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderPage(currentPage);
  const venmo_box = document.getElementById("venmo");
  venmo_box.scrollIntoView({ behavior: "smooth" });
}

// Open post in modal
async function expandPost(postId) {
  const post = allPosts.find((p) => p._id === postId);
  const commentRes = await fetch(`${api}/comments/${postId}`);
  const comments = await commentRes.json();

  const commentTimeFormat = (date) =>
    new Date(date).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const commentsHTML = comments.length
    ? comments
        .map(
          (c) => `
        <div class="border-l-4 border-gray-600 pl-3 mb-2 text-sm">
          <div><strong class="text-purple-300">${
            c.username || "Anon"
          }</strong> • <span class="text-gray-400 text-xs">${commentTimeFormat(
            c.createdAt
          )}</span></div>
          <p>${c.text}</p>
        </div>`
        )
        .join("")
    : `<p class="text-gray-500 text-sm">No comments yet.</p>`;

  const fullHTML = `
    <h3 class="text-2xl font-semibold text-purple-400 mb-3">${post.title}</h3>
    <p class="text-gray-300 mb-3">${post.body}</p>
    <p class="text-xs text-gray-500 mb-3">by ${
      post.author || "Anon"
    } • ${commentTimeFormat(post.createdAt)}</p>
    <hr class="border-gray-600 mb-4" />
    <div>
      <h4 class="text-sm text-purple-300 mb-2">Comments</h4>
      ${commentsHTML}
    </div>
    <form onsubmit="return postComment('${postId}', this, event)" class="mt-4 space-y-2">
      <input name="username" class="w-full px-3 py-1 text-sm rounded bg-gray-700 border border-gray-600 text-white placeholder-gray-400" placeholder="Your name" />
      <textarea name="text" class="w-full px-3 py-2 text-sm rounded bg-gray-700 border border-gray-600 text-white placeholder-gray-400" placeholder="Write a comment..." required></textarea>
      <button class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 text-sm rounded">Post Comment</button>
    </form>
  `;

  document.getElementById("modalBody").innerHTML = fullHTML;
  document.getElementById("modalOverlay").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
  document.getElementById("modalBody").innerHTML = "";
}

// Updated postComment with event.preventDefault()
async function postComment(postId, form, event) {
  event.preventDefault();

  const data = {
    username: form.username.value,
    text: form.text.value,
  };

  await fetch(`${api}/comments/${postId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  form.text.value = "";

  await expandPost(postId); // Refresh modal content

  // Update inline comment count as well
  const counts = await loadCommentCounts([postId]);
  const count = counts[postId] || 0;
  const countElem = document.querySelector(`#post-${postId} p.text-purple-400`);
  if (countElem) {
    countElem.textContent = `💬 ${count} comment${count !== 1 ? "s" : ""}`;
  }

  return false;
}

loadPosts();
