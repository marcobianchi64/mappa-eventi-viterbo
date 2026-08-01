import {
  CATEGORY_META,
  DATE_RANGE_LABELS,
  escapeHtml,
  formatEventSchedule,
  getDisplayCategory,
  getEventComuneDisplayLabel,
  getEventDisplayTitle,
  getCategoryMeta,
  isHttpUrl,
  type AtlasEvent,
  type DateRangeKey,
  type EventCategory,
} from "@atlas/core";

export type EventListCategoryFilter = EventCategory | "all";

const DATE_OPTIONS: DateRangeKey[] = ["today", "tomorrow", "weekend", "7", "15", "30", "60"];

function excerpt(text: string | null | undefined, max = 200): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "Scopri date, luogo e dettagli aprendo la scheda evento.";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function listCardMedia(event: AtlasEvent): string {
  const category = getDisplayCategory(event);
  const meta = getCategoryMeta(category);
  if (isHttpUrl(event.image_url)) {
    const src = escapeHtml(event.image_url!);
    return `<div class="list-card-media has-img"><img src="${src}" alt="" loading="lazy" /></div>`;
  }
  return `<div class="list-card-media placeholder" style="background:linear-gradient(135deg, ${meta.color}, ${meta.color}99)"><span>${meta.icon}</span></div>`;
}

function sidebarLinks(
  kind: "cat" | "range",
  activeCat: EventListCategoryFilter,
  activeRange: DateRangeKey,
): string {
  if (kind === "cat") {
    const items: { key: EventListCategoryFilter; label: string }[] = [
      { key: "all", label: "Tutte le categorie" },
      ...(Object.keys(CATEGORY_META) as EventCategory[]).map((key) => ({
        key,
        label: CATEGORY_META[key].label,
      })),
    ];
    return items
      .map((item) => {
        const active = item.key === activeCat;
        return `<li><button type="button" class="list-sidebar-link${active ? " active" : ""}" data-list-cat="${item.key}">${escapeHtml(item.label)}</button></li>`;
      })
      .join("");
  }

  return DATE_OPTIONS.map((range) => {
    const label = DATE_RANGE_LABELS[range] ?? range;
    const active = range === activeRange;
    return `<li><button type="button" class="list-sidebar-link${active ? " active" : ""}" data-list-range="${range}">${escapeHtml(label)}</button></li>`;
  }).join("");
}

export function renderEventListPageHtml(
  events: AtlasEvent[],
  activeCategory: EventListCategoryFilter,
  activeRange: DateRangeKey,
): string {
  const rangeLabel = DATE_RANGE_LABELS[activeRange] ?? activeRange;
  const cards =
    events.length === 0
      ? `<p class="list-page-empty">Nessun evento per i filtri scelti. Prova ad allargare il periodo o cambiare categoria.</p>`
      : events
          .map((event) => {
            const id = escapeHtml(event.date_event ?? "");
            const title = escapeHtml(getEventDisplayTitle(event));
            const category = getDisplayCategory(event);
            const meta = getCategoryMeta(category);
            const when = escapeHtml(formatEventSchedule(event));
            const place = escapeHtml(getEventComuneDisplayLabel(event) || event.venue || "");
            const desc = escapeHtml(excerpt(event.description));
            return `
        <article class="list-card">
          <button type="button" class="list-card-hit" data-event-id="${id}">
            ${listCardMedia(event)}
            <div class="list-card-body">
              <h2 class="list-card-title">${title}</h2>
              <p class="list-card-excerpt">${desc}</p>
              <div class="list-card-meta">
                <span class="list-card-meta-item">📅 ${when}</span>
                <span class="list-card-meta-item" style="color:${meta.color}">🏷 ${escapeHtml(meta.label)}</span>
                ${place ? `<span class="list-card-meta-item">📍 ${place}</span>` : ""}
              </div>
            </div>
          </button>
        </article>
      `;
          })
          .join("");

  return `
    <div class="list-page-layout">
      <div class="list-page-main">
        <header class="list-page-intro">
          <h1>Eventi in provincia di Viterbo</h1>
          <p class="list-page-lead"><strong>${escapeHtml(rangeLabel)}</strong> · ${events.length} eventi in elenco</p>
        </header>
        <div class="list-cards">${cards}</div>
      </div>
      <aside class="list-page-sidebar" aria-label="Filtra eventi">
        <h2 class="list-sidebar-heading">Scopri gli eventi in calendario</h2>
        <div class="list-sidebar-cols">
          <div class="list-sidebar-col">
            <h3><span aria-hidden="true">🏷</span> Categoria</h3>
            <ul class="list-sidebar-list">${sidebarLinks("cat", activeCategory, activeRange)}</ul>
          </div>
          <div class="list-sidebar-col">
            <h3><span aria-hidden="true">📅</span> Quando</h3>
            <ul class="list-sidebar-list">${sidebarLinks("range", activeCategory, activeRange)}</ul>
          </div>
        </div>
      </aside>
    </div>
  `;
}

export function bindEventListPage(
  root: HTMLElement,
  onCategory: (cat: EventListCategoryFilter) => void,
  onRange: (range: DateRangeKey) => void,
  onSelect: (eventId: string) => void,
): void {
  root.querySelectorAll("[data-list-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = (btn as HTMLButtonElement).dataset.listCat as EventListCategoryFilter;
      onCategory(key);
    });
  });
  root.querySelectorAll("[data-list-range]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = (btn as HTMLButtonElement).dataset.listRange as DateRangeKey;
      onRange(key);
    });
  });
  root.querySelectorAll("[data-event-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLButtonElement).dataset.eventId;
      if (id) onSelect(id);
    });
  });
}
