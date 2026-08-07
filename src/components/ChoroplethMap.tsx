import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  bagangaBarangaysGeoJSON,
  BAGANGA_COLOR_MAP,
  type BagangaBarangayProperties
} from '../data/geophBagangaBarangaysData';
import PhilippinesMapBounds from './PhilippinesMapBounds';

interface ChoroplethMapProps {
  onHoverBarangay: (b: BagangaBarangayProperties | null) => void;
  onSelectBarangay: (b: BagangaBarangayProperties | null) => void;
  selectedBarangay: BagangaBarangayProperties | null;
  onInitMap?: (map: L.Map, bounds: L.LatLngBounds) => void;
}

export const ChoroplethMap: React.FC<ChoroplethMapProps> = ({
  onHoverBarangay,
  onSelectBarangay,
  selectedBarangay,
  onInitMap
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const selectedBarangayIdRef = useRef<string | null>(selectedBarangay?.id ?? null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const getBarangayColor = (pop: number) => {
    if (pop >= 8000) return BAGANGA_COLOR_MAP.RED;
    if (pop >= 5000) return BAGANGA_COLOR_MAP.ORANGE;
    if (pop >= 3000) return BAGANGA_COLOR_MAP.YELLOW;
    if (pop >= 1500) return BAGANGA_COLOR_MAP.TEAL;
    return BAGANGA_COLOR_MAP.LIGHT_BLUE;
  };

  selectedBarangayIdRef.current = selectedBarangay?.id ?? null;

  const getBarangayStyle = (
    properties: BagangaBarangayProperties,
    isSelected = false
  ): L.PathOptions => ({
    fillColor: getBarangayColor(properties.population),
    weight: isSelected ? 4 : 1.8,
    opacity: 1,
    color: isSelected ? '#0369a1' : '#ffffff',
    fillOpacity: isSelected ? 0.92 : 0.75,
    className: 'barangay-boundary'
  });

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet Map over Baganga Municipality, Davao Oriental
    const map = L.map(mapContainerRef.current, {
      center: [7.592, 126.412],
      zoom: 11,
      zoomControl: false
    });

    setMapInstance(map);

    // Add Tile Layer (OpenStreetMap basemap displaying natural ocean tiles)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    map.attributionControl.addAttribution(
      'Boundaries: <a href="https://github.com/OSSPhilippines/geoph/tree/06e792bd6c241c57f8c3946b648381ae8a328846/geojson/barangay">GeoPH</a>'
    );

    // Style and Add Baganga Barangay Boundary Layer
    const geoJsonLayer = L.geoJSON(bagangaBarangaysGeoJSON as any, {
      style: (feature) => getBarangayStyle(
        feature?.properties as BagangaBarangayProperties,
        feature?.properties?.id === selectedBarangayIdRef.current
      ),
      onEachFeature: (feature, layer) => {
        const props = feature.properties as BagangaBarangayProperties;

        // Tooltip popup showing Barangay Name and Population
        const labelText = `<div style="font-family: system-ui, sans-serif; font-size: 12px; font-weight: 700;">Barangay ${props.name}</div><div style="font-size: 11px; color: #475569;">Population: ${props.formattedPop}</div><div style="font-size: 10px; color: #475569;">Lat: ${props.centerLat.toFixed(5)}° N &nbsp; Lng: ${props.centerLng.toFixed(5)}° E</div><div style="font-size: 10px; color: #0284c7; font-weight: 600;">Baganga, Davao Oriental</div>`;
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
            const isSelected = props.id === selectedBarangayIdRef.current;
            e.target.setStyle(getBarangayStyle(props, isSelected));
            onHoverBarangay(null);
          },
          click: () => {
            onSelectBarangay(props);
          }
        });
      }
    }).addTo(map);
    geoJsonLayerRef.current = geoJsonLayer;

    const bagangaBounds = geoJsonLayer.getBounds();
    map.fitBounds(bagangaBounds, { padding: [25, 25] });

    if (onInitMap) {
      onInitMap(map, bagangaBounds);
    }

    const refreshMap = () => {
      map.invalidateSize();
      map.fitBounds(geoJsonLayer.getBounds(), { padding: [25, 25] });
    };

    refreshMap();
    requestAnimationFrame(refreshMap);
    setTimeout(refreshMap, 150);

    return () => {
      geoJsonLayerRef.current = null;
      map.remove();
    };
  }, [onHoverBarangay, onSelectBarangay, onInitMap]);

  useEffect(() => {
    const geoJsonLayer = geoJsonLayerRef.current;
    if (!geoJsonLayer) return;

    geoJsonLayer.eachLayer((layer) => {
      const path = layer as L.Path & {
        feature?: { properties?: BagangaBarangayProperties };
      };
      const properties = path.feature?.properties;
      if (!properties) return;

      const isSelected = properties.id === selectedBarangay?.id;
      path.setStyle(getBarangayStyle(properties, isSelected));
      if (isSelected) path.bringToFront();
    });
  }, [selectedBarangay]);

  return (
    <div className="relative w-full h-full min-h-[540px]">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full bg-slate-100 z-0" />
      <PhilippinesMapBounds map={mapInstance} minZoom={6} maxBoundsViscosity={1.0} />
    </div>
  );
};
