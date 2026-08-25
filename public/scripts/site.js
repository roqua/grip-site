document.querySelectorAll('[data-bg]').forEach((el) => {
  el.style.backgroundImage = `url(${el.dataset.bg})`;
});
