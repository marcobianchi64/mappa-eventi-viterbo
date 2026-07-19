/** Uscita pulita da CLI Node (evita crash libuv su Windows/Git Bash). */
export function runCli(task: () => Promise<void>): void {
  task()
    .then(() => {
      setTimeout(() => process.exit(0), 10);
    })
    .catch((error: unknown) => {
      console.error("Errore:", error);
      setTimeout(() => process.exit(1), 10);
    });
}
