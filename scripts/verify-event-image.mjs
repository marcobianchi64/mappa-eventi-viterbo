/**
 * Verifica estrazione immagine da HTML (Open Graph).
 */
import assert from "node:assert/strict";
import { extractEventImageFromHtml } from "../packages/core/dist/index.js";

const pageUrl = "https://www.example.com/eventi/sagra.html";
const html = `
<html><head>
<meta property="og:image" content="https://cdn.example.com/poster.jpg" />
<meta name="twitter:image" content="https://cdn.example.com/poster-twitter.jpg" />
</head><body></body></html>
`;

assert.equal(
  extractEventImageFromHtml(html, pageUrl),
  "https://cdn.example.com/poster.jpg",
);

const relative = `<meta property="og:image" content="/media/foto.jpg" />`;
assert.equal(
  extractEventImageFromHtml(relative, pageUrl),
  "https://www.example.com/media/foto.jpg",
);

console.log("verify-event-image: OK");
