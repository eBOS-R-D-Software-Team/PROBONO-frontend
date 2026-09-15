#!/usr/bin/env python3
"""Build an evidence-traceable A/B/C factorial experiment from clean templates."""

from __future__ import annotations

import copy
import csv
import gzip
import hashlib
import math
import os
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from collections import Counter, OrderedDict, defaultdict
from pathlib import Path

from common import (
    ANALYSIS,
    CALIBRATED_SPEED_FACTOR,
    CANONICAL_SEED,
    FUEL_VTYPE,
    OBSERVED_LARGE_15MIN,
    OBSERVED_SENSOR_TOTALS,
    OBSERVED_SPEED_OVER_36_PCT,
    ROOT,
    SCENARIOS,
    STATBEL_2025,
    largest_remainder_counts,
    scenario_dir,
    write_csv,
)


TEMPLATES = ROOT / "templates"
BUS_TIMETABLE = ROOT / "evidence" / "gtfs" / "line34_bergoje_schedule_proxy_2025-10-15.csv"
TEMPLATE_CONFIG = {
    "current": "run.baseline.sumocfg",
    "A": "run.baseline.sumocfg",
    "B": "run.scenarioB.sumocfg",
    "C": "run.scenarioC.sumocfg",
    "OW_FULL": "run.baseline.sumocfg",
    "OW_REDUCED": "run.baseline.sumocfg",
}
TEMPLATE_FOLDER = {
    "current": "current",
    "A": "current",
    "B": "B",
    "C": "C",
    "OW_FULL": "current",
    "OW_REDUCED": "current",
}
EMISSION_CLASS = {
    "veh_passenger_petrol_be2025": "HBEFA4/PC_petrol_Euro-6d",
    "veh_passenger_diesel_be2025": "HBEFA4/PC_diesel_Euro-6d",
    "veh_passenger_hybrid_be2025": "HBEFA4/PC_petrol_Euro-6d",
    "veh_passenger_electric_be2025": "HBEFA4/PC_BEV",
    "veh_passenger_gas_be2025": "HBEFA4/PC_CNG_petrol_Euro-6_(CNG)",
    "veh_passenger_other_be2025": "HBEFA4/PC_petrol_Euro-6d",
    "truck_truck": "HBEFA4/RT_le7.5t_Euro-VI_A-C",
    "motorcycle_motorcycle": "HBEFA4/MC_4S_gt250cc_preEuro",
    "pt_bus": "HBEFA4/UBus_Std_gt15-18t_Euro-VI_A-C",
}

# The supplied sensor identifies directional passages at the school frontage,
# not network-wide origins, destinations, or turning movements.  Constrain the
# sensor-calibrated synthetic trips to observable corridor boundary conditions
# so that unmeasured side-street OD assumptions cannot create artificial
# gridlock.  Public-transport routes and pedestrian paths remain design inputs.
CORRIDOR_BOUNDARY_OD = {
    "standard": {
        "pos": ("1046472245#0", "33128974#3", "33128974#0"),
        "neg": ("-33128974#3", "1046472243#3", "-33128974#0"),
    },
    "B": {
        "pos": ("1046472245#0", "33128974#3", "33128974#0a 33128974#0b 33128974#0c"),
        "neg": ("-33128974#3", "1046472243#3", "-33128974#0c -33128974#0b -33128974#0a"),
    },
    "C1": {
        "pos": ("1046472245#0", "33128974#3", "33128974#0 33128974#0.c1e"),
        "neg": ("-33128974#3", "1046472243#3", "-33128974#0 -33128974#0.c1w"),
    },
}

# The one-way concepts were supplied separately by the mobility expert. The
# clipped OSM-Wizard network has no connected external detour around either
# closure. Rather than deleting prohibited westbound trips or inventing a
# network-wide OD matrix, each trip is retained and exits at the intervention
# boundary. Its onward off-model diversion is deliberately not estimated.
# Bicycles retain the standard two-way corridor ODs.
ONEWAY_GENERAL_OD = {
    "OW_FULL": {
        # Eastbound general traffic traverses the full one-way section and
        # follows the slide's right-turn-only instruction at Tervuursesteenweg.
        "pos": ("1046472245#0", "435654120#0", "33128974#0 582782542"),
        # Westbound traffic approaches from the east and exits at the closure.
        "neg": ("-33128976#0", "-582782542", ""),
    },
    "OW_REDUCED": {
        # Slide 4 retains the east-end right-turn-only instruction even though
        # the private-traffic one-way section ends earlier at Bergagegaarde.
        # Eastbound traffic therefore continues through the unchanged eastern
        # section and turns right at Tervuursesteenweg.
        "pos": ("1046472245#0", "435654120#0", "33128974#0 582782542"),
        # Westbound traffic enters from the east, traverses the unchanged
        # two-way section, and exits at the Bergagegaarde closure boundary.
        # Its unobserved onward diversion remains outside the clipped model.
        "neg": ("-33128976#0", "-33128974#3", ""),
    },
}

ONEWAY_RESTRICTED_EDGES = {
    "OW_FULL": {
        "-33128974#3", "-33128974#2", "-33128974#1", "-33128974#0",
        "1046472243#0", "1046472243#2", "1046472243#3",
        "1165966443", "1046472242", "-1046472244",
    },
    "OW_REDUCED": {
        "-33128974#2", "-33128974#1", "-33128974#0",
        "1046472243#0", "1046472243#2", "1046472243#3",
        "1165966443", "1046472242", "-1046472244",
    },
}

BUS_CORRIDOR_ROUTES = {
    "standard": {
        "pos": "40357844#0 1046472244 71760726 1046472245#0 1046472245#1 1046472245#3 33128974#0 33128974#1 33128974#2 33128974#3",
        "neg": "-33128974#3 -33128974#2 -33128974#1 -33128974#0 1046472243#0 1046472243#2 1046472243#3 1165966443 1046472242 -1046472244 -40357844#1",
    },
    "B": {
        "pos": "40357844#0 1046472244 71760726 1046472245#0 1046472245#1 1046472245#3 33128974#0a 33128974#0b 33128974#0c 33128974#1 33128974#2 33128974#3",
        "neg": "-33128974#3 -33128974#2 -33128974#1 -33128974#0c -33128974#0b -33128974#0a 1046472243#0 1046472243#2 1046472243#3 1165966443 1046472242 -1046472244 -40357844#1",
    },
    "C1": {
        "pos": "40357844#0 1046472244 71760726 1046472245#0 1046472245#1 1046472245#3 33128974#0 33128974#0.c1e 33128974#1 33128974#2 33128974#3",
        "neg": "-33128974#3 -33128974#2 -33128974#1 -33128974#0 -33128974#0.c1w 1046472243#0 1046472243#2 1046472243#3 1165966443 1046472242 -1046472244 -40357844#1",
    },
}

PEDESTRIAN_FRONTAGE_PATHS = (
    "969633048#0 969633048#1 1239139978#0",
    "1239139980#0 1239139979",
)

C1_CROSSING_PATHS = (
    "969633048#0 969633048#1 scenarioC_school_frontage_mid_n_w scenarioC_school_frontage_mid_n_link scenarioC_school_frontage_mid_s_link 1239139979.scMid",
    "1239139979.scMid scenarioC_school_frontage_mid_s_link scenarioC_school_frontage_mid_n_link scenarioC_school_frontage_mid_n_w 969633048#1 969633048#0",
)

C1_CROSSING_NODE = "scenarioC_school_frontage_mid"
C1_FORWARD_CONTINUATION = "33128974#0.c1e"
C1_REVERSE_CONTINUATION = "-33128974#0.c1w"

# Seconds from the clipped SUMO route boundary to the original Bergoje
# departure time in the OSM-wizard public-transport route definitions.
BUS_SCHEDULE_OFFSETS = {"neg": 186, "pos": 165}


def split_files(value: str) -> list[str]:
    return [item.strip() for item in value.replace("\n", " ").split(",") if item.strip()]


def write_xml_atomic(tree: ET.ElementTree, path: Path) -> None:
    """Publish only a complete, parseable XML file to a generated case."""
    data = ET.tostring(tree.getroot(), encoding="utf-8", xml_declaration=True)
    ET.fromstring(data)
    error = None
    for attempt in range(3):
        temporary = path.with_name(f".{path.name}.tmp{attempt}")
        try:
            with temporary.open("wb") as handle:
                handle.write(data)
                handle.flush()
                os.fsync(handle.fileno())
            if temporary.read_bytes() != data:
                raise OSError("temporary XML byte verification failed")
            temporary.replace(path)
            if path.read_bytes() != data:
                raise OSError("published XML byte verification failed")
            ET.fromstring(path.read_bytes())
            return
        except (OSError, ET.ParseError) as exc:
            error = exc
    raise OSError(f"Could not publish complete XML {path} after three attempts") from error


def write_gzip_xml_atomic(tree: ET.ElementTree, path: Path) -> None:
    """Publish a complete compressed XML tree transactionally."""
    xml_data = ET.tostring(tree.getroot(), encoding="utf-8", xml_declaration=True)
    ET.fromstring(xml_data)
    compressed = gzip.compress(xml_data, mtime=0)
    error = None
    for attempt in range(3):
        temporary = path.with_name(f".{path.name}.tmp{attempt}")
        try:
            with temporary.open("wb") as handle:
                handle.write(compressed)
                handle.flush()
                os.fsync(handle.fileno())
            if temporary.read_bytes() != compressed:
                raise OSError("temporary gzip byte verification failed")
            temporary.replace(path)
            published = path.read_bytes()
            if published != compressed:
                raise OSError("published gzip byte verification failed")
            ET.fromstring(gzip.decompress(published))
            return
        except (OSError, ET.ParseError, EOFError) as exc:
            error = exc
    raise OSError(f"Could not publish complete gzip XML {path} after three attempts") from error


def source_config(scenario: str) -> Path:
    design = str(SCENARIOS[scenario]["design"])
    return scenario_dir(scenario) / TEMPLATE_CONFIG[design]


def crossing_share(scenario: str) -> int:
    return int(SCENARIOS[scenario].get("crossing_pct", 0))


def is_c1(scenario: str) -> bool:
    return bool(SCENARIOS[scenario].get("c1_network", False))


def is_oneway(scenario: str) -> bool:
    return str(SCENARIOS[scenario]["design"]).startswith("OW_")


def corridor_variant(scenario: str) -> str:
    design = str(SCENARIOS[scenario]["design"])
    if is_c1(scenario):
        return "C1"
    return "B" if design == "B" else "standard"


def trip_od(scenario: str, trip: ET.Element) -> tuple[str, str, str]:
    """Return the declared boundary OD for one synthetic road-user trip."""
    vehicle_id = trip.get("id", "")
    if "_pos_" in vehicle_id:
        direction = "pos"
    elif "_neg_" in vehicle_id:
        direction = "neg"
    else:
        raise ValueError(f"Cannot infer sensor direction from {vehicle_id}")
    design = str(SCENARIOS[scenario]["design"])
    vehicle_type = trip.get("type", "").lower()
    if design in ONEWAY_GENERAL_OD and "bicycle" not in vehicle_type and not vehicle_type.startswith("bike_"):
        return ONEWAY_GENERAL_OD[design][direction]
    return CORRIDOR_BOUNDARY_OD[corridor_variant(scenario)][direction]


def copy_template(scenario: str) -> None:
    design = str(SCENARIOS[scenario]["design"])
    source = TEMPLATES / ("C1" if is_c1(scenario) else TEMPLATE_FOLDER[design])
    target = scenario_dir(scenario)
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(source, target)
    for stale in target.glob("*.summary.txt"):
        stale.unlink()


def route_files(scenario: str) -> list[Path]:
    config = source_config(scenario)
    root = ET.parse(config).getroot()
    value = root.find("input/route-files").get("value", "")
    return [scenario_dir(scenario) / name for name in split_files(value)]


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
        raise ValueError(f"Expected one {mode} route file for {scenario}; found {matches}")
    return matches[0]


def stable_assignment(ids: list[str], counts: OrderedDict[str, int]) -> dict[str, str]:
    ordered = sorted(ids, key=lambda value: hashlib.sha256(("fuel:" + value).encode()).hexdigest())
    fuels = []
    for fuel, count in counts.items():
        fuels.extend([fuel] * count)
    if len(ordered) != len(fuels):
        raise ValueError("Fuel allocation size mismatch")
    return {vehicle_id: FUEL_VTYPE[fuel] for vehicle_id, fuel in zip(ordered, fuels)}


def assign_current_fleet() -> None:
    path = mode_file("current", "passenger")
    tree = ET.parse(path)
    trips = [elem for elem in tree.getroot() if elem.tag == "trip"]
    assignment = stable_assignment(
        [elem.get("id", "") for elem in trips], largest_remainder_counts(len(trips))
    )
    for trip in trips:
        trip.set("type", assignment[trip.get("id", "")])
    ET.indent(tree, space="    ")
    write_xml_atomic(tree, path)


def neutralize_current_direction_split() -> None:
    """Use a balanced per-bin split where the supplied sensor has no direction."""
    for mode, prefix in (("passenger", "vehSchool"), ("bike_moto", "schoolBike")):
        path = mode_file("current", mode)
        tree = ET.parse(path)
        groups: dict[int, list[ET.Element]] = defaultdict(list)
        for trip in tree.getroot().findall("trip"):
            groups[int(float(trip.get("depart", "0")) // 900)].append(trip)
        for bin_index, trips in groups.items():
            ordered = sorted(trips, key=lambda elem: (float(elem.get("depart", "0")), elem.get("id", "")))
            pos_count = len(ordered) // 2 + (1 if len(ordered) % 2 and bin_index % 2 == 0 else 0)
            for rank, trip in enumerate(ordered):
                direction = "pos" if rank < pos_count else "neg"
                trip.set("id", f"{prefix}_{bin_index:02d}_{direction}_{rank:04d}")
        ET.indent(tree, space="    ")
        write_xml_atomic(tree, path)


def replace_trips_from_current(scenario: str, mode: str) -> None:
    target_path = mode_file(scenario, mode)
    source_path = mode_file("current", mode)
    target_tree = ET.parse(target_path)
    target_root = target_tree.getroot()
    for elem in list(target_root):
        if elem.tag == "trip":
            target_root.remove(elem)
    for elem in ET.parse(source_path).getroot():
        if elem.tag == "trip":
            target_root.append(copy.deepcopy(elem))
    if str(SCENARIOS[scenario]["design"]) == "B":
        for trip in target_root.findall("trip"):
            tokens = split_files(trip.get("via", "").replace(" ", ","))
            expanded = []
            for token in tokens:
                if token == "33128974#0":
                    expanded.extend(["33128974#0a", "33128974#0b", "33128974#0c"])
                elif token == "-33128974#0":
                    expanded.extend(["-33128974#0c", "-33128974#0b", "-33128974#0a"])
                else:
                    expanded.append(token)
            if expanded:
                trip.set("via", " ".join(expanded))
    ET.indent(target_tree, space="    ")
    write_xml_atomic(target_tree, target_path)


def constrain_to_observed_corridor(scenario: str) -> None:
    """Apply directional school-frontage boundary ODs to synthetic demand."""
    for mode in ("passenger", "truck", "bike_moto"):
        path = mode_file(scenario, mode)
        tree = ET.parse(path)
        for trip in tree.getroot().findall("trip"):
            source, destination, via = trip_od(scenario, trip)
            trip.set("from", source)
            trip.set("to", destination)
            if via:
                trip.set("via", via)
            else:
                trip.attrib.pop("via", None)
            trip.set("departLane", "best")
        ET.indent(tree, space="    ")
        write_xml_atomic(tree, path)


def configure_pedestrian_routes(scenario: str) -> None:
    """Keep observed totals and apply a nested C1 crossing-share sensitivity."""
    path = mode_file(scenario, "pedestrian")
    tree = ET.parse(path)
    persons = tree.getroot().findall("person")
    target = round(len(persons) * crossing_share(scenario) / 100)
    ranked = sorted(
        persons,
        key=lambda elem: hashlib.sha256(("c1-crossing:" + elem.get("id", "")).encode()).hexdigest(),
    )
    selected = {id(elem) for elem in ranked[:target]}
    for index, person in enumerate(persons):
        person.attrib.pop("arrival", None)
        for stage in list(person):
            person.remove(stage)
        if id(person) in selected:
            direction_hash = hashlib.sha256(("c1-direction:" + person.get("id", "")).encode()).hexdigest()
            edges = C1_CROSSING_PATHS[int(direction_hash, 16) % 2]
        else:
            edges = PEDESTRIAN_FRONTAGE_PATHS[index % 2]
        ET.SubElement(person, "walk", {"edges": edges})
    ET.indent(tree, space="    ")
    write_xml_atomic(tree, path)


def bus_direction(route_id: str) -> str:
    if route_id.endswith(":0"):
        return "neg"
    if route_id.endswith(":1"):
        return "pos"
    raise ValueError(f"Cannot infer bus direction from route {route_id}")


def load_bus_timetable() -> list[dict[str, str]]:
    with BUS_TIMETABLE.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise ValueError(f"Empty bus timetable: {BUS_TIMETABLE}")
    required = {
        "scheduled_seconds",
        "gtfs_trip_id",
        "sumo_direction",
        "sumo_route",
        "sumo_bus_stop",
        "timetable_status",
    }
    if missing := required - set(rows[0]):
        raise ValueError(f"Bus timetable is missing columns: {sorted(missing)}")
    if len({row["gtfs_trip_id"] for row in rows}) != len(rows):
        raise ValueError("Bus timetable contains duplicate GTFS trips")
    return sorted(rows, key=lambda row: int(row["scheduled_seconds"]))


def constrain_public_transport(scenario: str) -> None:
    """Represent every timetable call as one scheduled corridor bus passage."""
    routes = BUS_CORRIDOR_ROUTES[corridor_variant(scenario)]
    path = mode_file(scenario, "bus")
    tree = ET.parse(path)
    root = tree.getroot()
    for route in root.findall("route"):
        direction = bus_direction(route.get("id", ""))
        route.set("edges", routes[direction])
        for stop in list(route.findall("stop")):
            route.remove(stop)
    for elem in list(root):
        if elem.tag in {"flow", "vehicle"}:
            root.remove(elem)
    for index, row in enumerate(load_bus_timetable()):
        direction = row["sumo_direction"]
        scheduled = int(row["scheduled_seconds"])
        vehicle = ET.SubElement(
            root,
            "vehicle",
            {
                "id": f"pt_bus_34_timetable_{index:03d}",
                "type": "pt_bus",
                "route": row["sumo_route"],
                "depart": str(scheduled - BUS_SCHEDULE_OFFSETS[direction]),
                "line": f"34:{direction}",
            },
        )
        ET.SubElement(vehicle, "param", {"key": "gtfsTripId", "value": row["gtfs_trip_id"]})
        ET.SubElement(
            vehicle,
            "param",
            {"key": "scheduledBergojeDeparture", "value": str(scheduled)},
        )
        ET.SubElement(
            vehicle,
            "param",
            {"key": "timetableStatus", "value": row["timetable_status"]},
        )
        ET.SubElement(
            vehicle,
            "stop",
            {
                "busStop": row["sumo_bus_stop"],
                "duration": "20",
                "until": str(scheduled),
            },
        )
    ET.indent(tree, space="    ")
    write_xml_atomic(tree, path)


def apply_report_bus_stop_relocation(scenario: str) -> None:
    """Apply the report's common Émile Idiersstraat stop-relocation option."""
    design = str(SCENARIOS[scenario]["design"])
    if design != "A":
        return
    target = scenario_dir(scenario) / "osm_stops.add.xml"
    source = TEMPLATES / "B" / "osm_stops.scenarioB.add.xml"
    tree = ET.parse(source)
    ET.indent(tree, space="    ")
    write_xml_atomic(tree, target)


def scheduled_bus_counts(scenario: str) -> Counter[tuple[int, str]]:
    counts: Counter[tuple[int, str]] = Counter()
    root = ET.parse(mode_file(scenario, "bus")).getroot()
    for vehicle in root.findall("vehicle"):
        direction = bus_direction(vehicle.get("route", ""))
        parameters = {elem.get("key", ""): elem.get("value", "") for elem in vehicle.findall("param")}
        scheduled = int(parameters["scheduledBergojeDeparture"])
        counts[(scheduled // 900, direction)] += 1
    return counts


def rebuild_current_trucks_from_sensor_large() -> None:
    """Subtract one-pass scheduled buses from each large-vehicle sensor bin."""
    path = mode_file("current", "truck")
    tree = ET.parse(path)
    root = tree.getroot()
    for elem in list(root):
        if elem.tag == "trip":
            root.remove(elem)
    bus_counts = scheduled_bus_counts("current")
    for bin_index, observed in enumerate(OBSERVED_LARGE_15MIN):
        bus_pos = bus_counts[(bin_index, "pos")]
        bus_neg = bus_counts[(bin_index, "neg")]
        # Neutral split because the supplied sensor has no direction field.
        pos_target = observed // 2 + (1 if observed % 2 and bin_index % 2 == 0 else 0)
        neg_target = observed - pos_target
        truck_counts = {"pos": pos_target - bus_pos, "neg": neg_target - bus_neg}
        if min(truck_counts.values()) < 0:
            raise ValueError(f"Scheduled buses exceed observed large vehicles in bin {bin_index}")
        for direction, count in truck_counts.items():
            source, destination, via = CORRIDOR_BOUNDARY_OD["standard"][direction]
            for rank in range(count):
                depart = bin_index * 900 + 60 + (rank + 1) * 720 / (count + 1)
                ET.SubElement(
                    root,
                    "trip",
                    {
                        "id": f"schoolTruck_{bin_index:02d}_{direction}_{rank:04d}",
                        "depart": f"{depart:.2f}",
                        "from": source,
                        "to": destination,
                        "via": via,
                        "departLane": "best",
                        "type": "truck_truck",
                    },
                )
    trips = list(root.findall("trip"))
    for trip in trips:
        root.remove(trip)
    for trip in sorted(trips, key=lambda elem: (float(elem.get("depart", "0")), elem.get("id", ""))):
        root.append(trip)
    ET.indent(tree, space="    ")
    write_xml_atomic(tree, path)


def trip_group(elem: ET.Element) -> tuple[int, str]:
    interval = int(float(elem.get("depart", "0")) // 900)
    vehicle_id = elem.get("id", "")
    direction = "pos" if "_pos_" in vehicle_id else "neg" if "_neg_" in vehicle_id else "other"
    return interval, direction


def filter_route(path: Path, response_pct: int, motorcycle_only: bool = False) -> None:
    if response_pct == 0:
        return
    tree = ET.parse(path)
    root = tree.getroot()
    groups: dict[tuple[int, str], list[ET.Element]] = defaultdict(list)
    for elem in root.findall("trip"):
        if motorcycle_only and "motorcycle" not in elem.get("type", "").lower():
            continue
        groups[trip_group(elem)].append(elem)
    remove = set()
    keep_fraction = 1 - response_pct / 100
    for group, trips in groups.items():
        ranked = sorted(
            trips,
            key=lambda elem: hashlib.sha256(("response:" + elem.get("id", "")).encode()).hexdigest(),
        )
        keep_n = round(len(ranked) * keep_fraction)
        remove.update(id(elem) for elem in ranked[keep_n:])
    for elem in list(root):
        if id(elem) in remove:
            root.remove(elem)
    ET.indent(tree, space="    ")
    write_xml_atomic(tree, path)


def standardize_behavior(scenario: str) -> None:
    for path in route_files(scenario):
        try:
            tree = ET.parse(path)
        except ET.ParseError:
            continue
        changed = False
        for elem in tree.getroot().findall("vType"):
            vtype_id = elem.get("id", "")
            if vtype_id not in EMISSION_CLASS:
                continue
            vclass = elem.get("vClass", "")
            elem.attrib.clear()
            elem.set("id", vtype_id)
            elem.set("vClass", vclass)
            elem.set("emissionClass", EMISSION_CLASS[vtype_id])
            elem.set("speedFactor", CALIBRATED_SPEED_FACTOR)
            changed = True
        if changed:
            ET.indent(tree, space="    ")
            write_xml_atomic(tree, path)


def normalize_design_network(scenario: str) -> None:
    """Isolate committed design levers and remove inherited, unsupported signal changes."""
    design = str(SCENARIOS[scenario]["design"])
    config_root = ET.parse(source_config(scenario)).getroot()
    net_name = config_root.find("input/net-file").get("value", "")
    net_path = scenario_dir(scenario) / net_name
    opener = gzip.open if net_path.suffix == ".gz" else open
    with opener(net_path, "rb") as handle:
        tree = ET.parse(handle)
    if design == "B":
        speeds = {
            "33128974#0a": "8.33", "33128974#0b": "6.94", "33128974#0c": "8.33",
            "-33128974#0a": "8.33", "-33128974#0b": "6.94", "-33128974#0c": "8.33",
        }
        for edge in tree.getroot().findall("edge"):
            if edge.get("id", "") in speeds:
                speed = speeds[edge.get("id", "")]
                edge.set("speed", speed)
                for lane in edge.findall("lane"):
                    lane.set("speed", speed)
    if design in ONEWAY_RESTRICTED_EDGES:
        restricted = ONEWAY_RESTRICTED_EDGES[design]
        found = set()
        for edge in tree.getroot().findall("edge"):
            edge_id = edge.get("id", "")
            if edge_id not in restricted:
                continue
            found.add(edge_id)
            for lane in edge.findall("lane"):
                # Preserve the imported narrow bicycle-only lane where present;
                # reserve the former general lane for buses and bicycles.
                if lane.get("allow") == "bicycle":
                    continue
                lane.attrib.pop("disallow", None)
                lane.set("allow", "bus bicycle")
        if found != restricted:
            raise ValueError(f"{scenario}: missing one-way restricted edges {sorted(restricted - found)}")

    target_root = tree.getroot()
    if design in {"B", "C"}:
        current_net = TEMPLATES / "current" / "osm.net.xml.gz"
        with gzip.open(current_net, "rb") as handle:
            current_root = ET.parse(handle).getroot()
        current_tls = {elem.get("id", ""): elem for elem in current_root.findall("tlLogic")}
        for index, elem in enumerate(list(target_root)):
            if elem.tag == "tlLogic" and elem.get("id", "") in current_tls:
                target_root.remove(elem)
                target_root.insert(index, copy.deepcopy(current_tls[elem.get("id", "")]))

    if net_path.suffix == ".gz":
        write_gzip_xml_atomic(tree, net_path)
    else:
        write_xml_atomic(tree, net_path)


def find_netconvert() -> Path:
    candidates = []
    if os.environ.get("NETCONVERT_BINARY"):
        candidates.append(Path(os.environ["NETCONVERT_BINARY"]))
    if os.environ.get("SUMO_BINARY"):
        candidates.append(Path(os.environ["SUMO_BINARY"]).resolve().parent / "netconvert")
    if os.environ.get("SUMO_HOME"):
        candidates.append(Path(os.environ["SUMO_HOME"]) / "bin" / "netconvert")
    system = shutil.which("netconvert")
    if system:
        candidates.append(Path(system))
    for candidate in candidates:
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate.resolve()
    raise RuntimeError("C1 preparation requires SUMO 1.27.1 netconvert; set NETCONVERT_BINARY or SUMO_HOME")


def build_c1_priority_crossing(scenario: str) -> None:
    """Replace the decorative mid-block foot link with a real priority crossing."""
    if not is_c1(scenario):
        return
    config_root = ET.parse(source_config(scenario)).getroot()
    net_name = config_root.find("input/net-file").get("value", "")
    net_path = scenario_dir(scenario) / net_name
    opener = gzip.open if net_path.suffix == ".gz" else open
    with opener(net_path, "rb") as handle:
        existing_root = ET.parse(handle).getroot()
    existing_crossings = [
        edge for edge in existing_root.findall("edge")
        if edge.get("function") == "crossing" and C1_CROSSING_NODE in edge.get("id", "")
    ]
    existing_ids = {edge.get("id", "") for edge in existing_root.findall("edge")}
    if (
        len(existing_crossings) == 1
        and existing_crossings[0].get("crossingEdges") == f"{C1_FORWARD_CONTINUATION} -33128974#0"
        and {"33128974#0", C1_FORWARD_CONTINUATION, "-33128974#0", C1_REVERSE_CONTINUATION} <= existing_ids
    ):
        return
    netconvert = find_netconvert()
    env = os.environ.copy()
    env.setdefault("SUMO_HOME", str(netconvert.parent.parent))

    with tempfile.TemporaryDirectory(prefix=f"{scenario}.c1-net.") as temporary_name:
        temporary = Path(temporary_name)
        prefix = temporary / "cnet"
        export = subprocess.run(
            [
                str(netconvert),
                "--sumo-net-file", str(net_path),
                "--plain-output-prefix", str(prefix),
                "--plain.extend-edge-shape", "true",
            ],
            env=env,
            text=True,
            capture_output=True,
        )
        if export.returncode:
            raise RuntimeError(f"{scenario}: netconvert plain export failed\n{export.stdout}\n{export.stderr}")

        node_path = temporary / "cnet.nod.xml"
        edge_path = temporary / "cnet.edg.xml"
        connection_path = temporary / "cnet.con.xml"
        tls_path = temporary / "cnet.tll.xml"

        node_tree = ET.parse(node_path)
        crossing_node = next(
            (node for node in node_tree.getroot().findall("node") if node.get("id") == C1_CROSSING_NODE),
            None,
        )
        if crossing_node is None:
            raise ValueError(f"{scenario}: missing supplied C foot-link node {C1_CROSSING_NODE}")
        crossing_node.set("type", "priority")
        x = float(crossing_node.get("x", "0"))
        y = float(crossing_node.get("y", "0"))
        ET.indent(node_tree, space="    ")
        node_tree.write(node_path, encoding="utf-8", xml_declaration=True)

        edge_tree = ET.parse(edge_path)
        edge_root = edge_tree.getroot()

        def split_edge(edge_id: str, continuation_id: str, reverse: bool) -> None:
            edge = next((item for item in edge_root.findall("edge") if item.get("id") == edge_id), None)
            if edge is None:
                raise ValueError(f"{scenario}: missing C1 split edge {edge_id}")
            points = edge.get("shape", "").split()
            point = f"{x:.2f},{y:.2f}"
            west = [value for value in points if float(value.split(",")[0]) < x]
            east = [value for value in points if float(value.split(",")[0]) > x]
            if not west or not east:
                raise ValueError(f"{scenario}: crossing node does not fall inside edge {edge_id}")
            original_to = edge.get("to", "")
            continuation = copy.deepcopy(edge)
            continuation.set("id", continuation_id)
            edge.set("to", C1_CROSSING_NODE)
            if reverse:
                edge.set("shape", " ".join(east + [point]))
                continuation.set("shape", " ".join([point] + west))
            else:
                edge.set("shape", " ".join(west + [point]))
                continuation.set("shape", " ".join([point] + east))
            continuation.set("from", C1_CROSSING_NODE)
            continuation.set("to", original_to)
            edge_root.insert(list(edge_root).index(edge) + 1, continuation)

        split_edge("33128974#0", C1_FORWARD_CONTINUATION, reverse=False)
        split_edge("-33128974#0", C1_REVERSE_CONTINUATION, reverse=True)
        ET.indent(edge_tree, space="    ")
        edge_tree.write(edge_path, encoding="utf-8", xml_declaration=True)

        connection_tree = ET.parse(connection_path)
        connection_root = connection_tree.getroot()
        for connection in connection_root.findall("connection"):
            if connection.get("from") == "33128974#0":
                connection.set("from", C1_FORWARD_CONTINUATION)
            elif connection.get("from") == "-33128974#0":
                connection.set("from", C1_REVERSE_CONTINUATION)
        ET.SubElement(
            connection_root,
            "connection",
            {"from": "33128974#0", "to": C1_FORWARD_CONTINUATION, "fromLane": "0", "toLane": "0"},
        )
        ET.SubElement(
            connection_root,
            "connection",
            {"from": "-33128974#0", "to": C1_REVERSE_CONTINUATION, "fromLane": "0", "toLane": "0"},
        )
        ET.SubElement(
            connection_root,
            "crossing",
            {
                "node": C1_CROSSING_NODE,
                "edges": f"{C1_FORWARD_CONTINUATION} -33128974#0",
                "priority": "1",
                "width": "4.00",
            },
        )
        ET.indent(connection_tree, space="    ")
        connection_tree.write(connection_path, encoding="utf-8", xml_declaration=True)

        generated = temporary / "c1.net.xml.gz"
        build = subprocess.run(
            [
                str(netconvert),
                "--node-files", str(node_path),
                "--edge-files", str(edge_path),
                "--connection-files", str(connection_path),
                "--tllogic-files", str(tls_path),
                "--plain.extend-edge-shape", "true",
                "--geometry.min-radius.fix.railways", "false",
                "--geometry.avoid-overlap", "false",
                "--geometry.max-grade.fix", "false",
                "--offset.disable-normalization", "true",
                "--no-turnarounds", "true",
                "--junctions.corner-detail", "5",
                "--junctions.limit-turn-speed", "5.5",
                "--rectangular-lane-cut", "false",
                "--walkingareas", "true",
                "--output.street-names", "true",
                "--output-file", str(generated),
            ],
            env=env,
            text=True,
            capture_output=True,
        )
        log = "# Plain export\n" + export.stdout + export.stderr + "\n# C1 rebuild\n" + build.stdout + build.stderr
        scenario_dir(scenario).joinpath("c1_netconvert.log").write_text(log, encoding="utf-8")
        if build.returncode:
            raise RuntimeError(f"{scenario}: C1 network rebuild failed; see c1_netconvert.log")
        with gzip.open(generated, "rb") as handle:
            generated_root = ET.parse(handle).getroot()
        crossings = [
            edge for edge in generated_root.findall("edge")
            if edge.get("function") == "crossing" and C1_CROSSING_NODE in edge.get("id", "")
        ]
        if len(crossings) != 1 or crossings[0].get("crossingEdges") != f"{C1_FORWARD_CONTINUATION} -33128974#0":
            raise ValueError(f"{scenario}: C1 priority crossing was not generated correctly")
        publish = net_path.with_name(f".{net_path.name}.c1.tmp")
        shutil.copy2(generated, publish)
        publish.replace(net_path)


def additional_files(config: Path) -> list[Path]:
    root = ET.parse(config).getroot()
    value = root.find("input/additional-files").get("value", "")
    return [config.parent / name for name in split_files(value)]


def standardize_config(scenario: str) -> None:
    config = source_config(scenario)
    tree = ET.parse(config)
    root = tree.getroot()
    output = root.find("output")
    if output is None:
        output = ET.SubElement(root, "output")
    for tag, value in {
        "tripinfo-output": f"tripinfos.{scenario}.xml",
        "personinfo-output": f"personinfos.{scenario}.xml",
        "stop-output": f"stopinfos.{scenario}.xml",
        "statistic-output": f"stats.{scenario}.xml",
    }.items():
        elem = output.find(tag)
        if elem is None:
            elem = ET.SubElement(output, tag)
        elem.set("value", value)
    processing = root.find("processing")
    if processing is None:
        processing = ET.SubElement(root, "processing")
    ignore = processing.find("ignore-route-errors")
    if ignore is None:
        ignore = ET.SubElement(processing, "ignore-route-errors")
    ignore.set("value", "false")
    lateral = processing.find("lateral-resolution")
    if lateral is None:
        lateral = ET.SubElement(processing, "lateral-resolution")
    lateral.set("value", "0.8")
    for random_section in root.findall("random_number"):
        root.remove(random_section)
    random_section = ET.SubElement(root, "random_number")
    ET.SubElement(random_section, "seed", {"value": str(CANONICAL_SEED)})

    detector = None
    edge_output = None
    for path in additional_files(config):
        if not path.exists() or path.suffix != ".xml":
            continue
        add_tree = ET.parse(path)
        if add_tree.getroot().find("inductionLoop") is not None:
            detector = path
            for elem in add_tree.getroot().findall("inductionLoop"):
                elem.set("file", f"school_e1.{scenario}.xml")
            ET.indent(add_tree, space="    ")
            write_xml_atomic(add_tree, path)
        if add_tree.getroot().find("edgeData") is not None:
            edge_output = path
            for elem in add_tree.getroot().findall("edgeData"):
                elem.set("file", f"edgeData.{scenario}.xml")
            ET.indent(add_tree, space="    ")
            write_xml_atomic(add_tree, path)
    if detector is None or edge_output is None:
        raise ValueError(f"Missing detector/edge output definition for {scenario}")
    edges = []
    for elem in ET.parse(detector).getroot().findall("inductionLoop"):
        lane = elem.get("lane", "")
        edge = lane.rsplit("_", 1)[0]
        if edge not in edges:
            edges.append(edge)
    selection = "".join(f"edge:{edge}\n" for edge in edges)
    scenario_dir(scenario).joinpath("school_fcd_edges.txt").write_text(selection, encoding="utf-8")
    scenario_dir(scenario).joinpath("school_ssm_filter.txt").write_text(selection, encoding="utf-8")
    ET.indent(tree, space="    ")
    write_xml_atomic(tree, scenario_dir(scenario) / f"run.{scenario}.sumocfg")


def count_demand(scenario: str) -> dict[str, int | str]:
    counts = Counter()
    for mode in ("passenger", "truck", "bike_moto", "pedestrian"):
        root = ET.parse(mode_file(scenario, mode)).getroot()
        for elem in root:
            if elem.tag == "trip":
                if mode == "bike_moto":
                    counts["bicycle" if "bike_" in elem.get("type", "") else "motorcycle"] += 1
                else:
                    counts[mode] += 1
            elif elem.tag == "person":
                counts["pedestrian"] += 1
                if any("scenarioC_school_frontage_mid_n_link" in walk.get("edges", "") for walk in elem.findall("walk")):
                    counts["pedestrian_crossing"] += 1
    counts["bus"] = len(ET.parse(mode_file(scenario, "bus")).getroot().findall("vehicle"))
    return {
        "scenario": scenario,
        **{
            key: counts[key]
            for key in ("passenger", "truck", "bus", "motorcycle", "bicycle", "pedestrian", "pedestrian_crossing")
        },
    }


def departure_bins(scenario: str, mode: str) -> Counter[int]:
    counts: Counter[int] = Counter()
    for elem in ET.parse(mode_file(scenario, mode)).getroot():
        if elem.tag not in {"trip", "person"}:
            continue
        counts[int(float(elem.get("depart", "0")) // 900)] += 1
    return counts


def write_documentation() -> None:
    ANALYSIS.mkdir(exist_ok=True)
    definitions = []
    for scenario, meta in SCENARIOS.items():
        design = str(meta["design"])
        definitions.append(
            {
                "scenario": scenario,
                "design": design,
                "motorized_trip_response_pct": meta["response_pct"],
                "pedestrian_crossing_share_pct": crossing_share(scenario),
                "report_status": (
                    "observed reference" if design == "current" else
                    "mobility-expert one-way option" if design.startswith("OW_") else
                    "road-safety report Scenario " + design
                ),
                "quantitative_interpretation": (
                    "existing conditions" if design == "current" else
                    "Émile Idiersstraat bus-stop relocation; visibility package qualitative" if design == "A" else
                    "30 km/h chicane with 25 km/h central effective-design-speed proxy; no parking-capacity model" if design == "B" else
                    "full Émile Idiersstraat-Tervuursesteenweg eastbound-only private-traffic section; buses/bicycles two-way; eastbound general traffic right-turn-only; westbound diversion exits at boundary" if design == "OW_FULL" else
                    "reduced Émile Idiersstraat-Bergagegaarde eastbound-only private-traffic section; buses/bicycles two-way; eastbound general traffic right-turn-only at Tervuursesteenweg; westbound diversion exits at boundary" if design == "OW_REDUCED" else
                    (
                        f"20 km/h plus one real mid-block priority crossing; {crossing_share(scenario)}% pedestrian crossing sensitivity"
                        if is_c1(scenario)
                        else "20 km/h shared-space speed/geometry proxy; no pedestrian crossing interaction"
                    )
                ),
                "response_status": (
                    "pedestrian crossing-share sensitivity, not forecast" if is_c1(scenario) else
                    "motorized demand sensitivity, not forecast" if meta["response_pct"] else
                    "observed demand"
                ),
            }
        )
    write_csv(ANALYSIS / "scenario_definitions.csv", definitions)
    write_csv(ANALYSIS / "demand_definition.csv", [count_demand(s) for s in SCENARIOS])

    total_stock = sum(STATBEL_2025.values())
    fleet_rows = []
    for fuel, stock in STATBEL_2025.items():
        fleet_rows.append(
            {
                "vehicle_group": "passenger car",
                "fuel": fuel,
                "stock_2025": stock,
                "share_pct": 100 * stock / total_stock,
                "SUMO_class": EMISSION_CLASS[FUEL_VTYPE[fuel]],
                "evidence": "Statbel fuel share; Euro-stage mapping assumed",
            }
        )
    for vtype in ("truck_truck", "pt_bus", "motorcycle_motorcycle"):
        fleet_rows.append(
            {"vehicle_group": vtype, "fuel": "proxy", "stock_2025": "", "share_pct": "", "SUMO_class": EMISSION_CLASS[vtype], "evidence": "model assumption; not identified by supplied fleet source"}
        )
    write_csv(ANALYSIS / "fleet_assumptions.csv", fleet_rows)

    write_csv(
        ANALYSIS / "calibration_targets.csv",
        [
            {"target": key, "observed": value, "date": "2025-10-01", "use": "exact 15-minute input demand profile; daily detector total checked"}
            for key, value in OBSERVED_SENSOR_TOTALS.items()
        ] + [
            {"target": "motorized speed >36 km/h", "observed": OBSERVED_SPEED_OVER_36_PCT, "date": "September 2024", "use": "aggregate secondary speed calibration target"}
        ],
    )
    car_bins = departure_bins("current", "passenger")
    two_wheeler_bins = departure_bins("current", "bike_moto")
    pedestrian_bins = departure_bins("current", "pedestrian")
    write_csv(
        ANALYSIS / "observed_sensor_profile.csv",
        [
            {
                "bin_index": index,
                "window_start": f"{index // 4:02d}:{(index % 4) * 15:02d}",
                "pedestrian_total": pedestrian_bins[index],
                "two_wheeler_total": two_wheeler_bins[index],
                "car_total": car_bins[index],
                "large_vehicle_total": OBSERVED_LARGE_15MIN[index],
                "source": "supplied 2025-10-01 sensor table; no directions or trajectories",
            }
            for index in range(96)
        ],
    )
    traceability = [
        ("Baseline", "15-minute pedestrians, two-wheelers, cars, large vehicles", "corridor-boundary demand files", "input departure bins represented exactly; detector passage times can shift to adjacent bins through route travel and queues; daily totals exact"),
        ("Baseline", "sensor has no direction or OD/turning fields", "balanced per-bin directional split; fixed corridor boundary ODs", "explicit structural assumption; scheduled buses retain timetable direction; no network-wide demand claim"),
        ("Baseline", "large-vehicle total", "one passage per timetable-proxy bus plus residual trucks", "803/803 exact; 107 buses and 696 residual trucks; bus timetable uses a near-date weekday proxy"),
        ("Baseline", "pedestrian total without trajectories", "two non-crossing frontage-sidewalk exposure paths", "count represented; pedestrian conflict effects not estimated"),
        ("Baseline", "cars and bicycles share the carriageway", "common 0.8 m SUMO sublane resolution", "represented consistently across all cases; no overtaking calibration observations supplied"),
        ("Baseline", "37% of motorized vehicles above 36 km/h", "point-speed calibration", "represented as secondary target from September 2024"),
        ("A", "markings, school-zone visibility, lighting, sightlines", "none", "qualitative; no empirical behavior effect supplied"),
        ("A/B/C", "westbound and eastbound stops could move toward Émile Idiersstraat", "named Bergoje stop relocated once per bus direction; bus approach/recovery retained beyond both stop locations", "represented as a shared scenario assumption"),
        ("A/all", "discourage through traffic / traffic movement study", "DR15/DR30 motorized-trip response factor", "sensitivity only; local/through trips not identifiable from sensor counts"),
        ("B", "retain 30 km/h limit; remove six parking spaces and insert a chicane", "chicane geometry plus 25 km/h central effective-design-speed proxy", "chicane represented; OSM baseline has no parkingArea objects, so the six-space capacity/removal effect is not modeled"),
        ("B", "relocate stops / flexible freed space", "design-specific stop files", "represented where encoded; kerb-use effects not simulated"),
        ("C", "20 km/h shared space on the named street section", "20 km/h network edges", "represented"),
        ("C0", "raised curbless surface and crossing anywhere", "20 km/h speed/geometry proxy", "no pedestrian crossing interaction; retains the motor-vehicle operational comparison"),
        ("C1", "pedestrian priority / crossing anywhere", "one real mid-block priority crossing at the supplied foot-link location; nested 25/50/75% crossing shares", "interaction sensitivity only; crossing locations, shares, trajectories and yielding behavior were not observed"),
        ("C1", "continuous cross-anywhere movement", "not modeled", "standard SUMO crossing topology is discrete; one report-aligned logical band does not represent a continuous shared surface"),
        ("OW_FULL", "mobility-expert full one-way option", "westbound lanes reserved to buses/bicycles from Tervuursesteenweg to Émile Idiersstraat; eastbound private trips routed right at Tervuursesteenweg", "street access and right-turn instruction represented; existing northbound Oude Molenstraat motor-traffic direction retained because it already matches the slide"),
        ("OW_REDUCED", "mobility-expert reduced one-way option", "westbound lanes reserved to buses/bicycles from Bergagegaarde to Émile Idiersstraat; eastbound private trips continue through the unchanged eastern section and turn right at Tervuursesteenweg", "street access and repeated slide right-turn instruction represented"),
        ("OW_FULL/OW_REDUCED", "private westbound circulation after closure", "all trips retained but terminated at the intervention boundary", "off-network diversion is not modeled because the clipped OSM-Wizard network has no connected bypass; total route emissions/time are not comparable with current conditions"),
        ("OW_FULL/OW_REDUCED", "directional traffic demand", "balanced per-bin split inherited from the sensor boundary formulation", "structural assumption; the supplied sensor contains no direction field, so the frontage-flow reduction is not a measured forecast"),
        ("Fleet", "2025 Belgian passenger cars by fuel", "deterministic fuel shares", "represented; national stock is a proxy for local traffic"),
        ("Fleet", "Euro stage / age", "HBEFA class", "assumption; absent from cited Statbel table"),
    ]
    write_csv(ANALYSIS / "evidence_traceability.csv", [
        {"case": a, "report_or_data_statement": b, "model_lever": c, "status": d} for a, b, c, d in traceability
    ])

    # The repository README is curated for public release. Preserve it when
    # regenerating cases and analysis documentation.
    if not ROOT.joinpath("README.md").exists():
        ROOT.joinpath("README.md").write_text(
        """# Evidence-aligned SUMO school-street experiment v21

This package rebuilds the experiment around the three scenarios in the 2025 road-safety inspection: A, B and C.
The former D/E labels are removed because they are not report scenarios. `OBS` means the full observed passage
profile. `DR15` and `DR30` are separate demand-response sensitivities, so traffic reduction is not confused with
street-design effects or used to make a design numerically viable.

The observed reference preserves the 15-minute sensor counts as school-corridor boundary input demand. It does not
invent network-wide origins, destinations or turning movements that the sensor did not observe. Line 34 uses
OSM-derived corridor geometry and 107 scheduled Bergoje calls extracted from the nearest public archived Wednesday
GTFS feed; this is explicitly a 15 October proxy for the 1 October sensor date, not an exact-date timetable. Residual
large-vehicle counts are trucks, giving an exact 803/803 daily large calibration. SUMO travel time and queuing can
move some detector passages into an adjacent 15-minute output bin; this redistribution is reported separately.
Pedestrian counts remain exact. Baseline/A/B/C0 use frontage-sidewalk exposure because no trajectories were
supplied. C1_X0 is the identical rebuilt crossing-network control with no crossing pedestrians. C1_L25/C1_M50/C1_H75 route nested 25/50/75% shares through one real SUMO priority crossing at the
mid-block foot-link location already present in the supplied C geometry. These are interaction sensitivities,
not calibrated crossing forecasts or a claim of continuous cross-anywhere movement.
All cases use the same 0.8 m sublane resolution so car-bicycle interaction is not changed between designs.

Desired speeds are calibrated to the report's secondary target of 37% of motorized traffic above 36 km/h using
point speeds at the detector location. Scenario A quantifies the report-supported bus-stop relocation, while visual,
lighting and sightline effects remain qualitative until before/after behavior data exist. B represents the 30 km/h chicane with
a provisional 25 km/h effective central design-speed proxy; C0 represents the 20 km/h shared-space section. C1
adds pedestrian-priority interaction while holding the full observed vehicle, bus and pedestrian totals fixed. All
observed-demand cases must complete across five seeds without jam/yield teleports.

V21 additionally reconstructs the mobility expert's two separately supplied one-way concepts as `OW_FULL` and
`OW_REDUCED`, rather than reusing the invalid legacy D/E outputs. Private motor traffic is eastbound only; buses
and bicycles remain two-way. Every observed vehicle instance remains loaded, but prohibited westbound private
trips exit at the intervention boundary because the clipped OSM-Wizard network contains no connected external
detour. Off-network diversion time and emissions are outside scope, so total route-emissions and trip-time values
from these cases are not directly comparable with current conditions.

Run `scripts/run_all.sh` with SUMO 1.27.1. Read `analysis/evidence_traceability.csv` before interpreting results.
Emissions are SUMO/HBEFA tailpipe estimates. Statbel anchors passenger fuel shares, while Euro-stage mappings,
non-passenger classes, and the national-to-local fleet transfer are explicit assumptions. The package includes a
newer-versus-conservative passenger Euro-stage boundary test.
""",
        encoding="utf-8",
    )
    for scenario, meta in SCENARIOS.items():
        design = str(meta["design"])
        response = int(meta["response_pct"])
        crossing = crossing_share(scenario)
        description = (
            "Calibrated observed reference" if design == "current" else
            "Road-safety Scenario A: bus-stop relocation quantified; visual and lighting package qualitative" if design == "A" else
            "Road-safety Scenario B: chicane plus relocated stops; no parking-capacity model" if design == "B" else
            "Mobility-expert full one-way option: private eastbound only; bus/bicycle counterflow; right turn at Tervuursesteenweg" if design == "OW_FULL" else
            "Mobility-expert reduced one-way option: private eastbound only to Bergagegaarde; bus/bicycle counterflow; right turn at Tervuursesteenweg" if design == "OW_REDUCED" else
            "Road-safety Scenario C: matched discrete priority-crossing sensitivity" if is_c1(scenario) else
            "Road-safety Scenario C: 20 km/h shared-space operational proxy"
        )
        response_note = (
            f"Nested pedestrian crossing-share sensitivity: {crossing}%. Compare only with C1_X0."
            if is_c1(scenario) else
            f"Motorized demand response: {response}%. This is a sensitivity, not a forecast."
            if response else
            "Full observed input profile; no design-induced demand reduction is assumed."
        )
        scope_note = (
            "Off-network private diversion is not modeled; do not compare total trip time, VKT or emissions with the baseline."
            if design in {"OW_FULL", "OW_REDUCED"} else
            "Use the guidebook and evidence traceability matrix for modeled and qualitative requirements."
        )
        scenario_dir(scenario).joinpath("README.md").write_text(
            f"""# {scenario}

{description}.

- Design family: `{design}`
- {response_note}
- Run configuration: `run.{scenario}.sumocfg`
- Interpretation boundary: {scope_note}

Authoritative documentation is in `../docs/GUIDEBOOK.md`, `../evidence/scenario_requirements.csv`,
`../analysis/technical_results_summary.md` and `../analysis/validation_report.md`.
""",
            encoding="utf-8",
        )
    for folder, label in (("current", "existing network"), ("B", "chicane network"), ("C", "shared-space network"), ("C1", "validated shared-space crossing network")):
        TEMPLATES.joinpath(folder, "README.md").write_text(
            f"""# Source template: {label}

This folder contains immutable source inputs used by `scripts/prepare_experiment.py`. It is not a result case.
Generated cases and authoritative outputs are at the package root and in `analysis/`.
""",
            encoding="utf-8",
        )


def assert_prepared_behavior() -> None:
    """Fail preparation before SUMO if any legacy scenario behavior survives."""
    forbidden = {"tau", "sigma", "lcAssertive", "jmTimegapMinor"}
    for scenario in SCENARIOS:
        for path in route_files(scenario):
            root = ET.parse(path).getroot()
            for vtype in root.findall("vType"):
                if vtype.get("id", "") not in EMISSION_CLASS:
                    continue
                if vtype.get("speedFactor") != CALIBRATED_SPEED_FACTOR or forbidden & set(vtype.attrib):
                    raise ValueError(f"{scenario}: legacy/inconsistent behavior in {path.name}: {vtype.attrib}")


def expected_ids(scenario: str, mode: str) -> set[str]:
    """Reproduce the deterministic response filter without editing a file."""
    source = [copy.deepcopy(elem) for elem in ET.parse(mode_file("current", mode)).getroot().findall("trip")]
    response = int(SCENARIOS[scenario]["response_pct"])
    if response == 0:
        return {elem.get("id", "") for elem in source}
    groups: dict[tuple[int, str], list[ET.Element]] = defaultdict(list)
    always_keep = set()
    for elem in source:
        is_motorcycle = "motorcycle" in elem.get("type", "").lower()
        if mode == "bike_moto" and not is_motorcycle:
            always_keep.add(elem.get("id", ""))
        else:
            groups[trip_group(elem)].append(elem)
    keep = set(always_keep)
    keep_fraction = 1 - response / 100
    for trips in groups.values():
        ranked = sorted(
            trips,
            key=lambda elem: hashlib.sha256(("response:" + elem.get("id", "")).encode()).hexdigest(),
        )
        keep.update(elem.get("id", "") for elem in ranked[:round(len(ranked) * keep_fraction)])
    return keep


def prepared_errors(scenario: str) -> list[str]:
    """Return publication, demand, OD, network and behavior inconsistencies."""
    errors = []
    try:
        files = route_files(scenario)
        for path in files:
            ET.parse(path)
    except (OSError, ET.ParseError, ValueError) as exc:
        return [f"route XML: {exc}"]

    forbidden = {"tau", "sigma", "lcAssertive", "jmTimegapMinor"}
    for path in files:
        for vtype in ET.parse(path).getroot().findall("vType"):
            if vtype.get("id", "") in EMISSION_CLASS and (
                vtype.get("speedFactor") != CALIBRATED_SPEED_FACTOR or forbidden & set(vtype.attrib)
            ):
                errors.append(f"behavior {path.name}:{vtype.get('id')}")

    for mode in ("passenger", "truck", "bike_moto"):
        root = ET.parse(mode_file(scenario, mode)).getroot()
        trips = root.findall("trip")
        actual_ids = {trip.get("id", "") for trip in trips}
        expected = expected_ids(scenario, mode)
        if actual_ids != expected:
            errors.append(f"{mode} IDs {len(actual_ids)} != expected {len(expected)}")
        bad_od = []
        for trip in trips:
            actual = (trip.get("from", ""), trip.get("to", ""), trip.get("via", ""))
            if actual != trip_od(scenario, trip):
                bad_od.append(trip.get("id", ""))
        if bad_od:
            errors.append(f"{mode} OD mismatch {bad_od[:2]}")

    bus_root = ET.parse(mode_file(scenario, "bus")).getroot()
    if len(bus_root.findall("vehicle")) != 107:
        errors.append(f"bus vehicles={len(bus_root.findall('vehicle'))}")

    config_root = ET.parse(source_config(scenario)).getroot()
    net_path = scenario_dir(scenario) / config_root.find("input/net-file").get("value", "")
    opener = gzip.open if net_path.suffix == ".gz" else open
    try:
        with opener(net_path, "rb") as handle:
            net_root = ET.parse(handle).getroot()
    except (OSError, ET.ParseError, EOFError) as exc:
        return errors + [f"network XML: {exc}"]
    design = str(SCENARIOS[scenario]["design"])
    if design in ONEWAY_RESTRICTED_EDGES:
        found = set()
        for edge in net_root.findall("edge"):
            if edge.get("id", "") not in ONEWAY_RESTRICTED_EDGES[design]:
                continue
            found.add(edge.get("id", ""))
            permissions = [lane.get("allow", "") for lane in edge.findall("lane")]
            if not permissions or any(value not in {"bicycle", "bus bicycle"} for value in permissions) or "bus bicycle" not in permissions:
                errors.append(f"one-way permissions {edge.get('id')}={permissions}")
        if found != ONEWAY_RESTRICTED_EDGES[design]:
            errors.append(f"one-way edges missing={sorted(ONEWAY_RESTRICTED_EDGES[design] - found)}")
    if is_c1(scenario):
        edge_ids = {edge.get("id", "") for edge in net_root.findall("edge")}
        if {C1_FORWARD_CONTINUATION, C1_REVERSE_CONTINUATION} - edge_ids:
            errors.append("C1 split edges missing")
    return errors


def prepare_scenario(scenario: str) -> None:
    copy_template(scenario)
    apply_report_bus_stop_relocation(scenario)
    if scenario == "current":
        neutralize_current_direction_split()
        assign_current_fleet()
        constrain_public_transport(scenario)
        rebuild_current_trucks_from_sensor_large()
    else:
        for mode in ("passenger", "truck", "bike_moto"):
            replace_trips_from_current(scenario, mode)
        constrain_public_transport(scenario)
    constrain_to_observed_corridor(scenario)
    configure_pedestrian_routes(scenario)
    response = int(SCENARIOS[scenario]["response_pct"])
    filter_route(mode_file(scenario, "passenger"), response)
    filter_route(mode_file(scenario, "truck"), response)
    filter_route(mode_file(scenario, "bike_moto"), response, motorcycle_only=True)
    standardize_behavior(scenario)
    normalize_design_network(scenario)
    build_c1_priority_crossing(scenario)
    standardize_config(scenario)
    standardize_behavior(scenario)


def main() -> None:
    for scenario in SCENARIOS:
        prepare_scenario(scenario)
    for repair_round in range(1, 4):
        bad = {scenario: prepared_errors(scenario) for scenario in SCENARIOS}
        bad = {scenario: detail for scenario, detail in bad.items() if detail}
        if not bad:
            break
        print(f"Preparation integrity repair {repair_round}: {bad}", flush=True)
        targets = list(SCENARIOS) if "current" in bad else list(bad)
        for scenario in targets:
            prepare_scenario(scenario)
    final_bad = {scenario: prepared_errors(scenario) for scenario in SCENARIOS}
    final_bad = {scenario: detail for scenario, detail in final_bad.items() if detail}
    if final_bad:
        raise ValueError(f"Prepared-input integrity failed after repair: {final_bad}")
    assert_prepared_behavior()
    write_documentation()
    print(f"Prepared {len(SCENARIOS)} evidence-aligned OBS/DR, C1 and one-way cases.")


if __name__ == "__main__":
    main()
