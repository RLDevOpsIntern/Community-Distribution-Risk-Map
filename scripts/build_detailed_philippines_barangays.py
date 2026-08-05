#!/usr/bin/env python3
"""Build nationwide barangay GeoJSON with detailed WKT geometry when available.

Inputs:
  * barangays.geojson: canonical PSGC metadata and simplified fallback geometry
  * all_barangay-2.csv: preferred, more detailed WKT boundary geometry
  * studio_results_..._with_coordinates.csv: center coordinates and PSGC bridge

The script never guesses an ambiguous geometry match. Any barangay without one
unique detailed match retains the canonical simplified boundary and is reported.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from build_manila_test import parse_wkt_multipolygon
from build_philippines_barangays import (
    ROOT,
    admin_key,
    collection,
    geometry_centroid,
    load_boundaries,
    load_coordinates,
    merge_geometry,
    normalize_name,
    numeric_pcode,
    psgc_code,
    safe_float,
    slug,
    write_json,
)


DEFAULT_DETAILED = ROOT / "src/data/all_barangay-2.csv"
DEFAULT_BOUNDARIES = ROOT / "src/data/barangays.geojson"
DEFAULT_COORDINATES = ROOT / "src/data/studio_results_20260804_1119_with_coordinates.csv"
DEFAULT_OUTPUT_DIR = ROOT / "src/data/generated-detailed"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--validate-only", action="store_true")
    mode.add_argument("--generate", action="store_true")
    parser.add_argument("--detailed-boundaries", type=Path, default=DEFAULT_DETAILED)
    parser.add_argument("--boundaries", type=Path, default=DEFAULT_BOUNDARIES)
    parser.add_argument("--coordinates", type=Path, default=DEFAULT_COORDINATES)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    return parser.parse_args()


def load_detailed(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def matching_admin_key(province: Any, city: Any, barangay: Any) -> tuple[str, str, str]:
    normalized_province, normalized_city, normalized_barangay = admin_key(province, city, barangay)
    normalized_barangay = re.sub(r"\bzaiga\b", "zaniga", normalized_barangay)
    normalized_barangay = re.sub(r"\bosmea\b", "osmena", normalized_barangay)
    normalized_barangay = re.sub(r"\bnio\b", "nino", normalized_barangay)
    return normalized_province, normalized_city, normalized_barangay


def detailed_key(row: dict[str, str]) -> tuple[str, str, str]:
    return matching_admin_key(row["province"], row["municipality_city"], row["barangay"])


def boundary_keys(properties: dict[str, Any]) -> set[tuple[str, str, str]]:
    province = properties.get("ADM2_EN")
    city = properties.get("ADM3_EN")
    return {
        matching_admin_key(province, city, properties.get("ADM4_EN")),
        matching_admin_key(province, city, properties.get("psgc_name")),
    }


def deduplicate_detailed_rows(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    unique: dict[str, dict[str, str]] = {}
    for row in rows:
        unique.setdefault(row["polygon_wkt"], row)
    return list(unique.values())


def geometry_point_count(geometry: dict[str, Any]) -> int:
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    return sum(len(ring) for polygon in polygons for ring in polygon)


def detailed_geometry(row: dict[str, str]) -> dict[str, Any]:
    return parse_wkt_multipolygon(row["polygon_wkt"])


def make_output_feature(
    boundary_features: list[dict[str, Any]],
    coordinate: dict[str, str] | None,
    detailed: dict[str, str] | None,
    match_method: str,
) -> dict[str, Any]:
    source = boundary_features[0]["properties"]
    code = psgc_code(source.get("psgc_code"))
    if code is None:
        raise ValueError("Canonical boundary has no valid PSGC code")

    if detailed:
        geometry = detailed_geometry(detailed)
        geometry_source = "all_barangay-2.csv detailed WKT"
        source_points = int(detailed["polygon_point_count"])
    else:
        geometry = merge_geometry(boundary_features)
        geometry_source = "barangays.geojson simplified fallback"
        source_points = geometry_point_count(geometry)

    latitude = safe_float(coordinate.get("latitude")) if coordinate else None
    longitude = safe_float(coordinate.get("longitude")) if coordinate else None
    if latitude is None or longitude is None:
        center = geometry_centroid(geometry)
        if center:
            longitude, latitude = center

    distinct_areas: dict[str, float] = {}
    for feature in boundary_features:
        area = safe_float(feature.get("properties", {}).get("AREA_SQKM"))
        if area is not None:
            fingerprint = json.dumps(feature.get("geometry"), separators=(",", ":"))
            distinct_areas[fingerprint] = area

    name = source.get("psgc_name") or source.get("ADM4_EN")
    properties = {
        "ID_0": 177,
        "ISO": "PHL",
        "NAME_0": "Philippines",
        "ID_1": numeric_pcode(source.get("ADM2_PCODE")),
        "NAME_1": source.get("ADM2_EN"),
        "ID_2": numeric_pcode(source.get("ADM3_PCODE")),
        "NAME_2": source.get("ADM3_EN"),
        "ID_3": int(code),
        "NAME_3": name,
        "NL_NAME_3": None,
        "VARNAME_3": source.get("ADM4_REF"),
        "TYPE_3": "Barangay",
        "ENGTYPE_3": "Village",
        "PROVINCE": source.get("ADM2_EN"),
        "REGION": source.get("ADM1_EN"),
        "id": f"barangay-{code}",
        "name": name,
        "barangayCode": code,
        "population": None,
        "formattedPop": None,
        "densityCategory": "No data",
        "vulnerabilityRating": "No data",
        "healthRiskLevel": "No data",
        "areaKm2": round(sum(distinct_areas.values()), 6) if distinct_areas else None,
        "centerLat": latitude,
        "centerLng": longitude,
        "geometrySource": geometry_source,
        "geometryMatchMethod": match_method,
        "boundaryPointCount": source_points,
    }
    return {"type": "Feature", "properties": properties, "geometry": geometry}


def build(args: argparse.Namespace) -> dict[str, Any]:
    boundary_features = load_boundaries(args.boundaries)
    coordinate_rows = load_coordinates(args.coordinates)
    detailed_rows = load_detailed(args.detailed_boundaries)

    invalid_detailed_ids: set[int] = set()
    invalid_detailed_wkt: list[dict[str, Any]] = []
    for row in detailed_rows:
        try:
            detailed_geometry(row)
        except (ValueError, IndexError) as error:
            invalid_detailed_ids.add(id(row))
            invalid_detailed_wkt.append({
                "province": row["province"],
                "municipalityCity": row["municipality_city"],
                "barangay": row["barangay"],
                "error": str(error),
            })

    boundaries_by_code: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for feature in boundary_features:
        code = psgc_code(feature.get("properties", {}).get("psgc_code"))
        if code:
            boundaries_by_code[code].append(feature)

    coordinates_by_code: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in coordinate_rows:
        code = psgc_code(row.get("coordinate_source_id"))
        if code:
            coordinates_by_code[code].append(row)

    detailed_by_key: dict[tuple[str, str, str], list[dict[str, str]]] = defaultdict(list)
    for row in detailed_rows:
        if id(row) in invalid_detailed_ids:
            continue
        detailed_by_key[detailed_key(row)].append(row)
    for key, rows in list(detailed_by_key.items()):
        detailed_by_key[key] = deduplicate_detailed_rows(rows)

    coordinate_by_key: dict[tuple[str, str, str], list[dict[str, str]]] = defaultdict(list)
    for row in coordinate_rows:
        coordinate_by_key[matching_admin_key(row["province"], row["municipality_city"], row["barangay"])].append(row)

    used_detailed_ids: set[int] = set()
    used_coordinate_ids: set[int] = set()
    output_features: list[dict[str, Any]] = []
    geometry_match_counts: Counter[str] = Counter()
    coordinate_match_counts: Counter[str] = Counter()
    fallback_boundaries: list[dict[str, Any]] = []

    for code in sorted(boundaries_by_code):
        grouped = boundaries_by_code[code]
        source = grouped[0]["properties"]

        coordinate: dict[str, str] | None = None
        code_coordinates = coordinates_by_code.get(code, [])
        if len(code_coordinates) == 1:
            coordinate = code_coordinates[0]
            coordinate_match_counts["psgc_code"] += 1
        else:
            name_coordinate_candidates: list[dict[str, str]] = []
            for key in boundary_keys(source):
                name_coordinate_candidates.extend(coordinate_by_key.get(key, []))
            unique_candidates = {id(row): row for row in name_coordinate_candidates}
            if len(unique_candidates) == 1:
                coordinate = next(iter(unique_candidates.values()))
                coordinate_match_counts["unique_admin_names"] += 1
            else:
                coordinate_match_counts["geometry_centroid_fallback"] += 1
        if coordinate:
            used_coordinate_ids.add(id(coordinate))

        detailed_candidates: list[dict[str, str]] = []
        for key in boundary_keys(source):
            detailed_candidates.extend(detailed_by_key.get(key, []))
        unique_detailed = {id(row): row for row in detailed_candidates if id(row) not in used_detailed_ids}
        detailed: dict[str, str] | None = None
        match_method = "simplified_fallback"
        if len(unique_detailed) == 1:
            detailed = next(iter(unique_detailed.values()))
            match_method = "unique_official_admin_names"
        elif coordinate:
            bridge = [
                row for row in detailed_by_key.get(
                    matching_admin_key(coordinate["province"], coordinate["municipality_city"], coordinate["barangay"]),
                    [],
                )
                if id(row) not in used_detailed_ids
            ]
            if len(bridge) == 1:
                detailed = bridge[0]
                match_method = "psgc_coordinate_bridge"

        if detailed:
            used_detailed_ids.add(id(detailed))
            geometry_match_counts[match_method] += 1
        else:
            geometry_match_counts["simplified_fallback"] += 1
            fallback_boundaries.append({
                "psgcCode": code,
                "province": source.get("ADM2_EN"),
                "municipalityCity": source.get("ADM3_EN"),
                "barangay": source.get("psgc_name") or source.get("ADM4_EN"),
            })
        output_features.append(make_output_feature(grouped, coordinate, detailed, match_method))

    unused_detailed = [
        {
            "province": row["province"],
            "municipalityCity": row["municipality_city"],
            "barangay": row["barangay"],
            "boundaryPointCount": int(row["polygon_point_count"]),
        }
        for row in detailed_rows
        if id(row) not in used_detailed_ids
    ]
    output_geometry_types = Counter(feature["geometry"]["type"] for feature in output_features)
    missing_centers = sum(
        feature["properties"]["centerLat"] is None or feature["properties"]["centerLng"] is None
        for feature in output_features
    )
    report = {
        "sourceFiles": {
            "canonicalBoundaries": str(args.boundaries),
            "detailedBoundaries": str(args.detailed_boundaries),
            "coordinates": str(args.coordinates),
        },
        "summary": {
            "canonicalBoundaryFeatures": len(boundary_features),
            "uniquePsgcCodes": len(boundaries_by_code),
            "detailedBoundaryRows": len(detailed_rows),
            "coordinateRows": len(coordinate_rows),
            "outputFeatures": len(output_features),
            "detailedGeometryFeatures": sum(
                count for method, count in geometry_match_counts.items() if method != "simplified_fallback"
            ),
            "simplifiedFallbackFeatures": geometry_match_counts["simplified_fallback"],
            "featuresWithoutCenters": missing_centers,
            "unusedDetailedRows": len(unused_detailed),
            "invalidDetailedWktRows": len(invalid_detailed_wkt),
        },
        "geometryMatchCounts": dict(sorted(geometry_match_counts.items())),
        "coordinateMatchCounts": dict(sorted(coordinate_match_counts.items())),
        "outputGeometryTypes": dict(sorted(output_geometry_types.items())),
        "simplifiedFallbackBoundaries": fallback_boundaries,
        "unusedDetailedBoundaries": unused_detailed,
        "invalidDetailedWkt": invalid_detailed_wkt,
    }

    write_json(args.output_dir / "validation-report.json", report)
    if args.generate:
        write_json(args.output_dir / "philippines-barangays-detailed.geojson", collection(output_features), compact=True)
        region_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
        province_groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        city_groups: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
        for feature in output_features:
            properties = feature["properties"]
            region = properties["REGION"]
            province = properties["PROVINCE"]
            city = properties["NAME_2"]
            region_groups[region].append(feature)
            province_groups[(region, province)].append(feature)
            city_groups[(region, province, city)].append(feature)
        for region, features in region_groups.items():
            write_json(args.output_dir / "regions" / f"{slug(region)}.geojson", collection(features), compact=True)
        for (region, province), features in province_groups.items():
            filename = f"{slug(region)}--{slug(province)}.geojson"
            write_json(args.output_dir / "provinces" / filename, collection(features), compact=True)
        for (region, province, city), features in city_groups.items():
            filename = f"{slug(region)}--{slug(province)}--{slug(city)}.geojson"
            write_json(args.output_dir / "cities" / filename, collection(features), compact=True)
    return report


def main() -> int:
    args = parse_args()
    try:
        report = build(args)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(json.dumps({
        "summary": report["summary"],
        "geometryMatchCounts": report["geometryMatchCounts"],
        "coordinateMatchCounts": report["coordinateMatchCounts"],
    }, indent=2))
    print(f"Validation report: {args.output_dir / 'validation-report.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
