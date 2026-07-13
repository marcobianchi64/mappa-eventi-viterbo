let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, durationMs = 2200): void {
  const toast = document.getElementById("stableToast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), durationMs);
}

export function setStatus(message: string, type: "" | "error" | "success" = ""): void {
  document.querySelectorAll(".status").forEach((status) => {
    status.textContent = message;
    status.className = `status ${type}`.trim();
  });
}
