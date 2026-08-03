# Community Distribution & Risk Map (Quezon City Web GIS Choropleth)

## 📌 Project Overview

The **Community Distribution & Risk Map** is a modern, responsive Web GIS (Geographic Information System) application designed to visualize local administrative demographics and population density distributions across **Quezon City barangays**. 

Built with interactive choropleth map layers, the application dynamically displays population density color brackets over official administrative boundaries, allowing municipal planners, community workers, and citizens to analyze population density, vulnerability levels, health risks, and social assistance distribution.

---

## 🛠️ Technology Stack

This application is built using a modern frontend architecture:

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) | Component-based user interface architecture |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript for robust data structures & GeoJSON handling |
| **Map Engine & GIS** | [Leaflet](https://leafletjs.com/) | Lightweight open-source interactive mapping library |
| **Basemap Provider** | [OpenStreetMap](https://www.openstreetmap.org/) | Open-source geographic tile data |
| **Styling System** | [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS framework for glassmorphism UI components |
| **Build Tooling** | [Vite](https://vitejs.dev/) | Next-generation fast frontend build tool |

---

## ✨ Key Features

1. **Official Administrative Boundaries**: Renders real GeoJSON boundary polygons for Quezon City barangays.
2. **5-Bracket Choropleth Color Mapping**:
   - **`< 5,000`**: Light Blue (`#38bdf8`)
   - **`5,000 - 10,000`**: Teal/Green (`#14b8a6`)
   - **`10,000 - 15,000`**: Yellow (`#facc15`)
   - **`15,000 - 20,000`**: Orange (`#f97316`)
   - **`20,000+`**: Red/Coral (`#ef4444`)
3. **Interactive Polygon Highlights & Hover States**:
   - Dynamic stroke highlighting on polygon hover.
   - Sticky tooltips displaying exact barangay names and population numbers.
4. **Floating UI Cards**:
   - **Header Tab Switcher**: Filter maps by `Population`, `Health Risk`, `Vulnerability`, and `Social Assistance`.
   - **Demographics Panel**: Live legend swatches and detailed inspector card for selected barangays.
   - **Zoom Controls**: Custom `+` and `−` map navigation buttons.

---

## 📦 Installation & Setup Guide

Follow these steps to install and run the application locally:

### 1. Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (v9.0.0 or higher)

Verify your installation:
```bash
node -v
npm -v
```

### 2. Clone the Repository

```bash
git clone <repository-url>
cd map-layout/Frontend
```

### 3. Install Dependencies

Install all required npm packages (including Leaflet, React, TypeScript, and Tailwind CSS):

```bash
npm install
```

### 4. Run Development Server

Start the local development server with Vite:

```bash
npm run dev
```

The application will run at **http://localhost:5173/**. Open your browser and navigate to this URL to view the map.

### 5. Build for Production

To create an optimized production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## 📂 Project Architecture

```
Frontend/
├── src/
│   ├── components/
│   │   ├── ChoroplethMap.tsx     # Leaflet map container & GeoJSON layer logic
│   │   ├── DemographicsCard.tsx  # Floating demographic legend & selection inspector
│   │   └── ZoomControls.tsx      # Floating zoom in / zoom out controls
│   ├── data/
│   │   ├── barangaysData.ts      # GeoJSON data processor & population color map
│   │   └── realQCBarangays.json  # Official administrative GeoJSON boundaries of Quezon City
│   ├── App.tsx                   # Main dashboard view & layout wrapper
│   ├── main.tsx                  # React DOM root entrypoint
│   └── index.css                 # Global Tailwind CSS and Leaflet styles
├── package.json                  # Dependencies & npm scripts
├── vite.config.ts                # Vite bundler configuration
└── README.md                     # Project documentation
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.