import React from 'react';
import L from 'leaflet';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  mapInstance?: L.Map | null;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ onZoomIn, onZoomOut, mapInstance }) => {
  const handleIn = () => {
    if (mapInstance) {
      mapInstance.zoomIn();
    } else {
      onZoomIn();
    }
  };

  const handleOut = () => {
    if (mapInstance) {
      mapInstance.zoomOut();
    } else {
      onZoomOut();
    }
  };

  return (
    <div className="flex flex-col bg-white/95 backdrop-blur-sm border border-slate-200/80 shadow-md rounded-xl overflow-hidden text-slate-700 w-10">
      <button
        type="button"
        onClick={handleIn}
        title="Zoom In"
        aria-label="Zoom In"
        className="w-10 h-10 flex items-center justify-center text-xl font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-200/60 cursor-pointer"
      >
        +
      </button>
      <button
        type="button"
        onClick={handleOut}
        title="Zoom Out"
        aria-label="Zoom Out"
        className="w-10 h-10 flex items-center justify-center text-2xl font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
      >
        −
      </button>
    </div>
  );
};
