import { getCategoryMeta, type EventCategory } from "@atlas/core";

/** Varianti per categoria: 5 palette + 5 motivi = 30 cover distinte. */
export const COVER_VARIANTS_PER_CATEGORY = 5;

type CoverPalette = { a: string; b: string; c: string; accent: string };

/** Palette per variante — tonalità ben distinte dentro ogni categoria. */
const CATEGORY_PALETTES: Record<EventCategory, CoverPalette[]> = {
  music: [
    { a: "#1e3a8a", b: "#2563eb", c: "#60a5fa", accent: "#dbeafe" },
    { a: "#312e81", b: "#4f46e5", c: "#a5b4fc", accent: "#e0e7ff" },
    { a: "#581c87", b: "#9333ea", c: "#d8b4fe", accent: "#f3e8ff" },
    { a: "#164e63", b: "#0891b2", c: "#67e8f9", accent: "#cffafe" },
    { a: "#9d174d", b: "#db2777", c: "#f9a8d4", accent: "#fce7f3" },
  ],
  food: [
    { a: "#9a3412", b: "#ea580c", c: "#fdba74", accent: "#ffedd5" },
    { a: "#92400e", b: "#d97706", c: "#fcd34d", accent: "#fef3c7" },
    { a: "#7f1d1d", b: "#b91c1c", c: "#fca5a5", accent: "#fee2e2" },
    { a: "#3f6212", b: "#65a30d", c: "#bef264", accent: "#ecfccb" },
    { a: "#134e4a", b: "#0f766e", c: "#5eead4", accent: "#ccfbf1" },
  ],
  culture: [
    { a: "#581c87", b: "#7c3aed", c: "#c4b5fd", accent: "#ede9fe" },
    { a: "#1e3a8a", b: "#4338ca", c: "#818cf8", accent: "#e0e7ff" },
    { a: "#831843", b: "#be185d", c: "#f9a8d4", accent: "#fce7f3" },
    { a: "#134e4a", b: "#0d9488", c: "#5eead4", accent: "#ccfbf1" },
    { a: "#713f12", b: "#b45309", c: "#fcd34d", accent: "#fef3c7" },
  ],
  sport: [
    { a: "#14532d", b: "#16a34a", c: "#86efac", accent: "#dcfce7" },
    { a: "#365314", b: "#65a30d", c: "#bef264", accent: "#ecfccb" },
    { a: "#064e3b", b: "#059669", c: "#6ee7b7", accent: "#d1fae5" },
    { a: "#0c4a6e", b: "#0284c7", c: "#7dd3fc", accent: "#e0f2fe" },
    { a: "#7c2d12", b: "#ea580c", c: "#fdba74", accent: "#ffedd5" },
  ],
  families: [
    { a: "#0e7490", b: "#06b6d4", c: "#67e8f9", accent: "#cffafe" },
    { a: "#be185d", b: "#ec4899", c: "#f9a8d4", accent: "#fce7f3" },
    { a: "#6d28d9", b: "#8b5cf6", c: "#c4b5fd", accent: "#ede9fe" },
    { a: "#b45309", b: "#f59e0b", c: "#fcd34d", accent: "#fef3c7" },
    { a: "#047857", b: "#10b981", c: "#6ee7b7", accent: "#d1fae5" },
  ],
  other: [
    { a: "#334155", b: "#64748b", c: "#cbd5e1", accent: "#f1f5f9" },
    { a: "#374151", b: "#6b7280", c: "#d1d5db", accent: "#f9fafb" },
    { a: "#44403c", b: "#78716c", c: "#d6d3d1", accent: "#fafaf9" },
    { a: "#1e3a5f", b: "#3b82f6", c: "#93c5fd", accent: "#dbeafe" },
    { a: "#4c1d95", b: "#7c3aed", c: "#c4b5fd", accent: "#ede9fe" },
  ],
};

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Indice variante stabile per evento (stesso evento → stessa cover). */
export function getCategoryCoverVariant(category: EventCategory, seed: string): number {
  const key = `${category}:${seed || "atlas"}`;
  return hashSeed(key) % COVER_VARIANTS_PER_CATEGORY;
}

function paletteFor(category: EventCategory, variant: number): CoverPalette {
  return CATEGORY_PALETTES[category][variant % COVER_VARIANTS_PER_CATEGORY];
}

function gid(category: EventCategory, variant: number, name: string, seed: string): string {
  return `cc-${category}-v${variant}-${name}-${hashSeed(seed).toString(36)}`;
}

function svgWrap(category: EventCategory, variant: number, seed: string, body: string): string {
  const p = paletteFor(category, variant);
  const bg = gid(category, variant, "bg", seed);
  const glow = gid(category, variant, "glow", seed);
  const glowX = variant % 2 === 0 ? "28%" : "72%";
  return `<svg class="category-cover-svg" viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="${bg}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.a}" />
      <stop offset="55%" stop-color="${p.b}" />
      <stop offset="100%" stop-color="${p.c}" />
    </linearGradient>
    <radialGradient id="${glow}" cx="${glowX}" cy="22%" r="68%">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.58" />
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="640" height="360" fill="url(#${bg})" />
  <rect width="640" height="360" fill="url(#${glow})" />
  ${body}
</svg>`;
}

type ArtFn = (accent: string) => string;

const MUSIC_ART: ArtFn[] = [
  (a) => `<g opacity="0.92" fill="${a}">
    <rect x="72" y="118" width="28" height="124" rx="14"/><rect x="132" y="88" width="28" height="184" rx="14"/>
    <rect x="252" y="72" width="28" height="216" rx="14"/><rect x="372" y="98" width="28" height="164" rx="14"/>
    <path d="M500 180c48-10 88 18 88 58s-52 72-96 52" fill="none" stroke="${a}" stroke-width="10" stroke-linecap="round" opacity="0.65"/>
  </g>`,
  (a) => `<g opacity="0.95">
    <circle cx="470" cy="180" r="108" fill="none" stroke="${a}" stroke-width="16" opacity="0.35"/>
    <circle cx="470" cy="180" r="72" fill="${a}" opacity="0.22"/><circle cx="470" cy="180" r="24" fill="${a}" opacity="0.9"/>
    <path d="M120 250c60-92 150-118 230-72" fill="none" stroke="${a}" stroke-width="12" stroke-linecap="round" opacity="0.55"/>
  </g>`,
  (a) => `<g opacity="0.9" fill="none" stroke="${a}" stroke-width="10" stroke-linecap="round">
    <path d="M100 200c40-80 120-100 200-60s120 40 160 20"/><path d="M140 120c30 20 60 24 90 10"/>
    <circle cx="520" cy="100" r="36" opacity="0.5"/><circle cx="500" cy="220" r="18" opacity="0.4"/>
  </g>`,
  (a) => `<g opacity="0.88" fill="${a}">
    <rect x="160" y="140" width="320" height="100" rx="18" opacity="0.2"/>
    <circle cx="220" cy="190" r="14" opacity="0.85"/><circle cx="280" cy="190" r="14" opacity="0.85"/>
    <circle cx="340" cy="190" r="14" opacity="0.85"/><circle cx="400" cy="190" r="14" opacity="0.85"/>
    <rect x="200" y="96" width="240" height="28" rx="14" opacity="0.45"/>
  </g>`,
  (a) => `<g opacity="0.92">
    <path d="M480 250V110l-48-28-48 28v140" fill="none" stroke="${a}" stroke-width="12" stroke-linejoin="round"/>
    <ellipse cx="432" cy="250" rx="56" ry="14" fill="${a}" opacity="0.35"/>
    <path d="M120 230c30-50 70-70 110-70" fill="none" stroke="${a}" stroke-width="9" stroke-linecap="round" opacity="0.55"/>
  </g>`,
];

const FOOD_ART: ArtFn[] = [
  (a) => `<g opacity="0.94">
    <path d="M170 250V130c0-36 28-64 64-64h12c36 0 64 28 64 64v120" fill="none" stroke="${a}" stroke-width="18" stroke-linecap="round"/>
    <ellipse cx="240" cy="252" rx="92" ry="18" fill="${a}" opacity="0.35"/>
    <circle cx="506" cy="118" r="34" fill="${a}" opacity="0.55"/>
  </g>`,
  (a) => `<g opacity="0.94">
    <ellipse cx="320" cy="220" rx="132" ry="26" fill="none" stroke="${a}" stroke-width="12" opacity="0.75"/>
    <circle cx="132" cy="156" r="22" fill="${a}" opacity="0.65"/><circle cx="508" cy="148" r="20" fill="${a}" opacity="0.6"/>
  </g>`,
  (a) => `<g opacity="0.9" fill="${a}">
    <path d="M420 250c-20-80 20-130 80-150s100 10 120 70-40 110-100 80z" opacity="0.35"/>
    <rect x="150" y="170" width="180" height="14" rx="7" opacity="0.55"/><rect x="170" y="150" width="140" height="14" rx="7" opacity="0.4"/>
  </g>`,
  (a) => `<g opacity="0.92">
    <path d="M200 250c0-90 60-130 120-130s120 40 120 130" fill="none" stroke="${a}" stroke-width="14" stroke-linecap="round"/>
    <circle cx="320" cy="150" r="48" fill="${a}" opacity="0.25"/>
  </g>`,
  (a) => `<g opacity="0.9" stroke="${a}" stroke-width="10" stroke-linecap="round" fill="none">
    <path d="M140 220h120M140 190h90"/><path d="M380 250V150l40-24 40 24v100"/>
    <circle cx="500" cy="120" r="28" opacity="0.5"/>
  </g>`,
];

const CULTURE_ART: ArtFn[] = [
  (a) => `<g opacity="0.92">
    <path d="M170 250V140l50-36 50 36v110M350 250V140l50-36 50 36v110" fill="none" stroke="${a}" stroke-width="14" stroke-linejoin="round"/>
    <path d="M150 118h340" stroke="${a}" stroke-width="12" stroke-linecap="round" opacity="0.7"/>
  </g>`,
  (a) => `<g opacity="0.94">
    <path d="M228 106h96v144h-96z" fill="none" stroke="${a}" stroke-width="12"/>
    <path d="M248 130h56M248 162h56M248 194h40" stroke="${a}" stroke-width="8" stroke-linecap="round" opacity="0.75"/>
  </g>`,
  (a) => `<g opacity="0.9" fill="${a}">
    <rect x="180" y="120" width="280" height="130" rx="8" opacity="0.2"/>
    <circle cx="320" cy="185" r="52" fill="none" stroke="${a}" stroke-width="10" opacity="0.55"/>
    <path d="M320 145v80M280 185h80" stroke="${a}" stroke-width="8" stroke-linecap="round" opacity="0.5"/>
  </g>`,
  (a) => `<g opacity="0.88" stroke="${a}" stroke-width="11" stroke-linecap="round" fill="none">
    <path d="M120 250h400"/><path d="M160 250V160l80-50 80 50v90M360 250V150l80-60 80 60v100"/>
  </g>`,
  (a) => `<g opacity="0.9" fill="${a}">
    <path d="M140 250l60-120 60 80 60-100 60 140z" opacity="0.35"/>
    <rect x="450" y="130" width="80" height="100" rx="6" opacity="0.25"/>
  </g>`,
];

const SPORT_ART: ArtFn[] = [
  (a) => `<g opacity="0.94">
    <path d="M80 250c80-120 180-150 280-110s160 130 200 110" fill="none" stroke="${a}" stroke-width="14" stroke-linecap="round" opacity="0.55"/>
    <circle cx="500" cy="118" r="42" fill="${a}" opacity="0.35"/>
  </g>`,
  (a) => `<g opacity="0.94">
    <rect x="140" y="170" width="360" height="18" rx="9" fill="${a}" opacity="0.35"/>
    <circle cx="220" cy="210" r="28" fill="${a}" opacity="0.75"/>
    <path d="M300 210h160" stroke="${a}" stroke-width="12" stroke-linecap="round" opacity="0.6"/>
  </g>`,
  (a) => `<g opacity="0.9" fill="none" stroke="${a}" stroke-width="10" stroke-linecap="round">
    <path d="M160 220c40-60 100-80 160-50s90 70 140 40"/><circle cx="480" cy="200" r="34" opacity="0.45"/>
  </g>`,
  (a) => `<g opacity="0.92" fill="${a}">
    <rect x="260" y="100" width="120" height="150" rx="60" opacity="0.22"/>
    <path d="M200 250h240" opacity="0.35"/><circle cx="320" cy="175" r="20" opacity="0.7"/>
  </g>`,
  (a) => `<g opacity="0.9">
    <path d="M120 180h400" stroke="${a}" stroke-width="12" stroke-linecap="round" opacity="0.45"/>
    <path d="M180 180v70M300 180v70M420 180v70" stroke="${a}" stroke-width="10" stroke-linecap="round" opacity="0.55"/>
    <circle cx="520" cy="130" r="30" fill="${a}" opacity="0.4"/>
  </g>`,
];

const FAMILIES_ART: ArtFn[] = [
  (a) => `<g opacity="0.94" fill="${a}">
    <circle cx="250" cy="142" r="28" opacity="0.85"/><circle cx="320" cy="126" r="34" opacity="0.95"/><circle cx="390" cy="142" r="28" opacity="0.85"/>
    <path d="M286 250c10-42 28-58 48-58h32c20 0 38 16 48 58" opacity="0.75"/>
  </g>`,
  (a) => `<g opacity="0.92">
    <circle cx="520" cy="98" r="36" fill="${a}" opacity="0.55"/>
    <path d="M220 198l40-54 40 38 48-62 52 78" fill="none" stroke="${a}" stroke-width="10" stroke-linecap="round" opacity="0.7"/>
  </g>`,
  (a) => `<g opacity="0.9" fill="${a}">
    <path d="M160 250c20-70 60-100 110-100s90 30 110 100z" opacity="0.25"/>
    <circle cx="280" cy="170" r="22" opacity="0.7"/><circle cx="360" cy="170" r="18" opacity="0.55"/>
  </g>`,
  (a) => `<g opacity="0.88" stroke="${a}" stroke-width="10" stroke-linecap="round" fill="none">
    <path d="M140 230h360"/><path d="M200 230V170h40v60M300 230V150h40v80M400 230V165h40v65"/>
    <circle cx="500" cy="110" r="32" opacity="0.45"/>
  </g>`,
  (a) => `<g opacity="0.9" fill="${a}">
    <rect x="200" y="200" width="240" height="24" rx="12" opacity="0.35"/>
    <circle cx="240" cy="160" r="26" opacity="0.65"/><circle cx="320" cy="145" r="30" opacity="0.8"/><circle cx="400" cy="160" r="26" opacity="0.65"/>
  </g>`,
];

const OTHER_ART: ArtFn[] = [
  (a) => `<g opacity="0.92" fill="${a}">
    <path d="M320 86l28 84h90l-72 52 28 84-74-50-74 50 28-84-72-52h90z" opacity="0.75"/>
  </g>`,
  (a) => `<g opacity="0.9">
    <rect x="150" y="110" width="340" height="130" rx="22" fill="${a}" opacity="0.18"/>
    <path d="M190 150h80M190 182h120M190 214h96" stroke="${a}" stroke-width="10" stroke-linecap="round" opacity="0.65"/>
  </g>`,
  (a) => `<g opacity="0.88" fill="none" stroke="${a}" stroke-width="10" stroke-linecap="round">
    <circle cx="320" cy="180" r="70" opacity="0.45"/><path d="M320 130v100M270 180h100"/>
  </g>`,
  (a) => `<g opacity="0.9" fill="${a}">
    <path d="M120 250l80-140 80 90 80-110 80 160z" opacity="0.3"/>
    <circle cx="500" cy="120" r="24" opacity="0.5"/><circle cx="460" cy="90" r="12" opacity="0.35"/>
  </g>`,
  (a) => `<g opacity="0.92">
    <rect x="180" y="130" width="70" height="90" rx="8" fill="${a}" opacity="0.3"/>
    <rect x="270" y="110" width="70" height="110" rx="8" fill="${a}" opacity="0.38"/>
    <rect x="360" y="145" width="70" height="75" rx="8" fill="${a}" opacity="0.28"/>
  </g>`,
];

const ART_BY_CATEGORY: Record<EventCategory, ArtFn[]> = {
  music: MUSIC_ART,
  food: FOOD_ART,
  culture: CULTURE_ART,
  sport: SPORT_ART,
  families: FAMILIES_ART,
  other: OTHER_ART,
};

function artBody(category: EventCategory, variant: number): string {
  const accent = paletteFor(category, variant).accent;
  const fn = ART_BY_CATEGORY[category][variant % COVER_VARIANTS_PER_CATEGORY];
  return fn(accent);
}

export function renderCategoryCoverSvg(
  category: EventCategory,
  seed: string,
  variant?: number,
): string {
  const v = variant ?? getCategoryCoverVariant(category, seed);
  return svgWrap(category, v, seed, artBody(category, v));
}

export function categoryCoverSeed(event: { date_event?: string | null; title?: string | null }): string {
  return String(event.date_event ?? event.title ?? "atlas");
}

export function renderListCategoryCover(
  category: EventCategory,
  seed: string,
): string {
  const variant = getCategoryCoverVariant(category, seed);
  return `<div class="list-card-media category-cover"${categoryDataAttr(category)} data-cover-seed="${escapeAttr(seed)}" data-cover-variant="${variant}">
    ${renderCategoryCoverSvg(category, seed, variant)}
  </div>`;
}

export function renderSheetCategoryCover(
  category: EventCategory,
  seed: string,
  badgeHtml: string,
): string {
  const variant = getCategoryCoverVariant(category, seed);
  return `<div class="stable-event-cover category-cover"${categoryDataAttr(category)} data-cover-seed="${escapeAttr(seed)}" data-cover-variant="${variant}">
    ${renderCategoryCoverSvg(category, seed, variant)}
    ${badgeHtml}
  </div>`;
}

function categoryDataAttr(category: EventCategory): string {
  return ` data-category="${category}"`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** Ripristina cover stilizzata dopo errore caricamento foto reale. */
export function applyCategoryCoverFallback(
  container: HTMLElement,
  category: EventCategory,
  seed: string,
  badgeHtml = "",
): void {
  const variant = getCategoryCoverVariant(category, seed);
  const isSheet = container.classList.contains("stable-event-cover");
  container.classList.remove("has-img", "is-loaded", "img-error");
  container.classList.add("category-cover");
  container.dataset.coverSeed = seed;
  container.dataset.coverVariant = String(variant);
  container.style.background = "";
  container.innerHTML = `${renderCategoryCoverSvg(category, seed, variant)}${badgeHtml}`;
  if (!isSheet) container.classList.add("list-card-media");
}

export function categoryCoverLabel(category: EventCategory): string {
  return getCategoryMeta(category).label;
}

/** Totale combinazioni uniche (6 categorie × varianti). */
export function totalCategoryCoverCombinations(): number {
  return Object.keys(CATEGORY_PALETTES).length * COVER_VARIANTS_PER_CATEGORY;
}
