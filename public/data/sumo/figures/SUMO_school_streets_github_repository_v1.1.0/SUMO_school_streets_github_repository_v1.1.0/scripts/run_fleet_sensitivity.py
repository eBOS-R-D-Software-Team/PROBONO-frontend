#!/usr/bin/env python3
"""Run a conservative passenger Euro-stage boundary without altering prepared cases."""

from __future__ import annotations

import copy
import os
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

from common import ANALYSIS, SCENARIOS, config_path, parse_tripinfo, scenario_dir, write_csv
from run_experiment import find_sumo


EURO5 = {
    "veh_passenger_petrol_be2025": "HBEFA4/PC_petrol_Euro-5",
    "veh_passenger_diesel_be2025": "HBEFA4/PC_diesel_Euro-5",
    "veh_passenger_hybrid_be2025": "HBEFA4/PC_petrol_Euro-5",
    "veh_passenger_electric_be2025": "HBEFA4/PC_BEV",
    "veh_passenger_gas_be2025": "HBEFA4/PC_CNG_petrol_Euro-5_(CNG)",
    "veh_passenger_other_be2025": "HBEFA4/PC_petrol_Euro-5",
}
METRICS = ("CO2_kg", "CO_kg", "HC_kg", "PMx_kg", "NOx_kg", "fuel_kg", "electricity_kWh", "vkt_km", "CO2_g_per_vkm")


def patch_passenger_classes(folder: Path) -> None:
    for path in folder.glob("*.xml"):
        try:
            tree = ET.parse(path)
        except ET.ParseError:
            continue
        changed = False
        for elem in tree.getroot().findall("vType"):
            if elem.get("id", "") in EURO5:
                elem.set("emissionClass", EURO5[elem.get("id", "")])
                changed = True
        if changed:
            ET.indent(tree, space="    ")
            tree.write(path, encoding="utf-8", xml_declaration=True)


def run_euro5(binary: Path, scenario: str) -> dict[str, float | int]:
    with tempfile.TemporaryDirectory(prefix=f"sumo_fleet_{scenario}_") as temp:
        folder = Path(temp) / scenario
        shutil.copytree(scenario_dir(scenario), folder, ignore=shutil.ignore_patterns("logs", "fcd.school.*", "ssm.school.*", "tripinfos.*", "personinfos.*", "stopinfos.*", "stats.*", "edgeData.*", "school_e1.*", "collisions.*"))
        patch_passenger_classes(folder)
        command = [
            str(binary), "-c", config_path(scenario).name, "--seed", "42",
            "--ignore-route-errors", "false", "--output-prefix", "euro5.",
            "--duration-log.statistics", "true", "--no-warnings", "true",
        ]
        env = os.environ.copy()
        env.setdefault("SUMO_HOME", str(binary.parent.parent))
        completed = subprocess.run(command, cwd=folder, env=env, text=True, capture_output=True)
        if completed.returncode:
            raise RuntimeError(f"{scenario}: {completed.stdout[-1000:]} {completed.stderr[-1000:]}")
        metrics, _ = parse_tripinfo(folder / f"euro5.tripinfos.{scenario}.xml")
        return metrics


def main() -> None:
    binary = find_sumo(None)
    rows = []
    for index, scenario in enumerate(SCENARIOS, 1):
        print(f"[{index}/{len(SCENARIOS)}] fleet boundary: {scenario}", flush=True)
        central, _ = parse_tripinfo(scenario_dir(scenario) / f"tripinfos.{scenario}.xml")
        conservative = run_euro5(binary, scenario)
        for label, values in (("newer_Euro6d_proxy", central), ("conservative_Euro5_proxy", conservative)):
            row: dict[str, object] = {
                "scenario": scenario,
                "passenger_fleet_boundary": label,
                "status": "assumption boundary; not observed local Euro-stage distribution",
            }
            row.update({metric: values[metric] for metric in METRICS})
            if label == "conservative_Euro5_proxy":
                for metric in ("CO2_kg", "NOx_kg", "PMx_kg", "CO2_g_per_vkm"):
                    base = float(central[metric])
                    row[f"{metric}_change_vs_newer_pct"] = 100 * (float(values[metric]) - base) / base if base else 0.0
            rows.append(row)
    write_csv(ANALYSIS / "fleet_emission_sensitivity.csv", rows)
    print("Wrote passenger Euro-stage boundary sensitivity.")


if __name__ == "__main__":
    main()
