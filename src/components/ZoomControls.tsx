import React from 'react';
import L from 'leaflet';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  mapInstance?: L.Map | null;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onRecenter,
  onToggleFullscreen,
  isFullscreen = false,
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

      {onToggleFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          aria-label={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 active:bg-cyan-100 transition-colors border-b border-slate-200/60 cursor-pointer"
        >
          {isFullscreen ? (
            <svg
              className="w-[18px] h-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg
              className="w-[18px] h-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 2 2h3" />
            </svg>
          )}
        </button>
      )}

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
