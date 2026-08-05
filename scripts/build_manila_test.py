#!/usr/bin/env python3
"""Create a detailed Manila City GeoJSON proof of concept from WKT data."""

from __future__ import annotations

import csv
import json
import re
import unicodedata
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
WKT_SOURCE = ROOT / "src/data/all_barangay-2.csv"
PSGC_SOURCE = ROOT / "src/data/barangays.geojson"
COORDINATE_SOURCE = ROOT / "src/data/studio_results_20260804_1119_with_coordinates.csv"
OUTPUT = ROOT / "public/data/manila-city-detailed.geojson"


def normalized(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(character for character in text if not unicodedata.combining(character))
    return re.sub(r"[^a-z0-9]+", " ", text.casefold()).strip()


def parse_wkt_multipolygon(value: str) -> dict[str, Any]:
    match = re.match(r"^\s*(MULTIPOLYGON|POLYGON)\s*(.*)\s*$", value, re.IGNORECASE)
    if not match:
        raise ValueError("Only POLYGON and MULTIPOLYGON WKT are supported")
    geometry_type = match.group(1).title().replace("Multipolygon", "MultiPolygon")
    tokens = re.findall(r"[(),]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?", match.group(2))
    position = 0

    def parse_group() -> list[Any]:
        nonlocal position
        if position >= len(tokens) or tokens[position] != "(":
            raise ValueError("Expected opening parenthesis in WKT")
        position += 1
        values: list[Any] = []
        while position < len(tokens) and tokens[position] != ")":
            if tokens[position] == "(":
                values.append(parse_group())
            else:
                longitude = float(tokens[position])
                latitude = float(tokens[position + 1])
                position += 2
                values.append([longitude, latitude])
            if position < len(tokens) and tokens[position] == ",":
                position += 1
        if position >= len(tokens):
            raise ValueError("Unclosed parenthesis in WKT")
        position += 1
        return values

    coordinates = parse_group()
    if position != len(tokens):
        raise ValueError("Unexpected trailing WKT tokens")
    return {"type": geometry_type, "coordinates": coordinates}


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    detailed_rows = [
        row
        for row in load_csv(WKT_SOURCE)
        if normalized(row["province"]) == "metropolitan manila"
        and normalized(row["municipality_city"]) == "manila"
        and normalized(row["barangay"]) != "n a"
    ]
    coordinate_rows = [
        row
        for row in load_csv(COORDINATE_SOURCE)
        if normalized(row["region"]) == "ncr"
        and normalized(row["municipality_city"]) in {
            "binondo", "ermita", "intramuros", "malate", "paco", "pandacan",
            "port area", "quiapo", "sampaloc", "san andres", "san miguel",
            "san nicolas", "santa ana", "santa cruz", "tondo i ii",
        }
    ]
    coordinates_by_name = {normalized(row["barangay"]): row for row in coordinate_rows}

    with PSGC_SOURCE.open(encoding="utf-8") as handle:
        source_features = json.load(handle)["features"]
    psgc_by_name: dict[str, dict[str, Any]] = {}
    for feature in source_features:
        properties = feature.get("properties", {})
        if normalized(properties.get("ADM3_EN")) == "city of manila":
            psgc_by_name[normalized(properties.get("ADM4_EN"))] = properties
    missing_detailed_geometry = sorted(
        properties.get("psgc_name") or properties.get("ADM4_EN")
        for key, properties in psgc_by_name.items()
        if key not in {normalized(row["barangay"]) for row in detailed_rows}
    )

    features: list[dict[str, Any]] = []
    missing_psgc: list[str] = []
    for row in detailed_rows:
        key = normalized(row["barangay"])
        source = psgc_by_name.get(key)
        center = coordinates_by_name.get(key)
        if source is None:
            missing_psgc.append(row["barangay"])
        code = source.get("psgc_code") if source else None
        features.append({
            "type": "Feature",
            "properties": {
                "name": row["barangay"],
                "barangayCode": code,
                "municipalityCity": "City of Manila",
                "province": "Metropolitan Manila First District",
                "region": "National Capital Region (NCR)",
                "centerLat": float(center["latitude"]) if center else float(row["centroid_lat"]),
                "centerLng": float(center["longitude"]) if center else float(row["centroid_lon"]),
                "polygonPointCount": int(row["polygon_point_count"]),
                "geometrySource": "all_barangay-2.csv detailed WKT",
            },
            "geometry": parse_wkt_multipolygon(row["polygon_wkt"]),
        })

    output = {
        "type": "FeatureCollection",
        "name": "Manila City detailed barangay boundary test",
        "features": features,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8") as handle:
        json.dump(output, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")
    print(json.dumps({
        "output": str(OUTPUT),
        "features": len(features),
        "missingPsgc": len(missing_psgc),
        "missingPsgcNames": missing_psgc,
        "missingDetailedGeometry": missing_detailed_geometry,
    }, indent=2))


if __name__ == "__main__":
    main()
