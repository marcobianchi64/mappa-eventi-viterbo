#!/usr/bin/env node
import { formatEventSchedule, isEventOngoing, formatEventDateTime } from "@atlas/core";

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

const midnightUtc = formatEventSchedule({
  start_date: "2026-08-16T00:00:00.000Z",
  end_date: "2026-08-24T00:00:00.000Z",
});
if (midnightUtc.includes("02:") || midnightUtc.includes("2:00")) {
  errors.push(`date senza orario non devono mostrare 02:00, ottenuto: ${midnightUtc}`);
}
if (!midnightUtc.startsWith("Dal ")) {
  errors.push(`atteso intervallo senza orario, ottenuto: ${midnightUtc}`);
}

const onlyDate = formatEventDateTime("2026-09-01");
if (onlyDate.includes(":")) {
  errors.push(`YYYY-MM-DD non deve mostrare orario: ${onlyDate}`);
}

if (errors.length) {
  console.error("verify-event-schedule FAILED\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log("verify-event-schedule OK");
