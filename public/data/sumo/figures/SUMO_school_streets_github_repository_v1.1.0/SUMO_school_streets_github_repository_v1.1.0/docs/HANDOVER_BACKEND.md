# Digital Twin backend handover

## Purpose

This handover defines how the validated school-corridor SUMO package may be executed or exposed through a Digital Twin backend. It supersedes the legacy handover that referred to the earlier A–E folders and obsolete KPI values.

The safest first integration is a **curated predefined-study workflow**. A generic OSM Wizard sandbox is a different product capability and must not be presented as reproducing this calibrated study.

## Authoritative version

- Repository release: `1.1.0`
- Model lineage: `v21.2`
- SUMO runtime: `1.27.1`
- Seeds: `42, 43, 44, 45, 46`
- Validation: `307 passed, 10 warnings, 0 failed`

The backend should persist the repository version, model lineage, SUMO version, scenario id and seed with every result.

## Scenario registry

| Display label | Backend id | Role | Direct baseline comparison |
|---|---|---|---|
| Baseline | `current` | Calibrated reference | — |
| Scenario A | `A_OBS` | Report scenario; relocated bus stops | Yes |
| Scenario B | `B_OBS` | Report scenario; chicane plus relocated stops | Yes |
| Scenario C0 | `C_OBS` | 20 km/h shared-space operational proxy | Yes |
| C1 control | `C1_X0` | Rebuilt crossing-network control | Only within C1 |
| C1 low | `C1_L25` | 25% crossing-share sensitivity | Compare with C1_X0 |
| C1 medium | `C1_M50` | 50% crossing-share sensitivity | Compare with C1_X0 |
| C1 high | `C1_H75` | 75% crossing-share sensitivity | Compare with C1_X0 |
| Scenario D | `OW_FULL_OBS` | Full one-way corridor experiment | Frontage KPIs only |
| Scenario E | `OW_REDUCED_OBS` | Reduced one-way corridor experiment | Frontage KPIs only |

The `*_DR15` and `*_DR30` ids are optional demand-response sensitivities. They must not be used as default design cases or labeled as predicted traffic reductions.

## Recommended backend modes

### Mode 1 — serve validated results

For publication support and most demonstrations, read the processed tables rather than launching a new simulation:

- `analysis/replicate_summary.csv`
- `analysis/scenario_comparisons.csv`
- `analysis/scenario_C1_interaction_summary.csv`
- `analysis/scenario_oneway_summary.csv`
- `analysis/calibration_validation.csv`
- `analysis/validation_report.md`

This mode is fast, deterministic and preserves the exact evidence used by the paper.

### Mode 2 — rerun a curated case

For an interactive “run simulation” feature, execute only registered scenario ids with the packaged inputs. Do not regenerate the study from OSM during a user request.

Preparation and full rerun:

```bash
bash scripts/run_all.sh --sumo-binary /opt/sumo/1.27.1/bin/sumo
```

Targeted rerun:

```bash
python3 scripts/prepare_experiment.py
python3 scripts/run_experiment.py \
  --sumo-binary /opt/sumo/1.27.1/bin/sumo \
  --scenarios current A_OBS B_OBS C_OBS \
  --seeds 42 43 44 45 46
python3 scripts/extract_results.py
python3 scripts/validate_package.py
```

`prepare_experiment.py` recreates generated case folders from `templates/`. A production worker should operate on an immutable release image plus a per-job working copy.

### Mode 3 — generic mobility sandbox

A separate service may let users select an arbitrary area and generate an OSM Wizard baseline. That result is not equivalent to this study because it will not inherit:

- the 1 October 2025 sensor profile;
- the fitted desired-speed distribution;
- the Line 34 timetable proxy;
- the reconciled bus/truck count;
- the Statbel/HBEFA fleet allocation;
- the curated A–E scenario networks;
- the evidence and validation rules.

Keep the generic sandbox and curated school study as distinct backend modes and label them accordingly.

## Job contract

Recommended request:

```json
{
  "study_id": "ace_school_corridor",
  "repository_version": "1.1.0",
  "model_version": "v21.2",
  "scenario_id": "B_OBS",
  "seeds": [42, 43, 44, 45, 46],
  "sumo_version": "1.27.1"
}
```

Recommended response metadata:

```json
{
  "job_id": "<generated>",
  "status": "validated",
  "study_id": "ace_school_corridor",
  "scenario_id": "B_OBS",
  "repository_version": "1.1.0",
  "model_version": "v21.2",
  "sumo_version": "1.27.1",
  "seeds_requested": [42, 43, 44, 45, 46],
  "completion_valid_seeds": 5,
  "validation_failures": 0,
  "interpretation_profile": "primary_report_scenario"
}
```

Do not let a client override network files, source routes or calibration constants while still labeling the result as the validated release. A modified input creates a new model version.

## Execution workflow

1. Resolve the scenario id against an allowlist.
2. Create an isolated working directory from the immutable release.
3. Verify SUMO version `1.27.1`.
4. Prepare cases and execute requested seeds.
5. Reject incomplete XML output and retry only according to the repository runner.
6. Extract processed KPIs.
7. Run package validation.
8. Mark the job `validated` only if failed checks equal zero.
9. Persist inputs, logs, results, validation status and hashes.
10. Return processed KPIs plus interpretation metadata.

## Minimum outputs to persist

- exact `.sumocfg` and referenced input files;
- seed and command line;
- SUMO stdout/stderr log;
- `tripinfos`, `personinfos`, `stopinfos`, `stats`, detector and collision output;
- extracted replicate row;
- aggregate scenario summary;
- validation checks and warnings;
- input/output manifest with SHA-256 hashes.

The platform may retain FCD and SSM files in archival storage rather than in the transactional database.

## KPI API fields

Recommended common fields:

- `frontage_motorized_passages`
- `frontage_spot_speed_kmh`
- `frontage_above_36_pct`
- `mean_trip_duration_min`
- `mean_waiting_s`
- `mean_time_loss_s`
- `bus_mean_time_loss_s`
- `vkt_km`
- `co2_kg`
- `co2_g_per_vkm`
- `nox_kg`
- `teleports`
- `collision_diagnostics`

Additional C1 fields:

- `pedestrian_crossing_share_pct`
- `crossing_pedestrians`
- `crossing_mean_waiting_s`
- `slow_approach_pct`
- `hard_braking_passages`
- `intermodal_overlap_diagnostics`

## Interpretation metadata

Every response should include an interpretation profile:

- `reference`
- `primary_report_scenario`
- `pedestrian_sensitivity`
- `oneway_corridor_experiment`
- `demand_response_sensitivity`
- `tested_not_adopted`

The profile should control which comparisons the frontend is permitted to render.

For D/E, set:

```json
{
  "comparable_frontage_kpis": true,
  "comparable_total_route_kpis": false,
  "offnetwork_diversion_modeled": false
}
```

For C1, set the baseline id to `C1_X0`, not `current`.

## Guardrails

- Never describe the Line 34 data as an exact 1 October timetable.
- Never add buses to the 803 large vehicles; the 107 buses are already included.
- Never label DR15/DR30 as a design outcome.
- Never use D/E total emissions as neighbourhood-wide savings.
- Never interpret collision/overlap outputs as predicted crashes.
- Never replace the calibrated baseline with a fresh OSM Wizard generation under the same study id.
- Never combine the chicane or bus relocation with D/E unless a new combined scenario id and version are created.

## File entry points

- Core preparation: `scripts/prepare_experiment.py`
- Simulation runner: `scripts/run_experiment.py`
- Fleet boundary: `scripts/run_fleet_sensitivity.py`
- Extraction: `scripts/extract_results.py`
- Validation: `scripts/validate_package.py`
- Scenario definitions: `analysis/scenario_definitions.csv`
- Requirement matrix: `evidence/scenario_requirements.csv`
- Guidebook: `docs/GUIDEBOOK.md`
