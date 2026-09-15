# Release notes — repository 1.0.0 / model v21.1

This is the first publication-structured release of the school-street SUMO evidence package.

## Consolidated evidence layer

- Baseline, A, B, C0, C1, D and E are documented under a common source hierarchy.
- A–C are tied to the final road-safety report.
- D/E are tied to the separately supplied mobility-expert slides.
- The expanded one-way diversion experiment is segregated as tested but not adopted.
- Source documents are referenced by checksum and page/slide without redistribution.

## Documentation

- New reviewer-facing technical guidebook in PDF, editable DOCX and Markdown formats.
- New scenario requirements matrix and source register.
- New backend and frontend handovers.
- New public-release checklist and licensing note.
- New colour-vision-deficiency-safe scenario schematics generated from SUMO networks.

## Model/documentation corrections found during consolidation

1. `analysis/demand_definition.csv` contained a stale full-demand row for `A_DR30`; the generated route files and simulation outputs already used the correct 30% reduction. The table is now regenerated from the actual case files.
2. Mobility-expert slide 4 repeats the eastbound right-turn-only instruction at Tervuursesteenweg. The reduced one-way case now preserves its shorter one-way restriction to Bergagegaarde while continuing eastbound private trips through the unchanged eastern section to that right turn. All 15 reduced-option runs completed without teleports or collision diagnostics.

No A/B/C/C1 or full one-way (`OW_FULL`) simulation input was changed by the v21.1 consolidation.

The public repository copy also removes a generated local Windows username and absolute paths from the non-executable provenance comment in `templates/current/osm_pt.rou.xml`. The route and flow elements are unchanged; this is privacy hardening only and has no effect on simulation behavior.

## Validation

- 20 principal cases × five seeds.
- Passenger Euro-stage boundary analysis retained.
- 307 automated checks passed.
- 10 evidence limitations disclosed as warnings.
- 0 failed checks.
