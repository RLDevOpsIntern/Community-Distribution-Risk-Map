# Component Reusability & Integration Guide

This guide explains how the **Community Distribution & Risk Map** is structured as reusable React components and how you can plug it into any existing or new React application.

---

## 📐 Architecture Overview

The codebase provides two levels of reusability:

1. **Top-Level Plug & Play Feature Component (`CommunityRiskMapCard`)**: A complete, self-contained dashboard card with header tabs, map canvas, demographic legend/inspector, zoom controls, and fullscreen mode ready to be dropped into any page.
2. **Granular Sub-Components (`ChoroplethMap`, `DemographicsCard`, `ZoomControls`, etc.)**: Modular building blocks that can be reused independently to build custom GIS layouts or dashboards.

---

## ⚡ Quick Start: Pluggable Feature Component

To plug the entire map dashboard into any React page, import and render `<CommunityRiskMapCard />`.

```tsx
import React from 'react';
import { CommunityRiskMapCard } from './components/CommunityRiskMapCard';

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-6 flex justify-center items-center">
      {/* Self-contained, full-featured GIS Risk Map */}
      <CommunityRiskMapCard 
        locationBadge="Davao Oriental • Region XI"
        title="BAGANGA MUNICIPALITY - COMMUNITY DISTRIBUTION & RISK MAP"
      />
    </div>
  );
}
```

### `<CommunityRiskMapCard />` Props API

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `locationBadge` | `string` | `'Davao Oriental • Region XI'` | Location tag displayed at the top left badge. |
| `title` | `string` | `'BAGANGA MUNICIPALITY - COMMUNITY DISTRIBUTION & RISK MAP'` | Main header title text. |
| `tabs` | `readonly string[]` | `['Population', 'Health Risk', 'Vulnerability', 'Social Assistance']` | Array of tab names displayed in the top header. |
| `initialTab` | `string` | `'Population'` | Default selected active tab. |
| `className` | `string` | `''` | Extra CSS classes for outer layout customization. |

---

## 🧩 Reusing Granular Sub-Components

If you are building a custom layout and only need specific parts (e.g. just the map, just the zoom controls, or just the demographic legend), you can import the sub-components individually from `src/components/`.

### 1. Leaflet Choropleth Map (`ChoroplethMap`)
Renders the interactive Leaflet map canvas, GeoJSON boundary polygons, hover highlights, click events, and popups.

```tsx
import { ChoroplethMap } from './components/ChoroplethMap';
import type { BagangaBarangayProperties } from './data/geophBagangaBarangaysData';

function CustomMapLayout() {
  const [selected, setSelected] = useState<BagangaBarangayProperties | null>(null);
  const [hovered, setHovered] = useState<BagangaBarangayProperties | null>(null);

  return (
    <div className="w-full h-[500px] relative">
      <ChoroplethMap
        selectedBarangay={selected}
        onHoverBarangay={setHovered}
        onSelectBarangay={setSelected}
        onInitMap={(mapInstance, bounds) => {
          console.log('Leaflet map initialized:', mapInstance);
        }}
      />
    </div>
  );
}
```

### 2. Demographics Inspector & Legend (`DemographicsCard`)
Displays the color-coded population density legend and the active barangay inspector panel.

```tsx
import { DemographicsCard } from './components/DemographicsCard';

<DemographicsCard
  selectedBarangay={selectedBarangay}
  hoveredBarangay={hoveredBarangay}
  onClearSelection={() => setSelectedBarangay(null)}
/>
```

### 3. Navigation & Fullscreen Controls (`ZoomControls`)
Custom floating control buttons for zooming in/out, re-centering the map bounds, and toggling fullscreen mode.

```tsx
import { ZoomControls } from './components/ZoomControls';

<ZoomControls
  onZoomIn={() => mapRef.current?.zoomIn()}
  onZoomOut={() => mapRef.current?.zoomOut()}
  onRecenter={() => mapRef.current?.flyToBounds(initialBounds)}
  onToggleFullscreen={handleToggleFullscreen}
  isFullscreen={isFullscreen}
/>
```

### 4. Philippines Map Boundary Lock (`PhilippinesMapBounds`)
Restricts Leaflet map panning/zooming strictly within Philippine geographical coordinates so users cannot pan away into blank canvas areas.

```tsx
import PhilippinesMapBounds from './components/PhilippinesMapBounds';

<PhilippinesMapBounds map={mapInstance} minZoom={6} maxBoundsViscosity={1.0} />
```

---

## 🛠️ Required Dependencies & Integration Prerequisites

When copying or plugging these components into another project, ensure the following dependencies are installed and configured:

### 1. Packages
```bash
npm install leaflet
npm install -D @types/leaflet
```

### 2. Leaflet CSS Import
Ensure Leaflet's CSS is imported globally (or inside the component).
```tsx
import 'leaflet/dist/leaflet.css';
```

### 3. Styling
The components use **Tailwind CSS** classes (or equivalent utility CSS) for responsive layouts, rounded corners, glassmorphism (`backdrop-blur-md`), and slate color palettes.

---

## 📂 File Map Summary

```
src/
├── components/
│   ├── CommunityRiskMapCard.tsx   # 🌟 Complete reusable feature component
│   ├── ChoroplethMap.tsx          # 🗺️ Interactive Leaflet map canvas
│   ├── DemographicsCard.tsx        # 📊 Demographic legend & inspector card
│   ├── ZoomControls.tsx           # 🔍 Zoom / Recenter / Fullscreen widget
│   ├── PhilippinesMapBounds.tsx   # 🇵🇭 Map pan/zoom bounds restriction helper
│   └── FilterHeader.tsx           # 🎛️ Header filter dropdown component
└── data/
    └── geophBagangaBarangaysData.ts # 📍 GeoJSON data & color scale utilities
```
