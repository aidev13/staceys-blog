// formHandlers.js - Form event handlers module
export class FormHandlers {
  constructor(authManager) {
    this.authManager = authManager;
  }

  initializeRegisterForm() {
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const username = document.getElementById("username");
        const email = document.getElementById("email");
        const password = document.getElementById("password");
        
        if (!username || !email || !password) {
          alert("All fields are required.");
          return;
        }

        const result = await this.authManager.register(
          username.value,
          email.value,
          password.value
        );

        if (result.success) {
          window.location.href = "login.html";
        } else {
          alert(result.error);
        }
      });
    }
  }

  initializeLoginForm() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const loginEmail = document.getElementById("loginEmail");
        const loginPassword = document.getElementById("loginPassword");
        
        if (!loginEmail || !loginPassword) {
          alert("Email and password are required.");
          return;
        }

        const result = await this.authManager.login(
          loginEmail.value,
          loginPassword.value
        );

        if (result.success) {
          window.location.href = "index.html";
        } else {
          alert(result.error);
        }
      });
    }
  }
}