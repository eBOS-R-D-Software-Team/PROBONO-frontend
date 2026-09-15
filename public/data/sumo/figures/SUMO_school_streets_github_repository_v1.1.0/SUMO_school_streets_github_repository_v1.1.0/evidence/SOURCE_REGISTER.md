# Source register

This register identifies the evidence used to build repository release 1.1.0 / model v21.2. Project-supplied documents are cited by filename, location and checksum but are not redistributed pending confirmation of public-release rights.

## 1. Road-safety inspection

**Supplied file:** `Road safety inspection 2025 - de l'Autre Côté de l'Ecole (1)(1).pdf`  
**Repository status:** not redistributed  
**Integrity:** see `source_file_checksums.csv`

Relevant content:

- Section 1.3 / report page 5: 37% of motorized vehicles above 36 km/h in September 2024; 12 reported crashes on the way to school in 2019–2023.
- Section 5 / report pages 16–18: excessive speed, limited mutual visibility, weak signage/markings, narrow pedestrian space and public-transport constraints.
- Section 6.1 / report page 19: Scenario A; enhanced 30 km/h zone, markings, visibility, lighting, possible traffic reorganization and possible relocation of both stops toward Émile Idiersstraat.
- Section 6.2 / report page 20: Scenario B; retained 30 km/h limit, removal of six north-side parking spaces, chicane and possible relocation of both stops.
- Section 6.3 / report pages 20–21: Scenario C; 20 km/h shared space between Clos du Bergoje and Rue du Vieux Moulin, raised/curbless surface, removal of crosswalks, pedestrian priority everywhere, parking removal, relocated stops and possible junction/signal changes.
- Section 6.4 / report page 21: traffic-movement study and possible turn/flow changes for all scenarios.
- Monitoring / report page 22: before/after speed and behavior measurement recommended.

The report supplies design intent. It does not supply a demand-reduction coefficient, chicane achieved-speed distribution, parking-demand response, pedestrian trajectory set, yielding-compliance rate, conflict series or emissions factor.

## 2. Mobility-expert presentation

**Supplied file:** `Scenario's PROBONO Mobility BLL SUMO(3).pptx`  
**Repository status:** not redistributed  
**Integrity:** see `source_file_checksums.csv`

Relevant content:

- Slide 1: map concept for relocation of both bus stops.
- Slide 2: chicane and school-square concept; refers to retrieval of five parking spaces, whereas the final safety report specifies six.
- Slide 3: one-way Option A; private cars eastbound only from Émile Idiersstraat to Tervuursesteenweg, buses and bicycles permitted in both directions, and eastbound cars right-turn-only at Tervuursesteenweg.
- Slide 4: reduced one-way Option B; private one-way restriction ends at Bergagegaarde, buses and bicycles remain two-way, and the right-turn-only instruction is repeated at Tervuursesteenweg.

The final safety report governs A–C when text conflicts with the presentation. The presentation is the primary source for supplementary D/E.

## 3. Sensor counts

**Supplied file:** `rawdata_10_2025.csv`  
**Use:** first 96 fifteen-minute rows for 1 October 2025  
**Repository derivative:** `analysis/observed_sensor_profile.csv`

The source table contains total pedestrians, bikes/two-wheelers, cars and large vehicles. It contains no direction, origin, destination, turn, vehicle-subclass or pedestrian-trajectory field.

## 4. Public transport

OSM-derived Line 34 topology came from the supplied OSM Wizard files. Their 600-second headway was a generated frequency rather than an operator timetable.

The replacement list is `gtfs/line34_bergoje_schedule_proxy_2025-10-15.csv`, extracted from Mobility Database dataset `mdb-1857-202510130051`. It contains 107 Bergoje calls in the calibration window and is a Wednesday 15 October proxy for Wednesday 1 October 2025.

Supporting documentation:

- SUMO public-transport import tutorial: <https://sumo.dlr.de/docs/Tutorials/PT_from_OpenStreetMap.html>
- `ptlines2flows.py`: <https://sumo.dlr.de/docs/Tools/Misc.html#ptlines2flowspy>
- Mobility Database feed: <https://mobilitydatabase.org/feeds/gtfs/mdb-1857>

## 5. Fleet composition

Statbel, *Vehicle stock*, 1 August 2025: <https://statbel.fgov.be/en/themes/mobility/traffic/vehicle-stock>

Passenger stock used:

- petrol: 3,136,259;
- diesel: 1,699,797;
- hybrid: 846,354;
- electric: 395,188;
- gas: 24,869;
- other/not specified: 33,567;
- total: 6,136,034.

The source supports national fuel shares, not local traffic composition or Euro-stage distribution.

## 6. Simulation definitions

- SUMO 1.27.1 runtime. The release-to-release comparison is documented in `../docs/RUNTIME_MIGRATION_SUMO_1.27.1.md` and `../analysis/runtime_migration_v1.0_to_v1.1.csv`.
- HBEFA4 model: <https://sumo.dlr.de/docs/Models/Emissions/HBEFA4-based.html>
- TripInfo output: <https://sumo.dlr.de/docs/Simulation/Output/TripInfo.html>
- Pedestrian simulation: <https://sumo.dlr.de/docs/Simulation/Pedestrians.html>
- SSM output: <https://sumo.dlr.de/docs/Simulation/Output/SSM_Device.html>

## 7. Evidence boundary

All source-to-model translations are enumerated in `scenario_requirements.csv` and `../analysis/evidence_traceability.csv`. A source statement is not treated as numerically modeled unless an explicit model lever and validation check are identified.
