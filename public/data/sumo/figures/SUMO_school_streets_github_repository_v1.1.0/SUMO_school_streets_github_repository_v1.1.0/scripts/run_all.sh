#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

args=("$@")
for ((index=0; index<${#args[@]}; index++)); do
    if [[ "${args[$index]}" == "--sumo-binary" ]] && (( index + 1 < ${#args[@]} )); then
        export SUMO_BINARY="${args[$((index + 1))]}"
    fi
done

python3 scripts/prepare_experiment.py
python3 scripts/run_experiment.py --seeds 42 43 44 45 46 "${@}"
python3 scripts/run_fleet_sensitivity.py
python3 scripts/extract_results.py
python3 scripts/validate_package.py
