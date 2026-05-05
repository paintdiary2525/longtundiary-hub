(() => {
  const nav = document.querySelector('.hub-nav');
  if (!nav) return;
  const burger = nav.querySelector('.hub-nav__burger');
  const menu = nav.querySelector('.hub-nav__menu');
  if (!burger || !menu) return;

  const close = () => {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  };
  const toggle = () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  burger.addEventListener('click', toggle);
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();
