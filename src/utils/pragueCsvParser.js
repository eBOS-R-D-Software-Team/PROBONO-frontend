export const SCENARIO_LABELS = ["Scenario 1", "Scenario 2", "Scenario 3"];

const CSV_URL = "/data/prague-living-lab.csv";

function parseNumber(value) {
  if (value == null) return 0;

  const raw = String(value).trim();
  if (!raw) return 0;

  const normalized = raw.replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function addHours(baseDate, hoursToAdd) {
  const d = new Date(baseDate);
  d.setHours(d.getHours() + hoursToAdd);
  return d;
}

function cleanLine(line) {
  return String(line || "").replace(/^\uFEFF/, "").trim();
}

function sum(rows, key) {
  return rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
}

function formatMWh(wh) {
  return `${(wh / 1_000_000).toFixed(1)} MWh`;
}

function formatTon(g) {
  return `${(g / 1_000_000).toFixed(1)} t`;
}

function buildScenarioSummary(rows, measurementHeaders) {
  const totalEnergy = sum(rows, "Total energy use [Wh]");
  const primaryEnergy = sum(rows, "Primary energy [Wh]");
  const co2 = sum(rows, "CO2 emissions [g]");
  const heating = sum(rows, "Energy need for heating [Wh]");
  const cooling = sum(rows, "Energy need for cooling [Wh]");

  const pvKeys = [
    "Produced electricity from photovoltaic [Wh]",
    "Used electricity from photovoltaic [Wh]",
    "Unused electricity from photovoltaic [Wh]",
    "Incident solar radiation [Wh]",
  ];

  const hasPv = pvKeys.some((key) =>
    rows.some((row) => Number(row[key]) > 0)
  );

  /* ── per-column sums ── */
  const columnSums = {};
  measurementHeaders.forEach((h) => {
    columnSums[h] = sum(rows, h);
  });

  /* ── shortText uses only non-zero aggregates ── */
  const parts = [];
  if (totalEnergy)   parts.push(`Total energy: ${formatMWh(totalEnergy)}`);
  if (primaryEnergy) parts.push(`Primary energy: ${formatMWh(primaryEnergy)}`);
  if (co2)           parts.push(`CO₂: ${formatTon(co2)}`);
  if (heating)       parts.push(`Heating: ${formatMWh(heating)}`);
  if (cooling)       parts.push(`Cooling: ${formatMWh(cooling)}`);
  parts.push(`PV data: ${hasPv ? "yes" : "no"}`);

  return {
    totalEnergyWh: totalEnergy,
    primaryEnergyWh: primaryEnergy,
    co2g: co2,
    heatingWh: heating,
    coolingWh: cooling,
    hasPv,
    columnSums,
    shortText: `Hourly full-year scenario. ${parts.join(", ")}.`,
  };
}

export async function loadPragueCsv() {
  const res = await fetch(CSV_URL);
  if (!res.ok) {
    throw new Error(`Failed to load CSV: ${res.status}`);
  }

  const text = await res.text();

  const rawLines = text.split(/\r?\n/);
  const lines = rawLines.map(cleanLine).filter(Boolean);

  const headerIndex = lines.findIndex((line) => {
    const firstCell = line.split(";")[0]?.trim();
    return firstCell === "Hour";
  });

  if (headerIndex === -1) {
    console.error("CSV first lines:", lines.slice(0, 10));
    throw new Error("CSV header not found.");
  }

  const headers = lines[headerIndex].split(";").map((h) => h.trim());

  const measurementHeaders = headers.filter((h) => h !== "Hour");

  const headerIndexes = lines
    .map((line, idx) => {
      const firstCell = line.split(";")[0]?.trim();
      return firstCell === "Hour" ? idx : -1;
    })
    .filter((idx) => idx !== -1);

  const scenarios = {};
  const scenarioSummaries = {};

  headerIndexes.forEach((startIdx, scenarioIdx) => {
    const endIdx =
      scenarioIdx < headerIndexes.length - 1
        ? headerIndexes[scenarioIdx + 1]
        : lines.length;

    const blockLines = lines.slice(startIdx + 1, endIdx);

    const rows = blockLines
      .map((line) => line.split(";").map((x) => x.trim()))
      .filter((parts) => parts.length === headers.length)
      .filter((parts) => Number.isFinite(Number(parts[0])))
      .map((parts) => {
        const row = {};

        headers.forEach((h, i) => {
          row[h] = i === 0 ? Number(parts[i]) : parseNumber(parts[i]);
        });

        const hour = row["Hour"];
        const timestamp = addHours(
          "2025-01-01T00:00:00",
          hour - 1
        ).toISOString();

        return {
          ...row,
          timestamp,
        };
      });

    const label = SCENARIO_LABELS[scenarioIdx] || `Scenario ${scenarioIdx + 1}`;
    scenarios[label] = rows;
    scenarioSummaries[label] = buildScenarioSummary(rows, measurementHeaders);
  });

  const measurementOptions = measurementHeaders.map((h) => ({
    value: h,
    label: h,
  }));

  const scenarioOptions = Object.keys(scenarios).map((s) => ({
    value: s,
    label: s,
  }));

  return {
    scenarios,
    scenarioOptions,
    measurementOptions,
    scenarioSummaries,
  };
}