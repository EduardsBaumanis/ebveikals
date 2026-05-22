// ============================================================
// map.js
//
// An ARTISTIC, teaching-friendly map of clay locations.
//
// We do NOT use Google Maps or Mapbox. Instead we draw a stylised
// outline of Latvia in SVG and place pins using a simple coordinate
// normalisation function.
//
// IMPORTANT: the projection is APPROXIMATE. It linearly maps
// latitude/longitude onto the SVG box. This is good enough for an
// artistic panel and easy for students to understand. It is NOT a
// real cartographic projection.
// ============================================================

import { fetchClayLocations } from "./products.js";
import { escapeHtml } from "./utils.js";

// Rough geographic bounds of Latvia. Used to normalise coordinates.
const BOUNDS = {
  minLat: 55.6, maxLat: 58.1,
  minLng: 20.9, maxLng: 28.3
};

// SVG drawing area size.
const SVG_W = 600;
const SVG_H = 320;

// ------------------------------------------------------------
// project(lat, lng)
// Converts a latitude/longitude into x/y pixels inside the SVG.
// Note: higher latitude is further NORTH, so it maps to a SMALLER y
// (because SVG y grows downward).
// This is an approximate linear mapping - good for teaching.
// ------------------------------------------------------------
function project(lat, lng) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * SVG_W;
  const y = (1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * SVG_H;
  return { x, y };
}

// A simplified, decorative outline of Latvia (not geographically
// exact - it is an artistic silhouette).
const LATVIA_PATH =
  "M40,150 L120,90 L210,70 L300,55 L390,75 L470,70 L560,110 " +
  "L545,170 L500,210 L430,235 L360,250 L300,245 L240,255 " +
  "L170,240 L110,215 L60,195 Z";

// ------------------------------------------------------------
// buildMap(container, locations)
// Draws the SVG map with one pin per clay location.
// ------------------------------------------------------------
function buildMap(container, locations) {
  const pins = locations
    .filter((loc) => loc.latitude != null && loc.longitude != null)
    .map((loc, index) => {
      const { x, y } = project(Number(loc.latitude), Number(loc.longitude));
      return `
        <g class="map-pin" data-index="${index}" tabindex="0" role="button"
           aria-label="${escapeHtml(loc.name_lv)}">
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" class="map-pin-dot" />
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" class="map-pin-ring" />
        </g>`;
    }).join("");

  container.innerHTML = `
    <div class="map-wrap">
      <svg class="map-svg" viewBox="0 0 ${SVG_W} ${SVG_H}"
           role="img" aria-label="Latvijas māla izcelsmes karte">
        <path d="${LATVIA_PATH}" class="map-land" />
        ${pins}
      </svg>
      <aside id="map-detail" class="map-detail" aria-live="polite">
        <p class="map-hint">Izvēlieties punktu kartē, lai uzzinātu vairāk par māla izcelsmi.</p>
      </aside>
    </div>
  `;

  const detail = container.querySelector("#map-detail");

  function showLocation(loc) {
    detail.innerHTML = `
      <h3 class="map-detail-title">${escapeHtml(loc.name_lv)}</h3>
      <p class="map-detail-region">${escapeHtml(loc.region_lv || "")}</p>
      <p class="map-detail-desc">${escapeHtml(loc.description_lv || "")}</p>
      ${loc.story_lv ? `<p class="map-detail-story">${escapeHtml(loc.story_lv)}</p>` : ""}
      <a class="btn btn-secondary" href="shop.html?clay=${encodeURIComponent(loc.id)}">
        Apskatīt darbus no šī māla
      </a>
    `;
  }

  // Wire pins to the detail panel (mouse + keyboard).
  container.querySelectorAll(".map-pin").forEach((pin) => {
    const index = Number(pin.getAttribute("data-index"));
    const loc = locations.filter((l) => l.latitude != null)[index];
    const activate = () => showLocation(loc);
    pin.addEventListener("click", activate);
    pin.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
    });
  });
}

// ------------------------------------------------------------
// initMap(selector)
// Public entry point used by index.html.
// ------------------------------------------------------------
export async function initMap(selector) {
  const container = document.querySelector(selector);
  if (!container) return;
  try {
    const locations = await fetchClayLocations();
    if (locations.length === 0) {
      container.innerHTML = "<p>Pagaidām nav pievienotu māla izcelsmes vietu.</p>";
      return;
    }
    buildMap(container, locations);
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Neizdevās ielādēt karti.</p>";
  }
}
