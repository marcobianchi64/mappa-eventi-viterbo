import { escapeHtml, getCategoryMeta, type AtlasExperience, type EventCategory } from "@atlas/core";
import { createExperienceAdmin, updateExperienceAdmin } from "@atlas/supabase-client";

export interface ExperienceEditorOptions {
  container: HTMLElement;
  onSaved: () => void;
  onClose: () => void;
}

const TYPE_LABELS: Record<AtlasExperience["experience_type"], string> = {
  tour: "Tour",
  tasting: "Degustazione",
  food: "Food",
  activity: "Attività",
  workshop: "Laboratorio",
  trail: "Percorso",
  lodging: "Ospitalità",
  other: "Altro",
};

/** Editor esperienze — stessa architettura dell'editor eventi. */
export class ExperienceEditor {
  private experience: AtlasExperience | null = null;
  private creating = false;

  constructor(private options: ExperienceEditorOptions) {}

  openNew(): void {
    this.experience = null;
    this.creating = true;
    this.render();
  }

  open(experience: AtlasExperience): void {
    this.experience = experience;
    this.creating = false;
    this.render();
  }

  close(): void {
    this.experience = null;
    this.creating = false;
    this.options.container.innerHTML = "";
    this.options.onClose();
  }

  private render(): void {
    const experience = this.experience;
    const heading = this.creating ? "Nuova esperienza" : "Modifica esperienza";
    const subtitle = experience
      ? `${getCategoryMeta(experience.category).label} · ID ${escapeHtml(experience.id)}`
      : "Compila i campi essenziali: potrai completare i dettagli in seguito.";

    this.options.container.innerHTML = `
      <div class="editor-panel">
        <div class="editor-header">
          <h3>${heading}</h3>
          <button type="button" class="btn-link" id="closeExperienceEditor">Chiudi</button>
        </div>
        <p class="small">${subtitle}</p>
        <form id="experienceEditForm">
          <label>Titolo</label>
          <input name="title" value="${escapeHtml(experience?.title ?? "")}" required />
          <label>Tipo</label>
          <select name="experience_type">${typeOptions(experience?.experience_type ?? "tour")}</select>
          <label>Categoria</label>
          <select name="category">${categoryOptions(experience?.category ?? "culture")}</select>
          <label>Comune</label>
          <input name="municipality" value="${escapeHtml(experience?.municipality ?? "")}" />
          <label>Indirizzo o punto di ritrovo</label>
          <input name="address" value="${escapeHtml(experience?.address ?? "")}" />
          <label>Latitudine (per la mappa)</label>
          <input name="lat" type="number" step="any" value="${experience?.lat ?? ""}" />
          <label>Longitudine (per la mappa)</label>
          <input name="lng" type="number" step="any" value="${experience?.lng ?? ""}" />
          <label>Prezzo</label>
          <select name="price_hint">${priceOptions(experience?.price_hint ?? "unknown")}</select>
          <label>Disponibilità</label>
          <select name="repeatability">${repeatabilityOptions(experience?.repeatability ?? "ongoing")}</select>
          <label>Link informazioni o prenotazione</label>
          <input name="info_url" type="url" value="${escapeHtml(experience?.info_url ?? "")}" />
          <label>Immagine (URL)</label>
          <input name="image_url" type="url" value="${escapeHtml(experience?.image_url ?? "")}" />
          <label>Descrizione</label>
          <textarea name="description" rows="3">${escapeHtml(experience?.description ?? "")}</textarea>
          <label>Note interne</label>
          <textarea name="notes" rows="2">${escapeHtml(experience?.notes ?? "")}</textarea>
          <div class="editor-actions">
            ${experience?.info_url ? `<a class="btn-secondary link-btn" href="${escapeHtml(experience.info_url)}" target="_blank" rel="noopener">Apri pagina</a>` : ""}
            <button type="submit" class="primary">${this.creating ? "Crea esperienza" : "Salva modifiche"}</button>
          </div>
        </form>
      </div>
    `;

    this.options.container
      .querySelector("#closeExperienceEditor")
      ?.addEventListener("click", () => this.close());
    this.options.container.querySelector("#experienceEditForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      void this.save();
    });
  }

  private async save(): Promise<void> {
    const form = this.options.container.querySelector("form");
    if (!form) return;
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? "").trim();

    const payload = {
      title: value("title"),
      experience_type: value("experience_type") as AtlasExperience["experience_type"],
      category: value("category") as AtlasExperience["category"],
      municipality: value("municipality") || null,
      address: value("address") || null,
      lat: value("lat") ? Number(value("lat")) : null,
      lng: value("lng") ? Number(value("lng")) : null,
      price_hint: value("price_hint") as AtlasExperience["price_hint"],
      repeatability: value("repeatability") as AtlasExperience["repeatability"],
      info_url: value("info_url") || null,
      image_url: value("image_url") || null,
      description: value("description") || null,
      notes: value("notes") || null,
    };

    try {
      if (this.creating) {
        await createExperienceAdmin({ ...payload, territory_id: "IT-VT", status: "unknown" });
      } else if (this.experience) {
        if (!window.confirm("Salvare le modifiche a questa esperienza?")) return;
        await updateExperienceAdmin(this.experience.id, payload);
      }
      this.options.onSaved();
      this.close();
    } catch (error) {
      alert(`Errore salvataggio: ${(error as Error).message}`);
    }
  }
}

function typeOptions(current: AtlasExperience["experience_type"]): string {
  return (Object.keys(TYPE_LABELS) as Array<AtlasExperience["experience_type"]>)
    .map((type) => `<option value="${type}"${type === current ? " selected" : ""}>${TYPE_LABELS[type]}</option>`)
    .join("");
}

function categoryOptions(current: EventCategory): string {
  const cats: EventCategory[] = ["music", "food", "culture", "sport", "families", "other"];
  return cats
    .map((c) => `<option value="${c}"${c === current ? " selected" : ""}>${getCategoryMeta(c).label}</option>`)
    .join("");
}

function priceOptions(current: AtlasExperience["price_hint"]): string {
  const labels = { unknown: "Da verificare", free: "Gratuita", paid: "A pagamento", mixed: "Mista" };
  return (Object.keys(labels) as Array<AtlasExperience["price_hint"]>)
    .map((v) => `<option value="${v}"${v === current ? " selected" : ""}>${labels[v]}</option>`)
    .join("");
}

function repeatabilityOptions(current: AtlasExperience["repeatability"]): string {
  const labels = { ongoing: "Continuativa", seasonal: "Stagionale", on_request: "Su richiesta" };
  return (Object.keys(labels) as Array<AtlasExperience["repeatability"]>)
    .map((v) => `<option value="${v}"${v === current ? " selected" : ""}>${labels[v]}</option>`)
    .join("");
}
