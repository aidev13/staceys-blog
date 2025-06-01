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
                <div class="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 hover:border-purple-500 transition-colors duration-300" id="post-${
                  post._id
                }">
                    <!-- Header with title and timestamp -->
                    <div class="flex items-start justify-between gap-4 mb-4">
                        <h3 class="text-xl font-semibold text-purple-400 leading-tight flex-1">
                            ${post.title}
                        </h3>
                        <span class="text-xs text-gray-400 whitespace-nowrap mt-1">
                            ${createdAt}
                        </span>
                    </div>
                    
                    <!-- Preview text -->
                    <p class="text-gray-300 leading-relaxed mb-4" id="preview-${
                      post._id
                    }">
                        ${previewText}
                    </p>
                    
                    <!-- Footer with actions -->
                    <div class="flex items-center justify-between pt-2 border-t border-gray-700">
                        <button id="readMoreBtn-${
                          post._id
                        }" onclick="expandPost('${post._id}')" 
                            class="text-sm text-purple-400 hover:text-purple-300 hover:underline transition-colors duration-200">
                            Read More/Comment
                        </button>
                        <span class="text-sm text-gray-400">
                            💬 ${count} comment${count !== 1 ? "s" : ""}
                        </span>
                    </div>
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
            class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 border border-gray-700 hover:border-purple-500">
            Prev
        </button>
    `;

  for (let i = 1; i <= totalPages; i++) {
    buttonsHTML += `
            <button
                onclick="goToPage(${i})"
                class="px-4 py-2 rounded-lg transition-colors duration-200 border ${
                  currentPage === i
                    ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700 hover:border-purple-500"
                }"
            >
                ${i}
            </button>
        `;
  }

  buttonsHTML += `
        <button ${currentPage === totalPages ? "disabled" : ""}
            onclick="goToPage(${currentPage + 1})"
            class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 border border-gray-700 hover:border-purple-500">
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
<!-- Title -->
<h3 class="text-2xl font-semibold text-purple-400 mb-4">${post.title}</h3>

<!-- Body -->
<p class="text-gray-300 mb-4">${post.body}</p>

<!-- Author + Time -->
<p class="text-xs text-gray-500 mb-4">
  by ${post.author || "Anon"} • ${commentTimeFormat(post.createdAt)}
</p>

<!-- Divider -->
<hr class="border-gray-700 mb-5" />

<!-- Comments Section -->
<div>
  <h4 class="text-sm text-purple-300 mb-3">Comments</h4>
  ${commentsHTML}
</div>

<!-- Comment Form -->
<form onsubmit="return postComment('${postId}', this, event)" class="mt-6 space-y-3">
  <input
  name="username"
  class="w-full px-3 py-2 text-sm rounded bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 mb-2"
  placeholder="Your name"
/>
<textarea
  name="text"
  class="w-full px-3 py-3 text-sm rounded bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-600"
  placeholder="Write a comment..."
  required
></textarea>

  <button
    class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 text-sm rounded shadow-md transition-colors duration-200"
  >
    Post Comment
  </button>
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
    source: "public", // Add source identifier for public comments
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
  const countElem = document.querySelector(
    `#post-${postId} span.text-gray-400`
  );
  if (countElem && countElem.textContent.includes("comment")) {
    countElem.textContent = `💬 ${count} comment${count !== 1 ? "s" : ""}`;
  }

  return false;
}

loadPosts();
