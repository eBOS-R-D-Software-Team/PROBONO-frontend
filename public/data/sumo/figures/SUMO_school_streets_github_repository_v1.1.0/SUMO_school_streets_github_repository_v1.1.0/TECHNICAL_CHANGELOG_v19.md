# Technical change log — v19 bus-schedule integrity update

## v19 changes

- Replaced the OSM WebWizard's synthetic 600-second Line 34 flows with 107 individual scheduled Bergoje calls from a dated STIB GTFS archive.
- Retained OSM-derived route/stop geometry and one corridor passage per bus.
- Marked the departure list correctly as a near-date Wednesday proxy (15 October 2025), not the exact timetable for the 1 October sensor date; the exact archive identifier and replacement procedure are included.
- Recomputed the observed 803 large-vehicle passages by 15-minute bin as 107 timetable-proxy buses plus 696 residual trucks.
- Added validation for every bus trip, scheduled stop, direction, per-bin large-vehicle allocation and timetable provenance.
- Recorded that the OSM baseline contains no `parkingArea` objects. Scenario B's six-space removal is therefore a documented geometric-clearance assumption, not a modeled parking-capacity effect.

## Retained v18 corridor-integrity repairs

## Primary integrity repair

- Reinterpreted the supplied sensor table correctly as 15-minute school-frontage passage totals. It contains no origins, destinations, turns or directions.
- Removed the arbitrary network-wide OD distribution that caused stochastic gridlock in B and C. Cars, large vehicles and two-wheelers now enter upstream of the observed corridor and leave downstream while preserving every observed departure bin.
- Replaced recirculating public-transport routes that crossed the detector three times and made a short-link U-turn. Each scheduled bus now makes one corridor passage and one named Bergoje stop.
- Applied a balanced direction split within each 15-minute bin for unclassified car and two-wheeler totals; scheduled buses retain timetable direction.
- Allocated the observed 803 large-vehicle passages exactly; v19 updates the subclass split to 107 timetable-proxy bus passages plus 696 residual truck passages. The residual directional allocation remains an assumption because the sensor does not classify it.
- Replaced arbitrary network-wide pedestrian routes with two frontage-sidewalk exposure paths. The 1,528 count is preserved, but pedestrian crossing/conflict effects are not claimed without trajectory data.
- Enabled one common 0.8 m sublane resolution for every case so mixed car-bicycle movement is represented consistently rather than being separated by an arbitrary directional imbalance.

## Scenarios and demand response

- Retained only the safety-report designs A, B and C. Former D/E cases remain excluded because the clipped corridor cannot quantify off-network diversion.
- Renamed cases for clarity: `OBS` is the full observed profile; `DR15` and `DR30` are 15% and 30% non-transit motorized demand-response sensitivities.
- Demand response is no longer needed for numerical viability. Every A/B/C observed-demand case must complete in all five seeds without vehicle or person teleports.
- Scenario A quantifies the report-supported relocation of both bus stops toward Émile Idiersstraat. No response coefficient is invented for markings, lighting or sightlines.
- Bus routes extend beyond both baseline and relocated stop positions so braking, dwell and acceleration are retained on each side of the comparison rather than truncated at a model boundary.
- Scenario B retains the report-aligned chicane geometry with a provisional 25 km/h central effective-speed proxy inside a 30 km/h zone.
- Scenario C retains the 20 km/h shared-space speed/geometry proxy. Raised materials, curbless treatment and cross-anywhere behavior remain outside calibrated quantitative scope.

## Calibration, fleet and reproducibility

- Recalibrated common desired-speed heterogeneity after correcting OD, bus-boundary and timetable/fleet-passage logic. The v19 factor is recorded in `scripts/common.py`; its achieved five-seed point-speed result is reported in `analysis/calibration_validation.csv`.
- Applies Statbel 2025 national passenger-fuel shares deterministically and retains an explicit Euro-stage boundary test.
- Uses SUMO 1.24.0, seeds 42–46, strict route errors, point-speed FCD, SSM diagnostics, collision output, a validation suite and SHA-256 manifest.
- Publishes generated XML atomically after a parse check and verifies configured motorized behavior before every seed. A seed may be rerun once only when SUMO reports completion but an output XML is incomplete; traffic failures and invalid results are never retried or averaged away.
- Emissions are corridor-scope SUMO/HBEFA tailpipe estimates. Network-wide traffic, diversion and emissions are not inferred.
