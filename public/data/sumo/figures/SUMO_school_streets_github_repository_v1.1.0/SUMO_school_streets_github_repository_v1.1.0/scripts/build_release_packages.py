#!/usr/bin/env python3
"""Build GitHub-ready and archival release ZIPs for release 1.1.0."""

from __future__ import annotations

import argparse
import csv
import hashlib
import shutil
import zipfile
from pathlib import Path

from common import SCENARIOS


ROOT = Path(__file__).resolve().parents[1]
RELEASE = "1.1.0"
LEAN_NAME = f"SUMO_school_streets_github_repository_v{RELEASE}"
FULL_NAME = f"SUMO_school_streets_publication_archive_v{RELEASE}"

ALWAYS_EXCLUDED_PARTS = {
    ".git",
    "__pycache__",
    ".pytest_cache",
    "release_build",
    "release_build_v1.1.0",
}
OBSOLETE_RELEASE_FILES = {
    Path("docs/SUMO_School_Streets_Guidebook_v1.0.docx"),
    Path("docs/SUMO_School_Streets_Guidebook_v1.0.pdf"),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--outdir", required=True, type=Path)
    return parser.parse_args()


def excluded(relative: Path, *, archival: bool) -> bool:
    if any(part in ALWAYS_EXCLUDED_PARTS for part in relative.parts):
        return True
    if relative in OBSOLETE_RELEASE_FILES:
        return True
    if relative.name == "manifest_sha256.csv" and relative.parent == Path("analysis"):
        return True
    if relative.name.startswith(".DS_Store") or relative.suffix == ".pyc":
        return True
    if not archival and relative.parts and relative.parts[0] in SCENARIOS:
        return True
    return False


def copy_package(destination: Path, *, archival: bool) -> None:
    destination.mkdir(parents=True, exist_ok=False)
    for source in sorted(ROOT.rglob("*")):
        if not source.is_file():
            continue
        relative = source.relative_to(ROOT)
        if excluded(relative, archival=archival):
            continue
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    write_manifest(destination)


def write_manifest(package_root: Path) -> None:
    rows: list[dict[str, str | int]] = []
    manifest = package_root / "analysis" / "manifest_sha256.csv"
    for path in sorted(package_root.rglob("*")):
        relative = path.relative_to(package_root)
        if (
            not path.is_file()
            or path == manifest
            or "__pycache__" in relative.parts
            or path.suffix == ".pyc"
            or path.name.startswith("seed")
            or path.name.startswith(".")
        ):
            continue
        rows.append(
            {
                "relative_path": str(relative),
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "bytes": path.stat().st_size,
            }
        )
    manifest.parent.mkdir(parents=True, exist_ok=True)
    with manifest.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=("relative_path", "sha256", "bytes"))
        writer.writeheader()
        writer.writerows(rows)


def make_zip(package_root: Path, output: Path) -> None:
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(package_root.rglob("*")):
            if not path.is_file():
                continue
            archive.write(path, arcname=str(Path(package_root.name) / path.relative_to(package_root)))


def main() -> None:
    args = parse_args()
    outdir = args.outdir.resolve()
    if outdir == ROOT or ROOT in outdir.parents and outdir.name not in {"release_build", "release_build_v1.1.0"}:
        raise SystemExit("Refusing to use a source directory as the release output directory")
    outdir.mkdir(parents=True, exist_ok=True)
    staging = outdir / "staging"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir()

    lean_root = staging / LEAN_NAME
    full_root = staging / FULL_NAME
    copy_package(lean_root, archival=False)
    copy_package(full_root, archival=True)

    lean_zip = outdir / f"{LEAN_NAME}.zip"
    full_zip = outdir / f"{FULL_NAME}.zip"
    lean_zip.unlink(missing_ok=True)
    full_zip.unlink(missing_ok=True)
    make_zip(lean_root, lean_zip)
    make_zip(full_root, full_zip)
    print(f"Wrote {lean_zip}")
    print(f"Wrote {full_zip}")


if __name__ == "__main__":
    main()
