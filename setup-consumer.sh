#!/usr/bin/env bash

set -euo pipefail

readonly CLOUD_MATERIALS_REPOSITORY="git@github.com:Charlie-BU/cloud-materials-common.git"
readonly CONSUMER_ROOT="$(cd "${1:-.}" && pwd)"
readonly TARGET_DIRECTORY="${CONSUMER_ROOT}/cloud-materials-common"

if [[ ! -f "${CONSUMER_ROOT}/package.json" ]]; then
    echo "Error: package.json is missing from ${CONSUMER_ROOT}." >&2
    exit 1
fi

if [[ -d "${TARGET_DIRECTORY}/.git" ]]; then
    echo "cloud-materials-common already exists; keeping the current checkout."
else
    git clone --depth 1 "${CLOUD_MATERIALS_REPOSITORY}" "${TARGET_DIRECTORY}"
fi

if [[ ! -f "${TARGET_DIRECTORY}/@cloud-materials/common/package.json" ]]; then
    echo "Error: @cloud-materials/common is missing." >&2
    exit 1
fi

echo "Offline @cloud-materials/common is ready."

