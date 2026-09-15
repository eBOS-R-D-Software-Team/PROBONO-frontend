# Scenario C feasibility and C1 interaction experiment (developed in v20; retained in v21.2)

## Scope of the report design

The road-safety report defines Scenario C as a 20 km/h `zone de rencontre` on Chaussée de Wavre between Clos du Bergoje and rue du Vieux Moulin. It describes a raised curbless surface, removal of marked crosswalks, pedestrian priority everywhere, parking removal, relocated bus stops, flexible loading/drop-off use and possible signal or junction reconfiguration.

No pedestrian trajectories, crossing shares, yielding observations or final construction drawing were supplied. Continuous cross-anywhere behavior therefore cannot be calibrated.

## C0 retained as the primary operational proxy

`C_OBS` retains the v19 interpretation:

- 20 km/h operation on the report-defined corridor edges;
- all 8,610 motorized passages plus 755 bicycles and all 1,528 pedestrians;
- 107 timetable-proxy Line 34 bus passages and relocated stops;
- pedestrians represented on frontage-sidewalk exposure paths;
- no parking-capacity result because the baseline contains no `parkingArea` supply.

C0 estimates motor-vehicle speed, delay, VKT and tailpipe emissions. It does not quantify pedestrian-priority interactions.

## C1 implemented experiment

The decorative mid-block foot link already present in the supplied Scenario C geometry was converted into a real SUMO crossing. The carriageway was split at that location, the crossing has pedestrian priority, and the same full observed traffic and bus schedules are retained.

Four matched-network cases isolate the assumed pedestrian effect:

| Case | Pedestrians routed across | Purpose |
|---|---:|---|
| C1_X0 | 0 (0%) | Rebuilt-network control |
| C1_L25 | 382 (25%) | Low crossing-share sensitivity |
| C1_M50 | 764 (50%) | Central crossing-share sensitivity |
| C1_H75 | 1,146 (75%) | High crossing-share sensitivity |

The selected pedestrians are nested: the 25% set is contained in the 50% set, which is contained in the 75% set. No vehicle-demand reduction is applied.

## Five-seed results

All four C1 cases completed in all five seeds without vehicle or person teleports.

| Case | Spot speed (km/h) | CO2 (g/VKT) | Crossing wait (s) | Crossing pedestrians waiting | Slow motorized approaches | Bus time loss (s) | Intermodal overlap diagnostics |
|---|---:|---:|---:|---:|---:|---:|---:|
| C1_X0 | 16.06 | 338.7 | — | — | 12.48% | 16.98 | 0.0 |
| C1_L25 | 15.52 | 340.6 | 0.65 | 32.3% | 17.51% | 17.25 | 5.6 |
| C1_M50 | 15.00 | 342.6 | 0.66 | 32.5% | 22.63% | 17.37 | 8.0 |
| C1_H75 | 14.43 | 344.9 | 0.64 | 32.5% | 27.87% | 17.91 | 10.8 |

Relative to the identical C1_X0 network, increasing the crossing share from 25% to 75%:

- reduces spot speed by approximately 3.3% to 10.1%;
- increases CO2 per VKT by approximately 0.6% to 1.8%;
- adds approximately 0.27 to 0.92 seconds of mean bus time loss;
- increases the share of very slow motorized approaches by approximately 5.0 to 15.4 percentage points;
- produces approximately 5.6 to 10.8 SUMO intermodal overlap events per run.

Hard-braking passages in the technical tables use a diagnostic threshold of at least 2.5 m/s speed loss between consecutive 1-second FCD samples. Intermodal overlap events are SUMO geometry/time-step diagnostics. Neither is field-calibrated, and they are not observed or predicted crashes. The current SSM analysis does not estimate pedestrian crash risk.

## Integrity interpretation

The C1_X0 control is essential. Rebuilding the network around a real priority-crossing junction changes internal network geometry, VKT accounting and vehicle approach behavior even when no pedestrians cross. Consequently:

- pedestrian effects must be evaluated as C1_L25/M50/H75 versus C1_X0;
- the larger C0-to-C1_X0 difference must not be presented as a pedestrian effect;
- the one-band C1 model is a localized interaction sensitivity, not a complete shared-space forecast.

Concentrating every assumed crossing movement at one logical band is also more restrictive than the report's distributed cross-anywhere concept. It may act as an upper-bound local interaction test. Adding several bands without a design drawing or observed desire lines would redistribute an assumption rather than validate it.

## Recommended manuscript use

Keep `C_OBS` as the primary **20 km/h shared-space operational proxy**. Use C1 only as a supplementary sensitivity demonstrating that pedestrian-priority interaction can reduce approach speeds while increasing yielding, braking, bus delay, stop-and-go emissions and uncalibrated overlap diagnostics.

The defensible conclusion is conditional:

> Under full observed demand, the discrete priority-crossing representation remained operational across all assumed pedestrian shares, but its interaction and emissions outcomes were sensitive to the unobserved crossing share. The model therefore does not establish the safety performance of a continuous shared-space design.

Further Scenario C development is justified only if the project supplies at least one of the following:

1. a final shared-space layout with intended desire lines or crossing zones;
2. observed pedestrian trajectories or crossing proportions;
3. yielding-compliance and pedestrian-vehicle interaction observations;
4. a selected signal/junction treatment.

Without these inputs, a continuous TraCI cross-anywhere implementation would add apparent precision without improving evidential reliability.
