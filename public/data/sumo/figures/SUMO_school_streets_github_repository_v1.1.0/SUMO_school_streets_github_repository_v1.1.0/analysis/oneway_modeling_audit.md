# One-way modeling audit

## Requirements and implementation

| Requirement | OW_FULL | OW_REDUCED | Evidence boundary |
|---|---|---|---|
| Private motor traffic eastbound only | Émile Idiersstraat to Tervuursesteenweg | Émile Idiersstraat to Bergagegaarde | Enforced through westbound lane permissions |
| Buses retain both directions | Yes | Yes | All 107 trip-specific Line 34 calls retained |
| Bicycles retain both directions | Yes | Yes | All observed bicycle IDs retained on the standard corridor ODs |
| Eastbound private traffic turns right at Tervuursesteenweg | Yes | Yes | Repeated callout on slides 3 and 4; enforced through the declared eastbound trip boundary route |
| Rue du Vieux Moulin/Oude Molenstraat direction | Existing northbound motor direction retained | Existing direction retained | OSM network already matches the orange slide arrow |
| Bus-stop relocation | No | No | Separate slide/concept; current Bergoje stops retained |
| Chicane | No | No | Separate slide/concept |
| Westbound private diversion beyond the closure | Boundary exit at Tervuursesteenweg | Boundary exit at Bergagegaarde after traversing the unchanged eastern section | External detour absent from clipped network and unobserved |

## Interpretation rules

- `OBS` preserves every observed input ID; it does not mean the intervention reproduces baseline detector counts.
- A reduction in school-frontage traffic is an imposed access consequence under the balanced direction assumption, not a calibrated modal-shift or rerouting forecast.
- Total CO2, VKT, trip duration and time loss exclude onward off-network diversion and must not be presented as network-wide benefits.
- Frontage passage counts, spot speeds, bus operation, completion stability and local interaction diagnostics are within scope.
- `DR15` and `DR30` are optional demand-response sensitivities applied on top of each one-way design.
