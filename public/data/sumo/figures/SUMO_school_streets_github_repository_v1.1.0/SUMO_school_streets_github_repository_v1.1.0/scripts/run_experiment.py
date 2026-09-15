#!/usr/bin/env python3
"""Run canonical safety outputs and compact multi-seed SUMO replications."""

from __future__ import annotations

import argparse
import csv
import os
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from common import (
    ANALYSIS,
    CALIBRATED_SPEED_FACTOR,
    CANONICAL_SEED,
    DEFAULT_SEEDS,
    SCENARIOS,
    collect_scenario_metrics,
    config_path,
    output_paths,
    scenario_dir,
    write_csv,
)
from prepare_experiment import prepared_errors


def verify_prepared_inputs(scenario: str) -> None:
    """Reject a generated case if any configured motorized type changed after preparation."""
    forbidden = {"tau", "sigma", "lcAssertive", "jmTimegapMinor"}
    config_root = ET.parse(config_path(scenario)).getroot()
    value = config_root.find("input/route-files").get("value", "")
    names = [item.strip() for item in value.replace("\n", " ").split(",") if item.strip()]
    checked = 0
    for name in names:
        path = scenario_dir(scenario) / name
        root = ET.parse(path).getroot()
        for vtype in root.findall("vType"):
            if vtype.get("emissionClass") is None or vtype.get("vClass") == "bicycle":
                continue
            checked += 1
            if vtype.get("speedFactor") != CALIBRATED_SPEED_FACTOR or forbidden & set(vtype.attrib):
                raise ValueError(f"{scenario}: unprepared motorized type in {path.name}: {vtype.attrib}")
    if checked == 0:
        raise ValueError(f"{scenario}: no configured motorized types found")


def find_sumo(explicit: str | None) -> Path:
    candidates = []
    if explicit:
        candidates.append(Path(explicit))
    if os.environ.get("SUMO_BINARY"):
        candidates.append(Path(os.environ["SUMO_BINARY"]))
    system = shutil.which("sumo")
    if system:
        candidates.append(Path(system))
    try:
        import sumo  # type: ignore

        candidates.append(Path(sumo.__file__).resolve().parent / "bin" / "sumo")
    except ImportError:
        pass
    for candidate in candidates:
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate.resolve()
    raise SystemExit("SUMO binary not found. Install eclipse-sumo==1.27.1 or pass --sumo-binary.")


def base_command(binary: Path, scenario: str, seed: int) -> list[str]:
    return [
        str(binary),
        "-c",
        config_path(scenario).name,
        "--seed",
        str(seed),
        "--ignore-route-errors",
        "false",
        "--collision.check-junctions",
        "true",
        "--collision.action",
        "warn",
        "--intermodal-collision.action",
        "warn",
        "--duration-log.statistics",
        "true",
    ]


def fcd_options(scenario: str) -> list[str]:
    return [
        "--fcd-output",
        f"fcd.school.{scenario}.xml.gz",
        "--fcd-output.filter-edges.input-file",
        "school_fcd_edges.txt",
        "--fcd-output.attributes",
        "id,type,speed,lane,pos",
        "--device.fcd.period",
        "1",
    ]


def safety_options(scenario: str) -> list[str]:
    return [
        "--collision-output",
        f"collisions.{scenario}.xml",
        "--device.ssm.probability",
        "1",
        "--device.ssm.deterministic",
        "true",
        "--device.ssm.file",
        f"ssm.school.{scenario}.xml.gz",
        "--device.ssm.measures",
        "TTC PET",
        "--device.ssm.thresholds",
        "3.0 2.0",
        "--device.ssm.range",
        "50",
        "--device.ssm.filter-edges.input-file",
        "school_ssm_filter.txt",
        "--device.ssm.write-lane-positions",
        "true",
        "--device.ssm.exclude-conflict-types",
        "none",
    ]


def run_one(binary: Path, scenario: str, seed: int, canonical: bool) -> dict[str, object]:
    folder = scenario_dir(scenario)
    logs = folder / "logs"
    logs.mkdir(exist_ok=True)
    prefix = "" if canonical else f"seed{seed}."
    command = base_command(binary, scenario, seed)
    command.extend(fcd_options(scenario))
    if canonical:
        command.extend(safety_options(scenario))
    else:
        command.extend([
            "--output-prefix",
            prefix,
            "--collision-output",
            f"collisions.{scenario}.xml",
        ])

    env = os.environ.copy()
    env.setdefault("SUMO_HOME", str(binary.parent.parent))
    row = None
    for attempt in (1, 2):
        verify_prepared_inputs(scenario)
        for path in output_paths(scenario, prefix).values():
            if path.exists():
                path.unlink()
        log_path = logs / f"run.seed{seed}.log"
        with log_path.open("w", encoding="utf-8") as log:
            completed = subprocess.run(command, cwd=folder, env=env, stdout=log, stderr=subprocess.STDOUT)
        if completed.returncode:
            tail = "\n".join(log_path.read_text(encoding="utf-8", errors="replace").splitlines()[-30:])
            raise RuntimeError(f"SUMO failed for {scenario}, seed {seed}:\n{tail}")
        try:
            row = collect_scenario_metrics(
                scenario,
                prefix=prefix,
                include_fcd=True,
                include_safety_files=canonical,
            )
            break
        except (ET.ParseError, EOFError, OSError) as exc:
            if attempt == 2:
                raise RuntimeError(
                    f"{scenario}, seed {seed}: incomplete XML output after two complete SUMO runs"
                ) from exc
            print(f"{scenario}, seed {seed}: incomplete XML output; retrying once", flush=True)
    if row is None:
        raise RuntimeError(f"{scenario}, seed {seed}: no metrics collected")
    row["seed"] = seed
    row["canonical"] = "yes" if canonical else "no"
    if not canonical:
        for path in output_paths(scenario, prefix).values():
            if path.exists():
                path.unlink()
        for path in folder.glob(f"{prefix}*"):
            if path.is_file():
                path.unlink()
    return row


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sumo-binary", help="Path to SUMO 1.27.1 binary")
    parser.add_argument("--seeds", type=int, nargs="+", default=list(DEFAULT_SEEDS))
    parser.add_argument("--scenarios", nargs="+", choices=list(SCENARIOS), default=list(SCENARIOS))
    args = parser.parse_args()

    binary = find_sumo(args.sumo_binary)
    version = subprocess.run([str(binary), "--version"], text=True, capture_output=True, check=True).stdout
    first_line = version.splitlines()[0] if version else ""
    if "1.27.1" not in first_line:
        raise SystemExit(f"Expected SUMO 1.27.1 for exact reproducibility; found: {first_line}")

    seeds = list(dict.fromkeys(args.seeds))
    if CANONICAL_SEED not in seeds:
        seeds.insert(0, CANONICAL_SEED)
    ANALYSIS.mkdir(exist_ok=True)
    rows: list[dict[str, object]] = []
    replicate_path = ANALYSIS / "replicate_kpis.csv"
    if set(args.scenarios) != set(SCENARIOS) and replicate_path.exists():
        with replicate_path.open(encoding="utf-8", newline="") as handle:
            rows = [row for row in csv.DictReader(handle) if row.get("scenario") not in set(args.scenarios)]
    total = len(args.scenarios) * len(seeds)
    completed = 0
    for scenario in args.scenarios:
        if errors := prepared_errors(scenario):
            raise ValueError(f"{scenario}: prepared-input integrity failed before simulation: {errors}")
        for seed in seeds:
            canonical = seed == CANONICAL_SEED
            completed += 1
            print(f"[{completed}/{total}] {scenario}, seed {seed}{' (canonical safety run)' if canonical else ''}", flush=True)
            rows.append(run_one(binary, scenario, seed, canonical))
            write_csv(replicate_path, rows)
    print(f"Completed {total} SUMO runs with {first_line}.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise
