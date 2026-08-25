const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.getElementById('collapsed-menu');

toggle?.addEventListener('click', () => {
  const open = menu?.classList.toggle('is-open') ?? false;
  toggle.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('[data-bg]').forEach((el) => {
  el.style.backgroundImage = `url(${el.dataset.bg})`;
});
