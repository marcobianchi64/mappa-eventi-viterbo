import {
  INTERESTS_STORAGE_KEY,
  type AtlasEvent,
  type SavedInterest,
} from "@atlas/core";

type InterestMap = Record<string, SavedInterest>;

export class InterestsService {
  getAll(): InterestMap {
    try {
      return JSON.parse(localStorage.getItem(INTERESTS_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  save(event: AtlasEvent): void {
    const id = event.date_event;
    if (!id) throw new Error("Evento senza identificativo");

    const interests = this.getAll();
    interests[id] = {
      id,
      title: event.title || "Evento",
      start_date: event.start_date || null,
      venue: event.venue || "",
      lat: event.lat,
      lng: event.lng,
      event_url: event.event_url || "",
      saved_at: new Date().toISOString(),
      reminder: "day_before",
    };

    localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(interests));
  }

  remove(id: string): void {
    const interests = this.getAll();
    delete interests[id];
    localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(interests));
  }

  listSorted(): SavedInterest[] {
    return Object.values(this.getAll()).sort(
      (a, b) => new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime(),
    );
  }
}
