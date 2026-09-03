#!/usr/bin/env node
import { assessEventLocation, VITERBO_PROVINCE_CENTER } from "@atlas/core";

const errors = [];
const v = VITERBO_PROVINCE_CENTER;

const traindeville = assessEventLocation({
  lat: v.lat,
  lng: v.lng,
  comune: "Civitella D'agliano",
  city: null,
  title: "Traindeville in concerto",
  venue: "Cassero della Torre dei Monaldeschi",
  location: null,
});

if (traindeville.allowDirections) {
  errors.push("Traindeville legacy non deve offrire Guidami");
}
if (traindeville.confidence === "high") {
  errors.push(`Traindeville atteso medium/low, got ${traindeville.confidence}`);
}

const trusted = assessEventLocation({
  lat: 42.4664074,
  lng: 12.1734444,
  comune: "Vitorchiano",
  city: null,
  title: "Sagra del Cavatello",
  venue: "Centro storico, Piazza Roma",
  location: null,
});

if (!trusted.allowDirections) {
  errors.push(`Sagra Cavatello con comune+venue coerenti dovrebbe permettere Guidami: ${trusted.confidence}`);
}

if (errors.length) {
  console.error("verify-location-confidence FAILED\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log("verify-location-confidence OK");
