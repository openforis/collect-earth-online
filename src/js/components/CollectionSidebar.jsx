import React, { useState } from 'react';
import '../../css/sidebar.css';
import { mercator } from "../utils/mercator";

export const CollectionSidebar = ({
  showGeoDash,
  currentPlot,
  currentProject,
  KMLFeatures,
  setUsedKML,
}) => {
  return (
    <div className="collection-sidebar-container">
      <div className="collection-sidebar-content">
        <NewPlotNavigation projectTitle={currentProject.name}/>
        <ExternalTools showGeoDash={showGeoDash}
                       currentPlot={currentPlot}
                       currentProject={currentProject}
                       KMLFeatures={KMLFeatures}
                       setUsedKML={setUsedKML}
        />
      </div>
      <div className="collection-sidebar-footer">
        <SidebarFooter/>
      </div>
    </div>
  );
};

export const NewPlotNavigation = ({projectTitle}) => {
  return (
    <div className="collection-sidebar-navigation">
      <div className="collection-sidebar-header">
        <span className="collection-sidebar-title">{projectTitle}</span>
        <button className="collection-sidebar-info-button">i</button>
      </div>

      <label className="collection-sidebar-label">Navigate</label>
      <select className="collection-sidebar-select">
        <option>Default</option>
        <option>Analyzed plots</option>
        <option>Unanalyzed plots</option>
        <option>Flagged plots</option>
      </select>

      <div className="collection-sidebar-mode">
        <label className="collection-sidebar-switch">
          <input type="checkbox" />
          <span className="collection-sidebar-slider round"></span>
        </label>
        <span className="mode-label">Admin Review</span>
      </div>
    </div>
  );
};

export const ExternalTools = ({
  showGeoDash,
  currentPlot,
  currentProject,
  KMLFeatures,
  setUsedKML,
}) => {
  const [auxWindow, setAuxWindow] = useState(null);
  
  const loadGEEScript = () => {
    let urlParams="";
    if(currentPlot?.plotGeom){
      urlParams = currentPlot?.plotGeom?.includes("Point")
            ? currentProject.plotShape === "circle"
            ? "center=[" +
            mercator.parseGeoJson(currentPlot.plotGeom).getCoordinates() +
            "];radius=" +
            currentProject.plotSize / 2
            : "geoJson=" +
            mercator.geometryToGeoJSON(
              mercator.getPlotPolygon(
                currentPlot.plotGeom,
                currentProject.plotSize,
                currentProject.plotShape
              ),
              "EPSG:4326",
              "EPSG:3857",
              5
            )
            : "geoJson=" + currentPlot.plotGeom;
    }
    if (auxWindow) auxWindow.close();
    const win = window.open(
      "https://collect-earth-online.projects.earthengine.app/view/ceo-plot-ancillary-hotfix#" + urlParams
    );
    setAuxWindow(win);
  };
  const openInGoogleEarth = () => {
    let plotGeom=[0,0]
    if(currentPlot?.plotGeom){
      plotGeom = mercator.getCentroid((currentPlot?.plotGeom || "{}"), true);
      if (!plotGeom || plotGeom.length < 2) {
        console.warn("Invalid coordinates");
        return;
      }
    }
    const [lng, lat] = plotGeom;
    const url = `https://earth.google.com/web/@${lat},${lng},1000a,100d,35y,0h,0t,0r`;
    window.open(url, "_blank");
  };
  
  return (
    <div className="ext-card">
      <div className="ext-header">
        <span className="ext-title">EXTERNAL TOOLS</span>
        <button className="ext-info" aria-label="Info">i</button>
      </div>

      <div className="ext-grid">
        <button className="ext-btn"
              download={`ceo_projectId-${currentProject.id}_plotId-${currentPlot.visibleId}.kml`}
                href={
                  "data:earth.kml+xml application/vnd.google-earth.kmz," +
                    encodeURIComponent(KMLFeatures)}
        >
          <span className="ext-icon">
            ⬇
          </span>
          <span>Download Plot KML</span>
        </button>

        <button className="ext-btn"
                onClick={loadGEEScript()}>
          <span>Go To GEE Script</span>
          <span className="ext-icon">↗</span>
        </button>

        <button className="ext-btn">
          <span>Interpretation Instructions</span>
        </button>

        <button className="ext-btn"
                onClick={openInGoogleEarth()}>
          <span>Go To Google Earth Web</span>
          <span className="ext-icon">↗</span>
        </button>
      </div>
    </div>
  );
};

export const SidebarFooter = () => {
  return (
    <div className="collection-sidebar-footer-buttons">
      <button className="btn outline">Clear All</button>
      <button className="btn outline">Flag Plot</button>
      <button className="btn filled">Quit</button>
      <button className="btn filled">Save & Continue</button>
    </div>
  );
};
