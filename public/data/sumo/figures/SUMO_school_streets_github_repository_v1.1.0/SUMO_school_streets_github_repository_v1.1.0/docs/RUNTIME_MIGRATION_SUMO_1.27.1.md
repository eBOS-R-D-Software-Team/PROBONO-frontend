# SUMO runtime migration: 1.24.0 to 1.27.1

Repository release 1.1.0 / model lineage v21.2 reruns the unchanged evidence-aligned scenario definitions with SUMO 1.27.1. Runtime-derived networks and outputs were regenerated, all 20 cases were executed for seeds 42–46, and the complete validation suite was rerun.

## Migration outcome

- 100/100 scenario-seed runs produced completion-valid results.
- 307 automated checks passed; 10 evidence-boundary warnings remain; no checks failed.
- Loaded-user counts, frontage passage counts and represented VKT are unchanged.
- The ordering and interpretation of the principal A/B/C0, C1 and one-way findings are unchanged.
- Time-loss, emissions and some interaction diagnostics changed under the newer runtime and must not be mixed with release 1.0.0 values.
- One C_OBS seed-44 attempt produced incomplete XML. The existing integrity safeguard rejected it and automatically reran the complete seed; only the clean rerun contributes to the processed tables.

SUMO release notes document changes relevant to interpretation between these versions, including emissions behavior during person/container loading in 1.25, planned-stop time-loss semantics and pedestrian-crossing fixes in 1.26, and a stopping time-loss correction in 1.27. These notes are consistent with the classes of values that moved, but this package treats the rerun comparison—not an attribution to a single internal change—as the migration evidence.

Official sources: [release archive](https://sumo.dlr.de/releases/), [current changelog](https://sumo.dlr.de/docs/ChangeLog.html), and [2025 releases](https://sumo.dlr.de/docs/ChangeLog/Changes_in_2025_releases.html).

## Headline old-versus-new values

| Case | Speed 1.24 → 1.27.1 (km/h) | >36 1.24 → 1.27.1 (%) | CO2 1.24 → 1.27.1 (kg) | CO2/VKT 1.24 → 1.27.1 (g/km) | Mean loss 1.24 → 1.27.1 (s) | Bus loss 1.24 → 1.27.1 (s) |
|---|---:|---:|---:|---:|---:|---:|
| current | 32.66 → 32.77 | 36.76 → 36.34 | 918.65 → 878.09 | 334.62 → 319.85 | 21.31 → 20.86 | 16.19 → 6.08 |
| A_OBS | 35.24 → 35.27 | 48.57 → 48.93 | 730.15 → 687.14 | 265.96 → 250.29 | 6.38 → 5.64 | 19.51 → 9.39 |
| B_OBS | 29.27 → 29.27 | 11.46 → 11.59 | 765.76 → 723.64 | 277.55 → 262.28 | 6.74 → 6.00 | 19.74 → 9.58 |
| C_OBS | 22.39 → 22.35 | 0.08 → 0.09 | 795.24 → 760.98 | 289.67 → 277.19 | 8.50 → 7.85 | 19.43 → 9.55 |
| C1_X0 | 16.17 → 16.06 | 0.00 → 0.00 | 994.25 → 964.94 | 349.00 → 338.71 | 15.60 → 15.17 | 26.98 → 16.98 |
| C1_L25 | 15.70 → 15.52 | 0.00 → 0.00 | 998.92 → 970.32 | 350.64 → 340.60 | 15.81 → 15.39 | 27.25 → 17.25 |
| C1_M50 | 15.14 → 15.00 | 0.00 → 0.00 | 1003.79 → 976.07 | 352.35 → 342.62 | 16.08 → 15.67 | 27.62 → 17.37 |
| C1_H75 | 14.67 → 14.43 | 0.00 → 0.00 | 1009.80 → 982.47 | 354.46 → 344.87 | 16.37 → 16.08 | 27.99 → 17.91 |
| OW_FULL_OBS | 31.97 → 32.07 | 39.72 → 39.97 | 793.30 → 747.86 | 445.48 → 419.96 | 24.79 → 22.41 | 16.14 → 5.79 |
| OW_REDUCED_OBS | 32.07 → 32.06 | 39.83 → 40.00 | 912.31 → 871.07 | 406.11 → 387.76 | 25.47 → 23.79 | 16.06 → 5.82 |

## Interpretation

For release 1.1.0, every manuscript, guidebook, API and dashboard value must come from the SUMO 1.27.1 processed tables. Release 1.0.0 remains a historical runtime snapshot and should not be combined row-by-row with the new release. The detailed machine-readable comparison is `analysis/runtime_migration_v1.0_to_v1.1.csv`.
