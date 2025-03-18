import React from "react";

import { mercator } from "../utils/mercator";
import { detectMacOS } from "../utils/generalUtils";

export default class AOIMap extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mapConfig: null,
    };
  }

  componentDidMount() {
    if (this.props.context.institutionImagery.length > 0) this.initProjectMap();
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.context.institutionImagery.length > 0 &&
      this.props.context.institutionImagery !== prevProps.context.institutionImagery
    ) {
      this.initProjectMap();
    }

    if (this.state.mapConfig) {
      if (prevProps.context.aoiFeatures !== this.props.context.aoiFeatures) {
        this.updateAOIAreas();
      }

      if (prevProps.context.selectedStrata !== this.props.context.selectedStrata) {
        this.updateSelectedStrata();
      }

      if (prevProps.canDrag !== this.props.canDrag) {
        if (this.props.canDrag) {
          this.showDragBoxDraw();
        } else {
          this.hideDragBoxDraw();
        }
      }

      if (prevProps.context.plots !== this.props.context.plots) {
        if (this.props.context.plots.length > 0) {
          this.showPlots();
        } else {
          this.hidePlots();
        }
      }
    }
  }

  initProjectMap = () => {
    const newMapConfig = mercator.createMap("project-map", [0.0, 0.0], 1, this.props.imagery);
    this.setState({ mapConfig: newMapConfig }, () => {
      mercator.setVisibleLayer(this.state.mapConfig, this.props.imagery[0]?.id);
      if (this.props.context.aoiFeatures) this.updateAOIAreas();
      if (this.props.canDrag) this.showDragBoxDraw();
      if (this.props.context.plots.length > 0) this.showPlots();
    });
  };

  updateAOIAreas = () => {
    // Display a bounding box with the project's AOI on the map and zoom to it
    mercator.removeLayerById(this.state.mapConfig, "currentAOI");
    if (this.props.context.aoiFeatures) {
      mercator.addVectorLayer(
        this.state.mapConfig,
        "currentAOI",
        mercator.geomArrayToVectorSource(this.props.context.aoiFeatures),
        mercator.ceoMapStyles("geom", "yellow")
      );
      mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");
    }
  };

  updateSelectedStrata = () => {
    const { selectedStrata, aoiFeatures } = this.props.context;
    mercator.removeLayerById(this.state.mapConfig, "selectedStrata");
    if (selectedStrata > -1) {
      mercator.addVectorLayer(
        this.state.mapConfig,
        "selectedStrata",
        mercator.geomArrayToVectorSource([aoiFeatures[selectedStrata]]),
        mercator.ceoMapStyles("geom", "blue")
      );
    }
  };

  showDragBoxDraw = () => {
    const displayDragBoxBounds = (dragBox) => {
      mercator.removeLayerById(this.state.mapConfig, "currentAOI");
      const drawnBox = JSON.parse(
        mercator.geometryToGeoJSON(dragBox.getGeometry().clone(), "EPSG:4326", "EPSG:3857")
      );
      this.props.context.setProjectDetails({
        aoiFeatures: [drawnBox],
        aoiFileName: "",
        plots: [],
      });
    };
    mercator.enableDragBoxDraw(this.state.mapConfig, displayDragBoxBounds);
  };

  hideDragBoxDraw = () => {
    mercator.disableDragBoxDraw(this.state.mapConfig);
  };

  hidePlots = () => {
    mercator.removeLayerById(this.state.mapConfig, "projectPlots");
    mercator.removeLayerById(this.state.mapConfig, "flaggedPlots");
    mercator.removeLayerById(this.state.mapConfig, "analyzedPlots");
    mercator.removeLayerById(this.state.mapConfig, "unanalyzedPlots");
  };

  showPlots = () => {
    this.hidePlots();
    if (this.props.context.projectId > 0) {
      mercator.addPlotOverviewLayers(this.state.mapConfig, this.props.context.plots);
    } else {
      mercator.addVectorLayer(
        this.state.mapConfig,
        "projectPlots",
        mercator.plotsToVectorSource(this.props.context.plots),
        mercator.ceoMapStyles("overview", { color: "yellow", border: "black" })
      );
    }
  };

  render() {
    return (
      <div style={{ height: "25rem", width: "100%" }}>
        <div id="project-map" style={{ height: "25rem", width: "100%" }} />
        {this.props.canDrag && (
          <label className="col text-center mt-4 mb-2">
            {`Hold ${
              detectMacOS() ? "CMD ⌘" : "CTRL"
            } and click-and-drag a bounding box on the map`}
          </label>
        )}
      </div>
    );
  }
}
