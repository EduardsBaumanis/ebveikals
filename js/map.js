// ============================================================
// map.js
//
// Google Maps base + website-styled clay testing pin overlay.
// Pin data is loaded from data/latvijas_malu_testesanas_lokacijas_50.csv.
// ============================================================

import { escapeHtml } from "./utils.js";

const CSV_PIN_SOURCE = "data/latvijas_malu_testesanas_lokacijas_50.csv";
const GOOGLE_MAP_CENTER = { lat: 56.8796, lng: 24.6032 };
const DEFAULT_ZOOM = 7;
const MIN_ZOOM = 7;
const MAX_ZOOM = 10;
const TILE_SIZE = 256;
const FALLBACK_VIEWPORT = { width: 760, height: 430 };

let currentZoom = DEFAULT_ZOOM;
let currentViewport = FALLBACK_VIEWPORT;
let currentCenter = { ...GOOGLE_MAP_CENTER };

function googleMapSrc(zoom = DEFAULT_ZOOM) {
  return `https://www.google.com/maps?ll=${currentCenter.lat},${currentCenter.lng}&z=${zoom}&t=&output=embed`;
}

function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    const next = clean[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift().map((header) => header.trim());
  return rows.map((values) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = (values[index] || "").trim();
    });
    return item;
  });
}

function numberValue(value) {
  return Number(String(value || "").replace(",", "."));
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pinFromCsvRow(row) {
  const lat = numberValue(row.Lat);
  const lng = numberValue(row.Lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: row.ID || slugify(row["Lokācija / pins"]),
    name_lv: row["Lokācija / pins"] || "Māla punkts",
    region_lv: row["Novads/reģions"] || "",
    priority_lv: row["Prioritātes klase"] || "",
    latitude: lat,
    longitude: lng,
    geology_lv: row["Ģeoloģiskais pamatojums"] || "",
    purpose_lv: row["Testēšanas mērķis"] || "",
    access_lv: row["Piekļuves piezīme"] || "",
    source_url: row["Avota URL"] || "",
    google_maps_url: row["Google Maps URL"] || "",
    address_lv: row["My Maps adrese"] || "",
    status_lv: row.Statuss || ""
  };
}

function updateViewport(stage) {
  const rect = stage.getBoundingClientRect();
  currentViewport = {
    width: rect.width || FALLBACK_VIEWPORT.width,
    height: rect.height || FALLBACK_VIEWPORT.height
  };
}

function latLngToGooglePixel(lat, lng, zoom) {
  const scale = TILE_SIZE * (2 ** zoom);
  const safeLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sinLat = Math.sin(safeLat * Math.PI / 180);

  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  };
}

function googlePixelToLatLng(x, y, zoom) {
  const scale = TILE_SIZE * (2 ** zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));

  return { lat, lng };
}

function project(lat, lng) {
  const center = latLngToGooglePixel(currentCenter.lat, currentCenter.lng, currentZoom);
  const point = latLngToGooglePixel(lat, lng, currentZoom);
  const xPx = point.x - center.x + currentViewport.width / 2;
  const yPx = point.y - center.y + currentViewport.height / 2;
  const x = (xPx / currentViewport.width) * 100;
  const y = (yPx / currentViewport.height) * 100;
  const visible = xPx >= 0 && xPx <= currentViewport.width && yPx >= 0 && yPx <= currentViewport.height;

  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
    visible
  };
}

function priorityClass(priority) {
  if (priority.startsWith("A")) return "is-priority-a";
  if (priority.startsWith("B")) return "is-priority-b";
  if (priority.startsWith("C")) return "is-priority-c";
  return "";
}

function pinMarkup(pin, index) {
  const { x, y, visible } = project(pin.latitude, pin.longitude);
  const label = [pin.name_lv, pin.region_lv].filter(Boolean).join(", ");

  return `
    <button class="map-pin ${priorityClass(pin.priority_lv)} ${visible ? "" : "is-outside"}" data-index="${index}"
      style="--pin-x:${x.toFixed(2)}%; --pin-y:${y.toFixed(2)}%;"
      type="button" aria-label="${escapeHtml(label)}">
      <span class="map-pin-ring" aria-hidden="true"></span>
      <span class="map-pin-dot" aria-hidden="true"></span>
      <span class="map-pin-label">${escapeHtml(pin.name_lv)}</span>
    </button>`;
}

function positionPin(button, pin) {
  const { x, y, visible } = project(pin.latitude, pin.longitude);
  button.style.setProperty("--pin-x", `${x.toFixed(2)}%`);
  button.style.setProperty("--pin-y", `${y.toFixed(2)}%`);
  button.classList.toggle("is-outside", !visible);
}

function positionPins(buttons, pins) {
  buttons.forEach((button, index) => positionPin(button, pins[index]));
}

function detailRow(label, value) {
  if (!value) return "";
  return `
    <div class="map-detail-row">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>`;
}

function linkButton(href, label) {
  if (!href) return "";
  return `<a class="btn btn-secondary" href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
}

function buildMap(container, pins) {
  currentZoom = DEFAULT_ZOOM;
  currentViewport = FALLBACK_VIEWPORT;
  currentCenter = { ...GOOGLE_MAP_CENTER };

  container.innerHTML = `
    <div class="map-wrap">
      <div class="map-stage">
        <div class="map-controls" aria-label="Kartes tālummaiņa">
          <button class="map-zoom-btn" type="button" data-map-zoom="out" aria-label="Attālināt karti">−</button>
          <span class="map-zoom-level" aria-live="polite">${currentZoom}</span>
          <button class="map-zoom-btn" type="button" data-map-zoom="in" aria-label="Tuvināt karti">+</button>
          <button class="map-reset-btn" type="button" data-map-reset aria-label="Atgriezties uz sākotnējo kartes skatu">Atgriezties</button>
        </div>
        <iframe class="map-google-frame"
          title="Google Maps karte ar Latviju"
          src="${googleMapSrc(currentZoom)}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          aria-hidden="true"></iframe>
        <div class="map-print-tint" aria-hidden="true"></div>
        <div class="map-pins" aria-label="Māla testēšanas vietas kartē">
          ${pins.map(pinMarkup).join("")}
        </div>
      </div>
      <aside id="map-detail" class="map-detail" aria-live="polite">
        <p class="map-hint">Ielādēti ${pins.length} māla testēšanas punkti no CSV. Izvēlieties punktu kartē.</p>
      </aside>
    </div>
  `;

  const detail = container.querySelector("#map-detail");
  const stage = container.querySelector(".map-stage");
  const pinButtons = Array.from(container.querySelectorAll(".map-pin"));
  const frame = container.querySelector(".map-google-frame");
  const zoomLevel = container.querySelector(".map-zoom-level");

  function refreshPinPositions() {
    updateViewport(stage);
    positionPins(pinButtons, pins);
  }

  function showLocation(pin, button) {
    pinButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");

    detail.innerHTML = `
      <p class="eyebrow">CSV punkts #${escapeHtml(pin.id)}</p>
      <h3 class="map-detail-title">${escapeHtml(pin.name_lv)}</h3>
      <p class="map-detail-region">${escapeHtml(pin.region_lv)}</p>
      <dl class="map-detail-list">
        ${detailRow("Prioritāte", pin.priority_lv)}
        ${detailRow("Pamatojums", pin.geology_lv)}
        ${detailRow("Testēšanas mērķis", pin.purpose_lv)}
        ${detailRow("Piekļuve", pin.access_lv)}
        ${detailRow("Statuss", pin.status_lv)}
        ${detailRow("Adrese", pin.address_lv)}
      </dl>
      <div class="map-detail-actions">
        ${linkButton(pin.google_maps_url, "Atvērt Google Maps")}
        ${linkButton(pin.source_url, "Avots")}
      </div>
    `;
  }

  pinButtons.forEach((button) => {
    const index = Number(button.getAttribute("data-index"));
    button.addEventListener("click", () => showLocation(pins[index], button));
  });

  container.querySelectorAll("[data-map-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.getAttribute("data-map-zoom");
      const delta = direction === "in" ? 1 : -1;
      currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + delta));
      frame.src = googleMapSrc(currentZoom);
      zoomLevel.textContent = String(currentZoom);
      refreshPinPositions();
    });
  });

  container.querySelector("[data-map-reset]").addEventListener("click", () => {
    currentCenter = { ...GOOGLE_MAP_CENTER };
    currentZoom = DEFAULT_ZOOM;
    frame.src = googleMapSrc(currentZoom);
    zoomLevel.textContent = String(currentZoom);
    refreshPinPositions();
  });

  let dragState = null;

  function isMapControl(target) {
    return Boolean(target.closest(".map-controls, .map-pin, .map-detail"));
  }

  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || isMapControl(event.target)) return;
    updateViewport(stage);
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      centerPixel: latLngToGooglePixel(currentCenter.lat, currentCenter.lng, currentZoom)
    };
    stage.classList.add("is-dragging");
    stage.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  stage.addEventListener("pointermove", (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    const nextCenterPixel = {
      x: dragState.centerPixel.x - dx,
      y: dragState.centerPixel.y - dy
    };
    currentCenter = googlePixelToLatLng(nextCenterPixel.x, nextCenterPixel.y, currentZoom);
    refreshPinPositions();
  });

  function finishDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    stage.classList.remove("is-dragging");
    if (stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
    frame.src = googleMapSrc(currentZoom);
    refreshPinPositions();
    dragState = null;
  }

  stage.addEventListener("pointerup", finishDrag);
  stage.addEventListener("pointercancel", finishDrag);

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(refreshPinPositions);
    observer.observe(stage);
    stage._mapResizeObserver = observer;
  } else {
    window.addEventListener("resize", refreshPinPositions, { passive: true });
  }

  window.requestAnimationFrame(refreshPinPositions);

  if (pins.length > 0) {
    showLocation(pins[0], pinButtons[0]);
  }
}

export async function initMap(selector) {
  const container = document.querySelector(selector);
  if (!container) return;

  try {
    const response = await fetch(CSV_PIN_SOURCE);
    if (!response.ok) throw new Error(`CSV fetch failed: ${response.status}`);
    const rows = parseCsv(await response.text());
    const pins = rows.map(pinFromCsvRow).filter(Boolean);

    if (pins.length === 0) {
      container.innerHTML = '<p class="section-intro">CSV failā nav atrastu punktu ar koordinātām.</p>';
      return;
    }

    buildMap(container, pins);
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="section-intro">Neizdevās ielādēt māla testēšanas punktus no CSV.</p>';
  }
}
