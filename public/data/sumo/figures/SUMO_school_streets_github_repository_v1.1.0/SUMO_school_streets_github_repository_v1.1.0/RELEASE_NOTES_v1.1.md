# Release notes — repository 1.1.0 / model v21.2

Release 1.1.0 migrates the validated evidence-aligned school-street package from SUMO 1.24.0 to SUMO 1.27.1. The source evidence, scenario meanings, calibrated demand, driver population, fleet assumptions, timetable proxy, demand-response definitions and interpretation boundaries are unchanged.

## Runtime migration

- Updated the pinned runtime to `eclipse-sumo==1.27.1`.
- Regenerated every runtime-derived case from the immutable templates.
- Executed all 20 cases for seeds 42–46: 100 completion-valid runs.
- Reran the passenger Euro-stage boundary analysis.
- Regenerated all processed result tables and the SHA-256 manifest.
- Passed 307 automated checks, retained 10 disclosed evidence warnings and recorded no failed checks.

One first attempt for `C_OBS`, seed 44, produced incomplete XML. The runner's existing integrity safeguard rejected that attempt and automatically reran the complete seed. Only the clean rerun contributes to the processed results.

## Result impact

Loaded-user counts, frontage passage counts and represented VKT are unchanged. The primary ordering and interpretation also persist:

- A's modeled bus-stop relocation raises frontage speed and is not a speed-calming mechanism.
- B's chicane proxy and C0's 20 km/h operational proxy reduce frontage speed and speeding prevalence at full observed demand.
- C1 remains a conditional pedestrian-priority sensitivity with a speed/emissions/interaction trade-off.
- D/E reduce modeled frontage passage volume under the balanced-direction assumption but do not calm the remaining traffic; onward diversion remains outside the calibrated boundary.

Time-loss, emissions and several interaction diagnostics changed under the newer runtime. Release 1.1.0 values therefore replace—not supplement—the 1.0.0 processed values. See `docs/RUNTIME_MIGRATION_SUMO_1.27.1.md` and `analysis/runtime_migration_v1.0_to_v1.1.csv` for the complete comparison.

## Documentation

- Updated the README, guidebook, backend handover, source register and release checklist.
- Updated the publication-support manuscript tables, figures and interpretation to use SUMO 1.27.1 evidence.
- Added explicit runtime and model-lineage metadata for API integrations.

## Compatibility

The API scenario identifiers and result-table schema are unchanged. A backend can adopt release 1.1.0 by replacing the release bundle, verifying SUMO 1.27.1, and persisting `repository_version=1.1.0`, `model_version=v21.2` and `sumo_version=1.27.1` with every result.
