#!/usr/bin/env python3
"""Shared experiment definitions and lightweight SUMO-output parsers."""

from __future__ import annotations

import csv
import gzip
import math
import statistics
import xml.etree.ElementTree as ET
from collections import OrderedDict, defaultdict
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
ANALYSIS = ROOT / "analysis"

CANONICAL_SEED = 42
DEFAULT_SEEDS = (42, 43, 44, 45, 46)

SCENARIOS = OrderedDict(
    [
        ("current", {"folder": "current", "design": "current", "response_pct": 0}),
        ("A_OBS", {"folder": "A_OBS", "design": "A", "response_pct": 0}),
        ("A_DR15", {"folder": "A_DR15", "design": "A", "response_pct": 15}),
        ("A_DR30", {"folder": "A_DR30", "design": "A", "response_pct": 30}),
        ("B_OBS", {"folder": "B_OBS", "design": "B", "response_pct": 0}),
        ("B_DR15", {"folder": "B_DR15", "design": "B", "response_pct": 15}),
        ("B_DR30", {"folder": "B_DR30", "design": "B", "response_pct": 30}),
        ("C_OBS", {"folder": "C_OBS", "design": "C", "response_pct": 0}),
        ("C_DR15", {"folder": "C_DR15", "design": "C", "response_pct": 15}),
        ("C_DR30", {"folder": "C_DR30", "design": "C", "response_pct": 30}),
        ("C1_X0", {"folder": "C1_X0", "design": "C", "response_pct": 0, "crossing_pct": 0, "c1_network": True}),
        ("C1_L25", {"folder": "C1_L25", "design": "C", "response_pct": 0, "crossing_pct": 25, "c1_network": True}),
        ("C1_M50", {"folder": "C1_M50", "design": "C", "response_pct": 0, "crossing_pct": 50, "c1_network": True}),
        ("C1_H75", {"folder": "C1_H75", "design": "C", "response_pct": 0, "crossing_pct": 75, "c1_network": True}),
        ("OW_FULL_OBS", {"folder": "OW_FULL_OBS", "design": "OW_FULL", "response_pct": 0}),
        ("OW_FULL_DR15", {"folder": "OW_FULL_DR15", "design": "OW_FULL", "response_pct": 15}),
        ("OW_FULL_DR30", {"folder": "OW_FULL_DR30", "design": "OW_FULL", "response_pct": 30}),
        ("OW_REDUCED_OBS", {"folder": "OW_REDUCED_OBS", "design": "OW_REDUCED", "response_pct": 0}),
        ("OW_REDUCED_DR15", {"folder": "OW_REDUCED_DR15", "design": "OW_REDUCED", "response_pct": 15}),
        ("OW_REDUCED_DR30", {"folder": "OW_REDUCED_DR30", "design": "OW_REDUCED", "response_pct": 30}),
    ]
)

OBSERVED_SENSOR_TOTALS = OrderedDict(
    [("pedestrian", 1528), ("two_wheeler", 965), ("car", 7597), ("large", 803)]
)
OBSERVED_SPEED_OVER_36_PCT = 37.0
CALIBRATED_SPEED_FACTOR = "normc(1.372,0.20,0.75,2.00)"

# Supplied 2025-10-01 sensor profile, 96 consecutive 15-minute bins.
OBSERVED_LARGE_15MIN = (
    (0,) * 30
    + (6, 13, 18, 18, 18, 18, 16, 13, 16, 21, 23, 20, 25, 22, 24, 22,
       24, 9, 26, 9, 19, 15, 16, 16, 12, 20, 23, 17, 26, 12, 14, 21,
       27, 30, 26, 19, 15, 12, 9, 20, 17, 11, 7, 11, 9, 10, 4, 4)
    + (0,) * 18
)

STATBEL_2025 = OrderedDict(
    [
        ("petrol", 3_136_259),
        ("diesel", 1_699_797),
        ("hybrid", 846_354),
        ("electric", 395_188),
        ("gas", 24_869),
        ("other", 33_567),
    ]
)

FUEL_VTYPE = {
    "petrol": "veh_passenger_petrol_be2025",
    "diesel": "veh_passenger_diesel_be2025",
    "hybrid": "veh_passenger_hybrid_be2025",
    "electric": "veh_passenger_electric_be2025",
    "gas": "veh_passenger_gas_be2025",
    "other": "veh_passenger_other_be2025",
}


def scenario_dir(scenario: str) -> Path:
    return ROOT / SCENARIOS[scenario]["folder"]


def config_path(scenario: str) -> Path:
    return scenario_dir(scenario) / f"run.{scenario}.sumocfg"


def output_paths(scenario: str, prefix: str = "") -> dict[str, Path]:
    folder = scenario_dir(scenario)
    return {
        "tripinfo": folder / f"{prefix}tripinfos.{scenario}.xml",
        "personinfo": folder / f"{prefix}personinfos.{scenario}.xml",
        "stopinfo": folder / f"{prefix}stopinfos.{scenario}.xml",
        "stats": folder / f"{prefix}stats.{scenario}.xml",
        "edge": folder / f"{prefix}edgeData.{scenario}.xml",
        "e1": folder / f"{prefix}school_e1.{scenario}.xml",
        "fcd": folder / f"{prefix}fcd.school.{scenario}.xml.gz",
        "ssm": folder / f"{prefix}ssm.school.{scenario}.xml.gz",
        "collisions": folder / f"{prefix}collisions.{scenario}.xml",
    }


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def xml_input(path: Path):
    return gzip.open(path, "rb") if path.suffix == ".gz" else path.open("rb")


def safe_float(value: str | None, default: float = 0.0) -> float:
    try:
        return float(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def vehicle_category(vtype: str) -> str:
    value = (vtype or "").lower()
    if "bicycle" in value or value.startswith("bike_"):
        return "bicycle"
    if "motorcycle" in value:
        return "motorcycle"
    if "truck" in value:
        return "truck"
    if "bus" in value or value.startswith("pt_"):
        return "bus"
    if "passenger" in value:
        return "passenger"
    return "other"


def largest_remainder_counts(total: int) -> OrderedDict[str, int]:
    stock_total = sum(STATBEL_2025.values())
    exact = {fuel: total * count / stock_total for fuel, count in STATBEL_2025.items()}
    result = OrderedDict((fuel, math.floor(value)) for fuel, value in exact.items())
    remaining = total - sum(result.values())
    order = sorted(STATBEL_2025, key=lambda fuel: (exact[fuel] - result[fuel]), reverse=True)
    for fuel in order[:remaining]:
        result[fuel] += 1
    return result


def percentile(values: Iterable[float], probability: float) -> float | None:
    ordered = sorted(values)
    if not ordered:
        return None
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * probability
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def parse_tripinfo(path: Path) -> tuple[dict[str, float | int], dict[str, str]]:
    totals = defaultdict(float)
    category_totals: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    category_counts = defaultdict(int)
    vehicle_types: dict[str, str] = {}
    individual_speeds: list[float] = []

    with xml_input(path) as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if local_name(elem.tag) != "tripinfo":
                continue
            totals["vehicles"] += 1
            duration = safe_float(elem.get("duration"))
            length = safe_float(elem.get("routeLength"))
            totals["duration_s"] += duration
            totals["distance_m"] += length
            totals["waiting_s"] += safe_float(elem.get("waitingTime"))
            totals["waiting_count"] += safe_float(elem.get("waitingCount"))
            totals["time_loss_s"] += safe_float(elem.get("timeLoss"))
            totals["depart_delay_s"] += safe_float(elem.get("departDelay"))
            if duration > 0:
                individual_speeds.append(length / duration * 3.6)

            vtype = elem.get("vType") or elem.get("vtype") or ""
            vehicle_types[elem.get("id", "")] = vtype
            category = vehicle_category(vtype)
            category_counts[category] += 1
            category_totals[category]["duration_s"] += duration
            category_totals[category]["waiting_s"] += safe_float(elem.get("waitingTime"))
            category_totals[category]["time_loss_s"] += safe_float(elem.get("timeLoss"))
            category_totals[category]["depart_delay_s"] += safe_float(elem.get("departDelay"))
            category_totals[category]["stops"] += safe_float(elem.get("waitingCount"))

            for child in elem:
                if local_name(child.tag) != "emissions":
                    continue
                for pollutant in ("CO", "CO2", "HC", "PMx", "NOx", "fuel"):
                    totals[f"{pollutant}_mg"] += safe_float(child.get(f"{pollutant}_abs"))
                totals["electricity_Wh"] += safe_float(child.get("electricity_abs"))
            elem.clear()

    n = int(totals["vehicles"])
    distance_km = totals["distance_m"] / 1000
    metrics: dict[str, float | int] = {
        "vehicles_arrived": n,
        "vkt_km": distance_km,
        "mean_trip_speed_kmh": statistics.fmean(individual_speeds) if individual_speeds else 0.0,
        "space_time_speed_kmh": (
            totals["distance_m"] / totals["duration_s"] * 3.6 if totals["duration_s"] else 0.0
        ),
        "mean_duration_min": totals["duration_s"] / n / 60 if n else 0.0,
        "mean_waiting_s": totals["waiting_s"] / n if n else 0.0,
        "mean_stops": totals["waiting_count"] / n if n else 0.0,
        "mean_time_loss_s": totals["time_loss_s"] / n if n else 0.0,
        "mean_depart_delay_s": totals["depart_delay_s"] / n if n else 0.0,
        "CO2_kg": totals["CO2_mg"] / 1_000_000,
        "CO_kg": totals["CO_mg"] / 1_000_000,
        "HC_kg": totals["HC_mg"] / 1_000_000,
        "PMx_kg": totals["PMx_mg"] / 1_000_000,
        "NOx_kg": totals["NOx_mg"] / 1_000_000,
        "fuel_kg": totals["fuel_mg"] / 1_000_000,
        "electricity_kWh": totals["electricity_Wh"] / 1000,
        "CO2_g_per_vkm": totals["CO2_mg"] / totals["distance_m"] if totals["distance_m"] else 0.0,
    }
    for category in ("passenger", "truck", "bus", "bicycle", "motorcycle", "other"):
        count = category_counts[category]
        metrics[f"n_{category}"] = count
        if category in {"bus", "passenger", "truck", "motorcycle", "bicycle"}:
            metrics[f"{category}_mean_duration_s"] = category_totals[category]["duration_s"] / count if count else 0.0
            metrics[f"{category}_mean_waiting_s"] = category_totals[category]["waiting_s"] / count if count else 0.0
            metrics[f"{category}_mean_time_loss_s"] = category_totals[category]["time_loss_s"] / count if count else 0.0
            metrics[f"{category}_mean_depart_delay_s"] = category_totals[category]["depart_delay_s"] / count if count else 0.0
            metrics[f"{category}_mean_stops"] = category_totals[category]["stops"] / count if count else 0.0
    return metrics, vehicle_types


def parse_personinfo(path: Path, crossing_ids: set[str]) -> dict[str, float | int]:
    totals: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    with xml_input(path) as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if local_name(elem.tag) != "personinfo":
                continue
            group = "crossing" if elem.get("id", "") in crossing_ids else "frontage"
            totals[group]["count"] += 1
            totals[group]["duration_s"] += safe_float(elem.get("duration"))
            totals[group]["waiting_s"] += safe_float(elem.get("waitingTime"))
            totals[group]["time_loss_s"] += safe_float(elem.get("timeLoss"))
            totals[group]["waited"] += safe_float(elem.get("waitingTime")) > 0
            elem.clear()

    result: dict[str, float | int] = {}
    for group in ("crossing", "frontage"):
        count = int(totals[group]["count"])
        result[f"pedestrian_{group}_arrived"] = count
        result[f"pedestrian_{group}_mean_duration_s"] = totals[group]["duration_s"] / count if count else 0.0
        result[f"pedestrian_{group}_mean_waiting_s"] = totals[group]["waiting_s"] / count if count else 0.0
        result[f"pedestrian_{group}_mean_time_loss_s"] = totals[group]["time_loss_s"] / count if count else 0.0
        result[f"pedestrian_{group}_waited_pct"] = 100 * totals[group]["waited"] / count if count else 0.0
    return result


def parse_stats(path: Path) -> dict[str, float | int]:
    root = ET.parse(path).getroot()
    metrics: dict[str, float | int] = {}
    for elem in root:
        tag = local_name(elem.tag)
        if tag == "vehicles":
            metrics.update({f"vehicles_{key}": int(float(value)) for key, value in elem.attrib.items()})
        elif tag == "teleports":
            metrics.update({f"teleports_{key}": int(float(value)) for key, value in elem.attrib.items()})
        elif tag == "safety":
            metrics.update({f"safety_{key}": int(float(value)) for key, value in elem.attrib.items()})
        elif tag == "persons":
            metrics.update({f"persons_{key}": int(float(value)) for key, value in elem.attrib.items()})
        elif tag == "personTeleports":
            metrics.update({f"person_teleports_{key}": int(float(value)) for key, value in elem.attrib.items()})
    return metrics


def parse_e1(path: Path) -> dict[str, float | int]:
    counts = defaultdict(int)
    speed_weighted = defaultdict(float)
    with xml_input(path) as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if local_name(elem.tag) != "interval":
                continue
            detector_id = elem.get("id", "")
            count = int(float(elem.get("nVehContrib", "0")))
            speed = safe_float(elem.get("speed"), -1.0)
            if detector_id.startswith("school_car_"):
                mode = "car"
            elif detector_id.startswith("school_large_"):
                mode = "large"
            elif detector_id.startswith("school_bicycle_"):
                mode = "bicycle"
            elif detector_id.startswith("school_motorcycle_"):
                mode = "motorcycle"
            elif detector_id.startswith("school_bike_"):
                mode = "two_wheeler_combined"
            else:
                elem.clear()
                continue
            direction = "pos" if detector_id.endswith("_pos") else "neg"
            counts[(mode, direction)] += count
            if count and speed >= 0:
                speed_weighted[(mode, direction)] += count * speed * 3.6
            elem.clear()

    result: dict[str, float | int] = {}
    for mode in ("car", "large", "bicycle", "motorcycle", "two_wheeler_combined"):
        total = 0
        weighted = 0.0
        for direction in ("pos", "neg"):
            count = counts[(mode, direction)]
            result[f"frontage_{mode}_{direction}_count"] = count
            total += count
            weighted += speed_weighted[(mode, direction)]
        result[f"frontage_{mode}_count"] = total
        result[f"frontage_{mode}_mean_speed_kmh"] = weighted / total if total else 0.0

    motor_count = sum(int(result[f"frontage_{mode}_count"]) for mode in ("car", "large", "motorcycle"))
    motor_weighted = sum(
        float(result[f"frontage_{mode}_mean_speed_kmh"]) * int(result[f"frontage_{mode}_count"])
        for mode in ("car", "large", "motorcycle")
    )
    result["frontage_motorized_count"] = motor_count
    result["frontage_motorized_mean_speed_kmh"] = motor_weighted / motor_count if motor_count else 0.0
    return result


def parse_fcd(path: Path, loop_path: Path) -> dict[str, float | int]:
    samples: dict[tuple[str, int], list[float]] = defaultdict(list)
    types: dict[tuple[str, int], str] = {}
    last_time: dict[str, float] = {}
    episode: dict[str, int] = defaultdict(lambda: -1)
    current_time = 0.0
    with xml_input(path) as handle:
        for event, elem in ET.iterparse(handle, events=("start", "end")):
            name = local_name(elem.tag)
            if event == "start" and name == "timestep":
                current_time = safe_float(elem.get("time"))
            elif event == "end" and name == "vehicle":
                vehicle_id = elem.get("id", "")
                if vehicle_id not in last_time or current_time - last_time[vehicle_id] > 1.5:
                    episode[vehicle_id] += 1
                key = (vehicle_id, episode[vehicle_id])
                samples[key].append(safe_float(elem.get("speed")) * 3.6)
                types[key] = elem.get("type", "")
                last_time[vehicle_id] = current_time
                elem.clear()

    passage_speed = {key: statistics.fmean(values) for key, values in samples.items() if values}
    by_category: dict[str, list[float]] = defaultdict(list)
    for key, speed in passage_speed.items():
        by_category[vehicle_category(types.get(key, ""))].append(speed)

    motorized = []
    motorized_keys = []
    for category in ("passenger", "truck", "bus", "motorcycle"):
        motorized.extend(by_category[category])
        motorized_keys.extend(key for key in samples if vehicle_category(types.get(key, "")) == category)
    bicycle_keys = [key for key in samples if vehicle_category(types.get(key, "")) == "bicycle"]

    def approach_diagnostics(keys: list[tuple[str, int]]) -> tuple[int, int, int]:
        slow = 0
        stopped = 0
        hard_braking = 0
        for key in keys:
            values = samples.get(key, [])
            if not values:
                continue
            slow += min(values) <= 3.6
            stopped += min(values) <= 0.36
            hard_braking += any((before - after) / 3.6 >= 2.5 for before, after in zip(values, values[1:]))
        return slow, stopped, hard_braking

    motor_slow, motor_stop, motor_brake = approach_diagnostics(motorized_keys)
    bike_slow, bike_stop, bike_brake = approach_diagnostics(bicycle_keys)
    result: dict[str, float | int] = {
        "frontage_fcd_motorized_passages": len(motorized),
        "frontage_fcd_motorized_mean_speed_kmh": statistics.fmean(motorized) if motorized else 0.0,
        "frontage_fcd_motorized_p50_speed_kmh": percentile(motorized, 0.50) or 0.0,
        "frontage_fcd_motorized_p85_speed_kmh": percentile(motorized, 0.85) or 0.0,
        "frontage_fcd_motorized_over_20_pct": (
            100 * sum(value > 20 for value in motorized) / len(motorized) if motorized else 0.0
        ),
        "frontage_fcd_motorized_over_30_pct": (
            100 * sum(value > 30 for value in motorized) / len(motorized) if motorized else 0.0
        ),
        "frontage_fcd_motorized_over_36_pct": (
            100 * sum(value > 36 for value in motorized) / len(motorized) if motorized else 0.0
        ),
        "frontage_fcd_motorized_approach_slow_passages": motor_slow,
        "frontage_fcd_motorized_approach_stop_passages": motor_stop,
        "frontage_fcd_motorized_approach_hard_braking_passages": motor_brake,
        "frontage_fcd_motorized_approach_slow_pct": 100 * motor_slow / len(motorized_keys) if motorized_keys else 0.0,
        "frontage_fcd_bicycle_approach_slow_passages": bike_slow,
        "frontage_fcd_bicycle_approach_stop_passages": bike_stop,
        "frontage_fcd_bicycle_approach_hard_braking_passages": bike_brake,
    }
    for category in ("passenger", "truck", "bus", "motorcycle", "bicycle"):
        values = by_category[category]
        result[f"frontage_fcd_{category}_passages"] = len(values)
        result[f"frontage_fcd_{category}_mean_speed_kmh"] = statistics.fmean(values) if values else 0.0

    detector_positions = {}
    for detector in ET.parse(loop_path).getroot().findall("inductionLoop"):
        detector_id = detector.get("id", "")
        if detector_id.startswith(("school_car_", "school_large_", "school_motorcycle_")):
            detector_positions[detector.get("lane", "")] = safe_float(detector.get("pos"))
    nearest: dict[tuple[str, int], tuple[float, float, str]] = {}
    last_time.clear()
    episode.clear()
    with xml_input(path) as handle:
        for event, elem in ET.iterparse(handle, events=("start", "end")):
            name = local_name(elem.tag)
            if event == "start" and name == "timestep":
                current_time = safe_float(elem.get("time"))
            elif event == "end" and name == "vehicle":
                vehicle_id = elem.get("id", "")
                if vehicle_id not in last_time or current_time - last_time[vehicle_id] > 1.5:
                    episode[vehicle_id] += 1
                key = (vehicle_id, episode[vehicle_id])
                lane = elem.get("lane", "")
                if lane in detector_positions:
                    distance = abs(safe_float(elem.get("pos")) - detector_positions[lane])
                    candidate = (distance, safe_float(elem.get("speed")) * 3.6, elem.get("type", ""))
                    if key not in nearest or candidate[0] < nearest[key][0]:
                        nearest[key] = candidate
                last_time[vehicle_id] = current_time
                elem.clear()
    spot_by_category: dict[str, list[float]] = defaultdict(list)
    for _, speed, vtype in nearest.values():
        spot_by_category[vehicle_category(vtype)].append(speed)
    spot_motorized = []
    for category in ("passenger", "truck", "bus", "motorcycle"):
        spot_motorized.extend(spot_by_category[category])
    result.update(
        {
            "frontage_spot_motorized_passages": len(spot_motorized),
            "frontage_spot_motorized_mean_speed_kmh": statistics.fmean(spot_motorized) if spot_motorized else 0.0,
            "frontage_spot_motorized_p50_speed_kmh": percentile(spot_motorized, 0.50) or 0.0,
            "frontage_spot_motorized_p85_speed_kmh": percentile(spot_motorized, 0.85) or 0.0,
            "frontage_spot_motorized_over_30_pct": 100 * sum(v > 30 for v in spot_motorized) / len(spot_motorized) if spot_motorized else 0.0,
            "frontage_spot_motorized_over_36_pct": 100 * sum(v > 36 for v in spot_motorized) / len(spot_motorized) if spot_motorized else 0.0,
        }
    )
    return result


def parse_ssm(path: Path, vehicle_types: dict[str, str]) -> dict[str, float | int]:
    raw: list[dict[str, object]] = []
    with xml_input(path) as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if local_name(elem.tag) != "conflict":
                continue
            record: dict[str, object] = {
                "begin": safe_float(elem.get("begin")),
                "end": safe_float(elem.get("end")),
                "ego": elem.get("ego", ""),
                "foe": elem.get("foe", ""),
                "ttc": None,
                "pet": None,
            }
            for child in elem:
                name = local_name(child.tag)
                if name == "minTTC":
                    record["ttc"] = safe_float(child.get("value"), math.inf)
                elif name == "PET":
                    record["pet"] = safe_float(child.get("value"), math.inf)
            raw.append(record)
            elem.clear()

    grouped: dict[tuple[str, str], list[dict[str, object]]] = defaultdict(list)
    for record in raw:
        pair = tuple(sorted((str(record["ego"]), str(record["foe"]))))
        grouped[pair].append(record)

    encounters: list[dict[str, object]] = []
    for pair, records in grouped.items():
        for record in sorted(records, key=lambda item: float(item["begin"])):
            if encounters and encounters[-1].get("pair") == pair and float(record["begin"]) <= float(encounters[-1]["end"]) + 0.5:
                encounters[-1]["end"] = max(float(encounters[-1]["end"]), float(record["end"]))
                for metric in ("ttc", "pet"):
                    values = [value for value in (encounters[-1].get(metric), record.get(metric)) if value is not None]
                    encounters[-1][metric] = min(values) if values else None
            else:
                encounters.append({**record, "pair": pair})

    def vulnerable_pair(record: dict[str, object]) -> bool:
        ego_category = vehicle_category(vehicle_types.get(str(record["ego"]), ""))
        foe_category = vehicle_category(vehicle_types.get(str(record["foe"]), ""))
        vulnerable = {"bicycle", "motorcycle"}
        motor = {"passenger", "truck", "bus", "motorcycle"}
        return (ego_category in vulnerable and foe_category in motor) or (
            foe_category in vulnerable and ego_category in motor
        )

    ttc_values = [float(item["ttc"]) for item in encounters if item.get("ttc") is not None]
    pet_values = [float(item["pet"]) for item in encounters if item.get("pet") is not None]
    return {
        "ssm_raw_records": len(raw),
        "ssm_deduplicated_encounters": len(encounters),
        "ssm_vulnerable_mode_encounters": sum(vulnerable_pair(item) for item in encounters),
        "ssm_ttc_under_3_count": sum(value < 3.0 for value in ttc_values),
        "ssm_ttc_under_1_5_count": sum(value < 1.5 for value in ttc_values),
        "ssm_min_ttc_s": min(ttc_values) if ttc_values else 0.0,
        "ssm_pet_under_2_count": sum(value < 2.0 for value in pet_values),
        "ssm_pet_under_1_5_count": sum(value < 1.5 for value in pet_values),
        "ssm_min_pet_s": min(pet_values) if pet_values else 0.0,
    }


def parse_collisions(path: Path) -> dict[str, int]:
    total = 0
    intermodal = 0
    school_zone = 0
    intermodal_by_road_user = defaultdict(int)
    school_tokens = ("33128974#0", "2509183527", "5267905913", "scenarioC_school_frontage_mid")
    with xml_input(path) as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if local_name(elem.tag) != "collision":
                continue
            total += 1
            collider_type = elem.get("colliderType", "").lower()
            victim_type = elem.get("victimType", "").lower()
            if "ped" in collider_type or "ped" in victim_type:
                intermodal += 1
                road_user_type = victim_type if "ped" in collider_type else collider_type
                intermodal_by_road_user[vehicle_category(road_user_type)] += 1
            lane = elem.get("lane", "")
            if any(token in lane for token in school_tokens):
                school_zone += 1
            elem.clear()
    return {
        "collision_output_total": total,
        "collision_output_intermodal": intermodal,
        "collision_output_school_zone": school_zone,
        "collision_output_intermodal_passenger": intermodal_by_road_user["passenger"],
        "collision_output_intermodal_truck": intermodal_by_road_user["truck"],
        "collision_output_intermodal_bus": intermodal_by_road_user["bus"],
        "collision_output_intermodal_motorcycle": intermodal_by_road_user["motorcycle"],
        "collision_output_intermodal_bicycle": intermodal_by_road_user["bicycle"],
    }


def crossing_person_ids(scenario: str) -> set[str]:
    result: set[str] = set()
    root = ET.parse(config_path(scenario)).getroot()
    value = root.find("input/route-files").get("value", "")
    for name in [item.strip() for item in value.replace("\n", " ").split(",") if item.strip()]:
        path = scenario_dir(scenario) / name
        try:
            route_root = ET.parse(path).getroot()
        except ET.ParseError:
            continue
        for person in route_root.findall("person"):
            if any("scenarioC_school_frontage_mid_n_link" in walk.get("edges", "") for walk in person.findall("walk")):
                result.add(person.get("id", ""))
    return result


def detector_file(scenario: str) -> Path:
    matches = []
    root = ET.parse(config_path(scenario)).getroot()
    additional = root.find("input/additional-files")
    names = [] if additional is None else [
        item.strip() for item in additional.get("value", "").replace("\n", " ").split(",") if item.strip()
    ]
    for name in names:
        path = scenario_dir(scenario) / name
        try:
            if ET.parse(path).getroot().find("inductionLoop") is not None:
                matches.append(path)
        except ET.ParseError:
            continue
    if len(matches) != 1:
        raise ValueError(f"Expected one detector file for {scenario}; found {matches}")
    return matches[0]


def collect_scenario_metrics(
    scenario: str,
    prefix: str = "",
    include_fcd: bool = True,
    include_safety_files: bool = True,
) -> dict[str, object]:
    paths = output_paths(scenario, prefix)
    trip_metrics, vehicle_types = parse_tripinfo(paths["tripinfo"])
    metrics: dict[str, object] = {"scenario": scenario}
    metrics.update(trip_metrics)
    metrics.update(parse_stats(paths["stats"]))
    if paths["personinfo"].exists():
        metrics.update(parse_personinfo(paths["personinfo"], crossing_person_ids(scenario)))
    if paths["e1"].exists():
        metrics.update(parse_e1(paths["e1"]))
    if include_fcd and paths["fcd"].exists():
        metrics.update(parse_fcd(paths["fcd"], detector_file(scenario)))
    if include_safety_files and paths["ssm"].exists():
        metrics.update(parse_ssm(paths["ssm"], vehicle_types))
    if paths["collisions"].exists():
        metrics.update(parse_collisions(paths["collisions"]))
    encounters = safe_float(str(metrics.get("ssm_deduplicated_encounters", 0)))
    passes = safe_float(str(metrics.get("frontage_fcd_motorized_passages", 0)))
    if passes:
        metrics["ssm_encounters_per_1000_motorized_passages"] = encounters / passes * 1000
    return metrics


def write_csv(path: Path, rows: list[dict[str, object]], fieldnames: list[str] | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if fieldnames is None:
        fieldnames = []
        seen = set()
        for row in rows:
            for key in row:
                if key not in seen:
                    fieldnames.append(key)
                    seen.add(key)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
