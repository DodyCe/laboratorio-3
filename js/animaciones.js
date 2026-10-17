// Aparición discreta una sola vez al entrar en pantalla.
// El contenido permanece visible si no hay soporte o se prefiere menos movimiento.
if ("IntersectionObserver" in window && !movimientoReducido.matches) {
  const secciones = document.querySelectorAll(".intro, .form-card, .summary-card, .history-card, .calendar-card, .chart-card, .site-footer");
  function revelar(seccion) {
    seccion.classList.remove("reveal-pending");
    observador.unobserve(seccion);
  }
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => { if (entrada.isIntersecting) revelar(entrada.target); });
  }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });
  secciones.forEach(seccion => {
    // Las secciones ya visibles no se ocultan al cargar.
    if (seccion.getBoundingClientRect().top >= window.innerHeight) {
      seccion.classList.add("scroll-reveal", "reveal-pending");
      observador.observe(seccion);
      seccion.addEventListener("focusin", () => revelar(seccion), { once: true });
    }
  });
  movimientoReducido.addEventListener("change", () => {
    if (movimientoReducido.matches) {
      secciones.forEach(revelar);
      observador.disconnect();
    }
  });
}
