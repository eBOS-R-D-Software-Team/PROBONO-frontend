#!/usr/bin/env python3
"""Validate evidence traceability, factorial consistency, calibration and run integrity."""

from __future__ import annotations

import csv
import gzip
import hashlib
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

from common import (
    ANALYSIS,
    CALIBRATED_SPEED_FACTOR,
    OBSERVED_SENSOR_TOTALS,
    OBSERVED_SPEED_OVER_36_PCT,
    ROOT,
    SCENARIOS,
    STATBEL_2025,
    config_path,
    largest_remainder_counts,
    scenario_dir,
    write_csv,
)
from prepare_experiment import (
    BUS_TIMETABLE,
    BUS_CORRIDOR_ROUTES,
    C1_CROSSING_NODE,
    C1_CROSSING_PATHS,
    CORRIDOR_BOUNDARY_OD,
    ONEWAY_GENERAL_OD,
    ONEWAY_RESTRICTED_EDGES,
    PEDESTRIAN_FRONTAGE_PATHS,
    corridor_variant,
    crossing_share,
    is_c1,
    is_oneway,
    scheduled_bus_counts,
    trip_od,
)


checks: list[dict[str, str]] = []


def add(status: str, check: str, detail: str) -> None:
    checks.append({"status": status, "check": check, "detail": detail})


def split_files(value: str) -> list[str]:
    return [item.strip() for item in value.replace("\n", " ").split(",") if item.strip()]


def route_files(scenario: str) -> list[Path]:
    root = ET.parse(config_path(scenario)).getroot()
    return [scenario_dir(scenario) / name for name in split_files(root.find("input/route-files").get("value", ""))]


def mode_file(scenario: str, mode: str) -> Path:
    matches = []
    for path in route_files(scenario):
        name = path.name.lower()
        if mode == "passenger" and "passenger" in name:
            matches.append(path)
        elif mode == "truck" and "truck" in name:
            matches.append(path)
        elif mode == "bike_moto" and "bike_moto" in name:
            matches.append(path)
        elif mode == "pedestrian" and "pedestrian" in name:
            matches.append(path)
        elif mode == "bus" and "pt" in name:
            matches.append(path)
    if len(matches) != 1:
        raise ValueError(f"{scenario}: {mode} files {matches}")
    return matches[0]


def ids(scenario: str, mode: str, motorcycle_only: bool = False) -> set[str]:
    result = set()
    for elem in ET.parse(mode_file(scenario, mode)).getroot():
        if elem.tag == "trip" and (not motorcycle_only or "motorcycle" in elem.get("type", "").lower()):
            result.add(elem.get("id", ""))
        elif elem.tag == "person" and mode == "pedestrian":
            result.add(elem.get("id", ""))
    return result


def read_csv(name: str) -> list[dict[str, str]]:
    with (ANALYSIS / name).open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def check_configs() -> None:
    for scenario in SCENARIOS:
        path = config_path(scenario)
        if not path.exists():
            add("FAIL", f"{scenario}: configuration", "missing")
            continue
        root = ET.parse(path).getroot()
        seed = root.find("random_number/seed")
        ignore = root.find("processing/ignore-route-errors")
        lateral = root.find("processing/lateral-resolution")
        add("PASS" if seed is not None and seed.get("value") == "42" and ignore is not None and ignore.get("value") == "false" and lateral is not None and lateral.get("value") == "0.8" else "FAIL", f"{scenario}: strict common config", f"seed={seed.get('value') if seed is not None else None}; ignore={ignore.get('value') if ignore is not None else None}; lateral={lateral.get('value') if lateral is not None else None}")
        names = []
        for tag in ("net-file", "route-files", "additional-files"):
            elem = root.find(f"input/{tag}")
            if elem is not None:
                names.extend(split_files(elem.get("value", "")))
        missing = [name for name in names if not (scenario_dir(scenario) / name).exists()]
        add("PASS" if not missing else "FAIL", f"{scenario}: referenced inputs", "all present" if not missing else str(missing))


def check_factorial() -> None:
    add("PASS" if not (ROOT / "scenarioD").exists() and not (ROOT / "scenarioE").exists() else "FAIL", "Legacy D/E implementations excluded", "D/E absent; expert concepts use explicit OW_FULL/OW_REDUCED names")
    for design in ("A", "B", "C", "OW_FULL", "OW_REDUCED"):
        d0, r15, r30 = f"{design}_OBS", f"{design}_DR15", f"{design}_DR30"
        for mode, moto in (("passenger", False), ("truck", False), ("bike_moto", True)):
            sets = [ids(s, mode, moto) for s in (d0, r15, r30)]
            add("PASS" if sets[2] <= sets[1] <= sets[0] else "FAIL", f"{design}: nested {mode} response demand", f"n={len(sets[0])}/{len(sets[1])}/{len(sets[2])}")
        for mode in ("bike_moto", "pedestrian"):
            base = ids(d0, mode) - (ids(d0, mode, True) if mode == "bike_moto" else set())
            stable = True
            for scenario in (r15, r30):
                candidate = ids(scenario, mode) - (ids(scenario, mode, True) if mode == "bike_moto" else set())
                stable &= candidate == base
            add("PASS" if stable else "FAIL", f"{design}: {mode} non-motorized demand held fixed", f"n={len(base)}")
    for mode in ("passenger", "truck", "bike_moto"):
        moto = mode == "bike_moto"
        current_ids = ids("current", mode, moto)
        stable = all(ids(f"{design}_OBS", mode, moto) == current_ids for design in ("A", "B", "C", "OW_FULL", "OW_REDUCED"))
        add("PASS" if stable else "FAIL", f"Full-demand {mode} IDs matched across designs", f"n={len(current_ids)}")
        c1_stable = all(ids(scenario, mode, moto) == current_ids for scenario in ("C1_X0", "C1_L25", "C1_M50", "C1_H75"))
        add("PASS" if c1_stable else "FAIL", f"C1 full-demand {mode} IDs matched current", f"n={len(current_ids)}")
    pedestrian_ids = ids("current", "pedestrian")
    c1_pedestrian_stable = all(ids(scenario, "pedestrian") == pedestrian_ids for scenario in ("C1_X0", "C1_L25", "C1_M50", "C1_H75"))
    add("PASS" if c1_pedestrian_stable else "FAIL", "C1 preserves all observed pedestrian IDs", f"n={len(pedestrian_ids)}")

    selected_sets = []
    expected_counts = []
    for scenario in ("C1_X0", "C1_L25", "C1_M50", "C1_H75"):
        selected = {
            person.get("id", "")
            for person in ET.parse(mode_file(scenario, "pedestrian")).getroot().findall("person")
            if any("scenarioC_school_frontage_mid_n_link" in walk.get("edges", "") for walk in person.findall("walk"))
        }
        selected_sets.append(selected)
        expected_counts.append(round(len(pedestrian_ids) * crossing_share(scenario) / 100))
    nested = selected_sets[0] <= selected_sets[1] <= selected_sets[2] <= selected_sets[3]
    actual_counts = [len(value) for value in selected_sets]
    add("PASS" if nested and actual_counts == expected_counts else "FAIL", "C1 nested pedestrian crossing shares", f"actual={actual_counts}; expected={expected_counts}")


def check_behavior_and_network() -> None:
    calibrated_ids = {
        "veh_passenger_petrol_be2025", "veh_passenger_diesel_be2025",
        "veh_passenger_hybrid_be2025", "veh_passenger_electric_be2025",
        "veh_passenger_gas_be2025", "veh_passenger_other_be2025",
        "truck_truck", "pt_bus", "motorcycle_motorcycle",
    }
    for scenario in SCENARIOS:
        found = 0
        bad = []
        for path in route_files(scenario):
            for elem in ET.parse(path).getroot().findall("vType"):
                if elem.get("id", "") in calibrated_ids:
                    found += 1
                    if elem.get("speedFactor") != CALIBRATED_SPEED_FACTOR or any(key in elem.attrib for key in ("sigma", "tau", "lcAssertive", "jmTimegapMinor")):
                        bad.append((elem.get("id"), dict(elem.attrib)))
        add("PASS" if found and not bad else "FAIL", f"{scenario}: common calibrated motorized behavior", f"types={found}; bad={bad[:2]}")

    for scenario in ("B_OBS", "B_DR15", "B_DR30"):
        root = ET.parse(config_path(scenario)).getroot()
        net = scenario_dir(scenario) / root.find("input/net-file").get("value", "")
        with gzip.open(net, "rb") as handle:
            net_root = ET.parse(handle).getroot()
        speed = {edge.get("id"): edge.find("lane").get("speed") for edge in net_root.findall("edge") if edge.get("id") in {"33128974#0a", "33128974#0b", "33128974#0c", "-33128974#0a", "-33128974#0b", "-33128974#0c"}}
        expected = {key: ("6.94" if key.endswith("0b") else "8.33") for key in speed}
        add("PASS" if speed == expected and len(speed) == 6 else "FAIL", f"{scenario}: chicane speed proxy", str(speed))

    for scenario in ("C1_X0", "C1_L25", "C1_M50", "C1_H75"):
        root = ET.parse(config_path(scenario)).getroot()
        net = scenario_dir(scenario) / root.find("input/net-file").get("value", "")
        with gzip.open(net, "rb") as handle:
            net_root = ET.parse(handle).getroot()
        crossing_edges = [
            edge.get("crossingEdges", "")
            for edge in net_root.findall("edge")
            if edge.get("function") == "crossing" and C1_CROSSING_NODE in edge.get("id", "")
        ]
        split_ids = {edge.get("id", "") for edge in net_root.findall("edge")}
        split_ok = {"33128974#0", "33128974#0.c1e", "-33128974#0", "-33128974#0.c1w"} <= split_ids
        add("PASS" if crossing_edges == ["33128974#0.c1e -33128974#0"] and split_ok else "FAIL", f"{scenario}: real mid-block priority crossing", f"crossingEdges={crossing_edges}; split={split_ok}")
    add("WARN", "C1 network rebuild scope", "The valid mid-block crossing replaces one unused invalid OSM crossing outside the school frontage during netconvert rebuilding; the sensor-corridor routes do not use the dropped crossing")

    for design in ("OW_FULL", "OW_REDUCED"):
        for scenario in (f"{design}_OBS", f"{design}_DR15", f"{design}_DR30"):
            root = ET.parse(config_path(scenario)).getroot()
            net = scenario_dir(scenario) / root.find("input/net-file").get("value", "")
            with gzip.open(net, "rb") as handle:
                net_root = ET.parse(handle).getroot()
            lane_permissions = {}
            for edge in net_root.findall("edge"):
                if edge.get("id", "") in ONEWAY_RESTRICTED_EDGES[design]:
                    lane_permissions[edge.get("id", "")] = [
                        lane.get("allow", "") for lane in edge.findall("lane")
                    ]
            complete = set(lane_permissions) == ONEWAY_RESTRICTED_EDGES[design]
            reserved = all(
                permissions and all(value in {"bicycle", "bus bicycle"} for value in permissions)
                and "bus bicycle" in permissions
                for permissions in lane_permissions.values()
            )
            add("PASS" if complete and reserved else "FAIL", f"{scenario}: counterflow reserved to buses/bicycles", str(lane_permissions))

    add(
        "PASS" if "-33128974#3" in ONEWAY_RESTRICTED_EDGES["OW_FULL"] and "-33128974#3" not in ONEWAY_RESTRICTED_EDGES["OW_REDUCED"] else "FAIL",
        "One-way extents distinguish full and reduced concepts",
        "full begins at Tervuursesteenweg; reduced begins at Bergagegaarde",
    )
    right_turn = ("1046472245#0", "435654120#0", "33128974#0 582782542")
    add(
        "PASS" if ONEWAY_GENERAL_OD["OW_FULL"]["pos"] == right_turn and ONEWAY_GENERAL_OD["OW_REDUCED"]["pos"] == right_turn else "FAIL",
        "Both one-way options enforce the repeated east-end right turn",
        f"full={ONEWAY_GENERAL_OD['OW_FULL']['pos']}; reduced={ONEWAY_GENERAL_OD['OW_REDUCED']['pos']}",
    )
    add(
        "PASS" if ONEWAY_GENERAL_OD["OW_REDUCED"]["neg"] == ("-33128976#0", "-33128974#3", "") else "FAIL",
        "Reduced option traverses the unchanged eastern section before diversion",
        str(ONEWAY_GENERAL_OD["OW_REDUCED"]["neg"]),
    )


def check_observation_scope() -> None:
    for scenario in SCENARIOS:
        design = str(SCENARIOS[scenario]["design"])
        bad = []
        for mode in ("passenger", "truck", "bike_moto"):
            for trip in ET.parse(mode_file(scenario, mode)).getroot().findall("trip"):
                expected = trip_od(scenario, trip)
                actual = (trip.get("from", ""), trip.get("to", ""), trip.get("via", ""))
                if actual != expected:
                    bad.append((trip.get("id", ""), actual, expected))
        add("PASS" if not bad else "FAIL", f"{scenario}: sensor demand uses corridor boundary ODs", f"bad={bad[:2]}")

        ped_root = ET.parse(mode_file(scenario, "pedestrian")).getroot()
        ped_paths = {walk.get("edges", "") for person in ped_root.findall("person") for walk in person.findall("walk")}
        expected_ped_paths = set(PEDESTRIAN_FRONTAGE_PATHS)
        if is_c1(scenario) and crossing_share(scenario):
            expected_ped_paths |= set(C1_CROSSING_PATHS)
        add("PASS" if ped_paths == expected_ped_paths else "FAIL", f"{scenario}: pedestrian paths match declared scope", str(sorted(ped_paths)))

        bus_root = ET.parse(mode_file(scenario, "bus")).getroot()
        expected_routes = BUS_CORRIDOR_ROUTES[corridor_variant(scenario)]
        bus_bad = []
        for route in bus_root.findall("route"):
            direction = "neg" if route.get("id", "").endswith(":0") else "pos"
            if route.get("edges", "") != expected_routes[direction] or route.findall("stop"):
                bus_bad.append(route.get("id", ""))
        for vehicle in bus_root.findall("vehicle"):
            direction = "neg" if vehicle.get("route", "").endswith(":0") else "pos"
            parameters = {elem.get("key", ""): elem.get("value", "") for elem in vehicle.findall("param")}
            stops = vehicle.findall("stop")
            expected_stop = "-4059785907" if direction == "neg" else "4052677689"
            if (
                len(stops) != 1
                or stops[0].get("busStop") != expected_stop
                or not parameters.get("gtfsTripId")
                or not parameters.get("scheduledBergojeDeparture")
            ):
                bus_bad.append(vehicle.get("id", ""))
        add("PASS" if not bus_bad else "FAIL", f"{scenario}: buses cross corridor once", f"bad={bus_bad}")

        stop_files = list(scenario_dir(scenario).glob("osm_stops*.add.xml"))
        stop_lanes = {}
        if len(stop_files) == 1:
            stop_lanes = {stop.get("id", ""): stop.get("lane", "") for stop in ET.parse(stop_files[0]).getroot().findall("busStop")}
        expected_named = (
            {"-4059785907": "-33128974#0_0", "4052677689": "33128974#0_0"}
            if design == "current" or design.startswith("OW_")
            else {"-4059785907": "1046472242_1", "4052677689": "71760726_1"}
        )
        actual_named = {key: stop_lanes.get(key, "") for key in expected_named}
        add("PASS" if actual_named == expected_named else "FAIL", f"{scenario}: report-aligned named bus stops", str(actual_named))

    bus_total = sum(scheduled_bus_counts("current").values())
    truck_total = len(ids("current", "truck"))
    add("PASS" if bus_total == 107 and truck_total == 696 else "FAIL", "Large-vehicle subclass allocation", f"timetable-proxy buses={bus_total}; residual trucks={truck_total}; total={bus_total + truck_total}")

    truck_bins: Counter[tuple[int, str]] = Counter()
    for trip in ET.parse(mode_file("current", "truck")).getroot().findall("trip"):
        bin_index = int(float(trip.get("depart", "0")) // 900)
        direction = "pos" if "_pos_" in trip.get("id", "") else "neg"
        truck_bins[(bin_index, direction)] += 1
    buses = scheduled_bus_counts("current")
    large_by_bin = {
        index: sum(buses[(index, direction)] + truck_bins[(index, direction)] for direction in ("pos", "neg"))
        for index in range(96)
    }
    expected_profile = [int(row["large_vehicle_total"]) for row in read_csv("observed_sensor_profile.csv")]
    mismatched = {index: (large_by_bin[index], expected_profile[index]) for index in range(96) if large_by_bin[index] != expected_profile[index]}
    add("PASS" if not mismatched else "FAIL", "Per-bin large-vehicle allocation", f"mismatched={mismatched}")

    with BUS_TIMETABLE.open(encoding="utf-8", newline="") as handle:
        timetable_rows = list(csv.DictReader(handle))
    statuses = {row["timetable_status"] for row in timetable_rows}
    add("PASS" if len(timetable_rows) == 107 and statuses == {"near-date_weekday_proxy_not_exact_sensor_date"} else "FAIL", "Line 34 timetable-proxy provenance", f"rows={len(timetable_rows)}; statuses={statuses}")
    add("WARN", "Line 34 exact-date limitation", "OSM supplies route/stop geometry only; departures use Wednesday 2025-10-15 as a near-date proxy because the exact 2025-10-01 archived GTFS ZIP was credential-gated")

    parking_objects = []
    for path in route_files("current"):
        if ET.parse(path).getroot().find(".//parkingArea") is not None:
            parking_objects.append(path.name)
    for path in scenario_dir("current").glob("*.add.xml"):
        if ET.parse(path).getroot().find(".//parkingArea") is not None:
            parking_objects.append(path.name)
    add("PASS" if not parking_objects else "FAIL", "Baseline contains no modeled parking supply", f"parkingArea files={parking_objects}")
    add("WARN", "Scenario B parking scope", "The report's six-space removal is not a parking-capacity result because the OSM-wizard baseline contains no parkingArea objects")
    add("WARN", "One-way diversion boundary", "All prohibited westbound private trips remain loaded but exit at Tervuursesteenweg (full option) or Bergagegaarde (reduced option); the clipped OSM-Wizard network contains no connected external detour, so onward travel time and emissions are not estimated")
    add("WARN", "One-way directional-demand uncertainty", "The sensor has no direction field; the resulting frontage reduction follows the declared balanced per-bin direction assumption and is not a measured diversion forecast")

    for mode in ("passenger", "bike_moto"):
        directional: Counter[tuple[int, str]] = Counter()
        for trip in ET.parse(mode_file("current", mode)).getroot().findall("trip"):
            bin_index = int(float(trip.get("depart", "0")) // 900)
            direction = "pos" if "_pos_" in trip.get("id", "") else "neg"
            directional[(bin_index, direction)] += 1
        differences = [abs(directional[(index, "pos")] - directional[(index, "neg")]) for index in range(96)]
        add("PASS" if max(differences, default=0) <= 1 else "FAIL", f"Current {mode}: balanced unobserved directions", f"max per-bin difference={max(differences, default=0)}")

    profile = read_csv("observed_sensor_profile.csv")
    totals = {
        "pedestrian": sum(int(row["pedestrian_total"]) for row in profile),
        "two_wheeler": sum(int(row["two_wheeler_total"]) for row in profile),
        "car": sum(int(row["car_total"]) for row in profile),
        "large": sum(int(row["large_vehicle_total"]) for row in profile),
    }
    add("PASS" if len(profile) == 96 and totals == dict(OBSERVED_SENSOR_TOTALS) else "FAIL", "Observed 96-bin sensor profile preserved", f"rows={len(profile)}; totals={totals}")


def check_detector_temporal_calibration() -> None:
    """Distinguish exact input bins from detector-time redistribution in SUMO."""
    profile = read_csv("observed_sensor_profile.csv")
    root = ET.parse(scenario_dir("current") / "school_e1.current.xml").getroot()
    detector: dict[str, Counter[int]] = {
        key: Counter() for key in ("car", "large", "bicycle", "motorcycle")
    }
    for interval in root.findall("interval"):
        detector_id = interval.get("id", "")
        for key in detector:
            if detector_id.startswith(f"school_{key}_"):
                detector[key][int(float(interval.get("begin", "0")) // 900)] += int(
                    interval.get("nVehEntered", "0")
                )
    observed = {
        "car": [int(row["car_total"]) for row in profile],
        "large": [int(row["large_vehicle_total"]) for row in profile],
        "two_wheeler": [int(row["two_wheeler_total"]) for row in profile],
    }
    simulated = {
        "car": [detector["car"][index] for index in range(96)],
        "large": [detector["large"][index] for index in range(96)],
        "two_wheeler": [
            detector["bicycle"][index] + detector["motorcycle"][index]
            for index in range(96)
        ],
    }
    rows = []
    for mode in observed:
        differences = [simulated[mode][index] - observed[mode][index] for index in range(96)]
        rows.append(
            {
                "mode": mode,
                "observed_total": sum(observed[mode]),
                "detector_total": sum(simulated[mode]),
                "mismatched_15min_bins": sum(value != 0 for value in differences),
                "absolute_bin_error_sum": sum(abs(value) for value in differences),
                "maximum_absolute_bin_error": max(map(abs, differences)),
                "interpretation": "daily total exact; detector times may cross input-bin boundaries because of route travel time and queues",
            }
        )
    write_csv(ANALYSIS / "temporal_calibration_validation.csv", rows)
    daily_exact = all(int(row["observed_total"]) == int(row["detector_total"]) for row in rows)
    add("PASS" if daily_exact else "FAIL", "Canonical detector daily totals", str(rows))
    shifted = {row["mode"]: int(row["mismatched_15min_bins"]) for row in rows}
    add("WARN", "Detector-time 15-minute redistribution", f"mismatched bins={shifted}; input departure bins are exact, but detector passage bins are not claimed as exact")


def check_fleet() -> None:
    expected = largest_remainder_counts(len(ids("current", "passenger")))
    reverse = {"veh_passenger_" + fuel + "_be2025": count for fuel, count in expected.items()}
    actual = Counter(elem.get("type", "") for elem in ET.parse(mode_file("current", "passenger")).getroot().findall("trip"))
    add("PASS" if actual == Counter(reverse) else "FAIL", "Current passenger fleet matches Statbel shares", f"actual={dict(actual)}; expected={reverse}")
    add("WARN", "Fleet transfer limitation", "Statbel is national stock by fuel; local traffic, Euro stages and non-passenger classes remain assumptions")


def check_results() -> None:
    rows = read_csv("replicate_kpis.csv")
    by = {scenario: [row for row in rows if row["scenario"] == scenario] for scenario in SCENARIOS}
    for scenario, values in by.items():
        seeds = sorted(int(row["seed"]) for row in values)
        add("PASS" if seeds == [42, 43, 44, 45, 46] else "FAIL", f"{scenario}: five replicate seeds", str(seeds))
        outputs = [
            scenario_dir(scenario) / f"tripinfos.{scenario}.xml",
            scenario_dir(scenario) / f"stats.{scenario}.xml",
            scenario_dir(scenario) / f"fcd.school.{scenario}.xml.gz",
        ]
        add("PASS" if all(path.exists() for path in outputs) else "FAIL", f"{scenario}: canonical outputs", str([p.name for p in outputs if not p.exists()]))
        route_errors = []
        for log in scenario_dir(scenario).glob("logs/*.log"):
            text = log.read_text(encoding="utf-8", errors="replace")
            if any(pattern in text for pattern in ("Error:", "No connection between edge", "Route file should be sorted", "ignoring 'school")):
                route_errors.append(log.name)
        add("PASS" if not route_errors else "FAIL", f"{scenario}: run logs free of route errors", str(route_errors))
        teleports = [int(float(row.get("teleports_total", "0"))) for row in values]
        person_teleports = [int(float(row.get("person_teleports_total", "0"))) for row in values]
        add("PASS" if max(teleports, default=0) == 0 and max(person_teleports, default=0) == 0 else "FAIL", f"{scenario}: no teleport-based recovery", f"vehicle={teleports}; person={person_teleports}")

    summary = {row["scenario"]: row for row in read_csv("replicate_summary.csv")}
    for scenario in SCENARIOS:
        valid = int(summary[scenario]["completion_valid_replicates"])
        add("PASS" if valid == 5 else "FAIL", f"{scenario}: all runs completion-valid", f"{valid}/5")

    c1_collision_counts = {
        scenario: [int(float(row.get("collision_output_intermodal", "0"))) for row in by[scenario]]
        for scenario in ("C1_X0", "C1_L25", "C1_M50", "C1_H75")
    }
    collision_coverage = all(len(values) == 5 for values in c1_collision_counts.values())
    add("PASS" if collision_coverage else "FAIL", "C1 intermodal diagnostics recorded for every seed", str(c1_collision_counts))
    add("WARN", "C1 intermodal collision diagnostics", f"SUMO crossing-overlap events by seed={c1_collision_counts}; these are uncalibrated interaction diagnostics, not predicted crashes")

    oneway_collisions = {
        scenario: [int(float(row.get("collision_output_total", "0"))) for row in by[scenario]]
        for scenario in SCENARIOS if is_oneway(scenario)
    }
    add("PASS" if all(max(values, default=0) == 0 for values in oneway_collisions.values()) else "FAIL", "One-way cases have no collision diagnostics", str(oneway_collisions))

    calibration = {row["target"]: row for row in read_csv("calibration_validation.csv")}
    for target in ("car count", "two-wheeler count", "pedestrian persons"):
        error = abs(float(calibration[target]["error_pct"]))
        add("PASS" if error < 0.01 else "FAIL", f"Calibration: {target}", f"error={error:.3f}%")
    large_error = abs(float(calibration["large-vehicle count"]["error_pct"]))
    add("PASS" if large_error < 0.01 else "FAIL", "Calibration: large vehicles", f"error={large_error:.3f}%")
    speed_error = abs(float(calibration["motorized >36 km/h"]["error_pct"]))
    add("PASS" if speed_error <= 2 else "FAIL", "Calibration: point-speed exceedance", f"target={OBSERVED_SPEED_OVER_36_PCT}%; error={speed_error:.2f} pp")
    fleet_boundary = read_csv("fleet_emission_sensitivity.csv")
    fleet_counts = Counter(row["scenario"] for row in fleet_boundary)
    add("PASS" if len(fleet_boundary) == 2 * len(SCENARIOS) and all(fleet_counts[s] == 2 for s in SCENARIOS) else "FAIL", "Passenger Euro-stage boundary coverage", f"rows={len(fleet_boundary)}; cases={dict(fleet_counts)}")
    add("WARN", "Absolute NOx fleet sensitivity", "Euro-5 passenger proxy is roughly five to six times the newer proxy; scenario ordering is more robust than absolute NOx")
    add("WARN", "Scenario A numerical scope", "Bus-stop relocation is quantified; visual, lighting and sightline benefits remain qualitative because no behavior response coefficient was supplied")


def write_manifest() -> None:
    rows = []
    for path in sorted(ROOT.rglob("*")):
        relative = path.relative_to(ROOT)
        if (
            not path.is_file()
            or path == ANALYSIS / "manifest_sha256.csv"
            or "__pycache__" in relative.parts
            or path.suffix == ".pyc"
            or path.name.startswith("seed")
            or path.name.startswith(".")
        ):
            continue
        rows.append({"relative_path": str(relative), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "bytes": path.stat().st_size})
    write_csv(ANALYSIS / "manifest_sha256.csv", rows)


def main() -> None:
    check_configs()
    check_factorial()
    check_behavior_and_network()
    check_observation_scope()
    check_detector_temporal_calibration()
    check_fleet()
    check_results()
    failed = sum(row["status"] == "FAIL" for row in checks)
    warnings = sum(row["status"] == "WARN" for row in checks)
    passed = sum(row["status"] == "PASS" for row in checks)
    write_csv(ANALYSIS / "validation_checks.csv", checks)
    report = [
        "# Validation report (v21.2 / SUMO 1.27.1)", "",
        f"Overall status: **{'PASS' if failed == 0 else 'FAIL'}**", "",
        f"- Passed: {passed}", f"- Warnings: {warnings}", f"- Failed: {failed}", "",
        "Warnings are disclosed evidence limitations; they are not silently converted into calibrated inputs.", "",
        "## Warnings", "",
    ]
    report.extend(f"- {row['check']}: {row['detail']}" for row in checks if row["status"] == "WARN")
    if failed:
        report.extend(["", "## Failures", ""])
        report.extend(f"- {row['check']}: {row['detail']}" for row in checks if row["status"] == "FAIL")
    (ANALYSIS / "validation_report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    write_manifest()
    print(f"Validation {'PASS' if failed == 0 else 'FAIL'}: {passed} passed, {warnings} warnings, {failed} failed.")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
