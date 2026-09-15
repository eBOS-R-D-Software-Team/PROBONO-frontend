# Technical changelog v20

v20 extends the validated v19 package without altering its bus, sensor-demand or fleet foundations.

## Scenario C changes

- Converted the supplied decorative mid-block foot link into one real SUMO pedestrian-priority crossing.
- Added an identical-network zero-crossing control (`C1_X0`).
- Added nested pedestrian crossing-share sensitivities:
  - `C1_L25`: 382 crossing pedestrians;
  - `C1_M50`: 764 crossing pedestrians;
  - `C1_H75`: 1,146 crossing pedestrians.
- Held all vehicle, bicycle, pedestrian and scheduled-bus totals fixed.
- Added deterministic crossing-person assignment and direction allocation.
- Added reproducible SUMO 1.24.0 `netconvert` generation of the crossing network.

## New diagnostics

- Crossing-pedestrian duration, waiting time, time loss and waiting incidence.
- Motorized and bicycle slow-approach, stop and strong-deceleration passage diagnostics.
- Category-resolved intermodal overlap output for every replicate seed.
- Bus-specific duration, waiting, time-loss, stop and departure-delay metrics.
- Dedicated `scenario_C1_interaction_summary.csv` and updated technical results summary.

## Integrity controls

- C1 effects are compared against `C1_X0`, not directly against C0, because network rebuilding changes internal geometry and approach behavior.
- Intermodal overlap and strong-deceleration events are explicitly labeled as uncalibrated diagnostics, not crash predictions.
- One unused invalid OSM crossing outside the sensor frontage is dropped during the reproducible C1 network rebuild; this is disclosed in validation.
- C0 remains the primary 20 km/h operational proxy; C1 is a pedestrian-interaction sensitivity.

## Execution and validation

- 70 principal SUMO runs: 14 cases × five seeds.
- 14 Euro-stage fleet-boundary runs.
- All cases completion-valid in all five seeds with no vehicle or person teleports.
- Package validation: 215 passed, eight disclosed warnings, zero failed.
