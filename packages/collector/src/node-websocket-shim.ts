/** Supabase client needs WebSocket in Node (GitHub Actions). */
import WebSocket from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  // `ws` is API-compatible for Supabase; DOM typings differ from undici.
  // @ts-expect-error WebSocket polyfill for Node
  globalThis.WebSocket = WebSocket;
}
