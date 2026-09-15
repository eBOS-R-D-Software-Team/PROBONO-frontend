# Evidence-aligned technical results (v21.2 / SUMO 1.27.1)

Means below use only replicates in which every loaded vehicle completed. Failed replicates are never folded into emissions or performance averages.

## Calibration

| Target | Observed | Simulated | Error |
|---|---:|---:|---:|
| car count | 7597.00 | 7597.00 | +0.00% |
| large-vehicle count | 803.00 | 803.00 | +0.00% |
| two-wheeler count | 965.00 | 965.00 | +0.00% |
| pedestrian persons | 1528.00 | 1528.00 | +0.00% |
| motorized >36 km/h | 37.00 | 36.34 | -0.66 pp |

## Five-seed scenario results

| Case | Valid seeds | Status | Motorized passages | Spot speed (km/h) | >36 km/h | CO2 (kg) | CO2 (g/VKT) |
|---|---:|---|---:|---:|---:|---:|---:|
| current | 5/5 | stable | 8610 ± 0 | 32.77 ± 0.15 | 36.34 ± 0.59% | 878.1 ± 2.9 | 319.8 ± 1.1 |
| A_OBS | 5/5 | stable | 8610 ± 0 | 35.27 ± 0.13 | 48.93 ± 1.00% | 687.1 ± 2.3 | 250.3 ± 0.8 |
| A_DR15 | 5/5 | stable | 7325 ± 0 | 35.88 ± 0.15 | 52.10 ± 0.68% | 592.1 ± 1.2 | 249.6 ± 0.5 |
| A_DR30 | 5/5 | stable | 6065 ± 0 | 36.39 ± 0.18 | 55.17 ± 0.84% | 503.7 ± 1.0 | 251.1 ± 0.5 |
| B_OBS | 5/5 | stable | 8610 ± 0 | 29.27 ± 0.13 | 11.59 ± 0.34% | 723.6 ± 2.3 | 262.3 ± 0.8 |
| B_DR15 | 5/5 | stable | 7325 ± 0 | 29.74 ± 0.12 | 12.86 ± 0.51% | 624.8 ± 1.3 | 262.1 ± 0.6 |
| B_DR30 | 5/5 | stable | 6065 ± 0 | 30.16 ± 0.14 | 14.78 ± 0.45% | 532.8 ± 1.1 | 264.2 ± 0.5 |
| C_OBS | 5/5 | stable | 8610 ± 0 | 22.35 ± 0.11 | 0.09 ± 0.01% | 761.0 ± 1.8 | 277.2 ± 0.6 |
| C_DR15 | 5/5 | stable | 7325 ± 0 | 22.91 ± 0.06 | 0.11 ± 0.05% | 653.1 ± 2.1 | 275.3 ± 0.9 |
| C_DR30 | 5/5 | stable | 6065 ± 0 | 23.40 ± 0.13 | 0.16 ± 0.06% | 553.6 ± 1.3 | 275.9 ± 0.7 |
| C1_X0 | 5/5 | stable | 8610 ± 0 | 16.06 ± 0.16 | 0.00 ± 0.00% | 964.9 ± 6.0 | 338.7 ± 2.1 |
| C1_L25 | 5/5 | stable | 8610 ± 0 | 15.52 ± 0.22 | 0.00 ± 0.00% | 970.3 ± 6.4 | 340.6 ± 2.2 |
| C1_M50 | 5/5 | stable | 8610 ± 0 | 15.00 ± 0.11 | 0.00 ± 0.00% | 976.1 ± 5.8 | 342.6 ± 2.1 |
| C1_H75 | 5/5 | stable | 8610 ± 0 | 14.43 ± 0.15 | 0.00 ± 0.00% | 982.5 ± 5.8 | 344.9 ± 2.0 |
| OW_FULL_OBS | 5/5 | stable | 4357 ± 0 | 32.07 ± 0.21 | 39.97 ± 0.70% | 747.9 ± 4.3 | 420.0 ± 2.4 |
| OW_FULL_DR15 | 5/5 | stable | 3717 ± 0 | 33.52 ± 0.08 | 43.92 ± 0.31% | 590.8 ± 2.6 | 380.2 ± 1.7 |
| OW_FULL_DR30 | 5/5 | stable | 3084 ± 0 | 34.65 ± 0.16 | 47.00 ± 0.66% | 485.7 ± 2.0 | 365.1 ± 1.5 |
| OW_REDUCED_OBS | 5/5 | stable | 4357 ± 0 | 32.06 ± 0.16 | 40.00 ± 0.49% | 871.1 ± 4.0 | 387.8 ± 1.8 |
| OW_REDUCED_DR15 | 5/5 | stable | 3717 ± 0 | 33.54 ± 0.11 | 43.80 ± 0.53% | 693.6 ± 3.3 | 355.8 ± 1.7 |
| OW_REDUCED_DR30 | 5/5 | stable | 3084 ± 0 | 34.64 ± 0.26 | 46.98 ± 0.93% | 568.9 ± 1.1 | 343.4 ± 0.6 |

## Mobility-expert one-way options

These concepts were supplied separately from the road-safety report. All observed vehicle IDs remain loaded. Prohibited westbound private trips exit at the intervention boundary because the clipped OSM-Wizard network has no connected external bypass; off-network travel is not estimated. Consequently, total CO2, VKT and trip-time values for these cases are not comparable with the current-condition totals.

| Case | Valid seeds | Cars east/west at frontage | Buses at frontage | Motorized frontage reduction | Spot speed (km/h) | Bus time loss (s) | Collision diagnostics |
|---|---:|---:|---:|---:|---:|---:|---:|
| OW_FULL_OBS | 5/5 | 3798 ± 0 / 0 ± 0 | 107 ± 0 | 49.4% | 32.07 ± 0.21 | 5.79 ± 0.12 | 0.0 ± 0.0 |
| OW_REDUCED_OBS | 5/5 | 3798 ± 0 / 0 ± 0 | 107 ± 0 | 49.4% | 32.06 ± 0.16 | 5.82 ± 0.12 | 0.0 ± 0.0 |
| OW_FULL_DR15 | 5/5 | 3226 ± 0 / 0 ± 0 | 107 ± 0 | 56.8% | 33.52 ± 0.08 | 5.86 ± 0.26 | 0.0 ± 0.0 |
| OW_REDUCED_DR15 | 5/5 | 3226 ± 0 / 0 ± 0 | 107 ± 0 | 56.8% | 33.54 ± 0.11 | 5.85 ± 0.27 | 0.0 ± 0.0 |
| OW_FULL_DR30 | 5/5 | 2658 ± 0 / 0 ± 0 | 107 ± 0 | 64.2% | 34.65 ± 0.16 | 5.79 ± 0.11 | 0.0 ± 0.0 |
| OW_REDUCED_DR30 | 5/5 | 2658 ± 0 / 0 ± 0 | 107 ± 0 | 64.2% | 34.64 ± 0.26 | 5.74 ± 0.06 | 0.0 ± 0.0 |

The frontage-flow reduction is a deterministic consequence of the declared balanced directional split and access rule, not a forecast of how many real drivers would divert. In both options, eastbound private traffic continues to the slide's right-turn-only instruction at Tervuursesteenweg. OW_REDUCED ends only the westbound private-traffic restriction at Bergagegaarde. The current Bergoje stops and the 107 trip-specific Line 34 calls are retained in both options.

## Scenario C pedestrian-interaction sensitivity

C1 adds one real SUMO pedestrian-priority crossing at the supplied mid-block foot-link location. `C1_X0` is the identical rebuilt-network control with no pedestrians routed across it. The 25/50/75% shares are nested assumptions applied to the same 1,528 observed pedestrians; they are not observed crossing rates.

| Case | Crossing pedestrians | Crossing wait (s) | Crossing pedestrians waiting | Motorized slow approaches | Hard-braking passages | Bus time loss (s) | Intermodal overlap diagnostics |
|---|---:|---:|---:|---:|---:|---:|---:|
| C_OBS | 0 ± 0 | 0.00 ± 0.00 | 0.0 ± 0.0% | 2.07 ± 0.37% | 505.0 ± 19.9 | 9.55 ± 0.39 | 0.0 ± 0.0 |
| C1_X0 | 0 ± 0 | 0.00 ± 0.00 | 0.0 ± 0.0% | 12.48 ± 1.07% | 2596.6 ± 41.2 | 16.98 ± 0.32 | 0.0 ± 0.0 |
| C1_L25 | 382 ± 0 | 0.65 ± 0.02 | 32.3 ± 2.1% | 17.51 ± 1.31% | 2933.8 ± 73.4 | 17.25 ± 0.36 | 5.6 ± 4.0 |
| C1_M50 | 764 ± 0 | 0.66 ± 0.02 | 32.5 ± 1.5% | 22.63 ± 1.02% | 3264.2 ± 87.4 | 17.37 ± 0.42 | 8.0 ± 2.8 |
| C1_H75 | 1146 ± 0 | 0.64 ± 0.02 | 32.5 ± 2.1% | 27.87 ± 1.03% | 3575.2 ± 69.1 | 17.91 ± 0.52 | 10.8 ± 3.3 |

Hard-braking passages are diagnostics with at least one speed loss of 2.5 m/s or more between consecutive 1-s FCD samples. Intermodal overlap diagnostics are SUMO geometry/time-step events under assumed crossing shares. Neither measure is field-calibrated, and overlap events must not be interpreted as observed or predicted crashes.

## Canonical safety diagnostics (seed 42 only)

These are vehicle-interaction diagnostics, not crash predictions. SUMO SSM does not cover pedestrian conflicts in this setup.

| Case | SSM encounters/1,000 motorized passages | Vulnerable-mode encounters | PET <2 s | Network collision diagnostics | Intermodal diagnostics | School-zone diagnostics |
|---|---:|---:|---:|---:|---:|---:|
| current | 318.1 | 1377 | 0 | 0 | 0 | 0 |
| A_OBS | 171.5 | 1163 | 0 | 0 | 0 | 0 |
| A_DR15 | 161.6 | 974 | 0 | 0 | 0 | 0 |
| A_DR30 | 157.8 | 812 | 0 | 0 | 0 | 0 |
| B_OBS | 107.3 | 664 | 0 | 0 | 0 | 0 |
| B_DR15 | 100.2 | 570 | 0 | 0 | 0 | 0 |
| B_DR30 | 92.2 | 464 | 0 | 0 | 0 | 0 |
| C_OBS | 126.8 | 534 | 0 | 0 | 0 | 0 |
| C_DR15 | 107.3 | 484 | 0 | 0 | 0 | 0 |
| C_DR30 | 96.9 | 406 | 0 | 0 | 0 | 0 |
| C1_X0 | 318.2 | 681 | 0 | 0 | 0 | 0 |
| C1_L25 | 379.6 | 768 | 0 | 7 | 7 | 7 |
| C1_M50 | 414.1 | 856 | 0 | 7 | 7 | 7 |
| C1_H75 | 487.3 | 987 | 0 | 15 | 15 | 15 |
| OW_FULL_OBS | 518.7 | 862 | 0 | 0 | 0 | 0 |
| OW_FULL_DR15 | 417.5 | 702 | 0 | 0 | 0 | 0 |
| OW_FULL_DR30 | 380.7 | 618 | 0 | 0 | 0 | 0 |
| OW_REDUCED_OBS | 520.5 | 875 | 0 | 0 | 0 | 0 |
| OW_REDUCED_DR15 | 423.2 | 718 | 0 | 0 | 0 | 0 |
| OW_REDUCED_DR30 | 381.0 | 631 | 0 | 0 | 0 | 0 |

## Passenger Euro-stage boundary

The cited Statbel table identifies fuel but not Euro stage. The conservative Euro-5 boundary is not a local-fleet estimate; it tests sensitivity to that missing variable.

| Case | CO2 change vs newer proxy | NOx change | PMx change |
|---|---:|---:|---:|
| current | -1.0% | +493.5% | +1.7% |
| A_OBS | -1.9% | +378.4% | +1.0% |
| A_DR15 | -1.9% | +348.7% | +0.9% |
| A_DR30 | -1.8% | +313.9% | +0.9% |
| B_OBS | -2.0% | +387.9% | +1.0% |
| B_DR15 | -1.9% | +359.0% | +0.9% |
| B_DR30 | -1.8% | +321.5% | +0.9% |
| C_OBS | -1.7% | +440.9% | +1.2% |
| C_DR15 | -1.6% | +402.9% | +1.1% |
| C_DR30 | -1.6% | +360.2% | +1.1% |
| C1_X0 | -1.8% | +492.5% | +1.2% |
| C1_L25 | -1.7% | +495.0% | +1.2% |
| C1_M50 | -1.8% | +495.0% | +1.2% |
| C1_H75 | -1.7% | +498.1% | +1.2% |
| OW_FULL_OBS | -1.4% | +471.6% | +1.3% |
| OW_FULL_DR15 | -1.5% | +378.8% | +1.1% |
| OW_FULL_DR30 | -1.4% | +322.4% | +1.0% |
| OW_REDUCED_OBS | -1.5% | +495.6% | +1.3% |
| OW_REDUCED_DR15 | -1.6% | +412.5% | +1.2% |
| OW_REDUCED_DR30 | -1.5% | +355.4% | +1.0% |

The scenario CO2 ordering is insensitive to this boundary, but absolute NOx is not: the Euro-5 proxy is roughly five to six times higher. NOx should therefore be treated as an uncertainty result until a local Euro-stage distribution is obtained.

## What is defensible

- `A_OBS` quantifies only the report-supported relocation of both bus stops toward Émile Idiersstraat. Markings, lighting, visibility and school-zone branding remain qualitative because no observed response coefficient was supplied.
- All observed-demand designs complete in all five seeds without jam/yield teleports. The former B/C failures were removed by replacing unsupported network-wide origin-destination and bus-recirculation assumptions with sensor-supported corridor boundary conditions.
- B's chicane and C's 20 km/h shared-space proxy reduce point speeds at the full observed passage profile. These are conditional corridor effects, not forecasts of network-wide diversion or capacity.
- B does not estimate parking-capacity effects: the OSM-wizard baseline contains no parkingArea objects, so the report's six-space clearance is documented but not numerically subtracted from an invented supply.
- `C_OBS` remains the C0 motor-vehicle speed/geometry proxy. `C1_X0` isolates the rebuilt crossing network with zero crossing pedestrians; C1_L25/M50/H75 then add low/central/high crossing shares at full observed demand.
- C1 quantifies conditional pedestrian waiting, vehicle slowing, bus delay and intermodal overlap diagnostics. It does not represent continuous cross-anywhere movement and its overlap events are not crash predictions.
- DR15/DR30 reduce non-transit motorized demand only. They are demand-response sensitivities, not requirements for the designs to function and not measured forecasts.
- The legacy D/E outputs remain excluded. The separately supplied one-way concepts are rebuilt as OW_FULL/OW_REDUCED with exact lane permissions, two-way buses/bicycles, full input-ID retention and explicit intervention-boundary exits for prohibited westbound private traffic.
- One-way frontage-flow and speed results are conditional local-corridor outputs. Total emissions, VKT and trip time exclude the unknown off-network diversion and must not be compared as network-wide benefits.

## Remaining evidence limits

The sensor calibration is one day and has no direction, origin-destination, turning, pedestrian-trajectory or vehicle-subclass fields. The model therefore uses balanced per-bin unclassified directions, a corridor-boundary passage formulation and explicit pedestrian crossing-share sensitivities rather than a calibrated crossing forecast. Input departure bins and daily detector totals are exact, but route travel time and queues redistribute some simulated detector passages to adjacent 15-minute output bins; see `temporal_calibration_validation.csv`. Buses retain timetable direction, but their 15 October weekday schedule is only a near-date proxy for the 1 October sensor date. The 37% speed target is an aggregate from a different observation period; no observed pedestrian conflicts or yielding compliance series is available; the bicycle/motorcycle split is assumed; national fuel shares proxy local traffic; HBEFA Euro stages are assumptions; and SUMO SSM does not validate pedestrian crash risk.
