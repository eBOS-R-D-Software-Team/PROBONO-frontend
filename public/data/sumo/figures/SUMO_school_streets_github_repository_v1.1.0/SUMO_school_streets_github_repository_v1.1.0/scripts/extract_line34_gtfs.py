#!/usr/bin/env python3
"""Extract scheduled Line 34 calls at Bergoje from a dated GTFS archive."""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import io
import zipfile
from pathlib import Path


BERGOJE_NAME = "BERGOJE"
WINDOW_START = 7 * 3600 + 30 * 60
WINDOW_END = 19 * 3600 + 30 * 60


def gtfs_seconds(value: str) -> int:
    hours, minutes, seconds = (int(part) for part in value.split(":"))
    return hours * 3600 + minutes * 60 + seconds


def read_table(archive: zipfile.ZipFile, name: str) -> list[dict[str, str]]:
    with archive.open(name) as handle:
        return list(
            csv.DictReader(io.TextIOWrapper(handle, encoding="utf-8-sig", newline=""))
        )


def active_services(
    calendar: list[dict[str, str]],
    exceptions: list[dict[str, str]],
    service_date: dt.date,
) -> set[str]:
    date_text = service_date.strftime("%Y%m%d")
    weekday = service_date.strftime("%A").lower()
    active = {
        row["service_id"]
        for row in calendar
        if row.get(weekday) == "1"
        and row["start_date"] <= date_text <= row["end_date"]
    }
    for row in exceptions:
        if row["date"] != date_text:
            continue
        if row["exception_type"] == "1":
            active.add(row["service_id"])
        elif row["exception_type"] == "2":
            active.discard(row["service_id"])
    return active


def sumo_mapping(headsign: str) -> tuple[str, str, str]:
    normalized = headsign.upper()
    if "SAINTE-ANNE" in normalized or "SINT-ANNA" in normalized:
        return "pos", "pt_bus_34:1", "4052677689"
    if "PORTE DE NAMUR" in normalized or "NAAMSEPOORT" in normalized:
        return "neg", "pt_bus_34:0", "-4059785907"
    raise ValueError(f"Unsupported Line 34 headsign: {headsign!r}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("gtfs_zip", type=Path)
    parser.add_argument("output_csv", type=Path)
    parser.add_argument("--service-date", default="2025-10-15")
    parser.add_argument("--target-date", default="2025-10-01")
    parser.add_argument("--source-dataset-id", default="mdb-1857-202510130051")
    parser.add_argument(
        "--status", default="near-date_weekday_proxy_not_exact_sensor_date"
    )
    args = parser.parse_args()

    service_date = dt.date.fromisoformat(args.service_date)
    source_sha256 = hashlib.sha256(args.gtfs_zip.read_bytes()).hexdigest()
    with zipfile.ZipFile(args.gtfs_zip) as archive:
        routes = read_table(archive, "routes.txt")
        route_ids = {
            row["route_id"] for row in routes if row.get("route_short_name") == "34"
        }
        if not route_ids:
            raise ValueError("Line 34 was not found in routes.txt")

        stops = read_table(archive, "stops.txt")
        stop_ids = {
            row["stop_id"]
            for row in stops
            if row.get("stop_name", "").strip().upper() == BERGOJE_NAME
        }
        if not stop_ids:
            raise ValueError("Bergoje was not found in stops.txt")

        services = active_services(
            read_table(archive, "calendar.txt"),
            read_table(archive, "calendar_dates.txt"),
            service_date,
        )
        trips = {
            row["trip_id"]: row
            for row in read_table(archive, "trips.txt")
            if row["route_id"] in route_ids and row["service_id"] in services
        }

        rows: list[dict[str, str | int]] = []
        with archive.open("stop_times.txt") as handle:
            reader = csv.DictReader(
                io.TextIOWrapper(handle, encoding="utf-8-sig", newline="")
            )
            for stop_time in reader:
                trip = trips.get(stop_time["trip_id"])
                if trip is None or stop_time["stop_id"] not in stop_ids:
                    continue
                departure_seconds = gtfs_seconds(stop_time["departure_time"])
                if not WINDOW_START <= departure_seconds < WINDOW_END:
                    continue
                direction, sumo_route, sumo_bus_stop = sumo_mapping(
                    trip.get("trip_headsign", "")
                )
                rows.append(
                    {
                        "target_sensor_date": args.target_date,
                        "proxy_service_date": service_date.isoformat(),
                        "scheduled_departure": stop_time["departure_time"],
                        "scheduled_seconds": departure_seconds,
                        "sensor_bin": departure_seconds // 900,
                        "gtfs_stop_id": stop_time["stop_id"],
                        "gtfs_trip_id": stop_time["trip_id"],
                        "gtfs_direction_id": trip.get("direction_id", ""),
                        "trip_headsign": trip.get("trip_headsign", ""),
                        "sumo_direction": direction,
                        "sumo_route": sumo_route,
                        "sumo_bus_stop": sumo_bus_stop,
                        "timetable_status": args.status,
                        "source_dataset_id": args.source_dataset_id,
                        "source_sha256": source_sha256,
                    }
                )

    rows.sort(key=lambda row: (int(row["scheduled_seconds"]), str(row["sumo_direction"])))
    if not rows:
        raise ValueError("No Line 34 Bergoje calls occur inside the sensor window")
    args.output_csv.parent.mkdir(parents=True, exist_ok=True)
    with args.output_csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} scheduled Bergoje calls to {args.output_csv}")


if __name__ == "__main__":
    main()
