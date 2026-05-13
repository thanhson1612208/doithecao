// ui.js – UI helpers (no Firebase dependency)

// ===== MODAL =====
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
function switchModal(from, to) {
  closeModal(from);
  setTimeout(() => openModal(to), 200);
}
window.openModal = openModal;
window.closeModal = closeModal;
window.switchModal = switchModal;

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && overlay.id !== 'dashboardModal') {
      closeModal(overlay.id);
    }
  });
});

// ===== TABS =====
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.dash-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  const idx = ['tabExchange','tabBank','tabHistory'].indexOf(tabId);
  document.querySelectorAll('.dash-tab')[idx]?.classList.add('active');
}
window.switchTab = switchTab;

// ===== NAVBAR SCROLL =====
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

// ===== HAMBURGER =====
function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}
window.toggleMenu = toggleMenu;

// ===== SCROLL TO =====
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
window.scrollTo = scrollTo;
