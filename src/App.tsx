import { useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import { ChoroplethMap } from './components/ChoroplethMap';
import { ZoomControls } from './components/ZoomControls';
import { DemographicsCard } from './components/DemographicsCard';
import type { BagangaBarangayProperties } from './data/geophBagangaBarangaysData';

function App() {
  const [activeTab, setActiveTab] = useState<'Population' | 'Health Risk' | 'Vulnerability' | 'Social Assistance'>('Population');
  const [hoveredBarangay, setHoveredBarangay] = useState<BagangaBarangayProperties | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<BagangaBarangayProperties | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const handleInitMap = useCallback((map: L.Map) => {
    mapRef.current = map;
  }, []);

  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, []);

  const tabs = ['Population', 'Health Risk', 'Vulnerability', 'Social Assistance'] as const;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex items-center justify-center font-sans text-slate-800">
      {/* Main Container Card */}
      <div className="w-full max-w-6xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-8 flex flex-col gap-6">
        
        {/* Header Bar with Location Badge and Tabs */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-sky-100 text-sky-800 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md border border-sky-200">
                Davao Oriental • Region XI
              </span>
            </div>
            <h1 className="text-base font-black tracking-wide text-slate-800 uppercase">
              BAGANGA MUNICIPALITY - COMMUNITY DISTRIBUTION & RISK MAP
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white text-cyan-600 shadow-sm border border-cyan-500/40'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Map Canvas Frame */}
        <div className="relative w-full h-[540px] bg-slate-50 rounded-2xl border border-slate-200/90 shadow-inner overflow-hidden">
          
          {/* Zoom Controls */}
          <div className="absolute bottom-6 left-6 z-20">
            <ZoomControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
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
            />
          </div>

        </div>

      </div>
    </div>
  );
}

export default App;
