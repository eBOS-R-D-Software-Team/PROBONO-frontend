#!/usr/bin/env python3
"""Create failure-aware tables and a concise technical interpretation."""

from __future__ import annotations

import csv
import statistics
from collections import defaultdict

from common import ANALYSIS, OBSERVED_SENSOR_TOTALS, OBSERVED_SPEED_OVER_36_PCT, SCENARIOS, write_csv


def number(row: dict[str, str], key: str) -> float:
    try:
        return float(row.get(key, ""))
    except ValueError:
        return 0.0


def read_rows() -> list[dict[str, str]]:
    with (ANALYSIS / "replicate_kpis.csv").open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def read_named_csv(name: str) -> list[dict[str, str]]:
    with (ANALYSIS / name).open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def completion_valid(row: dict[str, str]) -> bool:
    return (
        int(number(row, "vehicles_loaded")) == int(number(row, "vehicles_arrived"))
        and int(number(row, "vehicles_waiting")) == 0
        and int(number(row, "vehicles_running")) == 0
        and int(number(row, "persons_loaded"))
        == int(number(row, "pedestrian_crossing_arrived") + number(row, "pedestrian_frontage_arrived"))
        and int(number(row, "persons_running")) == 0
    )


def mean_sd(rows: list[dict[str, str]], key: str) -> tuple[float, float]:
    values = [number(row, key) for row in rows]
    return statistics.fmean(values), statistics.stdev(values) if len(values) > 1 else 0.0


def summarize(rows: list[dict[str, str]]) -> list[dict[str, object]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[row["scenario"]].append(row)
    result = []
    metrics = (
        "vehicles_arrived", "frontage_spot_motorized_passages",
        "frontage_spot_motorized_mean_speed_kmh", "frontage_spot_motorized_over_36_pct",
        "frontage_car_pos_count", "frontage_car_neg_count",
        "frontage_large_pos_count", "frontage_large_neg_count",
        "frontage_motorcycle_pos_count", "frontage_motorcycle_neg_count",
        "frontage_bicycle_pos_count", "frontage_bicycle_neg_count",
        "frontage_fcd_bus_passages",
        "CO2_kg", "CO2_g_per_vkm", "vkt_km", "mean_time_loss_s",
        "pedestrian_crossing_arrived", "pedestrian_crossing_mean_waiting_s",
        "pedestrian_crossing_waited_pct", "frontage_fcd_motorized_approach_slow_pct",
        "frontage_fcd_motorized_approach_hard_braking_passages", "bus_mean_time_loss_s",
        "collision_output_total", "collision_output_intermodal", "collision_output_intermodal_bicycle",
    )
    for scenario in SCENARIOS:
        all_rows = grouped[scenario]
        valid = [row for row in all_rows if completion_valid(row)]
        record: dict[str, object] = {
            "scenario": scenario,
            "replicates": len(all_rows),
            "completion_valid_replicates": len(valid),
            "completion_failed_replicates": len(all_rows) - len(valid),
            "interpretation_status": "stable" if len(valid) == len(all_rows) else "unstable; valid-run means only",
            "teleports_mean_all": statistics.fmean(number(row, "teleports_total") for row in all_rows),
            "teleports_max_all": max(int(number(row, "teleports_total")) for row in all_rows),
        }
        for metric in metrics:
            mean, sd = mean_sd(valid, metric) if valid else (0.0, 0.0)
            record[f"{metric}_mean_valid"] = mean
            record[f"{metric}_sd_valid"] = sd
        result.append(record)
    return result


def comparison_rows(summary: list[dict[str, object]]) -> list[dict[str, object]]:
    by = {row["scenario"]: row for row in summary}
    pairs = [
        ("A_OBS", "current", "Scenario A quantifiable component at observed demand"),
        ("B_OBS", "current", "Scenario B design at observed demand"),
        ("C_OBS", "current", "Scenario C design at observed demand"),
        ("C1_X0", "C_OBS", "C1 rebuilt-network zero-crossing control versus C0"),
        ("C1_L25", "C1_X0", "C1 low crossing interaction versus identical-network control"),
        ("C1_M50", "C1_X0", "C1 central crossing interaction versus identical-network control"),
        ("C1_H75", "C1_X0", "C1 high crossing interaction versus identical-network control"),
        ("A_DR15", "current", "A plus 15% demand response versus current"),
        ("B_DR15", "current", "B plus 15% demand response versus current"),
        ("C_DR15", "current", "C plus 15% demand response versus current"),
        ("A_DR30", "current", "A plus 30% demand response versus current"),
        ("B_DR30", "current", "B plus 30% demand response versus current"),
        ("C_DR30", "current", "C plus 30% demand response versus current"),
        ("B_DR15", "A_DR15", "B versus A at matched 15% response"),
        ("C_DR15", "A_DR15", "C versus A at matched 15% response"),
        ("B_DR30", "A_DR30", "B versus A at matched 30% response"),
        ("C_DR30", "A_DR30", "C versus A at matched 30% response"),
    ]
    metrics = (
        "frontage_spot_motorized_passages",
        "frontage_spot_motorized_mean_speed_kmh",
        "frontage_spot_motorized_over_36_pct",
        "CO2_kg", "CO2_g_per_vkm", "vkt_km",
    )
    result = []
    for candidate, reference, label in pairs:
        for metric in metrics:
            key = f"{metric}_mean_valid"
            a = float(by[candidate][key])
            b = float(by[reference][key])
            result.append(
                {
                    "comparison": label,
                    "candidate": candidate,
                    "reference": reference,
                    "metric": metric,
                    "candidate_valid_mean": a,
                    "reference_valid_mean": b,
                    "absolute_change": a - b,
                    "percent_change": 100 * (a - b) / b if b else "",
                    "candidate_status": by[candidate]["interpretation_status"],
                }
            )
    return result


def calibration_rows(rows: list[dict[str, str]]) -> list[dict[str, object]]:
    current = [row for row in rows if row["scenario"] == "current"]
    canonical = next(row for row in current if row.get("seed") == "42")
    speed_values = [number(row, "frontage_spot_motorized_over_36_pct") for row in current]
    return [
        {"target": "car count", "observed": OBSERVED_SENSOR_TOTALS["car"], "simulated": number(canonical, "frontage_car_count"), "error_pct": 100 * (number(canonical, "frontage_car_count") / OBSERVED_SENSOR_TOTALS["car"] - 1), "status": "canonical detector total"},
        {"target": "large-vehicle count", "observed": OBSERVED_SENSOR_TOTALS["large"], "simulated": number(canonical, "frontage_large_count"), "error_pct": 100 * (number(canonical, "frontage_large_count") / OBSERVED_SENSOR_TOTALS["large"] - 1), "status": "canonical detector total"},
        {"target": "two-wheeler count", "observed": OBSERVED_SENSOR_TOTALS["two_wheeler"], "simulated": number(canonical, "frontage_two_wheeler_combined_count"), "error_pct": 100 * (number(canonical, "frontage_two_wheeler_combined_count") / OBSERVED_SENSOR_TOTALS["two_wheeler"] - 1), "status": "canonical detector total; bicycle/motorcycle split assumed"},
        {"target": "pedestrian persons", "observed": OBSERVED_SENSOR_TOTALS["pedestrian"], "simulated": number(canonical, "persons_loaded"), "error_pct": 100 * (number(canonical, "persons_loaded") / OBSERVED_SENSOR_TOTALS["pedestrian"] - 1), "status": "loaded daily total"},
        {"target": "motorized >36 km/h", "observed": OBSERVED_SPEED_OVER_36_PCT, "simulated": statistics.fmean(speed_values), "error_pct": statistics.fmean(speed_values) - OBSERVED_SPEED_OVER_36_PCT, "status": f"five-seed point-speed mean; range {min(speed_values):.2f}-{max(speed_values):.2f}%"},
    ]


def fmt(mean: float, sd: float, digits: int = 1) -> str:
    return f"{mean:.{digits}f} ± {sd:.{digits}f}"


def safety_rows(canonical: list[dict[str, str]]) -> list[dict[str, object]]:
    result = []
    by = {row["scenario"]: row for row in canonical}
    for scenario in SCENARIOS:
        row = by[scenario]
        result.append(
            {
                "scenario": scenario,
                "seed": 42,
                "motorized_passages": number(row, "frontage_spot_motorized_passages"),
                "ssm_encounters": number(row, "ssm_deduplicated_encounters"),
                "ssm_encounters_per_1000_passages": number(row, "ssm_encounters_per_1000_motorized_passages"),
                "ssm_vulnerable_mode_encounters": number(row, "ssm_vulnerable_mode_encounters"),
                "ssm_ttc_under_3_count": number(row, "ssm_ttc_under_3_count"),
                "ssm_pet_under_2_count": number(row, "ssm_pet_under_2_count"),
                "network_collision_diagnostics": number(row, "collision_output_total"),
                "school_zone_collision_diagnostics": number(row, "collision_output_school_zone"),
                "intermodal_collision_diagnostics": number(row, "collision_output_intermodal"),
                "scope": "canonical diagnostics; SSM excludes pedestrians and collision overlap events are not predicted crashes",
            }
        )
    return result


def publication_rows(summary: list[dict[str, object]]) -> list[dict[str, object]]:
    """Create the compact, interpretation-aware table used by public clients."""
    metadata = (
        ("Baseline", "current", "calibrated reference", "yes", "Observed-demand corridor reference"),
        ("Scenario A", "A_OBS", "primary report scenario", "yes", "Bus-stop relocation quantified; visual package qualitative"),
        ("Scenario B", "B_OBS", "primary report scenario", "yes", "Chicane proxy plus relocated stops; no parking-capacity model"),
        ("Scenario C0", "C_OBS", "primary report scenario", "yes", "20 km/h shared-space operational proxy"),
        ("Scenario C1 control", "C1_X0", "supplementary matched control", "no", "Reference only for C1 crossing-share cases"),
        ("Scenario C1 low", "C1_L25", "supplementary sensitivity", "no", "Compare with C1_X0"),
        ("Scenario C1 medium", "C1_M50", "supplementary sensitivity", "no", "Compare with C1_X0"),
        ("Scenario C1 high", "C1_H75", "supplementary sensitivity", "no", "Compare with C1_X0"),
        ("Scenario D", "OW_FULL_OBS", "supplementary corridor experiment", "no", "Use frontage KPIs only; off-network diversion excluded"),
        ("Scenario E", "OW_REDUCED_OBS", "supplementary corridor experiment", "no", "Use frontage KPIs only; off-network diversion excluded"),
    )
    by_scenario = {str(row["scenario"]): row for row in summary}
    result = []
    for public_label, scenario, role, comparable, interpretation in metadata:
        row = by_scenario[scenario]
        result.append({
            "public_label": public_label,
            "technical_case": scenario,
            "evidence_role": role,
            "valid_seeds": row["completion_valid_replicates"],
            "frontage_motorized_passages": round(float(row["frontage_spot_motorized_passages_mean_valid"])),
            "frontage_spot_speed_kmh": f"{float(row['frontage_spot_motorized_mean_speed_kmh_mean_valid']):.2f}",
            "frontage_above_36_pct": f"{float(row['frontage_spot_motorized_over_36_pct_mean_valid']):.2f}",
            "co2_kg": f"{float(row['CO2_kg_mean_valid']):.1f}",
            "route_kpis_comparable_with_current": comparable,
            "interpretation": interpretation,
        })
    return result


def write_summary(
    summary: list[dict[str, object]],
    calibration: list[dict[str, object]],
    safety: list[dict[str, object]],
    fleet_boundary: list[dict[str, str]],
) -> None:
    lines = [
        "# Evidence-aligned technical results (v21.2 / SUMO 1.27.1)", "",
        "Means below use only replicates in which every loaded vehicle completed. Failed replicates are never folded into emissions or performance averages.", "",
        "## Calibration", "",
        "| Target | Observed | Simulated | Error |", "|---|---:|---:|---:|",
    ]
    for row in calibration:
        lines.append(f"| {row['target']} | {float(row['observed']):.2f} | {float(row['simulated']):.2f} | {float(row['error_pct']):+.2f}{' pp' if '>36' in str(row['target']) else '%'} |")
    lines.extend([
        "", "## Five-seed scenario results", "",
        "| Case | Valid seeds | Status | Motorized passages | Spot speed (km/h) | >36 km/h | CO2 (kg) | CO2 (g/VKT) |",
        "|---|---:|---|---:|---:|---:|---:|---:|",
    ])
    for row in summary:
        lines.append(
            f"| {row['scenario']} | {row['completion_valid_replicates']}/{row['replicates']} | {row['interpretation_status']} | "
            f"{fmt(float(row['frontage_spot_motorized_passages_mean_valid']), float(row['frontage_spot_motorized_passages_sd_valid']), 0)} | "
            f"{fmt(float(row['frontage_spot_motorized_mean_speed_kmh_mean_valid']), float(row['frontage_spot_motorized_mean_speed_kmh_sd_valid']), 2)} | "
            f"{fmt(float(row['frontage_spot_motorized_over_36_pct_mean_valid']), float(row['frontage_spot_motorized_over_36_pct_sd_valid']), 2)}% | "
            f"{fmt(float(row['CO2_kg_mean_valid']), float(row['CO2_kg_sd_valid']), 1)} | "
            f"{fmt(float(row['CO2_g_per_vkm_mean_valid']), float(row['CO2_g_per_vkm_sd_valid']), 1)} |"
        )
    by_summary = {str(row["scenario"]): row for row in summary}
    current_passages = float(by_summary["current"]["frontage_spot_motorized_passages_mean_valid"])
    lines.extend([
        "", "## Mobility-expert one-way options", "",
        "These concepts were supplied separately from the road-safety report. All observed vehicle IDs remain loaded. Prohibited westbound private trips exit at the intervention boundary because the clipped OSM-Wizard network has no connected external bypass; off-network travel is not estimated. Consequently, total CO2, VKT and trip-time values for these cases are not comparable with the current-condition totals.", "",
        "| Case | Valid seeds | Cars east/west at frontage | Buses at frontage | Motorized frontage reduction | Spot speed (km/h) | Bus time loss (s) | Collision diagnostics |",
        "|---|---:|---:|---:|---:|---:|---:|---:|",
    ])
    for scenario in ("OW_FULL_OBS", "OW_REDUCED_OBS", "OW_FULL_DR15", "OW_REDUCED_DR15", "OW_FULL_DR30", "OW_REDUCED_DR30"):
        row = by_summary[scenario]
        passages = float(row["frontage_spot_motorized_passages_mean_valid"])
        reduction = 100 * (1 - passages / current_passages) if current_passages else 0.0
        lines.append(
            f"| {scenario} | {row['completion_valid_replicates']}/{row['replicates']} | "
            f"{fmt(float(row['frontage_car_pos_count_mean_valid']), float(row['frontage_car_pos_count_sd_valid']), 0)} / "
            f"{fmt(float(row['frontage_car_neg_count_mean_valid']), float(row['frontage_car_neg_count_sd_valid']), 0)} | "
            f"{fmt(float(row['frontage_fcd_bus_passages_mean_valid']), float(row['frontage_fcd_bus_passages_sd_valid']), 0)} | "
            f"{reduction:.1f}% | "
            f"{fmt(float(row['frontage_spot_motorized_mean_speed_kmh_mean_valid']), float(row['frontage_spot_motorized_mean_speed_kmh_sd_valid']), 2)} | "
            f"{fmt(float(row['bus_mean_time_loss_s_mean_valid']), float(row['bus_mean_time_loss_s_sd_valid']), 2)} | "
            f"{fmt(float(row['collision_output_total_mean_valid']), float(row['collision_output_total_sd_valid']), 1)} |"
        )
    lines.extend([
        "", "The frontage-flow reduction is a deterministic consequence of the declared balanced directional split and access rule, not a forecast of how many real drivers would divert. In both options, eastbound private traffic continues to the slide's right-turn-only instruction at Tervuursesteenweg. OW_REDUCED ends only the westbound private-traffic restriction at Bergagegaarde. The current Bergoje stops and the 107 trip-specific Line 34 calls are retained in both options.",
    ])
    lines.extend([
        "", "## Scenario C pedestrian-interaction sensitivity", "",
        "C1 adds one real SUMO pedestrian-priority crossing at the supplied mid-block foot-link location. `C1_X0` is the identical rebuilt-network control with no pedestrians routed across it. The 25/50/75% shares are nested assumptions applied to the same 1,528 observed pedestrians; they are not observed crossing rates.", "",
        "| Case | Crossing pedestrians | Crossing wait (s) | Crossing pedestrians waiting | Motorized slow approaches | Hard-braking passages | Bus time loss (s) | Intermodal overlap diagnostics |",
        "|---|---:|---:|---:|---:|---:|---:|---:|",
    ])
    for scenario in ("C_OBS", "C1_X0", "C1_L25", "C1_M50", "C1_H75"):
        row = by_summary[scenario]
        lines.append(
            f"| {scenario} | {fmt(float(row['pedestrian_crossing_arrived_mean_valid']), float(row['pedestrian_crossing_arrived_sd_valid']), 0)} | "
            f"{fmt(float(row['pedestrian_crossing_mean_waiting_s_mean_valid']), float(row['pedestrian_crossing_mean_waiting_s_sd_valid']), 2)} | "
            f"{fmt(float(row['pedestrian_crossing_waited_pct_mean_valid']), float(row['pedestrian_crossing_waited_pct_sd_valid']), 1)}% | "
            f"{fmt(float(row['frontage_fcd_motorized_approach_slow_pct_mean_valid']), float(row['frontage_fcd_motorized_approach_slow_pct_sd_valid']), 2)}% | "
            f"{fmt(float(row['frontage_fcd_motorized_approach_hard_braking_passages_mean_valid']), float(row['frontage_fcd_motorized_approach_hard_braking_passages_sd_valid']), 1)} | "
            f"{fmt(float(row['bus_mean_time_loss_s_mean_valid']), float(row['bus_mean_time_loss_s_sd_valid']), 2)} | "
            f"{fmt(float(row['collision_output_intermodal_mean_valid']), float(row['collision_output_intermodal_sd_valid']), 1)} |"
        )
    lines.extend([
        "", "Hard-braking passages are diagnostics with at least one speed loss of 2.5 m/s or more between consecutive 1-s FCD samples. Intermodal overlap diagnostics are SUMO geometry/time-step events under assumed crossing shares. Neither measure is field-calibrated, and overlap events must not be interpreted as observed or predicted crashes.",
    ])
    lines.extend([
        "", "## Canonical safety diagnostics (seed 42 only)", "",
        "These are vehicle-interaction diagnostics, not crash predictions. SUMO SSM does not cover pedestrian conflicts in this setup.", "",
        "| Case | SSM encounters/1,000 motorized passages | Vulnerable-mode encounters | PET <2 s | Network collision diagnostics | Intermodal diagnostics | School-zone diagnostics |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ])
    for row in safety:
        lines.append(
            f"| {row['scenario']} | {float(row['ssm_encounters_per_1000_passages']):.1f} | "
            f"{int(float(row['ssm_vulnerable_mode_encounters']))} | {int(float(row['ssm_pet_under_2_count']))} | "
            f"{int(float(row['network_collision_diagnostics']))} | {int(float(row['intermodal_collision_diagnostics']))} | "
            f"{int(float(row['school_zone_collision_diagnostics']))} |"
        )
    lines.extend([
        "", "## Passenger Euro-stage boundary", "",
        "The cited Statbel table identifies fuel but not Euro stage. The conservative Euro-5 boundary is not a local-fleet estimate; it tests sensitivity to that missing variable.", "",
        "| Case | CO2 change vs newer proxy | NOx change | PMx change |",
        "|---|---:|---:|---:|",
    ])
    for row in fleet_boundary:
        lines.append(
            f"| {row['scenario']} | {float(row['CO2_kg_change_vs_newer_pct']):+.1f}% | "
            f"{float(row['NOx_kg_change_vs_newer_pct']):+.1f}% | {float(row['PMx_kg_change_vs_newer_pct']):+.1f}% |"
        )
    lines.append("")
    lines.append("The scenario CO2 ordering is insensitive to this boundary, but absolute NOx is not: the Euro-5 proxy is roughly five to six times higher. NOx should therefore be treated as an uncertainty result until a local Euro-stage distribution is obtained.")
    lines.extend([
        "", "## What is defensible", "",
        "- `A_OBS` quantifies only the report-supported relocation of both bus stops toward Émile Idiersstraat. Markings, lighting, visibility and school-zone branding remain qualitative because no observed response coefficient was supplied.",
        "- All observed-demand designs complete in all five seeds without jam/yield teleports. The former B/C failures were removed by replacing unsupported network-wide origin-destination and bus-recirculation assumptions with sensor-supported corridor boundary conditions.",
        "- B's chicane and C's 20 km/h shared-space proxy reduce point speeds at the full observed passage profile. These are conditional corridor effects, not forecasts of network-wide diversion or capacity.",
        "- B does not estimate parking-capacity effects: the OSM-wizard baseline contains no parkingArea objects, so the report's six-space clearance is documented but not numerically subtracted from an invented supply.",
        "- `C_OBS` remains the C0 motor-vehicle speed/geometry proxy. `C1_X0` isolates the rebuilt crossing network with zero crossing pedestrians; C1_L25/M50/H75 then add low/central/high crossing shares at full observed demand.",
        "- C1 quantifies conditional pedestrian waiting, vehicle slowing, bus delay and intermodal overlap diagnostics. It does not represent continuous cross-anywhere movement and its overlap events are not crash predictions.",
        "- DR15/DR30 reduce non-transit motorized demand only. They are demand-response sensitivities, not requirements for the designs to function and not measured forecasts.",
        "- The legacy D/E outputs remain excluded. The separately supplied one-way concepts are rebuilt as OW_FULL/OW_REDUCED with exact lane permissions, two-way buses/bicycles, full input-ID retention and explicit intervention-boundary exits for prohibited westbound private traffic.",
        "- One-way frontage-flow and speed results are conditional local-corridor outputs. Total emissions, VKT and trip time exclude the unknown off-network diversion and must not be compared as network-wide benefits.",
        "", "## Remaining evidence limits", "",
        "The sensor calibration is one day and has no direction, origin-destination, turning, pedestrian-trajectory or vehicle-subclass fields. The model therefore uses balanced per-bin unclassified directions, a corridor-boundary passage formulation and explicit pedestrian crossing-share sensitivities rather than a calibrated crossing forecast. Input departure bins and daily detector totals are exact, but route travel time and queues redistribute some simulated detector passages to adjacent 15-minute output bins; see `temporal_calibration_validation.csv`. Buses retain timetable direction, but their 15 October weekday schedule is only a near-date proxy for the 1 October sensor date. The 37% speed target is an aggregate from a different observation period; no observed pedestrian conflicts or yielding compliance series is available; the bicycle/motorcycle split is assumed; national fuel shares proxy local traffic; HBEFA Euro stages are assumptions; and SUMO SSM does not validate pedestrian crash risk.",
    ])
    (ANALYSIS / "technical_results_summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    rows = read_rows()
    canonical = [row for row in rows if row.get("seed") == "42"]
    write_csv(ANALYSIS / "scenario_kpis.csv", canonical)
    summary = summarize(rows)
    write_csv(ANALYSIS / "replicate_summary.csv", summary)
    write_csv(ANALYSIS / "publication_case_summary.csv", publication_rows(summary))
    write_csv(
        ANALYSIS / "scenario_oneway_summary.csv",
        [
            row for row in summary
            if row["scenario"] in {
                "current", "OW_FULL_OBS", "OW_FULL_DR15", "OW_FULL_DR30",
                "OW_REDUCED_OBS", "OW_REDUCED_DR15", "OW_REDUCED_DR30",
            }
        ],
    )
    c1_metrics = (
        "pedestrian_crossing_arrived", "pedestrian_crossing_mean_waiting_s",
        "pedestrian_crossing_waited_pct", "frontage_fcd_motorized_approach_slow_pct",
        "frontage_fcd_motorized_approach_hard_braking_passages", "bus_mean_time_loss_s",
        "collision_output_intermodal", "collision_output_intermodal_bicycle",
    )
    write_csv(
        ANALYSIS / "scenario_C1_interaction_summary.csv",
        [
            {
                "scenario": row["scenario"],
                "completion_valid_replicates": row["completion_valid_replicates"],
                **{
                    f"{metric}_{suffix}": row[f"{metric}_{suffix}_valid"]
                    for metric in c1_metrics
                    for suffix in ("mean", "sd")
                },
            }
            for row in summary
            if row["scenario"] in {"C_OBS", "C1_X0", "C1_L25", "C1_M50", "C1_H75"}
        ],
    )
    write_csv(ANALYSIS / "scenario_comparisons.csv", comparison_rows(summary))
    calibration = calibration_rows(rows)
    write_csv(ANALYSIS / "calibration_validation.csv", calibration)
    safety = safety_rows(canonical)
    write_csv(ANALYSIS / "safety_proxy_summary.csv", safety)
    fleet_all = read_named_csv("fleet_emission_sensitivity.csv") if (ANALYSIS / "fleet_emission_sensitivity.csv").exists() else []
    fleet_boundary = [row for row in fleet_all if row.get("passenger_fleet_boundary") == "conservative_Euro5_proxy"]
    write_summary(summary, calibration, safety, fleet_boundary)
    print("Wrote failure-aware calibration, scenario, replicate and comparison results.")


if __name__ == "__main__":
    main()
