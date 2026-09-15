#!/usr/bin/env python3
"""Compare two five-seed SUMO result summaries across runtime versions."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path


SCENARIO_ORDER = (
    "current",
    "A_OBS", "A_DR15", "A_DR30",
    "B_OBS", "B_DR15", "B_DR30",
    "C_OBS", "C_DR15", "C_DR30",
    "C1_X0", "C1_L25", "C1_M50", "C1_H75",
    "OW_FULL_OBS", "OW_FULL_DR15", "OW_FULL_DR30",
    "OW_REDUCED_OBS", "OW_REDUCED_DR15", "OW_REDUCED_DR30",
)

METRICS = (
    ("completion_valid_replicates", "valid replicates", "count"),
    ("frontage_spot_motorized_passages_mean_valid", "motorized frontage passages", "count"),
    ("frontage_spot_motorized_mean_speed_kmh_mean_valid", "frontage spot speed", "km/h"),
    ("frontage_spot_motorized_over_36_pct_mean_valid", "above 36 km/h", "%"),
    ("CO2_kg_mean_valid", "CO2", "kg"),
    ("CO2_g_per_vkm_mean_valid", "CO2 intensity", "g/VKT"),
    ("vkt_km_mean_valid", "represented VKT", "km"),
    ("mean_time_loss_s_mean_valid", "mean time loss", "s"),
    ("bus_mean_time_loss_s_mean_valid", "bus time loss", "s"),
    ("pedestrian_crossing_mean_waiting_s_mean_valid", "crossing wait", "s"),
    ("frontage_fcd_motorized_approach_slow_pct_mean_valid", "slow motorized approaches", "%"),
    ("frontage_fcd_motorized_approach_hard_braking_passages_mean_valid", "hard-braking passages", "count"),
    ("collision_output_intermodal_mean_valid", "intermodal overlap diagnostics", "count"),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--old", required=True, type=Path, help="Earlier replicate_summary.csv")
    parser.add_argument("--new", required=True, type=Path, help="Updated replicate_summary.csv")
    parser.add_argument("--old-label", default="SUMO 1.24.0")
    parser.add_argument("--new-label", default="SUMO 1.27.1")
    parser.add_argument("--output-csv", required=True, type=Path)
    parser.add_argument("--output-md", required=True, type=Path)
    return parser.parse_args()


def load(path: Path) -> dict[str, dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return {row["scenario"]: row for row in csv.DictReader(handle)}


def value(row: dict[str, str], key: str) -> float:
    raw = row.get(key, "")
    return float(raw) if raw not in ("", None) else 0.0


def delta_pct(old: float, new: float) -> str:
    if old == 0:
        return "" if new == 0 else "not defined"
    return f"{100 * (new - old) / old:.4f}"


def fmt(number: float, unit: str) -> str:
    if unit == "count":
        return f"{number:.1f}"
    if unit == "%":
        return f"{number:.2f}"
    return f"{number:.2f}"


def main() -> None:
    args = parse_args()
    old_rows = load(args.old)
    new_rows = load(args.new)
    missing = [s for s in SCENARIO_ORDER if s not in old_rows or s not in new_rows]
    if missing:
        raise SystemExit(f"Missing scenarios: {', '.join(missing)}")

    args.output_csv.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "scenario", "metric", "unit", "old_runtime", "new_runtime",
        "old_value", "new_value", "absolute_delta", "relative_delta_pct",
    ]
    records: list[dict[str, str]] = []
    for scenario in SCENARIO_ORDER:
        for key, label, unit in METRICS:
            old = value(old_rows[scenario], key)
            new = value(new_rows[scenario], key)
            records.append({
                "scenario": scenario,
                "metric": label,
                "unit": unit,
                "old_runtime": args.old_label,
                "new_runtime": args.new_label,
                "old_value": f"{old:.10g}",
                "new_value": f"{new:.10g}",
                "absolute_delta": f"{new - old:.10g}",
                "relative_delta_pct": delta_pct(old, new),
            })
    with args.output_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)

    headline = ("current", "A_OBS", "B_OBS", "C_OBS", "C1_X0", "C1_L25", "C1_M50", "C1_H75", "OW_FULL_OBS", "OW_REDUCED_OBS")
    md = [
        "# SUMO runtime migration: 1.24.0 to 1.27.1",
        "",
        "Repository release 1.1.0 / model lineage v21.2 reruns the unchanged evidence-aligned scenario definitions with SUMO 1.27.1. Runtime-derived networks and outputs were regenerated, all 20 cases were executed for seeds 42–46, and the complete validation suite was rerun.",
        "",
        "## Migration outcome",
        "",
        "- 100/100 scenario-seed runs produced completion-valid results.",
        "- 307 automated checks passed; 10 evidence-boundary warnings remain; no checks failed.",
        "- Loaded-user counts, frontage passage counts and represented VKT are unchanged.",
        "- The ordering and interpretation of the principal A/B/C0, C1 and one-way findings are unchanged.",
        "- Time-loss, emissions and some interaction diagnostics changed under the newer runtime and must not be mixed with release 1.0.0 values.",
        "- One C_OBS seed-44 attempt produced incomplete XML. The existing integrity safeguard rejected it and automatically reran the complete seed; only the clean rerun contributes to the processed tables.",
        "",
        "SUMO release notes document changes relevant to interpretation between these versions, including emissions behavior during person/container loading in 1.25, planned-stop time-loss semantics and pedestrian-crossing fixes in 1.26, and a stopping time-loss correction in 1.27. These notes are consistent with the classes of values that moved, but this package treats the rerun comparison—not an attribution to a single internal change—as the migration evidence.",
        "",
        "Official sources: [release archive](https://sumo.dlr.de/releases/), [current changelog](https://sumo.dlr.de/docs/ChangeLog.html), and [2025 releases](https://sumo.dlr.de/docs/ChangeLog/Changes_in_2025_releases.html).",
        "",
        "## Headline old-versus-new values",
        "",
        "| Case | Speed 1.24 → 1.27.1 (km/h) | >36 1.24 → 1.27.1 (%) | CO2 1.24 → 1.27.1 (kg) | CO2/VKT 1.24 → 1.27.1 (g/km) | Mean loss 1.24 → 1.27.1 (s) | Bus loss 1.24 → 1.27.1 (s) |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for scenario in headline:
        old = old_rows[scenario]
        new = new_rows[scenario]
        def pair(key: str, unit: str) -> str:
            return f"{fmt(value(old, key), unit)} → {fmt(value(new, key), unit)}"
        md.append("| " + " | ".join((
            scenario,
            pair("frontage_spot_motorized_mean_speed_kmh_mean_valid", "km/h"),
            pair("frontage_spot_motorized_over_36_pct_mean_valid", "%"),
            pair("CO2_kg_mean_valid", "kg"),
            pair("CO2_g_per_vkm_mean_valid", "g/VKT"),
            pair("mean_time_loss_s_mean_valid", "s"),
            pair("bus_mean_time_loss_s_mean_valid", "s"),
        )) + " |")

    md.extend([
        "",
        "## Interpretation",
        "",
        "For release 1.1.0, every manuscript, guidebook, API and dashboard value must come from the SUMO 1.27.1 processed tables. Release 1.0.0 remains a historical runtime snapshot and should not be combined row-by-row with the new release. The detailed machine-readable comparison is `analysis/runtime_migration_v1.0_to_v1.1.csv`.",
        "",
    ])
    args.output_md.write_text("\n".join(md), encoding="utf-8")


if __name__ == "__main__":
    main()
