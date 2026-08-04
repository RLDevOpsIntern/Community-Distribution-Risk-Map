import React from 'react';
import type { BagangaBarangayProperties } from '../data/geophBagangaBarangaysData';
import { BAGANGA_COLOR_MAP } from '../data/geophBagangaBarangaysData';

interface DemographicsCardProps {
  selectedBarangay: BagangaBarangayProperties | null;
  hoveredBarangay: BagangaBarangayProperties | null;
  onClearSelection?: () => void;
}

export const DemographicsCard: React.FC<DemographicsCardProps> = ({
  selectedBarangay,
  hoveredBarangay,
  onClearSelection
}) => {
  const activeBarangay = selectedBarangay || hoveredBarangay;

  const ranges = [
    { label: '< 1,500', color: BAGANGA_COLOR_MAP.LIGHT_BLUE, text: 'Light Blue' },
    { label: '1,500 - 3,000', color: BAGANGA_COLOR_MAP.TEAL, text: 'Teal/Green' },
    { label: '3,000 - 5,000', color: BAGANGA_COLOR_MAP.YELLOW, text: 'Yellow' },
    { label: '5,000 - 8,000', color: BAGANGA_COLOR_MAP.ORANGE, text: 'Orange' },
    { label: '8,000+', color: BAGANGA_COLOR_MAP.RED, text: 'Red/Coral' }
  ];

  return (
    <div className="absolute top-6 right-6 z-20 w-80 max-w-[calc(100vw-3rem)] bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl p-5 flex flex-col gap-4 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Demographics</h2>
          <p className="text-xs text-slate-500 font-medium">Baganga, Davao Oriental GIS</p>
        </div>
        <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full">
          Active Filter
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Population Range
        </h3>
        <div className="flex flex-col gap-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
          {ranges.map((range) => (
            <div key={range.label} className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-4 h-4 rounded-md shadow-sm border border-black/10 inline-block"
                  style={{ backgroundColor: range.color }}
                />
                <span className="text-slate-700">{range.label}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">{range.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Inspector or Instructional Panel */}
      {activeBarangay ? (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-xl shadow-inner flex flex-col gap-2 relative">
          {selectedBarangay && onClearSelection && (
            <button
              onClick={onClearSelection}
              className="absolute top-2 right-2 text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded bg-slate-700/50 hover:bg-slate-700"
            >
              ✕
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
              {selectedBarangay ? 'Selected Barangay' : 'Hovered Barangay'}
            </span>
          </div>
          <h4 className="text-base font-extrabold tracking-tight">
            Barangay {activeBarangay.name}
          </h4>
          <div className="grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-slate-700/60 text-xs">
            <div>
              <span className="block text-[10px] text-slate-400 font-medium uppercase">Population</span>
              <span className="font-extrabold text-sm text-yellow-300">{activeBarangay.formattedPop}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-medium uppercase">Density Range</span>
              <span className="font-semibold text-slate-200">{activeBarangay.densityCategory}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-medium uppercase">Land Area</span>
              <span className="font-semibold text-slate-200">{activeBarangay.areaKm2} km²</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-medium uppercase">Vulnerability</span>
              <span className="font-semibold text-emerald-300">{activeBarangay.vulnerabilityRating}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-medium uppercase">Latitude</span>
              <span className="font-semibold text-slate-200 tabular-nums">
                {activeBarangay.centerLat.toFixed(5)}° N
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-medium uppercase">Longitude</span>
              <span className="font-semibold text-slate-200 tabular-nums">
                {activeBarangay.centerLng.toFixed(5)}° E
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-100/90 border border-slate-200/80 p-3.5 rounded-xl text-center">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Hover or select a barangay in Baganga to view details.
          </p>
        </div>
      )}
    </div>
  );
};
