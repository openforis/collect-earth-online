import "../css/geo-dash.css";

import React from "react";
import ReactDOM from "react-dom";
import {Feature} from "ol";
import {buffer as ExtentBuffer} from "ol/extent";
import {Circle, Polygon, Point} from "ol/geom";
import {transform as projTransform} from "ol/proj";
import {Vector} from "ol/source";

import {mercator} from "./utils/mercator";
import {isArray, isNumber, UnicodeIcon} from "./utils/generalUtils";
import GeoDashNavigationBar from "./geodash/GeoDashNavigationBar";
import StatsWidget from "./geodash/StatsWidget";
import {graphWidgetList, mapWidgetList} from "./geodash/constants";
import GraphWidget from "./geodash/GraphWidget";
import MapWidget from "./geodash/MapWidget";

class Widget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isFull: false
        };
    }

    /// State

    toggleFullScreen = () => this.setState({isFull: !this.state.isFull});

    /// Render functions

    generateGridColumn = (x, w) => (x + 1) + " / span " + w;

    generateGridRow = (y, h) => (y + 1) + " / span " + h;

    getWidgetComponent = widget => {
        if (mapWidgetList.includes(widget.type)) {
            return (
                <MapWidget
                    imageryList={this.props.imageryList}
                    mapCenter={this.props.mapCenter}
                    mapZoom={this.props.mapZoom}
                    plotExtent={this.props.plotExtent}
                    plotExtentPolygon={this.props.plotExtentPolygon}
                    resetCenterAndZoom={this.props.resetCenterAndZoom}
                    setCenterAndZoom={this.props.setCenterAndZoom}
                    syncMapWidgets={this.syncMapWidgets}
                    vectorSource={this.props.vectorSource}
                    visiblePlotId={this.props.visiblePlotId}
                    widget={widget}
                />
            );
        } else if (graphWidgetList.includes(widget.type)) {
            return (
                <GraphWidget
                    initCenter={this.props.initCenter}
                    plotExtentPolygon={this.props.plotExtentPolygon}
                    vectorSource={this.props.vectorSource}
                    widget={widget}
                />
            );
        } else if (widget.type === "statistics") {
            return (
                <StatsWidget
                    plotExtentPolygon={this.props.plotExtentPolygon}
                    widgetId={widget.id}
                />
            );
        } else if (widget.type === "degradationTool") {
            return (
                <DegradationWidget
                    imageryList={this.props.imageryList}
                    initCenter={this.props.initCenter}
                    mapCenter={this.props.mapCenter}
                    mapZoom={this.props.mapZoom}
                    plotExtent={this.props.plotExtent}
                    plotExtentPolygon={this.props.plotExtentPolygon}
                    resetCenterAndZoom={this.props.resetCenterAndZoom}
                    setCenterAndZoom={this.props.setCenterAndZoom}
                    vectorSource={this.props.vectorSource}
                    visiblePlotId={this.props.visiblePlotId}
                    widget={widget}
                />
            );
        } else {
            return (
                <img
                    alt="Blank Widget"
                    className="img-responsive"
                    height="200"
                    src="data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
                    width="200"
                />
            );
        }
    };

    render() {
        const {isFull} = this.state;
        const {widget} = this.props;
        // TODO this probably can be return this.getWidgetHtml()
        return (
            <div
                className={`placeholder columnSpan3 rowSpan${widget.layout.h} ${isFull && "fullwidget"}`}
                style={{
                    gridColumn: this.generateGridColumn(widget.layout.x, widget.layout.w),
                    gridRow: this.generateGridRow(widget.layout.y, widget.layout.h)
                }}
            >
                <div className="panel panel-default" id={"widget_" + widget.id}>
                    <div className="panel-heading">
                        <ul className="list-inline panel-actions pull-right">
                            <li style={{display: "inline"}}>{widget.name}</li>
                            <li style={{display: "inline"}}>
                                <button
                                    className="list-inline panel-actions panel-fullscreen"
                                    onClick={this.toggleFullScreen}
                                    style={{color: "#31BAB0"}}
                                    title="Toggle Fullscreen"
                                    type="button"
                                >
                                    {widget.isFull ? <UnicodeIcon icon="collapse"/> : <UnicodeIcon icon="expand"/>}
                                </button>
                            </li>
                            {/* TODO move to bottom "map control" */}
                            {mapWidgetList.includes(widget.type) && (
                                <li style={{display: "inline"}}>
                                    <button
                                        className="list-inline panel-actions panel-fullscreen ml-2 p-0"
                                        onClick={() => this.props.resetCenterAndZoom()}
                                        title="Recenter"
                                        type="button"
                                    >
                                        <img alt="Collect Earth Online" src="img/geodash/ceoicon.png"/>
                                    </button>
                                </li>
                            )}
                        </ul>
                    </div>
                    <div className="widget-container" id={"widget-container_" + widget.id}>
                        <div className="front">
                            {this.getWidgetComponent(widget)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

class DegradationWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedDate: "",
            degDataType: "landsat"
        };
    }

    handleDegDataType = dataType => {
        this.setState({
            degDataType: dataType
        });
    };

    handleSelectDate = date => {
        this.setState({selectedDate: date});
    };

    render() {
        return (
            <div id={"degradation_" + this.props.widget.id} style={{width: "100%", minHeight: "200px"}}>
                <div
                    style={{
                        display: "table",
                        position: "absolute",
                        width: "100%",
                        height: "calc(100% - 45px)"
                    }}
                >
                    <div style={{display: "table-row", height: "65%"}}>
                        <div style={{display: "table-cell", position: "relative"}}>
                            <div className="front">
                                <MapWidget
                                    degDataType={this.state.degDataType}
                                    handleDegDataType={this.handleDegDataType}
                                    imageryList={this.props.imageryList}
                                    isDegradation
                                    mapCenter={this.props.mapCenter}
                                    mapZoom={this.props.mapZoom}
                                    plotExtent={this.props.plotExtent}
                                    plotExtentPolygon={this.props.plotExtentPolygon}
                                    resetCenterAndZoom={this.props.resetCenterAndZoom}
                                    selectedDate={this.state.selectedDate}
                                    setCenterAndZoom={this.props.setCenterAndZoom}
                                    vectorSource={this.props.vectorSource}
                                    widget={this.props.widget}
                                />
                            </div>
                        </div>
                    </div>
                    <div style={{display: "table-row"}}>
                        <div style={{display: "table-cell", position: "relative"}}>
                            <div className="front">
                                <GraphWidget
                                    degDataType={this.state.degDataType}
                                    handleSelectDate={this.handleSelectDate}
                                    initCenter={this.props.initCenter}
                                    plotExtentPolygon={this.props.plotExtentPolygon}
                                    vectorSource={this.props.vectorSource}
                                    widget={this.props.widget}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

class Geodash extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            widgets: [],
            left: 0,
            ptop: 0,
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

    updateSize = which => {
        if (which.isFull) {
            document.body.classList.remove("bodyfull");
        } else {
            document.body.classList.add("bodyfull");
        }
        const doc = document.documentElement;
        if ((window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0) === 0
                && (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0) === 0) {
            window.scrollTo(this.state.left, this.state.ptop);
            this.setState({left: 0, ptop: 0});
        } else {
            this.setState({
                left: (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0),
                ptop: (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0)
            });
            window.scrollTo(0, 0);
        }
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
            <div className="placeholders container-fluid">
                {widgets.length > 0
                    ? (widgets.map(widget => (
                        <Widget
                            key={widget.id}
                            imageryList={this.state.imageryList}
                            initCenter={this.mapCenter}
                            mapCenter={this.state.mapCenter}
                            mapZoom={this.state.mapZoom}
                            plotExtent={JSON.parse(this.props.plotExtent)}
                            plotExtentPolygon={this.extentToPolygon(this.props.plotExtent)}
                            resetCenterAndZoom={this.resetCenterAndZoom}
                            setCenterAndZoom={this.setCenterAndZoom}
                            vectorSource={this.state.vectorSource}
                            visiblePlotId={this.props.visiblePlotId}
                            widget={widget}
                        />
                    ))
                    ) : (
                        <div className="placeholder columnSpan3 rowSpan2" style={{gridArea: "1 / 1 / span 2 / span 12"}}>
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
