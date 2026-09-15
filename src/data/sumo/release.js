// src/data/sumo/release.js
//
// Authoritative release metadata for the validated CSVs served from
// public/data/sumo/. These identifiers MUST match the release the CSVs were
// exported from. When a new SUMO package is delivered, replace the three CSVs
// in public/data/sumo/ AND update this manifest in the same change, so the
// validated comparison always advertises the correct provenance.
//
// Per the mobility partner: values from different releases must never be
// mixed. The frontend surfaces this string next to the validated results,
// and can compare it against the repo/model version returned by the live
// API to detect a stale bundle.

const SUMO_RELEASE = {
  repoVersion: "1.1.0",
  modelVersion: "v21.2",
  sumoVersion: "1.27.1",
  validationSeeds: "42-46",
  officialSeedNote: "Validated values are five-seed means (seeds 42-46).",
  liveSeedNote: "Live executions are single seed-42 runs.",
};

export default SUMO_RELEASE;