import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  barangaysGeoJSON,
  POPULATION_COLOR_MAP,
  type BarangayFeatureProperties
} from '../data/barangaysData';

interface ChoroplethMapProps {
  onHoverBarangay: (b: BarangayFeatureProperties | null) => void;
  onSelectBarangay: (b: BarangayFeatureProperties | null) => void;
  selectedBarangay: BarangayFeatureProperties | null;
  onInitMap?: (map: L.Map) => void;
}

export const ChoroplethMap: React.FC<ChoroplethMapProps> = ({
  onHoverBarangay,
  onSelectBarangay,
  onInitMap
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const getBarangayColor = (pop: number) => {
    if (pop >= 20000) return POPULATION_COLOR_MAP.RED;
    if (pop >= 15000) return POPULATION_COLOR_MAP.ORANGE;
    if (pop >= 10000) return POPULATION_COLOR_MAP.YELLOW;
    if (pop >= 5000) return POPULATION_COLOR_MAP.TEAL;
    return POPULATION_COLOR_MAP.LIGHT_BLUE;
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet Map over Quezon City
    const map = L.map(mapContainerRef.current, {
      center: [14.676, 121.044],
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    mapRef.current = map;

    // Add Tile Layer (OpenStreetMap basemap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Style and Add Real Quezon City Barangay Boundary Layer
    const geoJsonLayer = L.geoJSON(barangaysGeoJSON as any, {
      style: (feature) => {
        const pop = feature?.properties?.population || 0;
        return {
          fillColor: getBarangayColor(pop),
          weight: 1.5,
          opacity: 1,
          color: '#ffffff',
          fillOpacity: 0.75
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties as BarangayFeatureProperties;

        // Tooltip popup showing Barangay Name and Population
        const labelText = `<div style="font-family: system-ui, sans-serif; font-size: 12px; font-weight: 700;">${props.name}</div><div style="font-size: 11px; color: #475569;">Population: ${props.formattedPop}</div>`;
        layer.bindTooltip(labelText, {
          sticky: true,
          direction: 'auto'
        });

        // Hover & Click Event Handling
        layer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({
              weight: 3.5,
              color: '#0f172a',
              fillOpacity: 0.95
            });
            target.bringToFront();
            onHoverBarangay(props);
          },
          mouseout: (e) => {
            geoJsonLayer.resetStyle(e.target);
            onHoverBarangay(null);
          },
          click: () => {
            onSelectBarangay(props);
          }
        });
      }
    }).addTo(map);

    map.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] });

    if (onInitMap) {
      onInitMap(map);
    }

    const refreshMap = () => {
      map.invalidateSize();
      map.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] });
    };

    refreshMap();
    requestAnimationFrame(refreshMap);
    setTimeout(refreshMap, 150);

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[540px]">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full bg-slate-100 z-0" />
    </div>
  );
};
