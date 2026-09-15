# Line 34 timetable evidence

The OSM WebWizard files define Line 34's route and stop topology, but their `period="600"` flows are synthetic. They are not an operator timetable.

`line34_bergoje_schedule_proxy_2025-10-15.csv` contains 107 scheduled Line 34 calls at the two Bergoje platforms between 07:30 and 19:30. It was extracted with `scripts/extract_line34_gtfs.py` from:

- Mobility Database dataset: `mdb-1857-202510130051`
- GTFS feed version: `2_22_20251010_130541`
- Feed service range: 2025-10-13 to 2025-11-09
- Extracted service date: Wednesday 2025-10-15
- Source ZIP SHA-256: `74da296ea0b620ad240cdc4e2d194621af6b634c5dae11892bc5dc45af0cd8c1`
- Archived dataset URL: <https://files.mobilitydatabase.org/mdb-1857/mdb-1857-202510130051/mdb-1857-202510130051.zip>
- Feed record: <https://mobilitydatabase.org/feeds/gtfs/mdb-1857>

MobilityData later documented that this `gtfs.be` mirror was the official STIB feed with only an additional empty `translations_new.txt` file: <https://github.com/MobilityData/mobility-database-catalogs/issues/939>.

This is a near-date weekday proxy, not the timetable active on the sensor date (Wednesday 2025-10-01). Transitland identifies the exact archived version covering that date as SHA-1 `9076bdfbb7b9d74f55f4c28985bf7042242e7c04`, with service from 2025-09-29 to 2025-10-26, but its raw historical ZIP was not publicly downloadable without credentials during this rebuild: <https://www.transit.land/feeds/f-u151-stib/versions/9076bdfbb7b9d74f55f4c28985bf7042242e7c04>.

Accordingly, v19 removes the unsupported 10-minute OSM-wizard frequency but does not claim exact-date timetable calibration. If the exact archive becomes available, rerun the extractor for `--service-date 2025-10-01`, replace the CSV, and rerun the package.
