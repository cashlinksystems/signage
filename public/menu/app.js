const leftColumn = document.querySelector("#leftColumn");
const rightColumn = document.querySelector("#rightColumn");
const extrasBar = document.querySelector("#extrasBar");
const menuError = document.querySelector("#menuError");

function applyDisplayConfig() {
  const config = window.MENU_CONFIG || {};
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
  document.documentElement.style.setProperty("--promo-width", `${targetWidth * 0.28}px`);
  document.documentElement.style.setProperty("--menu-vw", `${targetWidth / 100}px`);
  document.documentElement.style.setProperty("--menu-vh", `${targetHeight / 100}px`);
}

function createElement(tag, className, text = "") {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function formatPrice(value) {
  const raw = String(value || "").trim();
  const sign = raw.startsWith("+") || raw.startsWith("-") ? raw[0] : "";
  const numeric = raw
    .replace(/^[+-]/, "")
    .replace(/\s/g, "")
    .replace(/,-$/, "")
    .replace(/[^\d]/g, "");

  if (!numeric) {
    return raw;
  }

  const formatted = numeric.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${formatted} Ft`;
}

function createPriceElement(value) {
  const price = createElement("strong", "item-price");
  const formatted = formatPrice(value);

  if (!formatted.endsWith(" Ft")) {
    price.textContent = formatted;
    return price;
  }

  price.append(
    createElement("span", "price-amount", formatted.slice(0, -3)),
    createElement("span", "price-currency", " Ft")
  );

  return price;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("hu-HU")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function createItem(item, sectionTitle = "") {
  const row = document.createElement("article");
  const normalizedName = normalizeText(item.name);
  const normalizedSection = normalizeText(sectionTitle);
  const isPrimary = normalizedName === normalizedSection;
  const isAddon = ["l", "xl", "xxl"].includes(normalizedName);

  row.className = [
    "menu-item",
    isPrimary ? "menu-item-primary" : "",
    isAddon ? "menu-item-addon" : ""
  ].filter(Boolean).join(" ");

  const name = createElement("h3", "item-name");
  name.textContent = item.name;

  row.append(name);

  if (item.note) {
    const note = createElement("span", "item-note", item.note);
    if (normalizeText(item.note).includes("dkg")) {
      note.classList.add("item-note-meat");
    }
    row.append(note);
  } else {
    row.append(createElement("span", "item-note", ""));
  }

  row.append(createPriceElement(item.price));
  return row;
}

function createSection(section, options = {}) {
  const wrapper = document.createElement("section");
  const normalizedTitle = normalizeText(section.title).replace(/[^a-z0-9]+/g, "-");
  const visualSrc = options.visuals?.[normalizedTitle];
  wrapper.className = [
    "menu-section",
    section.compact ? "menu-section-compact" : "",
    visualSrc ? "menu-section-with-image" : "",
    `menu-section-${normalizedTitle}`
  ].filter(Boolean).join(" ");

  if (visualSrc) {
    const visual = document.createElement("div");
    visual.className = "menu-section-image";

    const image = document.createElement("img");
    image.src = visualSrc;
    image.alt = "";
    visual.append(image);

    if (["kebab", "durum"].includes(normalizedTitle)) {
      const steam = document.createElement("div");
      steam.className = "meat-steam";

      for (let index = 0; index < 5; index += 1) {
        steam.append(createElement("span", "steam-wisp"));
      }

      visual.append(steam);
    }

    wrapper.append(visual);
  }

  if (normalizedTitle === "durum") {
    const fries = document.createElement("div");
    fries.className = "fries-flyer";

    const friesImage = document.createElement("img");
    friesImage.src = "../assets/fries.png";
    friesImage.alt = "";
    fries.append(friesImage);

    const friesBadge = document.createElement("div");
    friesBadge.className = "fries-badge";
    friesBadge.append(
      createElement("strong", "fries-badge-price", "+990 Ft"),
      createElement("span", "fries-badge-label", "sült krumpli")
    );
    fries.append(friesBadge);

    wrapper.append(fries);
  }

  const content = document.createElement("div");
  content.className = "menu-section-content";

  if (!options.hideTitle) {
    content.append(createElement("h2", "section-title", section.title));
  }

  const list = document.createElement("div");
  list.className = "item-list";

  for (const item of section.items) {
    list.append(createItem(item, section.title));
  }

  content.append(list);
  wrapper.append(content);
  return wrapper;
}

function renderColumn(container, sections, options = {}) {
  container.replaceChildren();

  for (const section of sections) {
    container.append(createSection(section, options));
  }
}

function renderExtras(extras) {
  extrasBar.replaceChildren();
  extrasBar.append(createElement("strong", "extras-title", `${extras.title}:`));

  const list = createElement("div", "extras-list");
  for (const item of extras.items) {
    const row = createElement("div", "extras-item");
    row.append(createElement("span", "extras-item-name", item.name));
    if (item.price && item.price !== "0") {
      const priceEl = createPriceElement(`+${item.price}`);
      priceEl.classList.add("extras-price");
      row.append(priceEl);
    }
    list.append(row);
  }

  extrasBar.append(list);
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ";" : ",";
}

function parseCsv(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === String.fromCharCode(34) && quoted && next === String.fromCharCode(34)) {
      value += String.fromCharCode(34);
      index += 1;
      continue;
    }

    if (char === String.fromCharCode(34)) {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(value.trim());
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(value.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function csvToRows(text) {
  const [headers, ...rows] = parseCsv(text);
  if (!headers) {
    return [];
  }

  const keys = headers.map((header) => header.trim().toLowerCase());
  return rows.map((row) => Object.fromEntries(
    keys.map((key, index) => [key, row[index] || ""])
  ));
}

function isTruthy(value) {
  return ["1", "true", "yes", "igen"].includes(String(value || "").trim().toLowerCase());
}

function getOrCreateSection(sections, sectionTitle, compact) {
  let section = sections.find((candidate) => candidate.title === sectionTitle);

  if (!section) {
    section = {
      title: sectionTitle,
      compact,
      items: []
    };
    sections.push(section);
  }

  return section;
}

function csvToSections(text) {
  const sections = [];

  for (const row of csvToRows(text)) {
    const sectionTitle = String(row.section || "").trim();
    const name = String(row.name || "").trim();
    const note = String(row.note || "").trim();
    const price = String(row.price || "").trim();
    const compact = isTruthy(row.compact);

    if (!sectionTitle || !name) {
      continue;
    }

    getOrCreateSection(sections, sectionTitle, compact).items.push({
      name,
      note,
      price
    });
  }

  return sections;
}

function csvToExtras(text) {
  const extras = {
    title: "Extrák & szószok",
    items: []
  };

  for (const row of csvToRows(text)) {
    const sectionTitle = String(row.section || "").trim();
    const name = String(row.name || "").trim();
    const price = String(row.price || "").trim();

    if (sectionTitle) {
      extras.title = sectionTitle;
    }

    if (name) {
      extras.items.push({ name, price });
    }
  }

  return extras;
}

async function fetchText(path) {
  const response = await fetch(`${path}?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }

  return response.text();
}

async function loadMenu() {
  try {
    const [leftCsv, rightCsv, extrasCsv] = await Promise.all([
      fetchText("./left-menu.csv"),
      fetchText("./right-menu.csv"),
      fetchText("./extras.csv")
    ]);

    renderColumn(leftColumn, csvToSections(leftCsv), {
      hideTitle: true,
      visuals: {
        kebab: "../assets/kebab_gem2.png",
        durum: "../assets/Durum_gem.png"
      }
    });
    renderColumn(rightColumn, csvToSections(rightCsv));
    renderExtras(csvToExtras(extrasCsv));
    menuError.hidden = true;
  } catch (error) {
    menuError.hidden = false;
  }
}

applyDisplayConfig();
loadMenu();
window.addEventListener("resize", applyDisplayConfig);
window.setInterval(loadMenu, 30_000);
