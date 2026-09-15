// src/data/sumo/validatedResults.js
//
// Loads and shapes the official validated SUMO results from the release CSVs
// served out of public/data/sumo/. This is the AUTHORITATIVE source for the
// headline scenario comparison and KPI values (five-seed means), per
// docs/HANDOVER_FRONTEND.md.
//
// It is deliberately separate from the live /execute-/status-/result flow:
// the live tool runs single seed-42 simulations; nothing here is executable.
//
// CRA note: the CSVs live in public/, so they are fetched at runtime rather
// than imported. Call loadValidatedResults() once (e.g. in a useEffect) and
// read the returned tables. process.env.PUBLIC_URL keeps paths correct when
// the app is served from a sub-path.

import Papa from "papaparse";

import SUMO_RELEASE from "./release";

const CSV_BASE = `${process.env.PUBLIC_URL || ""}/data/sumo`;

const CSV_FILES = {
  replicate: `${CSV_BASE}/replicate_summary.csv`,
  oneway: `${CSV_BASE}/scenario_oneway_summary.csv`,
  c1: `${CSV_BASE}/scenario_C1_interaction_summary.csv`,
};

const parseCsvText = (text) =>
  Papa.parse(String(text).trim(), {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  }).data;

const rowById = (rows) => {
  const map = {};
  rows.forEach((r) => {
    if (r && r.scenario != null) map[String(r.scenario)] = r;
  });
  return map;
};

const fetchCsv = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${url} (${res.status})`);
  }
  return parseCsvText(await res.text());
};

/**
 * Fetches and indexes all three validated CSVs.
 * Returns { replicateById, c1ById, release } or throws.
 */
export const loadValidatedResults = async () => {
  const [replicate, , c1] = await Promise.all([
    fetchCsv(CSV_FILES.replicate),
    fetchCsv(CSV_FILES.oneway), // loaded for completeness; replicate is superset
    fetchCsv(CSV_FILES.c1),
  ]);

  return {
    replicateById: rowById(replicate),
    c1ById: rowById(c1),
    release: SUMO_RELEASE,
  };
};

/* ------------------------------------------------------------------ */
/* KPI metadata                                                        */
/*                                                                     */
/* `direction`: "lower" | "higher" | "neutral" — which way is better.  */
/* `scope`: "full"  KPIs valid for Baseline/A/B/C0 demand comparison.  */
/*          "frontage" KPIs also valid for D/E (frontage-level only).  */
/* Per the handover, D/E must NOT show total VKT, trip duration or     */
/* total emissions beside the full-demand cases.                       */
/* ------------------------------------------------------------------ */

const KPI = {
  passages: {
    key: "frontage_spot_motorized_passages_mean_valid",
    sd: "frontage_spot_motorized_passages_sd_valid",
    label: "Frontage motorized passages",
    unit: "",
    decimals: 0,
    direction: "neutral",
    scope: "frontage",
  },
  spotSpeed: {
    key: "frontage_spot_motorized_mean_speed_kmh_mean_valid",
    sd: "frontage_spot_motorized_mean_speed_kmh_sd_valid",
    label: "Frontage spot speed",
    unit: "km/h",
    decimals: 1,
    direction: "lower", // lower speed at a school frontage is the safety goal
    scope: "frontage",
  },
  over36: {
    key: "frontage_spot_motorized_over_36_pct_mean_valid",
    sd: "frontage_spot_motorized_over_36_pct_sd_valid",
    label: "Share above 36 km/h",
    unit: "%",
    decimals: 1,
    direction: "lower",
    scope: "frontage",
  },
  busPassages: {
    key: "frontage_fcd_bus_passages_mean_valid",
    sd: "frontage_fcd_bus_passages_sd_valid",
    label: "Bus passages",
    unit: "",
    decimals: 0,
    direction: "neutral",
    scope: "frontage",
  },
  busTimeLoss: {
    key: "bus_mean_time_loss_s_mean_valid",
    sd: "bus_mean_time_loss_s_sd_valid",
    label: "Bus mean time loss",
    unit: "s",
    decimals: 1,
    direction: "lower",
    scope: "frontage",
  },
  co2PerVkm: {
    key: "CO2_g_per_vkm_mean_valid",
    sd: "CO2_g_per_vkm_sd_valid",
    label: "CO\u2082 per VKT",
    unit: "g/km",
    decimals: 1,
    direction: "lower",
    scope: "full",
  },
  co2Total: {
    key: "CO2_kg_mean_valid",
    sd: "CO2_kg_sd_valid",
    label: "Total CO\u2082",
    unit: "kg",
    decimals: 1,
    direction: "lower",
    scope: "full", // excluded for D/E: totals omit onward diversion
  },
  vkt: {
    key: "vkt_km_mean_valid",
    sd: "vkt_km_sd_valid",
    label: "Total VKT",
    unit: "km",
    decimals: 0,
    direction: "neutral",
    scope: "full",
  },
  timeLoss: {
    key: "mean_time_loss_s_mean_valid",
    sd: "mean_time_loss_s_sd_valid",
    label: "Mean time loss",
    unit: "s",
    decimals: 1,
    direction: "lower",
    scope: "full",
  },
};

// Default full-demand comparison chart (Baseline / A / B / C0).
export const FULL_COMPARISON_KPIS = [
  KPI.spotSpeed,
  KPI.over36,
  KPI.busTimeLoss,
  KPI.co2PerVkm,
  KPI.timeLoss,
];

// D/E frontage-only view. No totals, no VKT, no total emissions.
export const FRONTAGE_KPIS = [
  KPI.passages,
  KPI.spotSpeed,
  KPI.over36,
  KPI.busPassages,
  KPI.busTimeLoss,
];

export const ALL_KPIS = KPI;

/* ------------------------------------------------------------------ */
/* Scenario definitions (grouping + copy from HANDOVER_FRONTEND.md)     */
/* ------------------------------------------------------------------ */

// group: "primary" (report scenarios, full comparison),
//        "oneway"  (D/E, frontage-only),
//        "sensitivity_c1" / "sensitivity_dr" (CSV-only, not executable).
// `figure` / `figureAlt`: scenario schematic from docs/figures/, served from
// public/data/sumo/figures/. Alt text describes intervention extent and model
// boundary, per the handover accessibility requirement.
export const VALIDATED_SCENARIOS = [
  {
    csvId: "current",
    label: "Baseline",
    title: "Calibrated current condition",
    status: "Reference",
    group: "primary",
    comparison: "full",
    note: "Sensor-aligned 24-hour school-corridor reference for 1 October 2025.",
    figure: "scenario_implementation_overview.png",
    figureAlt:
      "Schematic of the school corridor between Émile Idiersstraat and Tervuursesteenweg, showing the school frontage and the modeled study boundary used as the baseline reference.",
  },
  {
    csvId: "A_OBS",
    label: "Scenario A",
    title: "Enhanced 30 km/h zone",
    status: "Primary report scenario \u00b7 Partial quantitative representation",
    group: "primary",
    comparison: "full",
    note: "Relocates both Line 34 stops toward \u00c9mile Idiersstraat while retaining the existing 30 km/h network. Markings, lighting and visibility measures remain qualitative.",
    figure: "scenario_A.png",
    figureAlt:
      "Corridor schematic for Scenario A: both Line 34 bus stops relocated toward Émile Idiersstraat within the existing 30 km/h zone; visibility and lighting measures shown as qualitative only.",
  },
  {
    csvId: "B_OBS",
    label: "Scenario B",
    title: "30 km/h zone with chicane",
    status: "Primary report scenario \u00b7 Operational proxy",
    group: "primary",
    comparison: "full",
    note: "Adds explicit chicane geometry and relocates both bus stops. The central chicane uses a provisional 25 km/h effective-speed proxy. Parking capacity and displaced parking demand are not modeled.",
    figure: "scenario_B.png",
    figureAlt:
      "Corridor schematic for Scenario B: a chicane added mid-corridor within the 30 km/h zone with both bus stops relocated; the chicane is modeled as a 25 km/h effective-speed proxy.",
  },
  {
    csvId: "C_OBS",
    label: "Scenario C0",
    title: "20 km/h shared-space operational proxy",
    status: "Primary report scenario \u00b7 Proxy",
    group: "primary",
    comparison: "full",
    note: "Represents the low-speed and public-transport components of the shared-space proposal under full observed demand. Continuous cross-anywhere pedestrian movement, surface elevation and parking removal are not literal model objects.",
    figure: "scenario_C0.png",
    figureAlt:
      "Corridor schematic for Scenario C0: a 20 km/h shared-space operational proxy across the frontage under full observed demand; continuous cross-anywhere pedestrian movement is not modeled literally.",
  },
  {
    csvId: "OW_FULL_OBS",
    label: "Scenario D",
    title: "Full one-way option",
    status: "Supplementary corridor experiment",
    group: "oneway",
    comparison: "frontage",
    note: "Private traffic is eastbound only to Tervuursesteenweg; buses and bicycles retain counterflow, and eastbound cars turn right at the east boundary. Onward private diversion outside the corridor is not modeled.",
    figure: "scenario_D.png",
    figureAlt:
      "Corridor schematic for Scenario D: private traffic made eastbound-only to Tervuursesteenweg with a right turn at the east boundary; buses and bicycles keep counterflow. Diversion beyond the corridor is outside the modeled boundary.",
  },
  {
    csvId: "OW_REDUCED_OBS",
    label: "Scenario E",
    title: "Reduced one-way option",
    status: "Supplementary corridor experiment",
    group: "oneway",
    comparison: "frontage",
    note: "The private one-way restriction ends at Bergagegaarde; eastbound traffic continues to the right turn at Tervuursesteenweg, while buses and bicycles retain counterflow. Westbound diversion after Bergagegaarde is outside the modeled boundary.",
    figure: "scenario_E.png",
    figureAlt:
      "Corridor schematic for Scenario E: a reduced one-way restriction ending at Bergagegaarde, with eastbound traffic continuing to the Tervuursesteenweg right turn and buses and bicycles keeping counterflow. Westbound diversion beyond Bergagegaarde is outside the modeled boundary.",
  },
];

// C1 pedestrian-interaction sensitivity (separate chart, X0 reference).
export const C1_CASES = [
  { csvId: "C1_X0", label: "0% routed (X0)", reference: true },
  { csvId: "C1_L25", label: "25% routed (L25)" },
  { csvId: "C1_M50", label: "50% routed (M50)" },
  { csvId: "C1_H75", label: "75% routed (H75)" },
];

// Demand-response sensitivity rows, per base scenario.
export const DR_LEVELS = [
  { suffix: "OBS", label: "Observed demand" },
  { suffix: "DR15", label: "-15% demand" },
  { suffix: "DR30", label: "-30% demand" },
];

// Base scenarios that have DR rows in the CSV.
export const DR_BASES = [
  { prefix: "A", label: "Scenario A" },
  { prefix: "B", label: "Scenario B" },
  { prefix: "C", label: "Scenario C0" },
  { prefix: "OW_FULL", label: "Scenario D" },
  { prefix: "OW_REDUCED", label: "Scenario E" },
];

/* ------------------------------------------------------------------ */
/* Accessors (operate on tables returned by loadValidatedResults)      */
/* ------------------------------------------------------------------ */

const asNumber = (v) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// Read one KPI (value + sd) for a CSV row id, from a table (replicateById).
export const readKpi = (table, csvId, kpi) => {
  const row = table?.[csvId];
  if (!row) return null;
  return {
    value: asNumber(row[kpi.key]),
    sd: kpi.sd ? asNumber(row[kpi.sd]) : null,
  };
};

// Validity / provenance for a scenario row (used to flag invalid runs).
export const readValidity = (table, csvId) => {
  const row = table?.[csvId];
  if (!row) return null;
  return {
    status: row.interpretation_status || null,
    validReplicates: asNumber(row.completion_valid_replicates),
    failedReplicates: asNumber(row.completion_failed_replicates),
    teleports: asNumber(row.teleports_mean_all),
  };
};

export { SUMO_RELEASE };