// Outer world boundary ring (covering global coordinates)
const WORLD_OUTER_RING: [number, number][] = [
  [-180, -90],
  [180, -90],
  [180, 90],
  [-180, 90],
  [-180, -90]
];

// Tightened Philippines Cutout Ring (Excludes Sabah/Malaysia, Taiwan, and Vietnam)
const PHILIPPINES_CUTOUT_RING: [number, number][] = [
  [118.0, 18.8], // North-West (Below Taiwan / Luzon Strait)
  [126.8, 18.8], // North-East (Philippine Sea)
  [126.8, 5.2],  // South-East (Above Indonesia / Celebes Sea)
  [119.2, 5.2],  // South-West (Above Sabah, Malaysia / Sulu Sea)
  [117.2, 7.5],  // Palawan South
  [118.0, 18.8]  // Close ring
];

export const philippinesMaskGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'World Mask Outside Philippines' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          WORLD_OUTER_RING,
          PHILIPPINES_CUTOUT_RING
        ]
      }
    }
  ]
};
