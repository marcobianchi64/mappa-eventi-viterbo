import { escapeHtml, formatDate, getCategoryMeta, type AtlasEvent } from "@atlas/core";
import {
  fetchPendingEvents,
  getSession,
  signInWithOtp,
  updateEventReview,
} from "@atlas/supabase-client";

export class AdminApp {
  start(): void {
    const root = document.getElementById("app");
    if (!root) throw new Error("Elemento #app non trovato");

    root.innerHTML = `
      <header>
        <h1>Project Atlas - Control Center</h1>
      </header>
      <main>
        <section id="loginBox" class="card">
          <h2>Accesso amministratore</h2>
          <input id="email" type="email" placeholder="Email amministratore" />
          <button class="primary" id="loginBtn" type="button">Invia link di accesso</button>
          <p id="loginStatus" class="small"></p>
        </section>
        <section id="dashboard" class="hidden">
          <div class="card">
            <h2>Eventi da verificare</h2>
            <div id="eventsList">Caricamento...</div>
          </div>
        </section>
      </main>
    `;

    document.getElementById("loginBtn")?.addEventListener("click", () => void this.login());
    void this.checkSession();
  }

  private async login(): Promise<void> {
    const email = (document.getElementById("email") as HTMLInputElement).value.trim();
    const status = document.getElementById("loginStatus");

    if (!email) {
      if (status) status.textContent = "Inserisci una email.";
      return;
    }

    if (status) status.textContent = "Invio link in corso...";

    try {
      await signInWithOtp(email, window.location.href);
      if (status) status.textContent = "Controlla la tua email e clicca il link di accesso.";
    } catch (error) {
      if (status) status.textContent = `Errore: ${(error as Error).message}`;
    }
  }

  private async checkSession(): Promise<void> {
    try {
      const session = await getSession();
      if (session) {
        document.getElementById("loginBox")?.classList.add("hidden");
        document.getElementById("dashboard")?.classList.remove("hidden");
        await this.loadEvents();
      }
    } catch (error) {
      console.error(error);
    }
  }

  private async loadEvents(): Promise<void> {
    const list = document.getElementById("eventsList");
    if (!list) return;

    try {
      const events = await fetchPendingEvents();
      this.renderEvents(list, events);
    } catch (error) {
      list.innerHTML = `Errore caricamento: ${escapeHtml((error as Error).message)}`;
    }
  }

  private renderEvents(list: HTMLElement, events: AtlasEvent[]): void {
    if (events.length === 0) {
      list.innerHTML = "Nessun evento in revisione.";
      return;
    }

    list.innerHTML = "";

    for (const event of events) {
      const meta = getCategoryMeta(event.category);
      const div = document.createElement("div");
      div.className = "event";
      div.innerHTML = `
        <strong>${escapeHtml(event.title)}</strong>
        <div class="small">${meta.label} · ${formatDate(event.start_date)}</div>
        <div class="small">${escapeHtml(event.venue)}</div>
        <div class="small">${escapeHtml(event.description)}</div>
        <button class="approve" type="button">Approva</button>
        <button class="reject" type="button">Rifiuta</button>
      `;

      div.querySelector(".approve")?.addEventListener("click", () => {
        void this.updateEvent(event.date_event!, true, "approved");
      });
      div.querySelector(".reject")?.addEventListener("click", () => {
        void this.updateEvent(event.date_event!, false, "rejected");
      });

      list.appendChild(div);
    }
  }

  private async updateEvent(id: string, verified: boolean, status: "approved" | "rejected"): Promise<void> {
    try {
      await updateEventReview(id, verified, status);
      await this.loadEvents();
    } catch (error) {
      alert(`Errore aggiornamento: ${(error as Error).message}`);
    }
  }
}
