#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument near ${key ?? '<end>'}`);
    }
    args[key.slice(2)] = value;
  }
  return args;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  const headers = rows.shift();
  return rows
    .filter((values) => values.some((value) => value !== ''))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function quoteCsv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll('&', ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\bsta\b/g, 'santa')
    .replace(/\bsto\b/g, 'santo')
    .replace(/\bst\b/g, 'saint')
    .replace(/\bgen\b/g, 'general')
    .replace(/\bpob\b/g, 'poblacion')
    .replace(/\s+/g, ' ');
}

function normalizeProvince(value) {
  const normalized = normalize(value);
  return new Map([
    ['cotabato', 'north cotabato'],
    ['ncr', 'metropolitan manila'],
    ['national capital region', 'metropolitan manila'],
    ['compostela valley', 'davao de oro'],
  ]).get(normalized) ?? normalized;
}

function normalizeCity(value) {
  return normalize(value)
    .replace(/^science city of /, '')
    .replace(/^city of /, '')
    .replace(/ city$/, '')
    .replace(/^caloocan$/, 'kalookan');
}

function normalizeAdminCity(province, city) {
  const normalizedProvince = normalizeProvince(province);
  const normalizedCity = normalizeCity(city);
  const manilaSubmunicipalities = new Set([
    'binondo', 'ermita', 'intramuros', 'malate', 'paco', 'pandacan', 'port area',
    'quiapo', 'sampaloc', 'san andres', 'san miguel', 'san nicolas', 'santa ana',
    'santa cruz', 'tondo i ii',
  ]);
  return normalizedProvince === 'metropolitan manila' && manilaSubmunicipalities.has(normalizedCity)
    ? 'manila'
    : normalizedCity;
}

function normalizeBarangay(value) {
  return normalize(value)
    .replace(/\bnio\b/g, 'nino')
    .replace(/\bosmea\b/g, 'osmena');
}

function key(...parts) {
  return parts.join('\u001f');
}

function addToIndex(index, indexKey, value) {
  const values = index.get(indexKey);
  if (values) values.push(value);
  else index.set(indexKey, [value]);
}

function getUniqueUnused(index, indexKey, used) {
  const candidates = (index.get(indexKey) ?? []).filter((candidate) => !used.has(candidate.sourceId));
  return candidates.length === 1 ? candidates[0] : null;
}

function ringCentroid(ring) {
  let twiceArea = 0;
  let xSum = 0;
  let ySum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    const cross = x1 * y2 - x2 * y1;
    twiceArea += cross;
    xSum += (x1 + x2) * cross;
    ySum += (y1 + y2) * cross;
  }
  if (Math.abs(twiceArea) < 1e-12) return null;
  return {
    longitude: xSum / (3 * twiceArea),
    latitude: ySum / (3 * twiceArea),
    signedArea: twiceArea / 2,
  };
}

function polygonCentroid(polygon) {
  let longitudeSum = 0;
  let latitudeSum = 0;
  let areaSum = 0;
  polygon.forEach((ring, ringIndex) => {
    const centroid = ringCentroid(ring);
    if (!centroid) return;
    const weight = (ringIndex === 0 ? 1 : -1) * Math.abs(centroid.signedArea);
    longitudeSum += centroid.longitude * weight;
    latitudeSum += centroid.latitude * weight;
    areaSum += weight;
  });
  if (Math.abs(areaSum) < 1e-12) return null;
  return {
    longitude: longitudeSum / areaSum,
    latitude: latitudeSum / areaSum,
    area: Math.abs(areaSum),
  };
}

function geometryCentroid(geometry) {
  if (!geometry || geometry.type === 'GeometryCollection') return null;
  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : [];
  let longitudeSum = 0;
  let latitudeSum = 0;
  let areaSum = 0;
  for (const polygon of polygons) {
    const centroid = polygonCentroid(polygon);
    if (!centroid) continue;
    longitudeSum += centroid.longitude * centroid.area;
    latitudeSum += centroid.latitude * centroid.area;
    areaSum += centroid.area;
  }
  if (areaSum === 0) return null;
  return { longitude: longitudeSum / areaSum, latitude: latitudeSum / areaSum };
}

function levenshtein(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function similarity(left, right) {
  if (left === right) return 1;
  const longest = Math.max(left.length, right.length);
  return longest === 0 ? 1 : 1 - levenshtein(left, right) / longest;
}

function loadOfficialRecords(psgcDir, geometryDir) {
  const provinces = new Map(
    parseCsv(fs.readFileSync(path.join(psgcDir, 'PH_Adm2_ProvDists.csv'), 'utf8'))
      .map((row) => [row.adm2_psgc, row.adm2_en]),
  );
  const cities = new Map(
    parseCsv(fs.readFileSync(path.join(psgcDir, 'PH_Adm3_MuniCities.csv'), 'utf8'))
      .map((row) => [row.adm3_psgc, { name: row.adm3_en, provinceCode: row.adm2_psgc }]),
  );
  const adm4 = parseCsv(fs.readFileSync(path.join(psgcDir, 'PH_Adm4_BgySubMuns.csv'), 'utf8'));
  const submunicipalities = new Map(
    adm4.filter((row) => row.geo_level === 'SubMun')
      .map((row) => [row.adm4_psgc, { name: row.adm4_en, provinceCode: row.adm2_psgc }]),
  );

  const geometries = new Map();
  for (const filename of fs.readdirSync(geometryDir)) {
    if (!filename.endsWith('.json') && !filename.endsWith('.geojson')) continue;
    const collection = JSON.parse(fs.readFileSync(path.join(geometryDir, filename), 'utf8'));
    for (const feature of collection.features ?? []) {
      const psgc = String(feature.properties?.adm4_psgc ?? '');
      if (!psgc) continue;
      geometries.set(psgc, feature.geometry);
      if (psgc.endsWith('0')) geometries.set(psgc.slice(0, -1), feature.geometry);
    }
  }

  return adm4.filter((row) => row.geo_level === 'Bgy').map((row) => {
    const city = cities.get(row.adm3_psgc) ?? submunicipalities.get(row.adm3_psgc);
    const geometry = geometries.get(row.adm4_psgc) ?? geometries.get(`${row.adm4_psgc}0`);
    return {
      sourceId: `psgc:${row.adm4_psgc}`,
      sourceCode: row.adm4_psgc,
      source: 'PSGC 2023 / faeldon boundaries',
      province: provinces.get(city?.provinceCode ?? row.adm2_psgc)
        ?? (row.adm2_psgc === '1999900000' ? 'Maguindanao del Sur' : ''),
      city: city?.name ?? '',
      barangay: row.adm4_en,
      geometry,
      center: geometryCentroid(geometry),
    };
  }).filter((record) => record.center);
}

function loadGeoPhRecords(directory) {
  const records = [];
  for (const filename of fs.readdirSync(directory)) {
    if (!filename.endsWith('.json')) continue;
    const feature = JSON.parse(fs.readFileSync(path.join(directory, filename), 'utf8'));
    const center = geometryCentroid(feature.geometry);
    if (!center) continue;
    records.push({
      sourceId: `geoph:${feature.properties?.barangay_reference ?? filename}`,
      sourceCode: String(feature.properties?.barangay_reference ?? ''),
      source: 'GeoPH boundary',
      province: feature.properties?.province_name ?? '',
      city: feature.properties?.city_name ?? '',
      barangay: feature.properties?.barangay_name ?? '',
      geometry: feature.geometry,
      center,
    });
  }
  return records;
}

function prepare(records) {
  for (const record of records) {
    record.nProvince = normalizeProvince(record.province);
    record.nCity = normalizeAdminCity(record.province, record.city);
    record.nBarangay = normalizeBarangay(record.barangay);
    record.group = key(record.nProvince, record.nCity);
  }
  const indexes = {
    triple: new Map(),
    cityBarangay: new Map(),
    provinceBarangay: new Map(),
    groups: new Map(),
  };
  for (const record of records) {
    addToIndex(indexes.triple, key(record.nProvince, record.nCity, record.nBarangay), record);
    addToIndex(indexes.cityBarangay, key(record.nCity, record.nBarangay), record);
    addToIndex(indexes.provinceBarangay, key(record.nProvince, record.nBarangay), record);
    addToIndex(indexes.groups, record.group, record);
  }
  return indexes;
}

function assign(row, record, method, used) {
  row.match = { record, method };
  used.add(record.sourceId);
}

function matchDirect(rows, records, used, sourceLabel) {
  const indexes = prepare(records);
  for (const row of rows.filter((candidate) => !candidate.match)) {
    const lookups = [
      ['exact_admin_names', indexes.triple, key(row.nProvince, row.nCity, row.nBarangay)],
      ['unique_city_and_barangay', indexes.cityBarangay, key(row.nCity, row.nBarangay)],
      ['unique_province_and_barangay', indexes.provinceBarangay, key(row.nProvince, row.nBarangay)],
    ];
    for (const [method, index, indexKey] of lookups) {
      const record = getUniqueUnused(index, indexKey, used);
      if (record) {
        assign(row, record, `${sourceLabel}:${method}`, used);
        break;
      }
    }
  }
  return indexes;
}

function reconcileOfficialGroups(rows, records, used) {
  const remainingRows = rows.filter((row) => !row.match);
  const remainingRecords = records.filter((record) => !used.has(record.sourceId));
  const rowGroups = new Map();
  const recordGroups = new Map();
  for (const row of remainingRows) addToIndex(rowGroups, row.group, row);
  for (const record of remainingRecords) addToIndex(recordGroups, record.group, record);

  const candidateGroupPairs = [];
  for (const [rowGroup, groupRows] of rowGroups) {
    const names = new Set(groupRows.map((row) => row.nBarangay));
    for (const [recordGroup, groupRecords] of recordGroups) {
      if (groupRows[0].nProvince !== groupRecords[0].nProvince) continue;
      const overlap = groupRecords.filter((record) => names.has(record.nBarangay)).length;
      if (overlap > 0) {
        candidateGroupPairs.push({ rowGroup, recordGroup, overlap, sizeDelta: Math.abs(groupRows.length - groupRecords.length) });
      }
    }
  }
  candidateGroupPairs.sort((a, b) => b.overlap - a.overlap || a.sizeDelta - b.sizeDelta);

  for (const pair of candidateGroupPairs) {
    const groupRows = (rowGroups.get(pair.rowGroup) ?? []).filter((row) => !row.match);
    const groupRecords = (recordGroups.get(pair.recordGroup) ?? []).filter((record) => !used.has(record.sourceId));
    for (const row of groupRows) {
      const candidates = groupRecords.filter((record) => record.nBarangay === row.nBarangay && !used.has(record.sourceId));
      if (candidates.length === 1) assign(row, candidates[0], 'PSGC 2023:reconciled_municipality_transfer', used);
    }
  }

  const fuzzyPairs = [];
  for (const row of rows.filter((candidate) => !candidate.match)) {
    for (const record of records) {
      if (used.has(record.sourceId) || row.nProvince !== record.nProvince) continue;
      const nameScore = similarity(row.nBarangay, record.nBarangay);
      const cityScore = similarity(row.nCity, record.nCity);
      if (nameScore >= 0.84 && (row.nCity === record.nCity || cityScore >= 0.78)) {
        fuzzyPairs.push({ row, record, score: nameScore * 0.8 + cityScore * 0.2 });
      }
    }
  }
  fuzzyPairs.sort((a, b) => b.score - a.score);
  const fuzzyRows = new Set();
  for (const pair of fuzzyPairs) {
    if (pair.row.match || fuzzyRows.has(pair.row) || used.has(pair.record.sourceId)) continue;
    assign(pair.row, pair.record, 'PSGC 2023:fuzzy_name_reconciliation', used);
    fuzzyRows.add(pair.row);
  }
}

function findFallbackCenter(row, allRows, officialRecords, oldRecords) {
  const authoritativePoints = new Map([
    [key('palawan', 'kalayaan', 'pag asa'), {
      center: { latitude: 11.052778, longitude: 114.28525 },
      source: 'Executive Order No. 111 (2026)',
      sourceCode: 'EO-111-2026',
      method: 'authoritative_named_feature_point',
    }],
  ]);
  const authoritativePoint = authoritativePoints.get(key(row.nProvince, row.nCity, row.nBarangay));
  if (authoritativePoint) return authoritativePoint;

  const sameMunicipalityMatches = allRows.filter((candidate) =>
    candidate.match && candidate.nProvince === row.nProvince && candidate.nCity === row.nCity);
  if (sameMunicipalityMatches.length > 0) {
    return {
      center: {
        longitude: sameMunicipalityMatches.reduce((sum, candidate) => sum + candidate.match.record.center.longitude, 0) / sameMunicipalityMatches.length,
        latitude: sameMunicipalityMatches.reduce((sum, candidate) => sum + candidate.match.record.center.latitude, 0) / sameMunicipalityMatches.length,
      },
      source: 'Derived from matched barangays in municipality',
      sourceCode: '',
      method: 'municipality_average_fallback',
    };
  }

  const candidates = [...officialRecords, ...oldRecords]
    .filter((record) => record.nProvince === row.nProvince)
    .map((record) => ({ record, score: similarity(row.nCity, record.nCity) }))
    .filter((candidate) => candidate.score >= 0.55)
    .sort((left, right) => right.score - left.score);
  const bestCity = candidates[0]?.record.nCity;
  const cityRecords = candidates.filter((candidate) => candidate.record.nCity === bestCity).map((candidate) => candidate.record);
  if (cityRecords.length > 0) {
    return {
      center: {
        longitude: cityRecords.reduce((sum, record) => sum + record.center.longitude, 0) / cityRecords.length,
        latitude: cityRecords.reduce((sum, record) => sum + record.center.latitude, 0) / cityRecords.length,
      },
      source: 'Derived from closest historical municipality boundary set',
      sourceCode: '',
      method: 'historical_municipality_fallback',
    };
  }
  return null;
}

function validateCoordinate(center, row) {
  if (!center || !Number.isFinite(center.latitude) || !Number.isFinite(center.longitude)) {
    throw new Error(`No coordinate available for ${row.province} / ${row.municipality_city} / ${row.barangay}`);
  }
  if (center.latitude < 4 || center.latitude > 22 || center.longitude < 112 || center.longitude > 130) {
    throw new Error(`Coordinate outside the Philippines for row ${row.id}: ${JSON.stringify(center)}`);
  }
}

const args = parseArgs(process.argv.slice(2));
for (const required of ['input', 'output', 'psgc-dir', 'modern-geometry-dir', 'geoph-dir']) {
  if (!args[required]) throw new Error(`Missing --${required}`);
}

const rows = parseCsv(fs.readFileSync(args.input, 'utf8'));
for (const row of rows) {
  row.nProvince = normalizeProvince(row.province);
  row.nCity = normalizeAdminCity(row.province, row.municipality_city);
  row.nBarangay = normalizeBarangay(row.barangay);
  row.group = key(row.nProvince, row.nCity);
}

const officialRecords = loadOfficialRecords(args['psgc-dir'], args['modern-geometry-dir']);
const oldRecords = loadGeoPhRecords(args['geoph-dir']);
const officialUsed = new Set();
const oldUsed = new Set();

matchDirect(rows, officialRecords, officialUsed, 'PSGC 2023');
reconcileOfficialGroups(rows, officialRecords, officialUsed);
matchDirect(rows, oldRecords, oldUsed, 'GeoPH');

for (const row of rows.filter((candidate) => !candidate.match)) {
  const fallback = findFallbackCenter(row, rows, officialRecords, oldRecords);
  if (fallback) row.fallback = fallback;
}

const headers = [
  'id', 'region', 'province', 'province_code', 'municipality_city', 'barangay',
  'latitude', 'longitude', 'coordinate_source', 'coordinate_method', 'coordinate_source_id',
];
const outputRows = [headers.map(quoteCsv).join(',')];
const methodCounts = new Map();
const fallbackRows = [];
for (const row of rows) {
  const record = row.match?.record;
  const fallback = row.fallback;
  const center = record?.center ?? fallback?.center;
  validateCoordinate(center, row);
  const method = row.match?.method ?? fallback.method;
  methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);
  if (!row.match) fallbackRows.push(row);
  const values = [
    row.id, row.region, row.province, row.province_code, row.municipality_city, row.barangay,
    center.latitude.toFixed(6), center.longitude.toFixed(6),
    record?.source ?? fallback.source, method, record?.sourceCode ?? fallback.sourceCode,
  ];
  outputRows.push(values.map(quoteCsv).join(','));
}
fs.writeFileSync(args.output, `${outputRows.join('\n')}\n`);

const report = {
  inputRows: rows.length,
  outputRows: outputRows.length - 1,
  officialBoundaryRecords: officialRecords.length,
  geoPhBoundaryRecords: oldRecords.length,
  fallbackCount: fallbackRows.length,
  methodCounts: Object.fromEntries([...methodCounts].sort((left, right) => right[1] - left[1])),
  fallbackRows: fallbackRows.map((row) => ({
    id: row.id,
    province: row.province,
    municipality_city: row.municipality_city,
    barangay: row.barangay,
    method: row.fallback?.method ?? null,
  })),
};
if (args.report) fs.writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, fallbackRows: undefined }, null, 2));
