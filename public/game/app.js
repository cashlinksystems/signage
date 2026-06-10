function applyDisplayConfig() {
  const config = window.GAME_CONFIG || {};
  const targetWidth = Number(config.targetWidth || window.innerWidth);
  const targetHeight = Number(config.targetHeight || window.innerHeight);
  const zoom = Number(config.zoom || 1);
  const fitMode = config.fitMode || "contain";

  document.documentElement.classList.add("configured-display");

  const scaleX = window.innerWidth / targetWidth;
  const scaleY = window.innerHeight / targetHeight;
  const baseScale = fitMode === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const scale = baseScale * zoom;
  const left = Math.max(0, (window.innerWidth - targetWidth * scale) / 2);
  const top = Math.max(0, (window.innerHeight - targetHeight * scale) / 2);

  document.documentElement.style.setProperty("--board-width", `${targetWidth}px`);
  document.documentElement.style.setProperty("--board-height", `${targetHeight}px`);
  document.documentElement.style.setProperty("--board-scale", String(scale));
  document.documentElement.style.setProperty("--board-left", `${left}px`);
  document.documentElement.style.setProperty("--board-top", `${top}px`);
}

applyDisplayConfig();
window.addEventListener("resize", applyDisplayConfig);
