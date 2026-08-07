import React, { useEffect } from 'react';
import L from 'leaflet';
import { philippinesMaskGeoJSON } from '../data/philippinesMaskGeoJSON';

export interface PhilippinesMapBoundsProps {
  map?: L.Map | null;
  minZoom?: number;
  maxBoundsViscosity?: number;
  maskColor?: string;
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
  maxBoundsViscosity = 1.0,
  maskColor = '#aad3df'
}) => {
  useEffect(() => {
    if (!map) return;

    lockMapToPhilippines(map, { minZoom, maxBoundsViscosity });

    // Keep the mask above the basemap but below application overlays such as
    // barangay boundaries. The GeoJSON is a world polygon whose holes follow
    // the Philippine coastline, so neighboring land and labels are concealed.
    const paneName = 'philippines-mask';
    const pane = map.getPane(paneName) ?? map.createPane(paneName);
    pane.style.zIndex = '350';
    pane.style.pointerEvents = 'none';

    // Leaflet normally renders SVG paths only slightly beyond the viewport.
    // A full viewport of padding prevents the basemap from peeking through the
    // clipped edge of this unusually large polygon while the map is dragged.
    const maskRenderer = L.svg({
      pane: paneName,
      padding: 1
    });

    const maskLayer = L.geoJSON(philippinesMaskGeoJSON as any, {
      pane: paneName,
      interactive: false,
      style: {
        renderer: maskRenderer,
        stroke: false,
        fillColor: maskColor,
        fillOpacity: 1,
        fillRule: 'evenodd'
      }
    }).addTo(map);

    return () => {
      maskLayer.removeFrom(map);
      maskRenderer.removeFrom(map);
    };
  }, [map, minZoom, maxBoundsViscosity, maskColor]);

  return null;
};

export default PhilippinesMapBounds;
