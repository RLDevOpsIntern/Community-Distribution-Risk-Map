#!/usr/bin/env python3
"""Export the detailed nationwide barangay GeoJSON to the existing CSV format.

The original coordinate CSV columns remain first and in the same order. New
PSGC and boundary columns are appended. Source files are never modified.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

from build_philippines_barangays import ROOT, admin_key, psgc_code


DEFAULT_GEOJSON = ROOT / "src/data/generated-detailed/philippines-barangays-detailed.geojson"
DEFAULT_COORDINATES = ROOT / "src/data/studio_results_20260804_1119_with_coordinates.csv"
DEFAULT_OUTPUT = ROOT / "src/data/generated-detailed/csv/studio_results_20260804_1119_with_detailed_boundaries.csv"
DEFAULT_REPORT = ROOT / "src/data/generated-detailed/csv/csv-export-report.json"

ORIGINAL_COLUMNS = [
    "id",
    "region",
    "province",
    "province_code",
    "municipality_city",
    "barangay",
    "latitude",
    "longitude",
    "coordinate_source",
    "coordinate_method",
    "coordinate_source_id",
]

BOUNDARY_COLUMNS = [
    "barangay_code",
    "area_km2",
    "geometry_type",
    "boundary_point_count",
    "geometry_source",
    "geometry_match_method",
    "geometry_geojson",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--geojson", type=Path, default=DEFAULT_GEOJSON)
    parser.add_argument("--coordinates", type=Path, default=DEFAULT_COORDINATES)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    return parser.parse_args()


def load_coordinate_rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = [column for column in ORIGINAL_COLUMNS if column not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"Coordinate CSV is missing columns: {', '.join(missing)}")
        return list(reader)


def load_features(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as handle:
        collection = json.load(handle)
    if collection.get("type") != "FeatureCollection":
        raise ValueError("Detailed GeoJSON is not a FeatureCollection")
    return collection.get("features", [])


def format_number(value: Any) -> str:
    if value is None:
        return ""
    number = float(value)
    if not math.isfinite(number):
        return ""
    return format(number, ".15g")


def normalized_feature_key(properties: dict[str, Any]) -> tuple[str, str, str]:
    return admin_key(properties.get("PROVINCE"), properties.get("NAME_2"), properties.get("name"))


def fallback_original_columns(properties: dict[str, Any]) -> dict[str, str]:
    return {
        "id": "",
        "region": str(properties.get("REGION") or "").casefold(),
        "province": str(properties.get("PROVINCE") or "").casefold(),
        "province_code": "",
        "municipality_city": str(properties.get("NAME_2") or "").casefold(),
        "barangay": str(properties.get("name") or "").casefold(),
        "latitude": format_number(properties.get("centerLat")),
        "longitude": format_number(properties.get("centerLng")),
        "coordinate_source": "boundary geometry",
        "coordinate_method": "geometry_centroid_fallback",
        "coordinate_source_id": "",
    }


def main() -> int:
    args = parse_args()
    try:
        coordinate_rows = load_coordinate_rows(args.coordinates)
        features = load_features(args.geojson)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    coordinates_by_code: dict[str, list[dict[str, str]]] = defaultdict(list)
    coordinates_by_name: dict[tuple[str, str, str], list[dict[str, str]]] = defaultdict(list)
    for row in coordinate_rows:
        code = psgc_code(row.get("coordinate_source_id"))
        if code:
            coordinates_by_code[code].append(row)
        coordinates_by_name[
            admin_key(row["province"], row["municipality_city"], row["barangay"])
        ].append(row)

    used_coordinate_ids: set[int] = set()
    match_counts = {"psgc_code": 0, "unique_admin_names": 0, "coordinate_geometry_fallback": 0}
    export_rows: list[dict[str, Any]] = []
    coordinate_fallback_features: list[dict[str, Any]] = []

    for feature in features:
        properties = feature.get("properties", {})
        code = psgc_code(properties.get("barangayCode"))
        source_row: dict[str, str] | None = None
        if code:
            candidates = [row for row in coordinates_by_code.get(code, []) if id(row) not in used_coordinate_ids]
            if len(candidates) == 1:
                source_row = candidates[0]
                match_counts["psgc_code"] += 1
        if source_row is None:
            candidates = [
                row for row in coordinates_by_name.get(normalized_feature_key(properties), [])
                if id(row) not in used_coordinate_ids
            ]
            if len(candidates) == 1:
                source_row = candidates[0]
                match_counts["unique_admin_names"] += 1

        if source_row is not None:
            used_coordinate_ids.add(id(source_row))
            row: dict[str, Any] = {column: source_row.get(column, "") for column in ORIGINAL_COLUMNS}
        else:
            row = fallback_original_columns(properties)
            match_counts["coordinate_geometry_fallback"] += 1
            coordinate_fallback_features.append({
                "barangayCode": code,
                "region": properties.get("REGION"),
                "province": properties.get("PROVINCE"),
                "municipalityCity": properties.get("NAME_2"),
                "barangay": properties.get("name"),
            })

        geometry = feature.get("geometry") or {}
        row.update({
            "barangay_code": code or "",
            "area_km2": format_number(properties.get("areaKm2")),
            "geometry_type": geometry.get("type", ""),
            "boundary_point_count": properties.get("boundaryPointCount", ""),
            "geometry_source": properties.get("geometrySource", ""),
            "geometry_match_method": properties.get("geometryMatchMethod", ""),
            "geometry_geojson": json.dumps(geometry, ensure_ascii=False, separators=(",", ":")),
        })
        export_rows.append(row)

    unused_coordinates = [
        {
            "id": row.get("id"),
            "region": row.get("region"),
            "province": row.get("province"),
            "municipalityCity": row.get("municipality_city"),
            "barangay": row.get("barangay"),
            "coordinateSourceId": row.get("coordinate_source_id"),
        }
        for row in coordinate_rows
        if id(row) not in used_coordinate_ids
    ]

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=ORIGINAL_COLUMNS + BOUNDARY_COLUMNS, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(export_rows)

    report = {
        "sourceFiles": {
            "detailedGeoJSON": str(args.geojson),
            "coordinateCSV": str(args.coordinates),
        },
        "outputFile": str(args.output),
        "summary": {
            "geoJsonFeatures": len(features),
            "coordinateRows": len(coordinate_rows),
            "exportedRows": len(export_rows),
            "unusedCoordinateRows": len(unused_coordinates),
            "coordinateFallbackRows": len(coordinate_fallback_features),
        },
        "matchCounts": match_counts,
        "coordinateFallbackFeatures": coordinate_fallback_features,
        "unusedCoordinates": unused_coordinates,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    with args.report.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(json.dumps({"summary": report["summary"], "matchCounts": match_counts}, indent=2))
    print(f"CSV: {args.output}")
    print(f"Report: {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
