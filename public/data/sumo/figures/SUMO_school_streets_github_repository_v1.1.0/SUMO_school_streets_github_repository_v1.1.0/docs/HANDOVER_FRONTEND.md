# Digital Twin frontend content handover

## Purpose

This handover provides the approved content hierarchy and comparison rules for presenting the school-corridor scenarios to a non-expert user. It supersedes the legacy frontend note and its obsolete KPI values.

The UI should make three distinctions visible:

1. primary road-safety-report scenarios;
2. supplementary sensitivities;
3. supplementary one-way corridor experiments.

Authoritative result metadata are repository release `1.1.0`, model `v21.2` and SUMO `1.27.1`. Display or persist these identifiers wherever results can be downloaded or compared.

## Recommended information architecture

1. Study overview
2. Baseline calibration
3. Primary scenario cards: A, B, C0
4. Supplementary analyses: C1, D, E, demand response
5. KPI comparison
6. Method and limitations
7. Downloads and evidence

## Scenario cards

### Baseline

**Title:** Calibrated current condition  
**Status:** Reference  
**Short copy:** Sensor-aligned 24-hour school-corridor reference for 1 October 2025.  
**Show:** frontage passages, spot speed, share above 36 km/h and calibration status.

### Scenario A

**Title:** Enhanced 30 km/h zone  
**Status:** Primary report scenario · Partial quantitative representation  
**Short copy:** Relocates both Line 34 stops toward Émile Idiersstraat while retaining the existing 30 km/h network. Markings, lighting and visibility measures remain qualitative.  
**Do not say:** the full visual package was simulated or proven to reduce speed.

### Scenario B

**Title:** 30 km/h zone with chicane  
**Status:** Primary report scenario · Operational proxy  
**Short copy:** Adds explicit chicane geometry and relocates both bus stops. The central chicane uses a provisional 25 km/h effective-speed proxy.  
**Visible limitation:** parking capacity and displaced parking demand are not modeled.

### Scenario C0

**Title:** 20 km/h shared-space operational proxy  
**Status:** Primary report scenario · Proxy  
**Short copy:** Represents the low-speed and public-transport components of the shared-space proposal under full observed demand.  
**Visible limitation:** continuous cross-anywhere pedestrian movement, surface elevation and parking removal are not literal model objects.

### Scenario C1

**Title:** Pedestrian-priority interaction sensitivity  
**Status:** Supplementary sensitivity  
**Short copy:** Tests one real priority crossing with 0%, 25%, 50% and 75% of observed pedestrians routed across it.  
**Comparison rule:** all percentage effects use `C1_X0` as the reference.  
**Visible limitation:** overlap diagnostics are not crashes.

### Scenario D

**Title:** Full one-way option  
**Status:** Supplementary corridor experiment  
**Short copy:** Private traffic is eastbound only to Tervuursesteenweg; buses and bicycles retain counterflow, and eastbound cars turn right at the east boundary.  
**Visible limitation:** onward private diversion outside the corridor is not modeled.

### Scenario E

**Title:** Reduced one-way option  
**Status:** Supplementary corridor experiment  
**Short copy:** The private one-way restriction ends at Bergagegaarde; eastbound traffic continues to the right turn at Tervuursesteenweg, while buses and bicycles retain counterflow.  
**Visible limitation:** westbound diversion after Bergagegaarde is outside the modeled boundary.

## Headline full-demand values

| Case | Frontage passages | Spot speed | Above 36 km/h | CO₂ | UI comparison status |
|---|---:|---:|---:|---:|---|
| Baseline | 8,610 | 32.77 km/h | 36.34% | 878.1 kg | Reference |
| A | 8,610 | 35.27 km/h | 48.93% | 687.1 kg | Direct, with partial-scope label |
| B | 8,610 | 29.27 km/h | 11.59% | 723.6 kg | Direct |
| C0 | 8,610 | 22.35 km/h | 0.09% | 761.0 kg | Direct, with proxy label |
| D | 4,357 | 32.07 km/h | 39.97% | 747.9 kg* | Frontage KPIs only |
| E | 4,357 | 32.06 km/h | 40.00% | 871.1 kg* | Frontage KPIs only |

\*Do not render D/E CO₂ as savings versus baseline. Those totals exclude onward private diversion.

Use `analysis/replicate_summary.csv` as the numerical source. Do not copy values from the legacy A–E handover or old comparison CSVs.

## Comparison behavior

### Default chart

The default comparison should show Baseline, A, B and C0 at observed demand. Recommended measures:

- frontage spot speed;
- share above 36 km/h;
- bus time loss;
- CO₂ per VKT or total CO₂, with tailpipe caveat;
- run completion status.

### C1 chart

Use a separate chart with `C1_X0`, `C1_L25`, `C1_M50`, `C1_H75`. Suggested measures:

- spot-speed change versus X0;
- crossing wait;
- bus time-loss change;
- CO₂/VKT change;
- overlap diagnostics, labeled “uncalibrated SUMO overlap events.”

### D/E chart

Use a separate school-frontage chart. Allowed measures:

- frontage passage count;
- spot speed;
- share above 36 km/h;
- bus passages/time loss;
- completion and collision-diagnostic status.

Do not show D/E total trip duration, VKT or total emissions beside Baseline as if routes were complete and comparable.

### Demand-response control

If exposed, place DR15/DR30 behind a clearly labeled “assumed demand response” toggle. Explain that cars, trucks and motorcycles are reduced while buses, bicycles and pedestrians remain fixed.

## Required UI notices

### Evidence notice

> Scenarios A–C are derived from the 2025 road-safety inspection. D and E are supplementary concepts supplied separately by the mobility expert.

### Proxy notice

> Some physical design features—such as lighting, markings, curbless materials and continuous shared-space behavior—are documented qualitatively or represented through bounded operational proxies.

### One-way notice

> D/E results describe the school frontage. Private traffic diverted beyond the closure leaves the modeled boundary, so neighbourhood-wide time, congestion and emissions are not estimated.

### Safety notice

> SUMO collision and overlap outputs are simulation diagnostics, not predicted crashes or measured safety benefits.

## Suggested frontend object

```json
{
  "id": "OW_REDUCED_OBS",
  "display_name": "Scenario E: Reduced one-way option",
  "group": "supplementary_oneway",
  "status": "corridor experiment",
  "source": "mobility-expert presentation, slide 4",
  "summary": "Private one-way restriction to Bergagegaarde with bus and bicycle counterflow; eastbound cars continue to the Tervuursesteenweg right turn.",
  "reference_case": "current",
  "allowed_comparisons": [
    "frontage_motorized_passages",
    "frontage_spot_speed_kmh",
    "frontage_above_36_pct",
    "bus_mean_time_loss_s"
  ],
  "blocked_comparisons": [
    "total_vkt_km",
    "total_trip_duration",
    "total_co2_kg"
  ],
  "limitations": [
    "Off-network westbound diversion is not modeled.",
    "Directional traffic is based on a balanced split assumption."
  ]
}
```

## Visual design and accessibility

- Use the repository’s blue–orange–purple palette; do not rely on red/green status encoding.
- Pair every color with text, icon, pattern or status label.
- Mark proxy and sensitivity cards explicitly.
- Keep warnings adjacent to affected KPIs rather than in a distant methodology page.
- Use the generated schematics in `docs/figures/`; they contain no third-party basemap imagery.
- Provide accessible alt text describing the intervention extent and model boundary.

## Downloads

Recommended public downloads:

- guidebook;
- scenario requirements matrix;
- processed results CSVs;
- validation report;
- SUMO 1.24.0-to-1.27.1 migration note;
- source register;
- GitHub/Zenodo release archive.

Raw XML outputs may be linked through the archival deposit rather than loaded into the UI.

## Content sources

- `docs/GUIDEBOOK.md`
- `evidence/scenario_requirements.csv`
- `analysis/replicate_summary.csv`
- `analysis/scenario_C1_interaction_summary.csv`
- `analysis/scenario_oneway_summary.csv`
- `analysis/validation_report.md`
- `docs/RUNTIME_MIGRATION_SUMO_1.27.1.md`
