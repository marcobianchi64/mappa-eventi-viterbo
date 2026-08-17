import { escapeHtml, getCategoryMeta, type AtlasExperience } from "@atlas/core";

export type ExperienceTypeFilter = "all" | AtlasExperience["experience_type"];
export type ExperiencePriceFilter = "all" | "free" | "paid";

interface ExperiencePanelState {
  type: ExperienceTypeFilter;
  price: ExperiencePriceFilter;
  query: string;
}

const TYPE_LABELS: Record<AtlasExperience["experience_type"], string> = {
  tour: "Tour",
  tasting: "Degustazioni",
  food: "Food",
  activity: "Attività",
  workshop: "Laboratori",
  trail: "Percorsi",
  lodging: "Ospitalità",
  other: "Altro",
};

const AVAILABILITY_LABELS: Record<AtlasExperience["repeatability"], string> = {
  ongoing: "Sempre disponibile",
  seasonal: "Stagionale",
  on_request: "Su richiesta",
};

const PRICE_LABELS: Record<AtlasExperience["price_hint"], string> = {
  free: "Gratuita",
  paid: "A pagamento",
  mixed: "Gratuita e a pagamento",
  unknown: "Prezzo da confermare",
};

function matchesPrice(experience: AtlasExperience, price: ExperiencePriceFilter): boolean {
  if (price === "all") return true;
  if (experience.price_hint === "mixed") return true;
  return experience.price_hint === price;
}

export function filterExperiences(
  experiences: AtlasExperience[],
  state: ExperiencePanelState,
): AtlasExperience[] {
  const query = state.query.trim().toLowerCase();
  return experiences.filter((experience) => {
    if (state.type !== "all" && experience.experience_type !== state.type) return false;
    if (!matchesPrice(experience, state.price)) return false;
    if (!query) return true;
    const haystack = [experience.title, experience.municipality, experience.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

/** Pannello esperienze — stessa architettura dei pannelli farmacie/cinema. */
export function mountExperiencePanel(
  container: HTMLElement,
  experiences: AtlasExperience[],
  onOpenExperience: (experience: AtlasExperience) => void,
): void {
  const state: ExperiencePanelState = { type: "all", price: "all", query: "" };

  const render = (): void => {
    container.innerHTML = renderContent(experiences, state);
    bind(container, experiences, state, render, onOpenExperience);
  };

  render();
}

function renderContent(experiences: AtlasExperience[], state: ExperiencePanelState): string {
  if (experiences.length === 0) {
    return `<p class="utility-services-empty">Le prime esperienze verificate saranno pubblicate a breve.</p>`;
  }

  const availableTypes = [...new Set(experiences.map((item) => item.experience_type))];
  const typeChips = [
    `<button type="button" class="utility-chip${state.type === "all" ? " active" : ""}" data-experience-type="all">Tutte</button>`,
    ...availableTypes.map(
      (type) =>
        `<button type="button" class="utility-chip${state.type === type ? " active" : ""}" data-experience-type="${type}">${TYPE_LABELS[type]}</button>`,
    ),
  ].join("");

  const priceChips = (["all", "free", "paid"] as const)
    .map((price) => {
      const labels = { all: "Ogni prezzo", free: "Gratuite", paid: "A pagamento" };
      return `<button type="button" class="utility-chip${state.price === price ? " active" : ""}" data-experience-price="${price}">${labels[price]}</button>`;
    })
    .join("");

  const filtered = filterExperiences(experiences, state);
  const cards =
    filtered.length === 0
      ? `<p class="utility-services-empty">Nessuna esperienza per questi filtri. Prova ad allargare la ricerca.</p>`
      : `<div class="utility-sync-items">${filtered
          .map((experience) => {
            const meta = getCategoryMeta(experience.category);
            const facts = [
              AVAILABILITY_LABELS[experience.repeatability],
              PRICE_LABELS[experience.price_hint],
              experience.municipality ?? "",
            ]
              .filter(Boolean)
              .join(" · ");
            return `
              <button type="button" class="utility-sync-item utility-experience-item" data-experience-open="${escapeHtml(experience.id)}">
                <strong class="utility-sync-item-title">${escapeHtml(experience.title)}</strong>
                <span class="utility-sync-item-meta"><span style="color:${meta.color}">${escapeHtml(meta.label)}</span> · ${escapeHtml(facts)}</span>
              </button>
            `;
          })
          .join("")}</div>`;

  return `
    <div class="utility-services-list" data-utility-panel="experiences">
      <div class="utility-panel-sticky">
        <p class="utility-services-lead">
          <strong>${filtered.length}</strong> esperienze da vivere tutto l'anno, senza vincolo di data
        </p>
        <div class="utility-panel-toolbar">
          <div class="utility-chip-row utility-chip-row-wrap" role="group" aria-label="Tipo esperienza">${typeChips}</div>
          <div class="utility-chip-row" role="group" aria-label="Prezzo">${priceChips}</div>
          <label class="utility-search">
            <span class="utility-search-label">Cerca esperienza o comune</span>
            <input type="search" class="utility-search-input" data-experience-search placeholder="Es. degustazione, Bolsena…" value="${escapeHtml(state.query)}" />
          </label>
        </div>
      </div>
      <div class="utility-panel-scroll-body" tabindex="0" aria-label="Elenco esperienze">
        ${cards}
      </div>
    </div>
  `;
}

function bind(
  container: HTMLElement,
  experiences: AtlasExperience[],
  state: ExperiencePanelState,
  render: () => void,
  onOpenExperience: (experience: AtlasExperience) => void,
): void {
  container.querySelectorAll<HTMLButtonElement>("[data-experience-type]").forEach((button) => {
    button.addEventListener("click", () => {
      state.type = button.dataset.experienceType as ExperienceTypeFilter;
      render();
    });
  });
  container.querySelectorAll<HTMLButtonElement>("[data-experience-price]").forEach((button) => {
    button.addEventListener("click", () => {
      state.price = button.dataset.experiencePrice as ExperiencePriceFilter;
      render();
    });
  });
  const search = container.querySelector<HTMLInputElement>("[data-experience-search]");
  search?.addEventListener("input", () => {
    state.query = search.value;
    render();
  });
  container.querySelectorAll<HTMLButtonElement>("[data-experience-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const experience = experiences.find((item) => item.id === button.dataset.experienceOpen);
      if (experience) onOpenExperience(experience);
    });
  });
}
