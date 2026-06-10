const slides = Array.from(document.querySelectorAll(".slide"));
const config = window.GAME_CONFIG || {};
const menuDurationMs = Number(config.menuDurationMs || 10000);
const promoDurationMs = Number(config.promoDurationMs || 10000);

let activeIndex = 0;

function showSlide(index) {
  slides.forEach((slide, i) => {
    slide.classList.toggle("is-active", i === index);
  });
}

function nextSlide() {
  activeIndex = (activeIndex + 1) % slides.length;
  showSlide(activeIndex);

  const duration = activeIndex === 0 ? menuDurationMs : promoDurationMs;
  setTimeout(nextSlide, duration);
}

showSlide(activeIndex);
setTimeout(nextSlide, menuDurationMs);
