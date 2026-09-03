import { escapeHtml, getCategoryMeta, type AtlasEvent, type EventCategory } from "@atlas/core";
import { updateEventAdmin } from "@atlas/supabase-client";

export interface EventEditorOptions {
  container: HTMLElement;
  onSaved: () => void;
  onClose: () => void;
}

interface EditorSnapshot {
  title: string;
  category: EventCategory;
  start_date: string;
  end_date: string;
  venue: string;
  event_url: string;
  description: string;
}

export class EventEditor {
  private event: AtlasEvent | null = null;
  private undoStack: EditorSnapshot[] = [];
  private redoStack: EditorSnapshot[] = [];

  constructor(private options: EventEditorOptions) {}

  open(event: AtlasEvent): void {
    this.event = event;
    this.undoStack = [];
    this.redoStack = [];
    this.render();
  }

  close(): void {
    this.event = null;
    this.options.container.innerHTML = "";
    this.options.onClose();
  }

  private snapshot(): EditorSnapshot {
    const form = this.options.container.querySelector("form") as HTMLFormElement;
    const data = new FormData(form);
    return {
      title: String(data.get("title") ?? ""),
      category: String(data.get("category") ?? "other") as EventCategory,
      start_date: String(data.get("start_date") ?? ""),
      end_date: String(data.get("end_date") ?? ""),
      venue: String(data.get("venue") ?? ""),
      event_url: String(data.get("event_url") ?? ""),
      description: String(data.get("description") ?? ""),
    };
  }

  private applySnapshot(s: EditorSnapshot): void {
    const set = (name: string, value: string) => {
      const el = this.options.container.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el) el.value = value;
    };
    set("title", s.title);
    set("category", s.category);
    set("start_date", s.start_date);
    set("end_date", s.end_date);
    set("venue", s.venue);
    set("event_url", s.event_url);
    set("description", s.description);
  }

  private pushUndo(): void {
    this.undoStack.push(this.snapshot());
    this.redoStack = [];
  }

  private render(): void {
    const event = this.event;
    if (!event) return;

    const meta = getCategoryMeta(event.category);
    const startLocal = toLocalInput(event.start_date);
    const endLocal = event.end_date ? toLocalInput(event.end_date) : "";

    this.options.container.innerHTML = `
      <div class="editor-panel">
        <div class="editor-header">
          <h3>Modifica evento</h3>
          <button type="button" class="btn-link" id="closeEditor">Chiudi</button>
        </div>
        <p class="small">${meta.label} · ID ${escapeHtml(event.date_event ?? "")}</p>
        <form id="eventEditForm">
          <label>Titolo</label>
          <input name="title" value="${escapeHtml(event.title)}" required />
          <label>Categoria</label>
          <select name="category">
            ${categoryOptions(event.category)}
          </select>
          <label>Inizio</label>
          <input name="start_date" type="datetime-local" value="${startLocal}" required />
          <label>Fine</label>
          <input name="end_date" type="datetime-local" value="${endLocal}" />
          <label>Luogo</label>
          <input name="venue" value="${escapeHtml(event.venue ?? "")}" />
          <label>Link evento</label>
          <input name="event_url" type="url" value="${escapeHtml(event.event_url ?? "")}" />
          <label>Descrizione</label>
          <textarea name="description" rows="3">${escapeHtml(event.description ?? "")}</textarea>
          <div class="editor-actions">
            <button type="button" id="undoBtn" class="btn-secondary" title="Annulla">↶ Annulla</button>
            <button type="button" id="redoBtn" class="btn-secondary" title="Ripeti">↷ Ripeti</button>
            ${event.event_url ? `<a class="btn-secondary link-btn" href="${escapeHtml(event.event_url)}" target="_blank" rel="noopener">Apri pagina</a>` : ""}
            <button type="submit" class="primary">Salva modifiche</button>
          </div>
        </form>
      </div>
    `;

    this.options.container.querySelector("#closeEditor")?.addEventListener("click", () => this.close());

    this.options.container.querySelectorAll("input, textarea, select").forEach((el) => {
      el.addEventListener("focus", () => this.pushUndo(), { once: true });
      el.addEventListener("change", () => this.pushUndo());
    });

    this.options.container.querySelector("#undoBtn")?.addEventListener("click", () => {
      if (this.undoStack.length === 0) return;
      this.redoStack.push(this.snapshot());
      const prev = this.undoStack.pop()!;
      this.applySnapshot(prev);
    });

    this.options.container.querySelector("#redoBtn")?.addEventListener("click", () => {
      if (this.redoStack.length === 0) return;
      this.undoStack.push(this.snapshot());
      const next = this.redoStack.pop()!;
      this.applySnapshot(next);
    });

    this.options.container.querySelector("#eventEditForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      void this.save();
    });
  }

  private async save(): Promise<void> {
    if (!this.event?.date_event) return;
    const ok = window.confirm("Salvare le modifiche a questo evento?");
    if (!ok) return;

    const s = this.snapshot();
    try {
      await updateEventAdmin(this.event.date_event, {
        title: s.title.trim(),
        category: s.category,
        start_date: new Date(s.start_date).toISOString(),
        end_date: s.end_date ? new Date(s.end_date).toISOString() : null,
        venue: s.venue.trim() || null,
        event_url: s.event_url.trim() || null,
        description: s.description.trim() || null,
      });
      this.options.onSaved();
      this.close();
    } catch (error) {
      alert(`Errore salvataggio: ${(error as Error).message}`);
    }
  }
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function categoryOptions(current: string): string {
  const cats: EventCategory[] = ["music", "food", "culture", "sport", "families", "other"];
  return cats
    .map((c) => {
      const meta = getCategoryMeta(c);
      return `<option value="${c}"${c === current ? " selected" : ""}>${meta.label}</option>`;
    })
    .join("");
}
