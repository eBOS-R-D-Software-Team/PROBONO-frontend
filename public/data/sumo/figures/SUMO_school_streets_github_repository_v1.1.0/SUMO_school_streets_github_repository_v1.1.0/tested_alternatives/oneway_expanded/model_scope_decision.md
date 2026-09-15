# One-way model-scope decision: corridor boundary versus bounded diversion

## Purpose

This experiment tested whether Scenarios D and E should be upgraded from the
validated v21.1 corridor-boundary formulation to a compact expanded OSM network
that completes the diverted westbound trips. The school frontage remained the
primary reporting zone, while the surrounding network was used only to close
the diversion routes.

The comparison uses five seeds (42–46), full observed demand, the same 107-bus
weekday timetable proxy, and a matched expanded-network current condition.

## Full-demand five-seed means

| Case | Arrived | VKT (km) | Mean trip duration (min) | Mean time loss (s) | CO2 (kg) | School-frontage motorized passages | Frontage spot speed (km/h) | Above 36 km/h | Bus time loss (s) | Teleports | Collision diagnostics/run |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Expanded current | 9,365 | 8,828.8 | 2.30 | 47.79 | 2,115.0 | 8,610 | 31.86 | 36.81% | 16.02 | 0 | 1.4 |
| Expanded full one-way | 9,365 | 17,331.2 | 5.09 | 150.88 | 5,078.2 | 4,357 | 34.00 | 40.43% | 16.22 | 0 | 1.0 |
| Expanded reduced one-way | 9,365 | 22,267.2 | 6.98 | 224.11 | 6,833.1 | 4,357 | 33.69 | 39.42% | 19.53 | 0 | 35.4 |

## Interpretation

The expansion confirms the qualitative conclusion from v21.1: removing
westbound private traffic approximately halves modeled motorized passages on
the school frontage, but it does not create a speed-calming effect. Mean spot
speed and the proportion above 36 km/h increase because the remaining
eastbound stream encounters less opposing general traffic.

The expanded model is not suitable as the primary evidence layer:

1. It assumes zero background traffic on all diversion streets because no
   counts are available there.
2. It assigns every prohibited westbound trip to one modeled local diversion,
   which is not supported by observed route-choice data.
3. The selected boundary nearly doubles VKT for the full option and more than
   doubles it for the reduced option. These values describe the imposed test
   envelope, not forecast neighbourhood impacts.
4. The reduced option concentrates traffic at the Bergagegarde exit and
   produces 29–52 SUMO junction collision/overlap diagnostics per run. This is
   a failed operational representation, not a result that can be interpreted
   as crash prediction.
5. Even the matched expanded current condition produces 1–2 geometric
   collision diagnostics per seed, showing that the additional OSM junctions
   require calibration and network repair before safety indicators can be
   trusted.

## Decision

Retain v21.1 for D/E as a bounded school-frontage access experiment. Its results
may be used only to assess corridor passages, speeds, and bus/bicycle access.
State explicitly that off-corridor diversion time, distance, congestion, and
emissions are outside the modeled boundary.

Keep this v22 branch as a feasibility/audit experiment. Do not use its absolute
VKT, travel-time, emissions, or collision values in the manuscript. Directional
40:60 and 60:40 simulations are not justified on this expanded network because
the base reduced-diversion representation already fails and the surrounding
route choice/background demand are uncalibrated. Directional uncertainty can
instead be reported analytically for the v21.1 frontage effect: the assumed
private westbound share determines the removed frontage share, so a 40–60%
westbound envelope would replace the single balanced 50% assumption.

## Conditions for a defensible future expanded model

- Directional counts on the intervention corridor.
- Counts or another calibrated demand source on diversion streets.
- Confirmed intended turn movements at Bergagegarde and Tervuursesteenweg.
- Observed or assignment-based route-choice proportions rather than a single
  forced diversion.
- Junction-geometry repair and a collision-free matched baseline.
