import "../css/geo-dash.css";

import React from "react";
import ReactDOM from "react-dom";
import {Feature} from "ol";
import {buffer as ExtentBuffer} from "ol/extent";
import {Circle, Polygon, Point} from "ol/geom";
import {transform as projTransform} from "ol/proj";
import {Vector} from "ol/source";

import {mercator} from "./utils/mercator";
import {isArray, isNumber} from "./utils/generalUtils";
import GeoDashNavigationBar from "./geodash/GeoDashNavigationBar";
import WidgetGridItem from "./geodash/WidgetGridItem";

class Geodash extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            widgets: [],
            mapCenter: null,
            mapZoom: null,
            imageryList: [],
            initCenter: null,
            initZoom: null,
            vectorSource: null
        };
    }

    /// Lifecycle

    componentDidMount() {
        Promise.all([this.getInstitutionImagery(), this.getWidgetsByProjectId(), this.getVectorSource()])
            .then(data => this.setState({imageryList: data[0], widgets: data[1], vectorSource: data[2]}))
            .catch(response => {
                console.log(response);
                alert("Error initializing Geo-Dash. See console for details.");
            });
    }

    /// API

    getInstitutionImagery = () => fetch(`/get-institution-imagery?institutionId=${this.props.institutionId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)));

    getWidgetsByProjectId = () => fetch(`/geo-dash/get-project-widgets?projectId=${this.props.projectId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)));

    getFeatures = async () => {
        const {plotShape, radius, center, plotId} = this.props;
        if (plotShape === "polygon") {
            const response = await fetch(`/get-plot-sample-geom?plotId=${plotId}`);
            const plotJsonObject = await (response.ok ? response.json() : Promise.reject(response));
            return [plotJsonObject.plotGeom, ...(plotJsonObject.sampleGeoms || [])]
                .filter(e => e)
                .map(geom => new Feature({geometry: mercator.parseGeoJson(geom, true)}));
        } else if (plotShape === "square") {
            const pointFeature = new Feature(
                new Point(projTransform(JSON.parse(center).coordinates, "EPSG:4326", "EPSG:3857"))
            );
            const pointExtent = pointFeature.getGeometry().getExtent();
            const bufferedExtent = new ExtentBuffer(pointExtent, radius);
            return [new Feature(new Polygon(
                [[[bufferedExtent[0], bufferedExtent[1]],
                  [bufferedExtent[0], bufferedExtent[3]],
                  [bufferedExtent[2], bufferedExtent[3]],
                  [bufferedExtent[2], bufferedExtent[1]],
                  [bufferedExtent[0], bufferedExtent[1]]]]
            ))];
        } else if (plotShape === "circle") {
            return [
                new Feature(
                    new Circle(
                        projTransform(JSON.parse(center).coordinates, "EPSG:4326", "EPSG:3857"),
                        Number(radius)
                    )
                )];
        } else {
            return [];
        }
    };

    getVectorSource = async () => new Vector({features: await this.getFeatures()});

    /// State

    setCenterAndZoom = (center, zoom) => {
        if (isArray(center) && isNumber(zoom)) {
            if (this.state.initCenter) {
                this.setState({
                    mapCenter: center,
                    mapZoom: zoom
                });
            } else {
                this.setState({
                    initCenter: center,
                    initZoom: zoom,
                    mapCenter: center,
                    mapZoom: zoom
                });
            }
        }
    };

    resetCenterAndZoom = () => {
        this.setCenterAndZoom(this.state.initCenter, this.state.initZoom);
    };

    /// Helpers

    extentToPolygon = extent => {
        // FIXME, probably dont need to decode.
        // TODO, does the geodash link need to add []?
        const theSplit = decodeURI(extent)
            .replace("[", "")
            .replace("]", "")
            .split(",");
        // FIXME, I can probably just build the array here
        return JSON.parse("[["
        + theSplit[0] + ","
        + theSplit[1] + "],["
        + theSplit[2] + ","
        + theSplit[1] + "],["
        + theSplit[2] + ","
        + theSplit[3] + "],["
        + theSplit[0] + ","
        + theSplit[3] + "],["
        + theSplit[0] + ","
        + theSplit[1] + "]]");
    };

    /// Render

    render() {
        const {widgets} = this.state;
        return (
            <div className="grid-layout container-fluid">
                {widgets.length > 0
                    ? (widgets.map((widget, idx) => (
                        <WidgetGridItem
                            key={widget.id}
                            idx={idx}
                            imageryList={this.state.imageryList}
                            initCenter={this.mapCenter}
                            mapCenter={this.state.mapCenter}
                            mapZoom={this.state.mapZoom}
                            plotExtentPolygon={this.extentToPolygon(this.props.plotExtent)}
                            resetCenterAndZoom={this.resetCenterAndZoom}
                            setCenterAndZoom={this.setCenterAndZoom}
                            vectorSource={this.state.vectorSource}
                            visiblePlotId={this.props.visiblePlotId}
                            widget={widget}
                        />
                    ))
                    ) : (
                        <div style={{gridArea: "2 / 2 / span 2 / span 10"}}>
                            <h1 id="noWidgetMessage">
                                Retrieving Geo-Dash configuration for this project
                            </h1>
                        </div>
                    )}
            </div>
        );
    }
}

export function pageInit(args) {
    ReactDOM.render(
        <GeoDashNavigationBar
            page={() => <Geodash {...args}/>}
            userName={args.userName || "guest"}
            visiblePlotId={args.visiblePlotId ? parseInt(args.visiblePlotId) : -1}
        />,
        document.getElementById("app")
    );
}
