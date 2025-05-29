const api = 'http://localhost:3000/api'
const token = localStorage.getItem('token')

// REGISTER
const registerForm = document.getElementById('registerForm')
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const res = await fetch(`${api}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        email: email.value,
        password: password.value
      })
    })
    if (res.ok) window.location.href = 'login.html'
    else alert('Register failed')
  })
}

// LOGIN
const loginForm = document.getElementById('loginForm')
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const res = await fetch(`${api}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: loginEmail.value,
        password: loginPassword.value
      })
    })
    const data = await res.json()
    if (res.ok) {
      localStorage.setItem('token', data.token)
      window.location.href = 'index.html'
    } else {
      alert(data.message)
    }
  })
}

// CREATE POST
const postForm = document.getElementById('createPostForm')
if (postForm) {
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const res = await fetch(`${api}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: title.value,
        body: body.value
      })
    })
    if (res.ok) {
      title.value = ''
      body.value = ''
      loadPosts()
    } else {
      alert('Must be logged in to post.')
    }
  })
}

// LOAD POSTS
const postsDiv = document.getElementById('posts')
async function loadPosts() {
  const res = await fetch(`${api}/posts`)
  const posts = await res.json()
  postsDiv.innerHTML = posts.map(post => `
    <div class="card mb-3">
      <div class="card-body">
        <h5>${post.title}</h5>
        <p>${post.body}</p>
        <small class="text-muted">by ${post.author || 'Anonymous'} on ${new Date(post.createdAt).toLocaleDateString()}</small>
      </div>
    </div>
  `).join('')
}
if (postsDiv) loadPosts()
