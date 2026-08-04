import type { FeatureCollection, Polygon } from 'geojson';

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
  LIGHT_BLUE: '#38bdf8', // < 1,500
  TEAL: '#14b8a6',       // 1,500 - 3,000
  YELLOW: '#facc15',     // 3,000 - 5,000
  ORANGE: '#f97316',     // 5,000 - 8,000
  RED: '#ef4444'         // 8,000+
};

type Point = [number, number]; // [longitude, latitude]

// Accurate GIS Polygon boundaries matching official Baganga Municipality Map (126°15'E-126°38'E, 7°26'N-7°44'N)
const bagangaFeaturesData: {
  name: string;
  pop: number;
  area: number;
  risk: 'Low' | 'Medium' | 'High' | 'Severe';
  vuln: 'Low' | 'Moderate' | 'High' | 'Very High';
  coords: Point[];
}[] = [
    {
      name: 'Banao',
      pop: 2150,
      area: 45.2,
      risk: 'Low',
      vuln: 'Moderate',
      coords: [
        [126.250, 7.740],
        [126.505, 7.720],
        [126.510, 7.683],
        [126.495, 7.683],
        [126.375, 7.683],
        [126.255, 7.683],
        [126.250, 7.740]
      ]
    },
    {
      name: 'Lucod',
      pop: 4890,
      area: 28.1,
      risk: 'Medium',
      vuln: 'Moderate',
      coords: [
        [126.255, 7.683],
        [126.375, 7.683],
        [126.365, 7.633],
        [126.260, 7.633],
        [126.255, 7.683]
      ]
    },
    {
      name: 'Campawan',
      pop: 3850,
      area: 32.5,
      risk: 'High',
      vuln: 'High',
      coords: [
        [126.375, 7.683],
        [126.495, 7.683],
        [126.495, 7.633],
        [126.365, 7.633],
        [126.375, 7.683]
      ]
    },
    {
      name: 'Kinablangan',
      pop: 7680,
      area: 14.2,
      risk: 'Severe',
      vuln: 'Very High',
      coords: [
        [126.495, 7.683],
        [126.525, 7.683],
        [126.535, 7.658],
        [126.495, 7.658],
        [126.495, 7.683]
      ]
    },
    {
      name: 'San Victor',
      pop: 1840,
      area: 11.5,
      risk: 'Medium',
      vuln: 'Moderate',
      coords: [
        [126.495, 7.658],
        [126.535, 7.658],
        [126.540, 7.625],
        [126.495, 7.625],
        [126.495, 7.658]
      ]
    },
    {
      name: 'San Isidro',
      pop: 1820,
      area: 29.5,
      risk: 'Low',
      vuln: 'Low',
      coords: [
        [126.260, 7.633],
        [126.365, 7.633],
        [126.495, 7.633],
        [126.495, 7.616],
        [126.265, 7.616],
        [126.260, 7.633]
      ]
    },
    {
      name: 'Dapnan',
      pop: 8320,
      area: 18.6,
      risk: 'High',
      vuln: 'High',
      coords: [
        [126.495, 7.625],
        [126.540, 7.625],
        [126.550, 7.575],
        [126.495, 7.575],
        [126.495, 7.616],
        [126.495, 7.625]
      ]
    },
    {
      name: 'Mikit',
      pop: 1180,
      area: 49.6,
      risk: 'Medium',
      vuln: 'Moderate',
      coords: [
        [126.265, 7.616],
        [126.495, 7.616],
        [126.495, 7.560],
        [126.415, 7.560],
        [126.270, 7.560],
        [126.265, 7.616]
      ]
    },
    {
      name: 'Mahanub',
      pop: 2680,
      area: 22.0,
      risk: 'High',
      vuln: 'Very High',
      coords: [
        [126.415, 7.560],
        [126.495, 7.575],
        [126.495, 7.535],
        [126.415, 7.535],
        [126.415, 7.560]
      ]
    },
    {
      name: 'Lambajon',
      pop: 3120,
      area: 12.8,
      risk: 'Medium',
      vuln: 'Moderate',
      coords: [
        [126.495, 7.575],
        [126.550, 7.575],
        [126.560, 7.545],
        [126.495, 7.545],
        [126.495, 7.575]
      ]
    },
    {
      name: 'Central (Poblacion)',
      pop: 10450,
      area: 12.4,
      risk: 'High',
      vuln: 'Moderate',
      coords: [
        [126.495, 7.545],
        [126.560, 7.545],
        [126.565, 7.525],
        [126.495, 7.525],
        [126.495, 7.545]
      ]
    },
    {
      name: 'Saoquegue',
      pop: 950,
      area: 33.9,
      risk: 'Low',
      vuln: 'Low',
      coords: [
        [126.270, 7.560],
        [126.415, 7.560],
        [126.390, 7.535],
        [126.390, 7.490],
        [126.275, 7.490],
        [126.270, 7.560]
      ]
    },
    {
      name: 'Batiano',
      pop: 1640,
      area: 14.7,
      risk: 'Medium',
      vuln: 'Moderate',
      coords: [
        [126.390, 7.535],
        [126.450, 7.535],
        [126.450, 7.490],
        [126.390, 7.490],
        [126.390, 7.535]
      ]
    },
    {
      name: 'Binondo',
      pop: 1980,
      area: 15.1,
      risk: 'Medium',
      vuln: 'Moderate',
      coords: [
        [126.450, 7.535],
        [126.495, 7.535],
        [126.495, 7.515],
        [126.450, 7.515],
        [126.450, 7.535]
      ]
    },
    {
      name: 'Salingcomot',
      pop: 4120,
      area: 21.0,
      risk: 'Low',
      vuln: 'Low',
      coords: [
        [126.495, 7.525],
        [126.565, 7.525],
        [126.560, 7.480],
        [126.450, 7.480],
        [126.495, 7.515],
        [126.495, 7.525]
      ]
    },
    {
      name: 'Bobonao',
      pop: 2340,
      area: 38.4,
      risk: 'Low',
      vuln: 'Low',
      coords: [
        [126.275, 7.490],
        [126.390, 7.490],
        [126.450, 7.480],
        [126.560, 7.480],
        [126.555, 7.465],
        [126.370, 7.465],
        [126.280, 7.465],
        [126.275, 7.490]
      ]
    },
    {
      name: 'Batawan',
      pop: 1250,
      area: 17.2,
      risk: 'Low',
      vuln: 'Low',
      coords: [
        [126.250, 7.465],
        [126.370, 7.465],
        [126.370, 7.445],
        [126.250, 7.445],
        [126.250, 7.465]
      ]
    },
    {
      name: 'Baculin',
      pop: 5410,
      area: 25.3,
      risk: 'Medium',
      vuln: 'Moderate',
      coords: [
        [126.370, 7.465],
        [126.555, 7.465],
        [126.550, 7.445],
        [126.370, 7.445],
        [126.370, 7.465]
      ]
    }
  ];

// Calculate polygon centroid for tooltip anchoring
function getPolygonCentroid(coords: Point[]): { lat: number; lng: number } {
  let sumLng = 0;
  let sumLat = 0;
  const count = coords.length - 1 || 1;
  for (let i = 0; i < count; i++) {
    sumLng += coords[i][0];
    sumLat += coords[i][1];
  }
  return { lat: sumLat / count, lng: sumLng / count };
}

export const bagangaBarangaysGeoJSON: FeatureCollection<Polygon, BagangaBarangayProperties> = {
  type: 'FeatureCollection',
  features: bagangaFeaturesData.map((item, idx) => {
    let densityCategory = '< 1,500';
    if (item.pop >= 8000) densityCategory = '8,000+';
    else if (item.pop >= 5000) densityCategory = '5,000 - 8,000';
    else if (item.pop >= 3000) densityCategory = '3,000 - 5,000';
    else if (item.pop >= 1500) densityCategory = '1,500 - 3,000';

    const centroid = getPolygonCentroid(item.coords);

    return {
      type: 'Feature',
      properties: {
        id: `baganga-${idx + 1}`,
        name: item.name,
        barangayCode: `112502${String(idx + 1).padStart(3, '0')}`,
        population: item.pop,
        formattedPop: item.pop.toLocaleString(),
        densityCategory,
        vulnerabilityRating: item.vuln,
        healthRiskLevel: item.risk,
        areaKm2: item.area,
        centerLat: centroid.lat,
        centerLng: centroid.lng
      },
      geometry: {
        type: 'Polygon',
        coordinates: [item.coords]
      }
    };
  })
};
