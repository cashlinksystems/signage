const slides = Array.from(document.querySelectorAll(".slide"));
const menuFrame = document.querySelector("#menuFrame");
const config = window.GAME_CONFIG || {};
const menuAnimationMs = Number(config.menuAnimationMs || 9000);
const menuHoldMs = Number(config.menuHoldMs || 4000);
const menuDurationMs = menuAnimationMs + menuHoldMs;
const promoDurationMs = Number(config.promoDurationMs || 10000);

let activeIndex = 0;

function showSlide(index) {
  slides.forEach((slide, i) => {
    slide.classList.toggle("is-active", i === index);
  });
}

function reloadMenu() {
  menuFrame.src = `/menu/?t=${Date.now()}`;
}

function nextSlide() {
  activeIndex = (activeIndex + 1) % slides.length;

  if (activeIndex === 0) {
    reloadMenu();
  }

  showSlide(activeIndex);

  const duration = activeIndex === 0 ? menuDurationMs : promoDurationMs;
  setTimeout(nextSlide, duration);
}

showSlide(activeIndex);
setTimeout(nextSlide, menuDurationMs);
