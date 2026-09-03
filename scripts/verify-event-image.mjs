/**
 * Verifica estrazione immagine da HTML (Open Graph) e criteri arricchimento locandine.
 */
import assert from "node:assert/strict";
import { extractEventImageFromHtml } from "../packages/core/dist/index.js";
import { needsEventImageEnrichment } from "../packages/collector/dist/enrich-event-images.js";

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

const livePublished = {
  archived: false,
  verified: true,
  start_date: "2099-06-01",
  end_date: "2099-06-02",
  event_url: "https://example.com/evento",
  image_url: null,
};

const withImage = { ...livePublished, image_url: "https://cdn.example.com/p.jpg" };
const past = { ...livePublished, start_date: "2020-01-01", end_date: "2020-01-02" };

assert.equal(needsEventImageEnrichment(livePublished), true);
assert.equal(needsEventImageEnrichment(withImage), false);
assert.equal(needsEventImageEnrichment(past), false);
assert.equal(needsEventImageEnrichment({ ...livePublished, event_url: null }), false);

console.log("verify-event-image: OK");
