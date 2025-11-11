import React, { useEffect, useRef, useState } from "react";

import { mercator } from "../utils/mercator";
import { detectMacOS } from "../utils/generalUtils";

export const AOIMap = ({ canDrag, context, imagery }) => {
  const mapRef = useRef(null);
  const [mapConfig, setMapConfig] = useState(null);

  // initialize map
  const initProjectMap = () => {
    if (mapRef.current) {
      mapRef.current.innerHTML = "";
    }

    const newMapConfig = mercator.createMap("project-map", [0.0, 0.0], 1, imagery);
    setMapConfig(newMapConfig);

    mercator.setVisibleLayer(newMapConfig, imagery[0]?.id);
    if (context.aoiFeatures) updateAOIAreas(newMapConfig);
    if (canDrag) showDragBoxDraw(newMapConfig);
    if (context.plots.length > 0) showPlots(newMapConfig);
  };

  // helper functions
  const updateAOIAreas = (config = mapConfig) => {
    mercator.removeLayerById(config, "currentAOI");
    if (context.aoiFeatures) {
      mercator.addVectorLayer(
        config,
        "currentAOI",
        mercator.geomArrayToVectorSource(context.aoiFeatures),
        mercator.ceoMapStyles("geom", "yellow")
      );
      mercator.zoomMapToLayer(config, "currentAOI");
    }
  };

  const updateSelectedStrata = (config = mapConfig) => {
    const { selectedStrata, aoiFeatures } = context;
    mercator.removeLayerById(config, "selectedStrata");
    if (selectedStrata > -1) {
      mercator.addVectorLayer(
        config,
        "selectedStrata",
        mercator.geomArrayToVectorSource([aoiFeatures[selectedStrata]]),
        mercator.ceoMapStyles("geom", "blue")
      );
    }
  };

  const showDragBoxDraw = (config = mapConfig) => {
    const displayDragBoxBounds = (dragBox) => {
      mercator.removeLayerById(config, "currentAOI");
      const drawnBox = JSON.parse(
        mercator.geometryToGeoJSON(dragBox.getGeometry().clone(), "EPSG:4326", "EPSG:3857")
      );
      context.setProjectDetails({
        aoiFeatures: [drawnBox],
        aoiFileName: "",
        plots: [],
      });
    };
    mercator.enableDragBoxDraw(config, displayDragBoxBounds);
  };

  const hideDragBoxDraw = (config = mapConfig) => {
    mercator.disableDragBoxDraw(config);
  };

  const hidePlots = (config = mapConfig) => {
    mercator.removeLayerById(config, "projectPlots");
    mercator.removeLayerById(config, "flaggedPlots");
    mercator.removeLayerById(config, "analyzedPlots");
    mercator.removeLayerById(config, "unanalyzedPlots");
  };

  const showPlots = (config = mapConfig) => {
    hidePlots(config);
    if (context.projectId > 0) {
      mercator.addPlotOverviewLayers(config, context.plots);
    } else {
      mercator.addVectorLayer(
        config,
        "projectPlots",
        mercator.plotsToVectorSource(context.plots),
        mercator.ceoMapStyles("overview", { color: "yellow", border: "black" })
      );
    }
  };

  useEffect(() => {
    if (context.institutionImagery.length > 0) {
      initProjectMap();
    }
    // cleanup function
    return () => {
      if (mapRef.current) mapRef.current.innerHTML = "";
    };
  }, [imagery?.[0]?.id]);

  useEffect(() => {
    if (!mapConfig) return;
    updateAOIAreas();
  }, [context.aoiFeatures]);

  useEffect(() => {
    if (!mapConfig) return;
    updateSelectedStrata();
  }, [context.selectedStrata]);

  useEffect(() => {
    if (!mapConfig) return;
    if (canDrag) showDragBoxDraw();
    else hideDragBoxDraw();
  }, [canDrag]);

  useEffect(() => {
    if (!mapConfig) return;
    if (context.plots.length > 0) showPlots();
    else hidePlots();
  }, [context.plots]);

  return (
    <div style={{ height: "25rem", width: "100%" }}>
      <div
        id="project-map"
        ref={mapRef}
        style={{ height: "25rem", width: "100%" }}
      />
      {canDrag && (
        <label className="col text-center mt-4 mb-2">
          {`Hold ${detectMacOS() ? "CMD ⌘" : "CTRL"} and click-and-drag a bounding box on the map`}
        </label>
      )}
    </div>
  );
};
