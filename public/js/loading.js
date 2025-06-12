// loading.js - Simple loading spinner for dashboard
export function initializeLoadingSpinner() {
  // Create and show spinner immediately
  createSpinner();
  
  // Hide spinner when everything is loaded
  if (document.readyState === 'loading') {
    window.addEventListener('load', hideSpinner);
  } else {
    // If already loaded, hide after a short delay
    setTimeout(hideSpinner, 500);
  }
}

function createSpinner() {
  const spinnerHTML = `
    <div id="loadingSpinner" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(17, 24, 39, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      transition: opacity 0.3s ease-out;
    ">
      <div style="text-align: center; color: #a855f7;">
        <div class="spinner" style="
          width: 60px;
          height: 60px;
          border: 4px solid #374151;
          border-top: 4px solid #a855f7;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        "></div>
        <div style="font-size: 18px; font-weight: 500;">
          Loading Dashboard...
        </div>
        <div style="font-size: 14px; opacity: 0.7; margin-top: 8px;">
          Please wait
        </div>
      </div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;

  document.body.insertAdjacentHTML('afterbegin', spinnerHTML);
}

function hideSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) {
    spinner.style.opacity = '0';
    setTimeout(() => {
      spinner.remove();
    }, 300);
  }
}