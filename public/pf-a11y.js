// PhysioFlow Accessibility Enhancement
(function() {
  'use strict';

  function enhance() {
    // ARIA labels for common buttons
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent?.trim();
      if (!text || btn.getAttribute('aria-label')) return;
      
      // Login form
      if (text.includes('Anmelden') || text.includes('Login')) btn.setAttribute('aria-label', 'Anmelden');
      if (text.includes('Abmelden') || text.includes('Logout')) btn.setAttribute('aria-label', 'Abmelden');
      
      // Navigation
      if (text === '☰' || btn.querySelector('svg[class*="menu"]')) btn.setAttribute('aria-label', 'Menü öffnen');
      if (text === '×') btn.setAttribute('aria-label', 'Schließen');
    });

    // Add role="main" to content area
    const main = document.querySelector('[class*="main"]') || document.querySelector('#root > div > div:last-child');
    if (main && !main.getAttribute('role')) {
      main.setAttribute('role', 'main');
    }

    // Add role="navigation" to sidebar
    document.querySelectorAll('nav, [class*="sidebar"], [class*="nav"]').forEach(el => {
      if (!el.getAttribute('role') && !el.closest('[role]')) {
        el.setAttribute('role', 'navigation');
      }
    });

    // Password field: add forgot password link hint
    document.querySelectorAll('input[type="password"]').forEach(input => {
      if (!input.getAttribute('aria-describedby')) {
        const form = input.closest('form');
        if (form) {
          let hint = form.querySelector('#pw-hint');
          if (!hint) {
            hint = document.createElement('div');
            hint.id = 'pw-hint';
            hint.className = 'text-xs text-gray-400 mt-1';
            hint.textContent = 'Passwort vergessen? Kontaktieren Sie Ihren Administrator.';
            hint.style.display = 'none';
            input.parentNode?.appendChild(hint);
          }
          input.setAttribute('aria-describedby', 'pw-hint');
        }
      }
    });
  }

  // SW registration for PWA
  // (No SW yet — add later when service-worker.js is created)

  const boot = () => setTimeout(enhance, 500);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  const observer = new MutationObserver(() => {
    clearTimeout(observer._t);
    observer._t = setTimeout(enhance, 200);
  });
  const root = document.getElementById('root');
  if (root) observer.observe(root, { childList: true, subtree: true });
})();