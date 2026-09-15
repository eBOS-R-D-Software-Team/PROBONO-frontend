# GitHub and Zenodo release checklist

## Scientific content

- [ ] Manuscript labels match the repository: Baseline, A, B, C0, C1, D/`OW_FULL`, E/`OW_REDUCED`.
- [ ] A is described as a bus-stop-relocation simulation with qualitative visibility measures.
- [ ] B states that the report says six parking spaces, slide 2 says five, and parking capacity is not modeled.
- [ ] C0 is called a 20 km/h shared-space operational proxy.
- [ ] C1 is compared only with `C1_X0` and is not presented as a continuous shared-space forecast.
- [ ] D/E inference is restricted to the school frontage; downstream diversion impacts are excluded.
- [ ] D and E both include the repeated right-turn-only instruction at Tervuursesteenweg.
- [ ] DR15/DR30 are labeled hypothetical demand-response sensitivities.
- [ ] Collision/overlap diagnostics are not called crashes or safety benefits.
- [x] Tables and figures use the v21.2 / SUMO 1.27.1 processed results.

## Repository QA

- [x] `python3 scripts/validate_package.py` reports zero failures in the archival package.
- [x] The release manifest is regenerated after the final documentation change.
- [x] No temporary files, cache files, partial XMLs or local runtime binaries are included.
- [x] All Markdown relative links resolve.
- [x] The lean package can rebuild the generated cases from `templates/`.
- [x] The archival package contains the canonical outputs used in processed tables.
- [x] Figures are readable in colour and grayscale and do not rely on red/green distinction.

## Rights and metadata

- [ ] Confirm code license.
- [ ] Confirm documentation/data license.
- [ ] Confirm OSM/ODbL attribution language.
- [ ] Confirm GTFS-derived schedule attribution and redistribution conditions.
- [ ] Confirm whether the safety report and mobility presentation may be redistributed; otherwise keep them excluded.
- [ ] Confirm repository contributors and update `CITATION.cff` if needed.
- [ ] Add GitHub repository URL to `CITATION.cff` after publication.
- [ ] Add the associated article citation and DOI when available.
- [ ] Add PROBONO funding acknowledgement and grant number in Zenodo metadata and the manuscript.

## GitHub release

- [ ] Publish the lean repository, not the raw-output archive, as the default branch.
- [ ] Create signed or annotated tag `v1.1.0`.
- [ ] Attach the archival ZIP or link its Zenodo DOI instead of committing raw outputs to Git history.
- [ ] Enable Zenodo–GitHub integration only after the repository metadata and license are final.

## Zenodo deposit

- [ ] Upload the archival ZIP and the standalone guidebook.
- [ ] Use version `1.1.0` and record model lineage `v21.2`.
- [ ] Include keywords for SUMO, school street, traffic microsimulation, road safety, shared space and PROBONO.
- [ ] Add the GitHub URL as a related identifier.
- [ ] Reserve a DOI before manuscript submission if the data-availability statement will cite it.
- [ ] After publication, update the GitHub README and `CITATION.cff` with the Zenodo DOI.
