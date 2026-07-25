#!/usr/bin/env node
import { formatEventSchedule, isEventOngoing } from "@atlas/core";

const errors = [];

const festivalStart = "2026-07-20T10:00:00.000Z";
const festivalEnd = "2026-08-10T22:00:00.000Z";
const midFestival = new Date("2026-07-25T12:00:00.000Z");

const ongoingLabel = formatEventSchedule(
  { start_date: festivalStart, end_date: festivalEnd },
  midFestival,
);
if (!ongoingLabel.startsWith("In corso")) {
  errors.push(`atteso «In corso» a metà festival, ottenuto: ${ongoingLabel}`);
}
if (!isEventOngoing({ start_date: festivalStart, end_date: festivalEnd }, midFestival)) {
  errors.push("isEventOngoing dovrebbe essere true a metà festival");
}

const futureLabel = formatEventSchedule(
  { start_date: festivalStart, end_date: festivalEnd },
  new Date("2026-07-01T12:00:00.000Z"),
);
if (!futureLabel.startsWith("Dal ")) {
  errors.push(`atteso intervallo futuro «Dal …», ottenuto: ${futureLabel}`);
}

const singleDay = formatEventSchedule({
  start_date: "2026-08-15T18:00:00.000Z",
  end_date: null,
});
if (!singleDay) errors.push("data singola vuota");

if (errors.length) {
  console.error("verify-event-schedule FAILED\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log("verify-event-schedule OK");
