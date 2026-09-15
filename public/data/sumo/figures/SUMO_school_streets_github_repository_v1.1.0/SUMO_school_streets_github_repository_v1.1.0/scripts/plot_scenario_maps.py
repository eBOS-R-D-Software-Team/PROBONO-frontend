#!/usr/bin/env python3
"""Create publication-safe schematics directly from the validated SUMO networks.

The figures deliberately avoid third-party basemap imagery. They show the
implemented SUMO topology and levers, not construction drawings.
"""

from __future__ import annotations

import gzip
import math
import xml.etree.ElementTree as ET
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.lines import Line2D


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "figures"

# Okabe-Ito-derived, colour-vision-deficiency-safe palette.
INK = "#263238"
ROAD = "#B8C2CC"
BLUE = "#0072B2"
SKY = "#56B4E9"
ORANGE = "#E69F00"
PURPLE = "#7A4EAB"
LIGHT = "#F3F5F7"

VIEW = (140, 590, 220, 340)
STREET_LABELS = [
    (165, 323, "Émile\nIdiersstraat"),
    (221, 305, "Jacques Bassemstraat"),
    (268, 308, "Rue du Vieux Moulin"),
    (412, 250, "Clos du Bergoje"),
    (552, 289, "Tervuursesteenweg"),
]


def open_xml(path: Path) -> ET.Element:
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rb") as handle:
        return ET.parse(handle).getroot()


def points(shape: str) -> list[tuple[float, float]]:
    return [tuple(map(float, token.split(","))) for token in shape.split()]


def network(case: str) -> tuple[ET.Element, Path]:
    candidates = {
        "current": [ROOT / "current" / "osm.net.xml.gz"],
        "A": [ROOT / "A_OBS" / "osm.net.xml.gz"],
        "B": [
            ROOT / "B_OBS" / "osm.scenarioB.sim.net.xml.gz",
            ROOT / "B_OBS" / "osm.scenarioB.net.xml.gz",
        ],
        "C": [ROOT / "C_OBS" / "osm.scenarioC.net.xml.gz"],
        "C1": [ROOT / "C1_M50" / "osm.scenarioC.net.xml.gz"],
        "D": [ROOT / "OW_FULL_OBS" / "osm.net.xml.gz"],
        "E": [ROOT / "OW_REDUCED_OBS" / "osm.net.xml.gz"],
    }[case]
    path = next((item for item in candidates if item.exists()), None)
    if path is None:
        raise FileNotFoundError(f"No generated network found for {case}; run prepare_experiment.py first")
    return open_xml(path), path


def edge_shapes(root: ET.Element) -> dict[str, list[list[tuple[float, float]]]]:
    result: dict[str, list[list[tuple[float, float]]]] = {}
    for edge in root.findall("edge"):
        if edge.get("function") == "internal":
            continue
        lanes = [points(lane.get("shape", "")) for lane in edge.findall("lane") if lane.get("shape")]
        if lanes:
            result[edge.get("id", "")] = lanes
    return result


def plot_network(ax, root: ET.Element) -> None:
    for edge in root.findall("edge"):
        if edge.get("function") == "internal":
            continue
        for lane in edge.findall("lane"):
            if not lane.get("shape"):
                continue
            xy = points(lane.get("shape", ""))
            xs, ys = zip(*xy)
            if max(xs) < VIEW[0] or min(xs) > VIEW[1] or max(ys) < VIEW[2] or min(ys) > VIEW[3]:
                continue
            ax.plot(xs, ys, color=ROAD, linewidth=1.15, solid_capstyle="round", zorder=1)
    ax.plot([145, 580], [322, 258], color=INK, linewidth=0.55, alpha=0.18, zorder=0)
    ax.fill_between([292, 410], [240, 238], [258, 258], color=LIGHT, zorder=0)
    ax.text(350, 246, "School frontage", fontsize=8, color=INK, ha="center", va="center")
    for x, y, label in STREET_LABELS:
        rotation = 78 if "Bassem" in label or "Moulin" in label else 0
        ax.text(x, y, label, fontsize=6.8, color=INK, ha="center", va="center", rotation=rotation)
    ax.set_xlim(VIEW[0], VIEW[1])
    ax.set_ylim(VIEW[2], VIEW[3])
    ax.set_aspect("equal", adjustable="box")
    ax.set_facecolor("white")
    ax.axis("off")


def draw_edges(ax, root: ET.Element, ids: set[str], color: str, width: float = 4.2, style: str = "-") -> None:
    shapes = edge_shapes(root)
    for edge_id in ids:
        for xy in shapes.get(edge_id, []):
            xs, ys = zip(*xy)
            ax.plot(xs, ys, color=color, linewidth=width, linestyle=style,
                    solid_capstyle="round", zorder=4)


def lane_map(root: ET.Element) -> dict[str, list[tuple[float, float]]]:
    result = {}
    for edge in root.findall("edge"):
        for lane in edge.findall("lane"):
            if lane.get("shape"):
                result[lane.get("id", "")] = points(lane.get("shape", ""))
    return result


def interpolate(polyline: list[tuple[float, float]], distance: float) -> tuple[float, float]:
    if not polyline:
        return (0.0, 0.0)
    lengths = [math.dist(a, b) for a, b in zip(polyline, polyline[1:])]
    total = sum(lengths)
    target = max(0.0, min(distance, total))
    for (a, b), length in zip(zip(polyline, polyline[1:]), lengths):
        if target <= length or length == 0:
            ratio = 0 if length == 0 else target / length
            return (a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio)
        target -= length
    return polyline[-1]


def used_stop_ids(route_path: Path) -> set[str]:
    root = ET.parse(route_path).getroot()
    return {
        stop.get("busStop", "")
        for vehicle in root.findall("vehicle")
        for stop in vehicle.findall("stop")
        if stop.get("busStop")
    }


def stop_positions(net: ET.Element, stop_path: Path, route_path: Path) -> list[tuple[float, float]]:
    lanes = lane_map(net)
    root = ET.parse(stop_path).getroot()
    active = used_stop_ids(route_path)
    found = []
    for stop in root.findall("busStop"):
        if stop.get("id", "") not in active:
            continue
        lane = lanes.get(stop.get("lane", ""))
        if not lane:
            continue
        mid = (float(stop.get("startPos", "0")) + float(stop.get("endPos", "0"))) / 2
        xy = interpolate(lane, mid)
        if VIEW[0] <= xy[0] <= VIEW[1] and VIEW[2] <= xy[1] <= VIEW[3]:
            if not any(math.dist(xy, prior) < 2 for prior in found):
                found.append(xy)
    return found


def draw_stops(ax, net: ET.Element, path: Path, route_path: Path,
               color: str, marker: str, label: str) -> None:
    xy = stop_positions(net, path, route_path)
    if not xy:
        return
    ax.scatter([p[0] for p in xy], [p[1] for p in xy], s=55, marker=marker,
               facecolors="white" if marker == "o" else color, edgecolors=color,
               linewidths=1.8, zorder=7, label=label)


def arrow(ax, start: tuple[float, float], end: tuple[float, float], color: str, width: float = 2.4) -> None:
    ax.annotate("", xy=end, xytext=start,
                arrowprops=dict(arrowstyle="-|>", color=color, lw=width, mutation_scale=12), zorder=8)


def decorate(ax, panel: str, title: str, note: str) -> None:
    ax.text(0.015, 0.965, panel, transform=ax.transAxes, fontsize=10.5, fontweight="bold",
            color="white", va="top", ha="left",
            bbox=dict(boxstyle="round,pad=0.25", facecolor=INK, edgecolor=INK))
    ax.text(0.10, 0.965, title, transform=ax.transAxes, fontsize=10.5, fontweight="bold",
            color=INK, va="top", ha="left")
    ax.text(0.015, 0.035, note, transform=ax.transAxes, fontsize=7.2, color=INK,
            va="bottom", ha="left", wrap=True,
            bbox=dict(boxstyle="round,pad=0.25", facecolor="white", edgecolor="#D5DDE3", alpha=0.94))


def panel_a(ax) -> None:
    current, _ = network("current")
    a, _ = network("A")
    plot_network(ax, current)
    draw_stops(ax, current, ROOT / "current" / "osm_stops.add.xml",
               ROOT / "current" / "osm_pt.schoolcal.rou.xml", BLUE, "o", "Current stops")
    draw_stops(ax, a, ROOT / "A_OBS" / "osm_stops.add.xml",
               ROOT / "A_OBS" / "osm_pt.schoolcal.rou.xml", ORANGE, "X", "Relocated stops")
    decorate(ax, "A", "Enhanced 30 km/h zone", "Quantified lever: both Line 34 stops relocated toward Émile Idiersstraat. Visual and lighting measures remain qualitative.")


def panel_b(ax) -> None:
    root, _ = network("B")
    plot_network(ax, root)
    outer = {"33128974#0a", "33128974#0c", "-33128974#0a", "-33128974#0c"}
    centre = {"33128974#0b", "-33128974#0b"}
    draw_edges(ax, root, outer, SKY, 4.4)
    draw_edges(ax, root, centre, ORANGE, 4.8)
    draw_stops(ax, root, ROOT / "B_OBS" / "osm_stops.scenarioB.add.xml",
               ROOT / "B_OBS" / "osm_pt.schoolcal.scenarioB.rou.xml", ORANGE, "X", "Relocated stops")
    decorate(ax, "B", "30 km/h zone with chicane", "Chicane geometry is explicit; its centre uses a provisional 25 km/h effective-speed proxy. Parking capacity is not modeled.")


def panel_c(ax) -> None:
    root, _ = network("C")
    plot_network(ax, root)
    ids = set()
    for edge in root.findall("edge"):
        if "Chaussée de Wavre" not in (edge.get("name") or ""):
            continue
        if any(abs(float(lane.get("speed", "0")) - 5.56) < 0.01 for lane in edge.findall("lane")):
            ids.add(edge.get("id", ""))
    draw_edges(ax, root, ids, PURPLE, 4.5)
    ax.axvline(265, ymin=0.28, ymax=0.70, color=INK, linestyle="--", linewidth=0.9, alpha=0.65)
    ax.axvline(410, ymin=0.25, ymax=0.70, color=INK, linestyle="--", linewidth=0.9, alpha=0.65)
    draw_stops(ax, root, ROOT / "C_OBS" / "osm_stops.scenarioC.add.xml",
               ROOT / "C_OBS" / "osm_pt.schoolcal.scenarioC.rou.xml", ORANGE, "X", "Relocated stops")
    decorate(ax, "C0", "20 km/h shared-space operational proxy", "The 20 km/h network covers the report corridor and a short west approach edge. Surface treatment and continuous cross-anywhere priority are not literal objects.")


def panel_c1(ax) -> None:
    root, _ = network("C1")
    plot_network(ax, root)
    ids = set()
    for edge in root.findall("edge"):
        if "Chaussée de Wavre" not in (edge.get("name") or ""):
            continue
        if any(abs(float(lane.get("speed", "0")) - 5.56) < 0.01 for lane in edge.findall("lane")):
            ids.add(edge.get("id", ""))
    draw_edges(ax, root, ids, PURPLE, 4.0)
    for edge in root.findall("edge"):
        if edge.get("function") == "crossing" and "scenarioC_school_frontage_mid" in edge.get("id", ""):
            for lane in edge.findall("lane"):
                xy = points(lane.get("shape", ""))
                xs, ys = zip(*xy)
                ax.plot(xs, ys, color=ORANGE, linewidth=7, solid_capstyle="butt", zorder=9)
    decorate(ax, "C1", "Discrete pedestrian-priority sensitivity", "One report-aligned priority crossing; matched 0/25/50/75% crossing-share cases. It is not a continuous shared-space forecast.")


def restricted_ids(root: ET.Element) -> set[str]:
    result = set()
    for edge in root.findall("edge"):
        values = {lane.get("allow", "") for lane in edge.findall("lane")}
        if "bus bicycle" in values:
            result.add(edge.get("id", ""))
    return result


def panel_d(ax) -> None:
    root, _ = network("D")
    plot_network(ax, root)
    draw_edges(ax, root, restricted_ids(root), ORANGE, 4.6)
    arrow(ax, (190, 313), (520, 264), BLUE)
    arrow(ax, (505, 271), (210, 307), ORANGE)
    arrow(ax, (525, 265), (555, 282), BLUE, 2.0)
    decorate(ax, "D", "Full one-way option (OW_FULL)", "Private traffic: eastbound only to Tervuursesteenweg and right-turn-only at the east boundary. Counterflow is reserved for buses and bicycles.")


def panel_e(ax) -> None:
    root, _ = network("E")
    plot_network(ax, root)
    draw_edges(ax, root, restricted_ids(root), ORANGE, 4.6)
    arrow(ax, (190, 313), (520, 264), BLUE)
    arrow(ax, (525, 265), (555, 282), BLUE, 2.0)
    arrow(ax, (382, 277), (210, 307), ORANGE)
    decorate(ax, "E", "Reduced one-way option (OW_REDUCED)", "Private one-way restriction ends at Bergagegaarde; eastbound traffic continues to the Tervuursesteenweg right turn. Bus/bicycle counterflow is retained.")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    panels = [panel_a, panel_b, panel_c, panel_c1, panel_d, panel_e]
    names = ["scenario_A", "scenario_B", "scenario_C0", "scenario_C1", "scenario_D", "scenario_E"]

    for function, name in zip(panels, names):
        fig, ax = plt.subplots(figsize=(9.2, 3.2), constrained_layout=True)
        function(ax)
        fig.savefig(OUT / f"{name}.png", dpi=220, bbox_inches="tight", facecolor="white")
        fig.savefig(OUT / f"{name}.svg", bbox_inches="tight", facecolor="white")
        plt.close(fig)

    fig, axes = plt.subplots(3, 2, figsize=(14, 7.6), constrained_layout=True)
    for function, ax in zip(panels, axes.flat):
        function(ax)
    handles = [
        Line2D([0], [0], color=BLUE, lw=3, label="general-traffic direction / current reference"),
        Line2D([0], [0], color=ORANGE, lw=3, label="intervention / bus+bicycle counterflow"),
        Line2D([0], [0], color=PURPLE, lw=3, label="20 km/h modeled section"),
    ]
    fig.legend(handles=handles, loc="lower center", ncol=3, frameon=False, fontsize=8.5)
    fig.suptitle("Implemented SUMO scenario schematics", fontsize=15, fontweight="bold", color=INK)
    fig.savefig(OUT / "scenario_implementation_overview.png", dpi=220, bbox_inches="tight", facecolor="white")
    fig.savefig(OUT / "scenario_implementation_overview.svg", bbox_inches="tight", facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    main()
