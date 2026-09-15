# Validation report (v21.2 / SUMO 1.27.1)

Overall status: **PASS**

- Passed: 307
- Warnings: 10
- Failed: 0

Warnings are disclosed evidence limitations; they are not silently converted into calibrated inputs.

## Warnings

- C1 network rebuild scope: The valid mid-block crossing replaces one unused invalid OSM crossing outside the school frontage during netconvert rebuilding; the sensor-corridor routes do not use the dropped crossing
- Line 34 exact-date limitation: OSM supplies route/stop geometry only; departures use Wednesday 2025-10-15 as a near-date proxy because the exact 2025-10-01 archived GTFS ZIP was credential-gated
- Scenario B parking scope: The report's six-space removal is not a parking-capacity result because the OSM-wizard baseline contains no parkingArea objects
- One-way diversion boundary: All prohibited westbound private trips remain loaded but exit at Tervuursesteenweg (full option) or Bergagegaarde (reduced option); the clipped OSM-Wizard network contains no connected external detour, so onward travel time and emissions are not estimated
- One-way directional-demand uncertainty: The sensor has no direction field; the resulting frontage reduction follows the declared balanced per-bin direction assumption and is not a measured diversion forecast
- Detector-time 15-minute redistribution: mismatched bins={'car': 39, 'large': 10, 'two_wheeler': 26}; input departure bins are exact, but detector passage bins are not claimed as exact
- Fleet transfer limitation: Statbel is national stock by fuel; local traffic, Euro stages and non-passenger classes remain assumptions
- C1 intermodal collision diagnostics: SUMO crossing-overlap events by seed={'C1_X0': [0, 0, 0, 0, 0], 'C1_L25': [7, 3, 12, 2, 4], 'C1_M50': [7, 6, 7, 13, 7], 'C1_H75': [15, 8, 7, 13, 11]}; these are uncalibrated interaction diagnostics, not predicted crashes
- Absolute NOx fleet sensitivity: Euro-5 passenger proxy is roughly five to six times the newer proxy; scenario ordering is more robust than absolute NOx
- Scenario A numerical scope: Bus-stop relocation is quantified; visual, lighting and sightline benefits remain qualitative because no behavior response coefficient was supplied
