import { getCategoryMeta, type EventCategory } from "@atlas/core";

export const COVER_VARIANTS_PER_CATEGORY = 2;

const PALETTES: Record<
  EventCategory,
  { a: string; b: string; c: string; accent: string }
> = {
  music: { a: "#1d4ed8", b: "#3b82f6", c: "#93c5fd", accent: "#dbeafe" },
  food: { a: "#c2410c", b: "#ea580c", c: "#fdba74", accent: "#ffedd5" },
  culture: { a: "#6d28d9", b: "#7c3aed", c: "#c4b5fd", accent: "#ede9fe" },
  sport: { a: "#15803d", b: "#16a34a", c: "#86efac", accent: "#dcfce7" },
  families: { a: "#0e7490", b: "#0891b2", c: "#67e8f9", accent: "#cffafe" },
  other: { a: "#475569", b: "#64748b", c: "#cbd5e1", accent: "#f1f5f9" },
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

function gid(category: EventCategory, variant: number, name: string, seed: string): string {
  return `cc-${category}-v${variant}-${name}-${hashSeed(seed).toString(36)}`;
}

function svgWrap(category: EventCategory, variant: number, seed: string, body: string): string {
  const p = PALETTES[category];
  const bg = gid(category, variant, "bg", seed);
  const glow = gid(category, variant, "glow", seed);
  return `<svg class="category-cover-svg" viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="${bg}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.a}" />
      <stop offset="55%" stop-color="${p.b}" />
      <stop offset="100%" stop-color="${p.c}" />
    </linearGradient>
    <radialGradient id="${glow}" cx="28%" cy="22%" r="65%">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.55" />
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="640" height="360" fill="url(#${bg})" />
  <rect width="640" height="360" fill="url(#${glow})" />
  ${body}
</svg>`;
}

function artBody(category: EventCategory, variant: number): string {
  const p = PALETTES[category];
  const accent = p.accent;

  switch (category) {
    case "music":
      if (variant === 0) {
        return `<g opacity="0.92" fill="${accent}">
          <rect x="72" y="118" width="28" height="124" rx="14" />
          <rect x="132" y="88" width="28" height="184" rx="14" />
          <rect x="192" y="138" width="28" height="104" rx="14" />
          <rect x="252" y="72" width="28" height="216" rx="14" />
          <rect x="312" y="128" width="28" height="114" rx="14" />
          <rect x="372" y="98" width="28" height="164" rx="14" />
          <rect x="432" y="148" width="28" height="84" rx="14" />
          <path d="M500 180c48-10 88 18 88 58s-52 72-96 52" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity="0.65"/>
        </g>`;
      }
      return `<g opacity="0.95">
        <circle cx="470" cy="180" r="108" fill="none" stroke="${accent}" stroke-width="16" opacity="0.35"/>
        <circle cx="470" cy="180" r="72" fill="${accent}" opacity="0.22"/>
        <circle cx="470" cy="180" r="24" fill="${accent}" opacity="0.9"/>
        <circle cx="470" cy="180" r="8" fill="#fff" opacity="0.95"/>
        <path d="M120 250c60-92 150-118 230-72" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round" opacity="0.55"/>
        <circle cx="150" cy="110" r="10" fill="${accent}" opacity="0.75"/>
        <circle cx="210" cy="86" r="7" fill="${accent}" opacity="0.55"/>
        <circle cx="260" cy="118" r="8" fill="${accent}" opacity="0.65"/>
      </g>`;

    case "food":
      if (variant === 0) {
        return `<g opacity="0.94">
          <path d="M170 250V130c0-36 28-64 64-64h12c36 0 64 28 64 64v120" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
          <ellipse cx="240" cy="252" rx="92" ry="18" fill="${accent}" opacity="0.35"/>
          <path d="M420 250c0-66 34-112 86-128" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round" opacity="0.8"/>
          <circle cx="506" cy="118" r="34" fill="${accent}" opacity="0.55"/>
          <circle cx="468" cy="150" r="18" fill="${accent}" opacity="0.4"/>
        </g>`;
      }
      return `<g opacity="0.94">
        <ellipse cx="320" cy="232" rx="150" ry="34" fill="${accent}" opacity="0.28"/>
        <ellipse cx="320" cy="220" rx="132" ry="26" fill="none" stroke="${accent}" stroke-width="12" opacity="0.75"/>
        <path d="M188 220c24-72 88-108 132-108s108 36 132 108" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity="0.55"/>
        <circle cx="132" cy="156" r="22" fill="${accent}" opacity="0.65"/>
        <circle cx="168" cy="128" r="16" fill="${accent}" opacity="0.45"/>
        <circle cx="508" cy="148" r="20" fill="${accent}" opacity="0.6"/>
      </g>`;

    case "culture":
      if (variant === 0) {
        return `<g opacity="0.92">
          <path d="M120 250h400" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity="0.5"/>
          <path d="M170 250V140l50-36 50 36v110M350 250V140l50-36 50 36v110" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M150 118h340" stroke="${accent}" stroke-width="12" stroke-linecap="round" opacity="0.7"/>
          <path d="M180 98h280l-24 28H204z" fill="${accent}" opacity="0.45"/>
        </g>`;
      }
      return `<g opacity="0.94">
        <path d="M180 250V150c0-24 20-44 48-44h24c28 0 48 20 48 44v100" fill="${accent}" opacity="0.22"/>
        <path d="M228 106h96v144h-96z" fill="none" stroke="${accent}" stroke-width="12" stroke-linejoin="round"/>
        <path d="M248 130h56M248 162h56M248 194h40" stroke="${accent}" stroke-width="8" stroke-linecap="round" opacity="0.75"/>
        <circle cx="470" cy="180" r="54" fill="none" stroke="${accent}" stroke-width="10" opacity="0.55"/>
        <path d="M470 146v68M438 180h64" stroke="${accent}" stroke-width="8" stroke-linecap="round" opacity="0.65"/>
      </g>`;

    case "sport":
      if (variant === 0) {
        return `<g opacity="0.94">
          <path d="M80 250c80-120 180-150 280-110s160 130 200 110" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round" opacity="0.55"/>
          <path d="M120 250c40-40 88-58 132-48" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity="0.45"/>
          <circle cx="500" cy="118" r="42" fill="${accent}" opacity="0.35"/>
          <path d="M458 118h84M500 76v84" stroke="${accent}" stroke-width="8" stroke-linecap="round" opacity="0.65"/>
        </g>`;
      }
      return `<g opacity="0.94">
        <rect x="140" y="170" width="360" height="18" rx="9" fill="${accent}" opacity="0.35"/>
          <rect x="180" y="132" width="280" height="18" rx="9" fill="${accent}" opacity="0.28"/>
          <circle cx="220" cy="210" r="28" fill="${accent}" opacity="0.75"/>
          <path d="M300 210h160" stroke="${accent}" stroke-width="12" stroke-linecap="round" opacity="0.6"/>
          <path d="M420 182l48-34" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity="0.55"/>
        </g>`;

    case "families":
      if (variant === 0) {
        return `<g opacity="0.94" fill="${accent}">
          <circle cx="250" cy="142" r="28" opacity="0.85"/>
          <circle cx="320" cy="126" r="34" opacity="0.95"/>
          <circle cx="390" cy="142" r="28" opacity="0.85"/>
          <path d="M210 250c18-58 52-82 88-82h44c36 0 70 24 88 82" opacity="0.55"/>
          <path d="M286 250c10-42 28-58 48-58h32c20 0 38 16 48 58" opacity="0.75"/>
        </g>`;
      }
      return `<g opacity="0.92">
        <circle cx="520" cy="98" r="36" fill="${accent}" opacity="0.55"/>
        <path d="M100 250c30-48 74-74 120-74s90 26 120 74" fill="${accent}" opacity="0.22"/>
        <path d="M160 250h320" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity="0.45"/>
        <path d="M220 198l40-54 40 38 48-62 52 78" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
        <rect x="250" y="214" width="140" height="18" rx="9" fill="${accent}" opacity="0.35"/>
      </g>`;

    default:
      if (variant === 0) {
        return `<g opacity="0.92" fill="${accent}">
          <path d="M320 86l28 84h90l-72 52 28 84-74-50-74 50 28-84-72-52h90z" opacity="0.75"/>
          <circle cx="150" cy="120" r="8" opacity="0.55"/>
          <circle cx="500" cy="160" r="6" opacity="0.45"/>
          <circle cx="470" cy="96" r="5" opacity="0.35"/>
        </g>`;
      }
      return `<g opacity="0.9">
        <rect x="150" y="110" width="340" height="130" rx="22" fill="${accent}" opacity="0.18"/>
        <path d="M190 150h80M190 182h120M190 214h96" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity="0.65"/>
        <circle cx="470" cy="180" r="44" fill="none" stroke="${accent}" stroke-width="10" opacity="0.55"/>
        <path d="M446 180h48M470 156v48" stroke="${accent}" stroke-width="8" stroke-linecap="round" opacity="0.6"/>
      </g>`;
  }
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
