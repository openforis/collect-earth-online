import React from "react";

import {mercator} from "../utils/mercator.js";

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
        if (this.props.context.institutionImagery.length > 0
            && this.props.context.institutionImagery !== prevProps.context.institutionImagery) {
            this.initProjectMap();
        }

        if (this.state.mapConfig) {
            if (prevProps.context.boundary !== this.props.context.boundary) {
                this.updateBoundary();
            }

            if (prevProps.context.imageryId !== this.props.context.imageryId) {
                this.updateBaseMapImagery();
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
        const newMapConfig = mercator.createMap("project-map", [0.0, 0.0], 1, this.props.context.institutionImagery);
        this.setState({mapConfig: newMapConfig}, () => {
            this.updateBaseMapImagery();
            if (this.props.context.boundary) this.updateBoundary();
            if (this.props.canDrag) this.showDragBoxDraw();
            if (this.props.context.plots.length > 0) this.showPlots();
        });
    };

    updateBaseMapImagery = () => {
        mercator.setVisibleLayer(this.state.mapConfig,
                                 this.props.context.imageryId || this.props.context.institutionImagery[0].id);
    };

    updateBoundary = () => {
        // Display a bounding box with the project's AOI on the map and zoom to it
        mercator.removeLayerById(this.state.mapConfig, "currentAOI");
        if (this.props.context.boundary) {
            mercator.addVectorLayer(
                this.state.mapConfig,
                "currentAOI",
                mercator.geometryToVectorSource(mercator.parseGeoJson(this.props.context.boundary, true)),
                mercator.ceoMapStyles("geom", "yellow")
            );
            mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");
        }
    };

    showDragBoxDraw = () => {
        const displayDragBoxBounds = (dragBox) => {
            mercator.removeLayerById(this.state.mapConfig, "currentAOI");
            const boundary = mercator.geometryToGeoJSON(dragBox.getGeometry().clone(), "EPSG:4326", "EPSG:3857");
            this.props.context.setProjectDetails({boundary: boundary, plots: []});
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
                mercator.ceoMapStyles("overview", "yellow")
            );
        }
    };

    render() {
        return (
            <div id="project-map" style={{height: "25rem", width: "100%"}}>
                {this.props.canDrag &&
                    <div className="col small text-center mb-2">
                        Hold CTRL and click-and-drag a bounding box on the map
                    </div>
                }
            </div>
        );
    }
}
