import React, { useEffect } from 'react';
import L from 'leaflet';

export interface PhilippinesMapBoundsProps {
  map?: L.Map | null;
  minZoom?: number;
  maxBoundsViscosity?: number;
}

/**
 * Official geographic bounding box enclosing the Philippine archipelago & territorial seas:
 * - South-West: [4.5° N, 116.0° E] (Sulu Sea / Tawi-Tawi)
 * - North-East: [21.5° N, 127.0° E] (Batanes / Philippine Sea)
 */
const PHILIPPINES_BOUNDS = L.latLngBounds(
  [4.5, 116.0],
  [21.5, 127.0]
);

/**
 * Locks a Leaflet map instance strictly within the Philippines geographic boundaries.
 */
function lockMapToPhilippines(
  map: L.Map,
  options: { minZoom?: number; maxBoundsViscosity?: number } = {}
): void {
  const { minZoom = 6, maxBoundsViscosity = 1.0 } = options;

  map.setMinZoom(minZoom);
  map.setMaxBounds(PHILIPPINES_BOUNDS);
  map.options.maxBoundsViscosity = maxBoundsViscosity;
}

/**
 * Declarative React Component that locks its target Leaflet map instance to the Philippines bounds.
 */
export const PhilippinesMapBounds: React.FC<PhilippinesMapBoundsProps> = ({
  map,
  minZoom = 6,
  maxBoundsViscosity = 1.0
}) => {
  useEffect(() => {
    if (!map) return;
    lockMapToPhilippines(map, { minZoom, maxBoundsViscosity });
  }, [map, minZoom, maxBoundsViscosity]);

  return null;
};

export default PhilippinesMapBounds;
