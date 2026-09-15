# Technical changelog — model v21.2

## Purpose

Model v21.2 is the SUMO 1.27.1 runtime migration of the validated v21.1 evidence-aligned model. It is a runtime/output revision, not a new planning scenario or a change to the source-derived intervention logic.

## Changed

- Pinned SUMO and `netconvert` at 1.27.1.
- Regenerated the 20 runtime-derived case folders from the existing templates.
- Reran seeds 42–46 and the passenger-fleet boundary.
- Regenerated calibration, mobility, emissions, interaction, safety-diagnostic and validation tables.
- Updated release metadata and publication-support documents.

## Unchanged

- observed daily and 15-minute demand definitions;
- even non-transit directional split;
- 107-call Line 34 timetable proxy;
- calibrated desired-speed distribution;
- scenario A/B/C0 network and stop meanings;
- C1 matched-control and nested crossing-share design;
- D/E access rules and corridor-boundary interpretation;
- DR15/DR30 deterministic filtering rules;
- fleet-class assumptions and evidence limitations;
- validation criteria and API scenario identifiers.

## Validation outcome

- 20 cases × five seeds = 100 completion-valid runs;
- 307 checks passed;
- 10 warnings retained;
- 0 checks failed.

The full quantitative migration record is `analysis/runtime_migration_v1.0_to_v1.1.csv`, with an interpretation note at `docs/RUNTIME_MIGRATION_SUMO_1.27.1.md`.
