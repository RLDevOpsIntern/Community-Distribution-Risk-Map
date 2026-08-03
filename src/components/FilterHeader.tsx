import React from 'react';

interface FilterHeaderProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const FilterHeader: React.FC<FilterHeaderProps> = ({ activeFilter, onFilterChange }) => {
  return (
    <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl px-4 py-2.5 rounded-xl flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Filter By:
        </span>
        <div className="relative inline-block text-left">
          <select
            value={activeFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="appearance-none bg-emerald-50 text-emerald-900 font-bold text-sm px-3.5 py-1.5 pr-8 rounded-lg border border-emerald-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="Population">Population</option>
            <option value="Density">Population Density</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-emerald-800">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="bg-slate-900/80 backdrop-blur-md text-white text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-700/50 shadow-lg hidden md:block">
        📍 Quezon City Administrative Map
      </div>
    </div>
  );
};
