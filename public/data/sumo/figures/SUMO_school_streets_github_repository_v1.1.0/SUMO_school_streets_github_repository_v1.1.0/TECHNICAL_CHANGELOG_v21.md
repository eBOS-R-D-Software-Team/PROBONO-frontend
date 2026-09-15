# Technical changelog v21

V21 extends the validated v20 experiment with two one-way concepts supplied separately by the mobility expert. They are not scenarios from the 2025 road-safety inspection and are therefore named `OW_FULL` and `OW_REDUCED`, not D/E or A/B.

## One-way definitions

- `OW_FULL`: private motor traffic is eastbound only between Émile Idiersstraat and Chaussée de Tervuren/Tervuursesteenweg. Buses and bicycles retain two-way access. Eastbound private traffic follows the slide's right-turn-only instruction at Tervuursesteenweg.
- `OW_REDUCED`: private motor traffic is eastbound only between Émile Idiersstraat and Clos du Bergoje/Bergagegaarde. Buses and bicycles retain two-way access. Eastbound private traffic continues through the unchanged eastern section and follows the slide 4 right-turn-only instruction at Tervuursesteenweg.
- The northbound motor-traffic direction on Rue du Vieux Moulin/Oude Molenstraat already matches the orange arrow in the source slide, so no unsupported reversal is added.
- The one-way cases retain the current Bergoje stop locations. Bus-stop relocation and the chicane remain separate concepts in the mobility-expert deck.

## Demand and diversion treatment

- Every observed passenger-car, truck, motorcycle, bicycle, bus and pedestrian ID remains loaded in the observed-demand cases.
- The same exact 15-minute input profile, calibrated behavior, Statbel passenger-fuel allocation, 107 trip-specific Line 34 calls and 696 residual trucks are retained.
- Prohibited westbound private traffic exits at the intervention boundary: Tervuursesteenweg for `OW_FULL`, Bergagegaarde for `OW_REDUCED`.
- The clipped OSM-Wizard network contains no connected external bypass around either restriction. Off-network diversion routes, time and emissions are therefore not invented.
- Frontage-flow and speed results are conditional local-corridor outputs. Total route emissions, VKT and trip time are not network-wide comparisons with current conditions.
- `DR15` and `DR30` remain optional non-transit motorized-demand sensitivities, not forecasts or viability devices.

## Corrections relative to the legacy D/E folders

- The full option now covers the complete Émile Idiersstraat–Tervuursesteenweg extent rather than only a clipped school-frontage subset.
- The reduced private-traffic one-way restriction ends at Bergagegaarde as shown in the slide.
- Both options include the explicit right-turn-only instruction repeated on their respective source slides.
- Private trips are retained as boundary-diverted trips instead of being silently deleted.
- Buses cross the corridor once per timetable call; the obsolete synthetic 10-minute flow and repeated bus recirculation are not reintroduced.
- All new cases use the same five-seed completion, teleport, collision, demand, timetable and behavior checks as A/B/C/C1.

## Reproducibility hardening

- Generated XML and compressed networks are published transactionally and byte-verified.
- The validated C1 crossing network is retained as an immutable source template so rebuilding one-way cases cannot alter the v20 pedestrian-interaction evidence.
