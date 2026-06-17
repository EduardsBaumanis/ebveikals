/**
 * Hero sun scroll rotation.
 *
 * The homepage hero sun rotates as the page scrolls.
 * There is intentionally no fixed decorative sun elsewhere on the site.
 */

document.addEventListener("DOMContentLoaded", () => {
  const heroSun = document.getElementById("heroSunSymbol");

  if (!heroSun) return;

  function updateHeroSunRotation() {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? scrollY / docHeight : 0;
    const rotation = scrollPercent * 360;

    heroSun.style.setProperty("--sun-rotation", `${rotation}deg`);
  }

  let frame = null;
  window.addEventListener("scroll", () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(updateHeroSunRotation);
  }, { passive: true });

  updateHeroSunRotation();
});
