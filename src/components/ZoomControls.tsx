import React from 'react';
import L from 'leaflet';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  mapInstance?: L.Map | null;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onRecenter,
  mapInstance
}) => {
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
        onClick={onRecenter}
        title="Re-center Map"
        aria-label="Re-center Map on Baganga"
        className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 active:bg-cyan-100 transition-colors border-b border-slate-200/60 cursor-pointer"
      >
        <svg
          aria-hidden="true"
          className="w-[18px] h-[18px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
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
