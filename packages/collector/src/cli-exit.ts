/** Uscita pulita da CLI Node (evita crash libuv su Windows/Git Bash). */
export function runCli(task: () => Promise<void>): void {
  task()
    .then(() => {
      // Supabase lascia handle HTTP aperti: su Windows serve un attimo prima di uscire.
      setTimeout(() => process.exit(0), 300);
    })
    .catch((error: unknown) => {
      console.error("Errore:", error);
      setTimeout(() => process.exit(1), 300);
    });
}
