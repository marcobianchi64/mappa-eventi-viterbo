import {
  escapeHtml,
  formatDate,
  getCategoryMeta,
  type AtlasEvent,
  type SourceInput,
} from "@atlas/core";
import {
  approveSubmissionAsEvent,
  createSource,
  fetchPendingEvents,
  fetchPendingSubmissions,
  fetchSources,
  getSession,
  signInWithOtp,
  updateEventReview,
  updateSource,
  updateSubmissionStatus,
} from "@atlas/supabase-client";

type AdminTab = "dashboard" | "sources" | "events" | "submissions";

export class AdminApp {
  private tab: AdminTab = "dashboard";

  start(): void {
    const root = document.getElementById("app");
    if (!root) throw new Error("Elemento #app non trovato");
    this.renderShell(root);
    document.getElementById("loginBtn")?.addEventListener("click", () => void this.login());
    void this.checkSession();
  }

  private renderShell(root: HTMLElement): void {
    root.innerHTML = `
      <header>
        <h1>Project Atlas — Control Center</h1>
      </header>
      <main>
        <section id="loginBox" class="card">
          <h2>Accesso amministratore</h2>
          <input id="email" type="email" placeholder="Email amministratore" />
          <button class="primary" id="loginBtn" type="button">Invia link di accesso</button>
          <p id="loginStatus" class="small"></p>
        </section>
        <section id="dashboard" class="hidden">
          <nav class="tabs">
            <button type="button" data-tab="dashboard" class="tab active">Dashboard</button>
            <button type="button" data-tab="sources" class="tab">Fonti</button>
            <button type="button" data-tab="events" class="tab">Eventi</button>
            <button type="button" data-tab="submissions" class="tab">Segnalazioni</button>
          </nav>
          <div id="panel" class="card">Caricamento...</div>
        </section>
      </main>
    `;
  }

  private bindTabs(): void {
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.tab = (btn as HTMLButtonElement).dataset.tab as AdminTab;
        document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        void this.renderPanel();
      });
    });
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
        this.bindTabs();
        await this.renderPanel();
      }
    } catch (error) {
      console.error(error);
    }
  }

  private async renderPanel(): Promise<void> {
    const panel = document.getElementById("panel");
    if (!panel) return;

    panel.innerHTML = "Caricamento...";

    try {
      if (this.tab === "dashboard") await this.renderDashboard(panel);
      else if (this.tab === "sources") await this.renderSources(panel);
      else if (this.tab === "events") await this.renderEvents(panel);
      else if (this.tab === "submissions") await this.renderSubmissions(panel);
    } catch (error) {
      panel.innerHTML = `<p class="error">Errore: ${escapeHtml((error as Error).message)}</p>`;
    }
  }

  private async renderDashboard(panel: HTMLElement): Promise<void> {
    const [sources, pendingEvents, submissions] = await Promise.all([
      fetchSources(),
      fetchPendingEvents(),
      fetchPendingSubmissions(),
    ]);

    const activeSources = sources.filter((s) => s.status === "active").length;
    const errorSources = sources.filter((s) => s.status === "error").length;

    panel.innerHTML = `
      <h2>Stato piattaforma</h2>
      <div class="stats">
        <div class="stat"><strong>${activeSources}</strong><span>Fonti attive</span></div>
        <div class="stat"><strong>${pendingEvents.length}</strong><span>Eventi in revisione</span></div>
        <div class="stat"><strong>${submissions.length}</strong><span>Segnalazioni utenti</span></div>
        <div class="stat"><strong>${errorSources}</strong><span>Fonti in errore</span></div>
      </div>
      <p class="small">Pilota: Provincia di Viterbo. Esegui le migrazioni SQL in <code>supabase/</code> se le tabelle non esistono ancora.</p>
    `;
  }

  private async renderSources(panel: HTMLElement): Promise<void> {
    const sources = await fetchSources();

    panel.innerHTML = `
      <h2>Gestione fonti</h2>
      <form id="newSourceForm" class="source-form">
        <input name="name" placeholder="Nome fonte" required />
        <input name="url" type="url" placeholder="https://..." />
        <select name="acquisition_mode">
          <option value="manual">Manuale</option>
          <option value="assisted">Assistita</option>
          <option value="automatic">Automatica</option>
          <option value="api">API</option>
        </select>
        <select name="reliability">
          <option value="A">Affidabilità A</option>
          <option value="B" selected>Affidabilità B</option>
          <option value="C">Affidabilità C</option>
        </select>
        <button type="submit" class="primary">Aggiungi fonte</button>
      </form>
      <div id="sourcesList"></div>
    `;

    const list = panel.querySelector("#sourcesList") as HTMLElement;
    if (sources.length === 0) {
      list.innerHTML = "<p>Nessuna fonte. Esegui <code>supabase/seed_viterbo.sql</code> o aggiungine una.</p>";
      return;
    }

    list.innerHTML = sources
      .map(
        (s) => `
      <article class="source-item" data-id="${escapeHtml(s.id)}">
        <strong>${escapeHtml(s.name)}</strong>
        <div class="small">${escapeHtml(s.source_type)} · ${escapeHtml(s.acquisition_mode)} · Affidabilità ${s.reliability}</div>
        <div class="small">${s.url ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.url)}</a>` : "—"}</div>
        <div class="small">Stato: ${escapeHtml(s.status)} · Sync: ${s.last_sync_at ? formatDate(s.last_sync_at) : "mai"}</div>
        <div class="row-actions">
          <button type="button" class="toggle-status" data-status="${s.status === "active" ? "inactive" : "active"}">
            ${s.status === "active" ? "Disattiva" : "Attiva"}
          </button>
        </div>
      </article>
    `,
      )
      .join("");

    panel.querySelector("#newSourceForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      void this.handleNewSource(e.target as HTMLFormElement);
    });

    list.querySelectorAll(".toggle-status").forEach((btn) => {
      btn.addEventListener("click", () => {
        const article = (btn as HTMLElement).closest(".source-item") as HTMLElement;
        const id = article.dataset.id!;
        const status = (btn as HTMLButtonElement).dataset.status as "active" | "inactive";
        void updateSource(id, { status }).then(() => this.renderPanel());
      });
    });
  }

  private async handleNewSource(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const input: SourceInput = {
      name: String(data.get("name")),
      url: String(data.get("url") || "") || null,
      source_type: "other",
      territory_id: "IT-VT",
      acquisition_mode: data.get("acquisition_mode") as SourceInput["acquisition_mode"],
      reliability: data.get("reliability") as SourceInput["reliability"],
    };
    await createSource(input);
    form.reset();
    await this.renderPanel();
  }

  private async renderEvents(panel: HTMLElement): Promise<void> {
    const pending = await fetchPendingEvents();
    panel.innerHTML = `<h2>Eventi in revisione</h2><div id="eventsList"></div>`;
    const list = panel.querySelector("#eventsList") as HTMLElement;
    this.renderEventCards(list, pending);
  }

  private renderEventCards(list: HTMLElement, events: AtlasEvent[]): void {
    if (events.length === 0) {
      list.innerHTML = "<p>Nessun evento in revisione.</p>";
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
        <div class="small">${escapeHtml(event.venue ?? "")}</div>
        <button class="approve" type="button">Approva</button>
        <button class="reject" type="button">Rifiuta</button>
      `;
      div.querySelector(".approve")?.addEventListener("click", () => {
        void updateEventReview(event.date_event!, true, "approved").then(() => this.renderPanel());
      });
      div.querySelector(".reject")?.addEventListener("click", () => {
        void updateEventReview(event.date_event!, false, "rejected").then(() => this.renderPanel());
      });
      list.appendChild(div);
    }
  }

  private async renderSubmissions(panel: HTMLElement): Promise<void> {
    const submissions = await fetchPendingSubmissions();
    panel.innerHTML = `<h2>Segnalazioni utenti</h2><div id="submissionsList"></div>`;
    const list = panel.querySelector("#submissionsList") as HTMLElement;

    if (submissions.length === 0) {
      list.innerHTML = "<p>Nessuna segnalazione in attesa.</p>";
      return;
    }

    list.innerHTML = "";
    for (const sub of submissions) {
      const meta = getCategoryMeta(sub.category);
      const div = document.createElement("div");
      div.className = "event";
      div.innerHTML = `
        <strong>${escapeHtml(sub.title)}</strong>
        <div class="small">${meta.label} · ${formatDate(sub.start_date)}</div>
        <div class="small">${escapeHtml(sub.venue ?? "")}</div>
        <div class="small">Contatto: ${escapeHtml(sub.contact)} (${escapeHtml(sub.contact_type ?? "other")})</div>
        ${sub.event_url ? `<div class="small"><a href="${escapeHtml(sub.event_url)}" target="_blank" rel="noopener">Link evento</a></div>` : ""}
        <button class="approve" type="button">Approva e pubblica</button>
        <button class="reject" type="button">Rifiuta</button>
        <button class="duplicate" type="button">Duplicato</button>
      `;

      div.querySelector(".approve")?.addEventListener("click", () => {
        void approveSubmissionAsEvent(sub).then(() => this.renderPanel());
      });
      div.querySelector(".reject")?.addEventListener("click", () => {
        void updateSubmissionStatus(sub.id, "rejected", "Rifiutata da revisore").then(() =>
          this.renderPanel(),
        );
      });
      div.querySelector(".duplicate")?.addEventListener("click", () => {
        void updateSubmissionStatus(sub.id, "duplicate", "Già presente su Atlas").then(() =>
          this.renderPanel(),
        );
      });

      list.appendChild(div);
    }
  }
}
