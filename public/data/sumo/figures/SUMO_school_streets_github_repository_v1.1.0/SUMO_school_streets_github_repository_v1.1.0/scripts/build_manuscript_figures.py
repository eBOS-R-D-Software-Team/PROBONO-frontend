#!/usr/bin/env python3
"""Regenerate manuscript result figures from the five-seed summary table."""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch


ROOT = Path(__file__).resolve().parents[1]
SUMMARY = ROOT / "analysis" / "replicate_summary.csv"
OUT = ROOT / "docs" / "figures"

INK = "#263238"
GRID = "#D5DEE5"
GREY = "#65717A"
BLUE = "#0072B2"
ORANGE = "#E69F00"
PURPLE = "#7A4AB9"
COLORS = (GREY, BLUE, ORANGE, PURPLE)
HATCHES = ("", "//", "..", "xx")


def load() -> dict[str, dict[str, float]]:
    with SUMMARY.open(newline="", encoding="utf-8") as handle:
        return {
            row["scenario"]: {
                key: float(value)
                for key, value in row.items()
                if key != "scenario" and value not in ("", None) and key not in {"interpretation_status"}
            }
            for row in csv.DictReader(handle)
        }


def style_axes(ax) -> None:
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.tick_params(colors=INK, labelsize=9)
    ax.yaxis.label.set_color(INK)
    ax.xaxis.label.set_color(INK)


def save(fig, stem: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT / f"{stem}.png", dpi=300, bbox_inches="tight", facecolor="white")
    fig.savefig(OUT / f"{stem}.pdf", bbox_inches="tight", facecolor="white")
    plt.close(fig)


def figure1() -> None:
    fig, ax = plt.subplots(figsize=(15.5, 6.8))
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.suptitle("Evidence-aligned SUMO school-street workflow", fontsize=17, fontweight="bold", color=INK, y=0.96)

    boxes = (
        ("1  Evidence", ("Road-safety report: A–C", "Mobility maps: D/E", "Telraam 15-min counts", "OSM, GTFS and fleet data"), "#E8F2FA", BLUE),
        ("2  Calibrated\nreference", ("9,365 vehicles + 1,528 persons", "107 scheduled buses", "Exact daily detector totals", "36.34% >36 km/h (target: 37%)"), "#E7F3EF", "#009E73"),
        ("3  Evidence tiers", ("Primary: A/B/C0 at OBS", "Sensitivity: DR15/DR30 and C1", "Supplementary: D/E access", "Rejected: expanded diversion"), "#FFF1DE", ORANGE),
        ("4  Execution\nand QA", ("SUMO 1.27.1", "20 cases × five seeds", "Completion and ID checks", "307 passed; 0 failed"), "#F0E9F8", PURPLE),
        ("5  Decision\nevidence", ("Frontage flow and speed", "Route operation/emissions", "C1 interaction diagnostics", "Repository and guidebook", "Backend/frontend handover"), "#FFF7D8", "#B07A00"),
    )
    left = 0.025
    gap = 0.015
    width = (0.95 - 4 * gap) / 5
    bottom = 0.25
    height = 0.56
    for index, (heading, lines, fill, edge) in enumerate(boxes):
        x = left + index * (width + gap)
        patch = FancyBboxPatch((x, bottom), width, height, boxstyle="round,pad=0.012,rounding_size=0.015", linewidth=1.5, edgecolor=edge, facecolor=fill)
        ax.add_patch(patch)
        ax.text(x + 0.018, bottom + height - 0.07, heading, va="top", ha="left", fontsize=11.5, fontweight="bold", color=INK, linespacing=0.9)
        ax.text(x + 0.018, bottom + height - 0.20, "\n".join(lines), va="top", ha="left", fontsize=9.5, color=INK, linespacing=1.35)
        if index < len(boxes) - 1:
            arrow = FancyArrowPatch((x + width + 0.003, bottom + 0.08), (x + width + gap - 0.003, bottom + 0.08), arrowstyle="-|>", mutation_scale=13, linewidth=1.3, color=INK)
            ax.add_patch(arrow)
    ax.text(0.5, 0.115, "Direct comparisons use the full observed-demand Baseline, A, B and C0. C1 uses its matched control; D/E are corridor-access experiments only.", ha="center", va="center", fontsize=10.2, color=GREY)
    ax.text(0.985, 0.045, "Repository 1.1.0 · model v21.2 · SUMO 1.27.1", ha="right", fontsize=8.2, color=GREY)
    fig.tight_layout(rect=(0, 0, 1, 0.93))
    save(fig, "manuscript_figure1_workflow_v1.1")


def figure6(rows: dict[str, dict[str, float]]) -> None:
    cases = ("current", "A_OBS", "B_OBS", "C_OBS")
    labels = ("Baseline", "A", "B", "C0")
    panels = (
        ("frontage_spot_motorized_mean_speed_kmh", "Mean school-frontage spot speed", "km/h", 2),
        ("frontage_spot_motorized_over_36_pct", "Frontage passages above 36 km/h", "%", 2),
        ("CO2_g_per_vkm", "Tailpipe CO₂ intensity", "g CO₂/VKT", 1),
    )
    fig, axes = plt.subplots(1, 3, figsize=(15.6, 5.1))
    fig.suptitle("Primary scenarios at full observed demand (mean ± SD, five seeds)", fontsize=15, fontweight="bold", color=INK, y=1.01)
    for ax, (metric, title, unit, digits) in zip(axes, panels):
        means = [rows[case][f"{metric}_mean_valid"] for case in cases]
        sds = [rows[case][f"{metric}_sd_valid"] for case in cases]
        bars = ax.bar(labels, means, yerr=sds, capsize=3, color=COLORS, edgecolor=INK, linewidth=0.8)
        for bar, hatch, mean in zip(bars, HATCHES, means):
            bar.set_hatch(hatch)
            ax.annotate(f"{mean:.{digits}f}", (bar.get_x() + bar.get_width() / 2, bar.get_height()), xytext=(0, 7), textcoords="offset points", ha="center", fontsize=8.5, color=INK)
        ax.set_title(title, fontsize=11.2, fontweight="bold", color=INK, pad=9)
        ax.set_ylabel(unit, fontsize=9.5)
        top = max(m + s for m, s in zip(means, sds))
        ax.set_ylim(0, top * 1.19)
        style_axes(ax)
    fig.text(0.995, 0.006, "SUMO 1.27.1 · model v21.2", ha="right", fontsize=7.5, color=GREY)
    fig.tight_layout(rect=(0, 0.025, 1, 0.94), w_pad=2.2)
    save(fig, "manuscript_figure6_primary_results_v1.1")


def figure7(rows: dict[str, dict[str, float]]) -> None:
    x0 = rows["C1_X0"]
    c1_cases = ("C1_X0", "C1_L25", "C1_M50", "C1_H75")
    shares = (0, 25, 50, 75)
    speed_change = [100 * (rows[c]["frontage_spot_motorized_mean_speed_kmh_mean_valid"] / x0["frontage_spot_motorized_mean_speed_kmh_mean_valid"] - 1) for c in c1_cases]
    co2_change = [100 * (rows[c]["CO2_g_per_vkm_mean_valid"] / x0["CO2_g_per_vkm_mean_valid"] - 1) for c in c1_cases]

    fig, axes = plt.subplots(1, 2, figsize=(15.0, 5.2), gridspec_kw={"width_ratios": (1.05, 1.0)})
    fig.suptitle("Bounded supplementary evidence", fontsize=15, fontweight="bold", color=INK, y=1.01)

    ax = axes[0]
    ax.axhline(0, color=INK, linewidth=0.8)
    ax.plot(shares, speed_change, color=BLUE, marker="o", linewidth=2, label="Spot-speed change")
    ax.plot(shares, co2_change, color=ORANGE, marker="s", linewidth=2, linestyle="--", label="CO₂/VKT change")
    for x, y in zip(shares[1:], speed_change[1:]):
        ax.annotate(f"{y:+.1f}%", (x, y), xytext=(0, -15), textcoords="offset points", ha="center", fontsize=8.5, color=INK)
    for x, y in zip(shares[1:], co2_change[1:]):
        ax.annotate(f"{y:+.1f}%", (x, y), xytext=(0, 7), textcoords="offset points", ha="center", fontsize=8.5, color=INK)
    ax.set_xticks(shares)
    ax.set_xlabel("Assumed share of pedestrians routed across (%)", fontsize=9.5)
    ax.set_ylabel("Change from C1_X0 (%)", fontsize=9.5)
    ax.set_title("(a) C1 versus identical-network control", fontsize=11.2, fontweight="bold", color=INK, pad=9)
    ax.legend(frameon=False, loc="lower left", fontsize=8.5)
    ax.set_ylim(min(speed_change) - 2.2, max(co2_change) + 2.1)
    style_axes(ax)

    ax = axes[1]
    cases = ("current", "OW_FULL_OBS", "OW_REDUCED_OBS")
    labels = ("Baseline", "D", "E")
    passages = [rows[c]["frontage_spot_motorized_passages_mean_valid"] for c in cases]
    above = [rows[c]["frontage_spot_motorized_over_36_pct_mean_valid"] for c in cases]
    bars = ax.bar(labels, passages, color=(GREY, ORANGE, BLUE), edgecolor=INK, linewidth=0.8)
    for bar, hatch, value in zip(bars, ("", "//", "xx"), passages):
        bar.set_hatch(hatch)
        ax.annotate(f"{value:,.0f}", (bar.get_x() + bar.get_width() / 2, bar.get_height()), xytext=(0, 7), textcoords="offset points", ha="center", fontsize=8.5, color=INK)
    ax.set_ylabel("Motorized frontage passages", fontsize=9.5)
    ax.set_ylim(0, 10000)
    ax.set_title("(b) One-way corridor-access experiments", fontsize=11.2, fontweight="bold", color=INK, pad=9)
    style_axes(ax)
    twin = ax.twinx()
    twin.plot(labels, above, color=PURPLE, marker="D", linewidth=2)
    for label, y in zip(labels, above):
        twin.annotate(f"{y:.2f}%", (label, y), xytext=(8, 5), textcoords="offset points", fontsize=8.5, color=PURPLE)
    twin.set_ylabel("Passages above 36 km/h (%)", fontsize=9.5, color=PURPLE)
    twin.set_ylim(0, 50)
    twin.tick_params(colors=PURPLE, labelsize=9)
    twin.spines["top"].set_visible(False)
    twin.spines["right"].set_color(PURPLE)

    fig.text(0.995, 0.006, "SUMO 1.27.1 · model v21.2", ha="right", fontsize=7.5, color=GREY)
    fig.tight_layout(rect=(0, 0.025, 1, 0.94), w_pad=2.6)
    save(fig, "manuscript_figure7_supplementary_results_v1.1")


def main() -> None:
    rows = load()
    figure1()
    figure6(rows)
    figure7(rows)
    print("Wrote manuscript Figures 1, 6 and 7 in PNG and PDF formats.")


if __name__ == "__main__":
    main()
