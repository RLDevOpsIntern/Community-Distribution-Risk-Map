import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import geophBagangaGeoJSONRaw from './geophBagangaBarangays.json';

export interface BagangaBarangayProperties {
  id: string;
  name: string;
  barangayCode: string;
  population: number;
  formattedPop: string;
  densityCategory: string;
  vulnerabilityRating: 'Low' | 'Moderate' | 'High' | 'Very High';
  healthRiskLevel: 'Low' | 'Medium' | 'High' | 'Severe';
  areaKm2: number;
  centerLat: number;
  centerLng: number;
}

export const BAGANGA_COLOR_MAP = {
  LIGHT_BLUE: '#38bdf8',
  TEAL: '#14b8a6',
  YELLOW: '#facc15',
  ORANGE: '#f97316',
  RED: '#ef4444'
};

type BagangaGeometry = Polygon | MultiPolygon;

interface GeoPHBarangayProperties {
  barangay_id: string;
  barangay_reference: string;
  barangay_name: string;
  locale: string;
}

interface BarangayStats {
  displayName?: string;
  population: number;
  areaKm2: number;
  healthRiskLevel: BagangaBarangayProperties['healthRiskLevel'];
  vulnerabilityRating: BagangaBarangayProperties['vulnerabilityRating'];
}

// These provisional statistics are retained from the original application.
// Boundary geometry comes exclusively from the pinned GeoPH dataset.
const statsByBarangay: Record<string, BarangayStats> = {
  Baculin: { population: 5410, areaKm2: 25.3, healthRiskLevel: 'Medium', vulnerabilityRating: 'Moderate' },
  Banao: { population: 2150, areaKm2: 45.2, healthRiskLevel: 'Low', vulnerabilityRating: 'Moderate' },
  Batawan: { population: 1250, areaKm2: 17.2, healthRiskLevel: 'Low', vulnerabilityRating: 'Low' },
  Batiano: { population: 1640, areaKm2: 14.7, healthRiskLevel: 'Medium', vulnerabilityRating: 'Moderate' },
  Binondo: { population: 1980, areaKm2: 15.1, healthRiskLevel: 'Medium', vulnerabilityRating: 'Moderate' },
  Bobonao: { population: 2340, areaKm2: 38.4, healthRiskLevel: 'Low', vulnerabilityRating: 'Low' },
  Campawan: { population: 3850, areaKm2: 32.5, healthRiskLevel: 'High', vulnerabilityRating: 'High' },
  Central: { displayName: 'Central (Poblacion)', population: 10450, areaKm2: 12.4, healthRiskLevel: 'High', vulnerabilityRating: 'Moderate' },
  Dapnan: { population: 8320, areaKm2: 18.6, healthRiskLevel: 'High', vulnerabilityRating: 'High' },
  Kinablangan: { population: 7680, areaKm2: 14.2, healthRiskLevel: 'Severe', vulnerabilityRating: 'Very High' },
  Lambajon: { population: 3120, areaKm2: 12.8, healthRiskLevel: 'Medium', vulnerabilityRating: 'Moderate' },
  Lucod: { population: 4890, areaKm2: 28.1, healthRiskLevel: 'Medium', vulnerabilityRating: 'Moderate' },
  Mahanub: { population: 2680, areaKm2: 22, healthRiskLevel: 'High', vulnerabilityRating: 'Very High' },
  Mikit: { population: 1180, areaKm2: 49.6, healthRiskLevel: 'Medium', vulnerabilityRating: 'Moderate' },
  Salingcomot: { population: 4120, areaKm2: 21, healthRiskLevel: 'Low', vulnerabilityRating: 'Low' },
  'San Isidro': { population: 1820, areaKm2: 29.5, healthRiskLevel: 'Low', vulnerabilityRating: 'Low' },
  'San Victor': { population: 1840, areaKm2: 11.5, healthRiskLevel: 'Medium', vulnerabilityRating: 'Moderate' },
  Saoquegue: { population: 950, areaKm2: 33.9, healthRiskLevel: 'Low', vulnerabilityRating: 'Low' }
};

function getDensityCategory(population: number): string {
  if (population >= 8000) return '8,000+';
  if (population >= 5000) return '5,000 - 8,000';
  if (population >= 3000) return '3,000 - 5,000';
  if (population >= 1500) return '1,500 - 3,000';
  return '< 1,500';
}

function getGeometryCenter(geometry: BagangaGeometry): { lat: number; lng: number } {
  let latitudeTotal = 0;
  let longitudeTotal = 0;
  let pointCount = 0;

  const visitCoordinates = (value: unknown): void => {
    if (!Array.isArray(value)) return;

    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      longitudeTotal += value[0];
      latitudeTotal += value[1];
      pointCount += 1;
      return;
    }

    value.forEach(visitCoordinates);
  };

  visitCoordinates(geometry.coordinates);

  return {
    lat: pointCount ? latitudeTotal / pointCount : 0,
    lng: pointCount ? longitudeTotal / pointCount : 0
  };
}

const geophCollection = geophBagangaGeoJSONRaw as unknown as FeatureCollection<
  BagangaGeometry,
  GeoPHBarangayProperties
>;

export const bagangaBarangaysGeoJSON: FeatureCollection<
  BagangaGeometry,
  BagangaBarangayProperties
> = {
  type: 'FeatureCollection',
  features: geophCollection.features.map((feature) => {
    const sourceName = feature.properties.barangay_name;
    const stats = statsByBarangay[sourceName];

    if (!stats) {
      throw new Error(`Missing application data for GeoPH barangay: ${sourceName}`);
    }

    const center = getGeometryCenter(feature.geometry);

    return {
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        id: `geoph-${feature.properties.barangay_id}`,
        name: stats.displayName ?? sourceName,
        barangayCode: feature.properties.barangay_reference,
        population: stats.population,
        formattedPop: stats.population.toLocaleString(),
        densityCategory: getDensityCategory(stats.population),
        vulnerabilityRating: stats.vulnerabilityRating,
        healthRiskLevel: stats.healthRiskLevel,
        areaKm2: stats.areaKm2,
        centerLat: center.lat,
        centerLng: center.lng
      }
    };
  })
};
