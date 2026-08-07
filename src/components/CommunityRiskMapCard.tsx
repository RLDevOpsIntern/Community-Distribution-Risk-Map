import React, { useState, useCallback, useRef, useEffect } from 'react';
import L from 'leaflet';
import { ChoroplethMap } from './ChoroplethMap';
import { ZoomControls } from './ZoomControls';
import { DemographicsCard } from './DemographicsCard';
import type { BagangaBarangayProperties } from '../data/geophBagangaBarangaysData';

export interface CommunityRiskMapCardProps {
  locationBadge?: string;
  title?: string;
  tabs?: readonly string[];
  initialTab?: string;
  className?: string;
}

export const CommunityRiskMapCard: React.FC<CommunityRiskMapCardProps> = ({
  locationBadge = 'Davao Oriental • Region XI',
  title = 'BAGANGA MUNICIPALITY - COMMUNITY DISTRIBUTION & RISK MAP',
  tabs = ['Population', 'Health Risk', 'Vulnerability', 'Social Assistance'] as const,
  initialTab = 'Population',
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [hoveredBarangay, setHoveredBarangay] = useState<BagangaBarangayProperties | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<BagangaBarangayProperties | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(true);

  const mapRef = useRef<L.Map | null>(null);
  const initialMapBoundsRef = useRef<L.LatLngBounds | null>(null);
  const mapContainerFrameRef = useRef<HTMLDivElement>(null);

  const handleInitMap = useCallback((map: L.Map, bounds: L.LatLngBounds) => {
    mapRef.current = map;
    initialMapBoundsRef.current = bounds;
  }, []);

  const handleToggleLock = useCallback(() => {
    setIsLocked(prev => !prev);
  }, []);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleRecenterMap = useCallback(() => {
    if (mapRef.current && initialMapBoundsRef.current) {
      mapRef.current.stop();
      mapRef.current.flyToBounds(initialMapBoundsRef.current, {
        padding: [25, 25],
        duration: 0.65
      });
    }
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!mapContainerFrameRef.current) return;

    if (!document.fullscreenElement) {
      mapContainerFrameRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setTimeout(() => mapRef.current?.invalidateSize(), 150);
      }).catch(() => {
        setIsFullscreen(prev => !prev);
        setTimeout(() => mapRef.current?.invalidateSize(), 150);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setTimeout(() => mapRef.current?.invalidateSize(), 150);
      }).catch(() => {
        setIsFullscreen(prev => !prev);
        setTimeout(() => mapRef.current?.invalidateSize(), 150);
      });
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isCurrentlyFull);
      setTimeout(() => mapRef.current?.invalidateSize(), 150);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className={`w-full max-w-6xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-8 flex flex-col gap-6 ${className}`}>

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-sky-100 text-sky-800 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md border border-sky-200">
              {locationBadge}
            </span>
          </div>
          <h1 className="text-base font-black tracking-wide text-slate-800 uppercase">
            {title}
          </h1>
        </div>

        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === tab
                    ? 'bg-white text-cyan-600 shadow-sm border border-cyan-500/40'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Frame Container */}
      <div
        ref={mapContainerFrameRef}
        className={`relative w-full bg-slate-50 border border-slate-200/90 shadow-inner overflow-hidden transition-all ${isFullscreen
            ? 'fixed inset-0 z-50 w-screen h-screen rounded-none'
            : 'h-[540px] rounded-2xl'
          }`}
      >
        {/* Zoom Controls */}
        <div className="absolute bottom-6 left-6 z-20">
          <ZoomControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onRecenter={handleRecenterMap}
            onToggleFullscreen={handleToggleFullscreen}
            isFullscreen={isFullscreen}
            onToggleLock={handleToggleLock}
            isLocked={isLocked}
          />
        </div>

        {/* Demographics Card */}
        <DemographicsCard
          selectedBarangay={selectedBarangay}
          hoveredBarangay={hoveredBarangay}
          onClearSelection={() => setSelectedBarangay(null)}
        />

        {/* Leaflet Choropleth Map */}
        <div className="w-full h-full">
          <ChoroplethMap
            selectedBarangay={selectedBarangay}
            onHoverBarangay={setHoveredBarangay}
            onSelectBarangay={setSelectedBarangay}
            onInitMap={handleInitMap}
            isLocked={isLocked}
          />
        </div>
      </div>
    </div>
  );
};
