#!/usr/bin/env python3
"""Build application-ready nationwide Philippine barangay GeoJSON.

The primary join is:
    barangays.geojson properties.psgc_code
        -> coordinates CSV coordinate_source_id

Rows without a real PSGC source ID may use a strict, unique match on normalized
province, municipality/city, and barangay names. Ambiguous records are never
selected automatically; they are written to the validation report.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BOUNDARIES = ROOT / "src/data/barangays.geojson"
DEFAULT_COORDINATES = ROOT / "src/data/studio_results_20260804_1119_with_coordinates.csv"
DEFAULT_OUTPUT_DIR = ROOT / "src/data/generated"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument(
        "--validate-only",
        action="store_true",
        help="Analyze sources and write only validation-report.json.",
    )
    mode.add_argument(
        "--generate",
        action="store_true",
        help="Write nationwide, region, province, and validation files.",
    )
    parser.add_argument("--boundaries", type=Path, default=DEFAULT_BOUNDARIES)
    parser.add_argument("--coordinates", type=Path, default=DEFAULT_COORDINATES)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    return parser.parse_args()


def normalize_name(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.casefold().replace("&", " and ")
    text = re.sub(r"\b(sta|sta\.)\b", "santa", text)
    text = re.sub(r"\b(sto|sto\.)\b", "santo", text)
    text = re.sub(r"\b(pob|pob\.)\b", "poblacion", text)
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def normalize_province(value: Any) -> str:
    normalized = normalize_name(value)
    if normalized.startswith("metropolitan manila"):
        return "ncr"
    aliases = {
        "compostela valley": "davao de oro",
        "cotabato": "north cotabato",
        "metropolitan manila": "ncr",
        "national capital region": "ncr",
    }
    return aliases.get(normalized, normalized)


def normalize_city(value: Any) -> str:
    normalized = normalize_name(value)
    normalized = re.sub(r"^(science )?city of ", "", normalized)
    normalized = re.sub(r" city$", "", normalized)
    return "kalookan" if normalized == "caloocan" else normalized


def admin_key(province: Any, city: Any, barangay: Any) -> tuple[str, str, str]:
    normalized_province = normalize_province(province)
    normalized_city = normalize_city(city)
    manila_submunicipalities = {
        "binondo",
        "ermita",
        "intramuros",
        "malate",
        "paco",
        "pandacan",
        "port area",
        "quiapo",
        "sampaloc",
        "san andres",
        "san miguel",
        "san nicolas",
        "santa ana",
        "santa cruz",
        "tondo i ii",
    }
    if normalized_province == "ncr" and normalized_city in manila_submunicipalities:
        normalized_city = "manila"
    return (
        normalized_province,
        normalized_city,
        normalize_name(barangay),
    )


def psgc_code(value: Any) -> str | None:
    """Return a canonical 10-digit PSGC code, rejecting local source IDs."""
    digits = re.sub(r"\D", "", str(value or ""))
    if len(digits) == 9:
        return digits.zfill(10)
    if len(digits) == 10:
        return digits
    return None


def safe_float(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if result == result else None


def slug(value: Any) -> str:
    return normalize_name(value).replace(" ", "-") or "unknown"


def numeric_pcode(value: Any) -> int | None:
    digits = re.sub(r"\D", "", str(value or ""))
    return int(digits) if digits else None


def load_coordinates(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def load_boundaries(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as handle:
        collection = json.load(handle)
    if collection.get("type") != "FeatureCollection":
        raise ValueError(f"{path} is not a GeoJSON FeatureCollection")
    return collection.get("features", [])


def geometry_parts(geometry: dict[str, Any]) -> list[list[Any]]:
    if geometry.get("type") == "Polygon":
        return [geometry["coordinates"]]
    if geometry.get("type") == "MultiPolygon":
        return geometry["coordinates"]
    raise ValueError(f"Unsupported geometry type: {geometry.get('type')!r}")


def ring_centroid(ring: list[list[float]]) -> tuple[float, float, float] | None:
    twice_area = x_sum = y_sum = 0.0
    for first, second in zip(ring, ring[1:]):
        x1, y1 = first[:2]
        x2, y2 = second[:2]
        cross = x1 * y2 - x2 * y1
        twice_area += cross
        x_sum += (x1 + x2) * cross
        y_sum += (y1 + y2) * cross
    if abs(twice_area) < 1e-12:
        return None
    return x_sum / (3 * twice_area), y_sum / (3 * twice_area), abs(twice_area / 2)


def geometry_centroid(geometry: dict[str, Any]) -> tuple[float, float] | None:
    weighted_x = weighted_y = total_area = 0.0
    for polygon in geometry_parts(geometry):
        if not polygon:
            continue
        outer = ring_centroid(polygon[0])
        if outer is None:
            continue
        polygon_x, polygon_y, polygon_area = outer
        weighted_x += polygon_x * polygon_area
        weighted_y += polygon_y * polygon_area
        total_area += polygon_area
    if total_area == 0:
        return None
    return weighted_x / total_area, weighted_y / total_area


def merge_geometry(features: list[dict[str, Any]]) -> dict[str, Any]:
    """Combine distinct polygon components without inventing new boundaries."""
    parts: list[list[Any]] = []
    seen: set[str] = set()
    for feature in features:
        for part in geometry_parts(feature["geometry"]):
            fingerprint = json.dumps(part, separators=(",", ":"))
            if fingerprint not in seen:
                seen.add(fingerprint)
                parts.append(part)
    if len(parts) == 1:
        return {"type": "Polygon", "coordinates": parts[0]}
    return {"type": "MultiPolygon", "coordinates": parts}


def make_feature(
    boundary_features: list[dict[str, Any]],
    coordinate: dict[str, str] | None,
) -> dict[str, Any]:
    source = boundary_features[0]["properties"]
    code = psgc_code(source.get("psgc_code"))
    if code is None:
        raise ValueError("Boundary feature is missing a valid PSGC code")

    latitude = safe_float(coordinate.get("latitude")) if coordinate else None
    longitude = safe_float(coordinate.get("longitude")) if coordinate else None
    geometry = merge_geometry(boundary_features)
    if latitude is None or longitude is None:
        center = geometry_centroid(geometry)
        if center:
            longitude, latitude = center

    # Repeated source features can be exact duplicates. Count their area once,
    # while still summing genuinely distinct polygon components for one code.
    areas_by_geometry: dict[str, float] = {}
    for feature in boundary_features:
        area = safe_float(feature.get("properties", {}).get("AREA_SQKM"))
        if area is not None:
            fingerprint = json.dumps(feature.get("geometry"), separators=(",", ":"))
            areas_by_geometry[fingerprint] = area

    name = source.get("psgc_name") or source.get("ADM4_EN")
    province = source.get("ADM2_EN")
    region = source.get("ADM1_EN")
    city = source.get("ADM3_EN")
    properties = {
        "ID_0": 177,
        "ISO": "PHL",
        "NAME_0": "Philippines",
        "ID_1": numeric_pcode(source.get("ADM2_PCODE")),
        "NAME_1": province,
        "ID_2": numeric_pcode(source.get("ADM3_PCODE")),
        "NAME_2": city,
        "ID_3": int(code),
        "NAME_3": name,
        "NL_NAME_3": None,
        "VARNAME_3": source.get("ADM4_REF"),
        "TYPE_3": "Barangay",
        "ENGTYPE_3": "Village",
        "PROVINCE": province,
        "REGION": region,
        "id": f"barangay-{code}",
        "name": name,
        "barangayCode": code,
        "population": None,
        "formattedPop": None,
        "densityCategory": "No data",
        "vulnerabilityRating": "No data",
        "healthRiskLevel": "No data",
        "areaKm2": round(sum(areas_by_geometry.values()), 6) if areas_by_geometry else None,
        "centerLat": latitude,
        "centerLng": longitude,
    }
    return {
        "type": "Feature",
        "properties": properties,
        "geometry": geometry,
    }


def write_json(path: Path, value: Any, *, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(
            value,
            handle,
            ensure_ascii=False,
            separators=(",", ":") if compact else None,
            indent=None if compact else 2,
        )
        handle.write("\n")


def collection(features: list[dict[str, Any]]) -> dict[str, Any]:
    return {"type": "FeatureCollection", "features": features}


def build(args: argparse.Namespace) -> dict[str, Any]:
    boundaries = load_boundaries(args.boundaries)
    coordinates = load_coordinates(args.coordinates)

    boundaries_by_code: dict[str, list[dict[str, Any]]] = defaultdict(list)
    boundary_name_index: dict[tuple[str, str, str], set[str]] = defaultdict(set)
    invalid_boundary_codes: list[dict[str, Any]] = []
    geometry_types: Counter[str] = Counter()

    for index, feature in enumerate(boundaries):
        properties = feature.get("properties", {})
        code = psgc_code(properties.get("psgc_code"))
        geometry = feature.get("geometry") or {}
        geometry_types[geometry.get("type", "missing")] += 1
        if code is None:
            invalid_boundary_codes.append({"featureIndex": index, "name": properties.get("ADM4_EN")})
            continue
        boundaries_by_code[code].append(feature)
        boundary_name_index[
            admin_key(properties.get("ADM2_EN"), properties.get("ADM3_EN"), properties.get("ADM4_EN"))
        ].add(code)

    coordinates_by_code: dict[str, list[dict[str, str]]] = defaultdict(list)
    coordinate_name_index: dict[tuple[str, str, str], list[dict[str, str]]] = defaultdict(list)
    for row in coordinates:
        code = psgc_code(row.get("coordinate_source_id"))
        if code:
            coordinates_by_code[code].append(row)
        coordinate_name_index[
            admin_key(row.get("province"), row.get("municipality_city"), row.get("barangay"))
        ].append(row)

    output_features: list[dict[str, Any]] = []
    join_counts: Counter[str] = Counter()
    unmatched_boundaries: list[dict[str, Any]] = []
    ambiguous_name_matches: list[dict[str, Any]] = []
    used_coordinate_rows: set[int] = set()

    for code in sorted(boundaries_by_code):
        grouped = boundaries_by_code[code]
        coordinate: dict[str, str] | None = None
        candidates = coordinates_by_code.get(code, [])
        if len(candidates) == 1:
            coordinate = candidates[0]
            join_counts["psgc_code"] += 1
        elif len(candidates) > 1:
            join_counts["ambiguous_psgc_code"] += 1
        else:
            properties = grouped[0]["properties"]
            key = admin_key(
                properties.get("ADM2_EN"),
                properties.get("ADM3_EN"),
                properties.get("ADM4_EN"),
            )
            name_candidates = coordinate_name_index.get(key, [])
            if len(name_candidates) == 1:
                coordinate = name_candidates[0]
                join_counts["unique_admin_names"] += 1
            elif len(name_candidates) > 1:
                join_counts["ambiguous_admin_names"] += 1
                ambiguous_name_matches.append({
                    "psgcCode": code,
                    "province": properties.get("ADM2_EN"),
                    "municipalityCity": properties.get("ADM3_EN"),
                    "barangay": properties.get("ADM4_EN"),
                    "candidateCount": len(name_candidates),
                })
            else:
                join_counts["unmatched"] += 1
                unmatched_boundaries.append({
                    "psgcCode": code,
                    "province": properties.get("ADM2_EN"),
                    "municipalityCity": properties.get("ADM3_EN"),
                    "barangay": properties.get("ADM4_EN"),
                })

        if coordinate is not None:
            used_coordinate_rows.add(id(coordinate))
        output_features.append(make_feature(grouped, coordinate))

    unused_coordinates = [
        {
            "id": row.get("id"),
            "sourceId": row.get("coordinate_source_id"),
            "province": row.get("province"),
            "municipalityCity": row.get("municipality_city"),
            "barangay": row.get("barangay"),
            "coordinateMethod": row.get("coordinate_method"),
        }
        for row in coordinates
        if id(row) not in used_coordinate_rows
    ]

    repeated_boundary_codes = {
        code: len(features)
        for code, features in boundaries_by_code.items()
        if len(features) > 1
    }
    duplicate_coordinate_codes = {
        code: len(rows)
        for code, rows in coordinates_by_code.items()
        if len(rows) > 1
    }
    output_geometry_types = Counter(feature["geometry"]["type"] for feature in output_features)
    missing_centers = sum(
        feature["properties"]["centerLat"] is None or feature["properties"]["centerLng"] is None
        for feature in output_features
    )

    report: dict[str, Any] = {
        "sourceFiles": {
            "boundaries": str(args.boundaries),
            "coordinates": str(args.coordinates),
        },
        "summary": {
            "boundaryFeatures": len(boundaries),
            "uniqueBoundaryPsgcCodes": len(boundaries_by_code),
            "coordinateRows": len(coordinates),
            "outputFeatures": len(output_features),
            "featuresWithoutCenters": missing_centers,
            "unusedCoordinateRows": len(unused_coordinates),
            "repeatedBoundaryPsgcCodes": len(repeated_boundary_codes),
            "duplicateCoordinatePsgcCodes": len(duplicate_coordinate_codes),
        },
        "joinCounts": dict(sorted(join_counts.items())),
        "sourceGeometryTypes": dict(sorted(geometry_types.items())),
        "outputGeometryTypes": dict(sorted(output_geometry_types.items())),
        "invalidBoundaryCodes": invalid_boundary_codes,
        "repeatedBoundaryCodes": repeated_boundary_codes,
        "duplicateCoordinateCodes": duplicate_coordinate_codes,
        "ambiguousNameMatches": ambiguous_name_matches,
        "unmatchedBoundaries": unmatched_boundaries,
        "unusedCoordinates": unused_coordinates,
    }

    write_json(args.output_dir / "validation-report.json", report)

    if args.generate:
        write_json(
            args.output_dir / "philippines-barangays.geojson",
            collection(output_features),
            compact=True,
        )
        region_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
        province_groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        for feature in output_features:
            properties = feature["properties"]
            region_groups[properties["REGION"]].append(feature)
            province_groups[(properties["REGION"], properties["PROVINCE"])].append(feature)
        for region, features in region_groups.items():
            write_json(args.output_dir / "regions" / f"{slug(region)}.geojson", collection(features), compact=True)
        for (region, province), features in province_groups.items():
            filename = f"{slug(region)}--{slug(province)}.geojson"
            write_json(args.output_dir / "provinces" / filename, collection(features), compact=True)

    return report


def main() -> int:
    args = parse_args()
    try:
        report = build(args)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    summary = report["summary"]
    print(json.dumps({"summary": summary, "joinCounts": report["joinCounts"]}, indent=2))
    print(f"Validation report: {args.output_dir / 'validation-report.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
