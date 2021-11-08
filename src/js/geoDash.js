import "../css/geo-dash.css";

import React from "react";
import ReactDOM from "react-dom";
import _ from "lodash";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {Feature, Map, View} from "ol";
import {buffer as ExtentBuffer} from "ol/extent";
import {Circle, Polygon, Point} from "ol/geom";
import {Tile as TileLayer, Vector as VectorLayer} from "ol/layer";
import {transform as projTransform} from "ol/proj";
import {Vector, XYZ} from "ol/source";
import {Style, Stroke} from "ol/style";

import {mercator} from "./utils/mercator";
import {UnicodeIcon, formatDateISO} from "./utils/generalUtils";
import GeoDashNavigationBar from "./geodash/GeoDashNavigationBar";
import Switch from "./components/Switch";
import StatsWidget from "./geodash/StatsWidget";
import {graphWidgetList, mapWidgetList} from "./geodash/constants";

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
            .then(data => this.setState({widgets: data[1], vectorSource: data[2]}))
            .catch(response => {
                console.log(response);
                alert("Error initializing Geo-Dash. See console for details.");
            });
    }

    /// API

    getInstitutionImagery = () => fetch(`/get-institution-imagery?institutionId=${this.props.institutionId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)))
        .then(data => this.setState({imageryList: data}));

    getWidgetsByProjectId = () => fetch(`/geo-dash/get-project-widgets?projectId=${this.props.projectId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)))
        .then(data => data.map(widget => {
            widget.isFull = false;
            widget.opacity = 0.9;
            widget.sliderType = widget.swipeAsDefault ? "swipe" : "opacity";
            widget.swipeValue = 1.0;
            return widget;
        }));

    getVectorSource = () => {
        const {plotShape, radius, center, plotId} = this.props;
        if (plotShape === "polygon") {
            return fetch(`/get-plot-sample-geom?plotId=${plotId}`)
                .then(response => (response.ok ? response.json() : Promise.reject(response)))
                .then(plotJsonObject => {
                    const features = [plotJsonObject.plotGeom, ...(plotJsonObject.sampleGeoms || [])]
                        .filter(e => e)
                        .map(geom => new Feature({geometry: mercator.parseGeoJson(geom, true)}));
                    return Promise.resolve(new Vector({features}));
                });
        } else if (plotShape === "square") {
            const pointFeature = new Feature(
                new Point(projTransform(JSON.parse(center).coordinates, "EPSG:4326", "EPSG:3857"))
            );
            const pointExtent = pointFeature.getGeometry().getExtent();
            const bufferedExtent = new ExtentBuffer(pointExtent, radius);
            return Promise.resolve(new Vector({
                features: [new Feature(new Polygon(
                    [[[bufferedExtent[0], bufferedExtent[1]],
                      [bufferedExtent[0], bufferedExtent[3]],
                      [bufferedExtent[2], bufferedExtent[3]],
                      [bufferedExtent[2], bufferedExtent[1]],
                      [bufferedExtent[0], bufferedExtent[1]]]]
                ))]
            }));
        } else if (plotShape === "circle") {
            return Promise.resolve(
                new Vector({
                    features: [
                        new Feature(
                            new Circle(
                                projTransform(JSON.parse(center).coordinates, "EPSG:4326", "EPSG:3857"), radius
                            )
                        )]
                })
            );
        } else {
            return Promise.resolve(new Vector({features: []}));
        }
    };

    /// State

    handleFullScreen = widget => {
        const widgets = [...this.state.widgets];
        const index = widgets.indexOf(widget);
        widgets[index] = {...widget};
        widgets[index].isFull = !widgets[index].isFull;
        this.setState(
            {widgets},
            () => this.updateSize(widget)
        );
    };

    handleSliderChange = widget => {
        const widgets = [...this.state.widgets];
        const index = widgets.indexOf(widget);
        widgets[index] = {...widget};
        widgets[index].sliderType = widgets[index].sliderType === "opacity" ? "swipe" : "opacity";
        this.setState({widgets});
    };

    handleSwipeChange = (widget, evt) => {
        const widgets = [...this.state.widgets];
        const index = widgets.indexOf(widget);
        widgets[index] = {...widget, swipeValue: Number(evt.target.value)};
        this.setState({widgets});
    };

    setCenterAndZoom = (center, zoom) => {
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
            <div className="container-fluid">
                {widgets.length > 0
                    ? (widgets.map(widget => (
                        <Widget
                            key={widget.id}
                            imageryList={this.state.imageryList}
                            initCenter={this.mapCenter}
                            mapCenter={this.state.mapCenter}
                            mapZoom={this.state.mapZoom}
                            onFullScreen={this.handleFullScreen}
                            onSliderChange={this.handleSliderChange}
                            onSwipeChange={this.handleSwipeChange}
                            plotExtent={this.props.plotExtent}
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

class Widget extends React.Component {
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
                    onSliderChange={this.props.onSliderChange}
                    onSwipeChange={this.props.onSwipeChange}
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
                    onSliderChange={this.props.onSliderChange}
                    onSwipeChange={this.props.onSwipeChange}
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
        const {widget, onSliderChange, onSwipeChange} = this.props;
        // TODO this probably can be return this.getWidgetHtml()
        return (
            <div
                className={`placeholder columnSpan3 rowSpan${widget.layout.h} ${widget.isFull && "fullwidget"}`}
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
                                    onClick={() => this.props.onFullScreen(this.props.widget)}
                                    style={{color: "#31BAB0"}}
                                    title="Toggle Fullscreen"
                                    type="button"
                                >
                                    {widget.isFull ? <UnicodeIcon icon="collapse"/> : <UnicodeIcon icon="expand"/>}
                                </button>
                            </li>
                            {this.isMapWidget(widget) && (
                                <li style={{display: "inline"}}>
                                    <button
                                        className="list-inline panel-actions panel-fullscreen"
                                        onClick={() => this.props.resetCenterAndZoom()}
                                        style={{marginRight: "10px"}}
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
                            {this.getWidgetComponent(widget, onSliderChange, onSwipeChange)}
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
                                    onSliderChange={this.props.onSliderChange}
                                    onSwipeChange={this.props.onSwipeChange}
                                    plotExtent={this.props.plotExtent}
                                    plotExtentPolygon={this.props.plotExtentPolygon}
                                    resetCenterAndZoom={this.props.resetCenterAndZoom}
                                    selectedDate={this.state.selectedDate}
                                    setCenterAndZoom={this.props.setCenterAndZoom}
                                    syncMapWidgets={this.syncMapWidgets}
                                    vectorSource={this.props.vectorSource}
                                    visiblePlotId={this.props.visiblePlotId}
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

class MapWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            mapRef: null,
            opacity: 0.9, // FIXME, opacity is being kept separately here even though it is also part of widget
            geeTimeOut: null,
            stretch: 321
        };
    }

    /// Lifecycle

    componentDidMount() {
        this.initMap();
        const {widget} = this.props;

        this.loadWidgetSource(widget);

        window.addEventListener("resize", this.handleResize);
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.widget.isFull !== prevProps.widget.isFull) {
            this.state.mapRef.updateSize();
        }

        if (this.props.mapCenter !== prevProps.mapCenter || this.props.mapZoom !== prevProps.mapZoom) {
            this.centerAndZoomMap(this.props.mapCenter, this.props.mapZoom);
        }

        if (this.props.selectedDate !== prevProps.selectedDate
            || this.state.stretch !== prevState.stretch
            || this.props.degDataType !== prevProps.degDataType) {
            if (this.props.widget.type === "degradationTool" && this.props.selectedDate !== "") {
                const postObject = this.getPostObject(this.props.widget);
                const map = this.state.mapRef;
                // TODO just update source
                try {
                    map.getLayers().getArray()
                        .filter(layer => layer.get("id") !== undefined
                            && layer.get("id") === "widgetmap_" + this.props.widget.id)
                        .forEach(layer => map.removeLayer(layer));
                } catch (e) {
                    console.log("removal error");
                }
                if (typeof (Storage) !== "undefined"
                    && this.checkForCache(postObject, this.props.widget, false)) {
                    this.fetchMapInfo(postObject, "/geo-dash/gateway-request", this.props.widget, null);
                }
            }
        }
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.handleResize);
    }

    /// API

    fetchSourceUrl = async postObject => {
        // Why even get degradation params if you just exit here?
        if (postObject.path === "degradationTileUrl") {
            return;
        }
        return fetch("/geo-dash/gateway-request", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(postObject)
        })
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then(data => {
                // FIXME, what other fields are in data that I can just save URL?
                if (data && data.hasOwnProperty("url")) {
                    this.setCache(postObject, data);
                    return data.url;
                } else {
                    console.warn("Wrong Data Returned");
                    return false;
                }
            })
            .catch(err => console.error(err));
    };

    /// State

    setStretch = evt => this.setState({stretch: parseInt(evt.target.value)});

    toggleDegDataType = checked => this.props.handleDegDataType(checked ? "sar" : "landsat");

    onOpacityChange = newOpacity => {
        try {
            this.setState({opacity: newOpacity});
            this.state.mapRef.getLayers().forEach(lyr => {
                if (lyr.get("id") && lyr.get("id").includes(this.props.widget.id)) {
                    lyr.setOpacity(newOpacity);
                }
            });
        } catch (e) {
            console.log(e.message);
        }
    };

    /// Helpers

    // TODO update widget to {name, type, params}
    getPostObject = widget => {
        if (widget.type === "imageAsset" || widget.type === "imageElevation") {
            return {path: "image", ...widget};
        } else if (widget.type === "degradationTool") {
            const {stretch} = this.state;
            // FIXME, it looks like stretch is calculated by type + stretch.  A bit redundant logic here.
            const {selectedDate, degDataType, plotExtentPolygon} = this.props;
            return {
                path: "degradationTileUrl",
                imageDate: selectedDate,
                stretch: degDataType === "landsat" ? stretch : "SAR",
                geometry: plotExtentPolygon,
                degDataType
            };
        } else if (widget.type === "polygonCompare") {
            return {path: "featureCollection", ...widget};
        } else if (widget.type === "preImageCollection") {
            const {indexName} = widget;
            const path = ["LANDSAT5", "LANDSAT7", "LANDSAT8"].includes(indexName)
                ? "filteredLandsat"
                : indexName === "Sentinel2"
                    ? "filteredSentinel2"
                    : "imageCollectionByIndex";
            return {path, ...widget};
        } else if (widget.type === "imageCollectionAsset") {
            return {path: "imageCollection", ...widget};
        } else {
            return {};
        }
    };

    wrapCache = widget => {
        const postObject = this.getPostObject(widget);
        const cacheUrl = this.checkForCache(postObject);
        if (cacheUrl) {
            return Promise.resolve(cacheUrl);
        } else {
            this.fetchSourceUrl(widget);
        }
    };

    loadWidgetSource = async widget => {
        const {type} = widget;
        if (type === "dualImagery") {
            // FIXME, use the actual dual image
            const [url1, url2] = await Promise.all([this.wrapCache(widget), this.wrapCache(widget)]);
            this.addTileServer(url1, widget.id);
            this.addSecondTileServer(url2, widget.id);
        } else {
            const url = await this.wrapCache(widget);
            this.addTileServer(url, widget.id);
        }
    };

    /// OpenLayers

    initMap = () => {
        const {widget} = this.props;
        const {plotExtent} = this.props;
        const {sourceConfig, id, attribution, isProxied} = this.props.imageryList.find(imagery =>
            imagery.id === widget.basemapId)
            || this.props.imageryList.find(imagery => imagery.title === "Open Street Map")
            || this.props.imageryList[0];
        const basemapLayer = new TileLayer({
            source: mercator.createSource(sourceConfig, id, attribution, isProxied)
        });
        const plotSampleLayer = new VectorLayer({
            source: this.props.vectorSource,
            style: new Style({
                stroke: new Stroke({
                    color: "yellow",
                    width: 3
                }),
                fill: null
            }),
            zIndex: 100
        });

        const mapdiv = "widgetmap_" + widget.id;
        const map = new Map({
            layers: [basemapLayer, plotSampleLayer],
            target: mapdiv,
            view: new View({
                center: [0, 0],
                projection: "EPSG:3857",
                zoom: 4
            }),
            id: "widgetmapobject_" + widget.id
        });
        map.getView().on("propertychange", onpropertychange);

        function onpropertychange() {
            map.dispatchEvent("movestart");
            const view = map.getView();
            view.un("propertychange", onpropertychange);
            map.on("moveend", () => {
                view.on("propertychange", onpropertychange);
            });
        }

        map.on("movestart", this.pauseGeeLayer);
        map.on("moveend", e => {
            this.props.setCenterAndZoom(e.map.getView().getCenter(), e.map.getView().getZoom());
            this.resumeGeeLayer(e);
        });

        map.getView().fit(
            projTransform(
                [plotExtent[0], plotExtent[1]], "EPSG:4326", "EPSG:3857"
            ).concat(projTransform(
                [plotExtent[2], plotExtent[3]], "EPSG:4326", "EPSG:3857"
            )),
            map.getSize()
        );

        if (!this.props.mapCenter) {
            this.props.setCenterAndZoom(map.getView().getCenter(), map.getView().getZoom());
        }

        this.setState({
            mapRef: map
        });
    };

    centerAndZoomMap = (center, zoom) => {
        const map = this.state.mapRef;
        map.getView().setCenter(center);
        map.getView().setZoom(zoom);
    };

    handleResize = () => {
        try {
            this.state.mapRef.updateSize();
        } catch (e) {
            console.log("resize issue");
        }
    };

    pauseGeeLayer = e => {
        const layers = e.target.getLayers().getArray();
        layers.forEach(lyr => {
            if (lyr.get("id") && lyr.get("id").indexOf("widget") === 0) {
                lyr.setVisible(false);
            }
        });
    };

    resumeGeeLayer = e => {
        try {
            if (this.state && this.state.geeTimeOut) {
                window.clearTimeout(this.state.geeTimeOut);
                this.setState({geeTimeOut: null});
            }
            this.setState({
                geeTimeOut: window.setTimeout(() => {
                    const layers = e.target.getLayers().getArray();
                    layers.forEach(lyr => {
                        if (lyr.get("id") && lyr.get("id").indexOf("widget") === 0) {
                            lyr.setVisible(true);
                        }
                    });
                }, Math.floor(Math.random() * (1250 - 950 + 1) + 950))
            });
        } catch (err) {
            console.log(err.message);
        }
    };

    addTileServer = (url, widgetId) => {
        window.setTimeout(() => {
            const source = new XYZ({
                url
            });
            source.on("tileloaderror", error => {
                try {
                    window.setTimeout(() => {
                        error.tile.attempt = error.tile.attempt ? error.tile.attempt + 1 : 1;
                        if (error.tile.attempt < 5) error.tile.load();
                    }, Math.floor(Math.random() * (1250 - 950 + 1) + 950));
                } catch (e) {
                    console.log(e.message);
                }
            });
            this.state.mapRef.addLayer(new TileLayer({
                source,
                id: "widgetmap_" + widgetId
            }));
        }, Math.floor(Math.random() * (300 - 200 + 1) + 200));
    };

    addSecondTileServer = (url, widgetId) => {
        const googleLayer = new TileLayer({
            source: new XYZ({
                url
            }),
            id: "widgetmap_" + widgetId + "_dual"
        });
        this.state.mapRef.addLayer(googleLayer);
        const swipe = document.getElementById("swipeWidget_" + widgetId);
        googleLayer.on("prerender", event => {
            const ctx = event.context;
            const width = ctx.canvas.width * (swipe.value);
            ctx.save();
            ctx.beginPath();
            ctx.rect(width, 0, ctx.canvas.width - width, ctx.canvas.height);
            ctx.clip();
        });

        googleLayer.on("postrender", event => {
            const ctx = event.context;
            ctx.restore();
        });
        // TODO, move to swipe component
        swipe.addEventListener("input", () => {
            this.state.mapRef.render();
        }, false);
    };

    /// Cache

    checkForCache = postObject => {
        const jsonKey = JSON.stringify(postObject);
        const {url, lastGatewayUpdate} = JSON.parse(localStorage.getItem(jsonKey));
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        if (!url || new Date(lastGatewayUpdate) > currentDate) {
            localStorage.removeItem(jsonKey);
            return null;
        } else {
            return url;
        }
    };

    setCache = (postObject, data) => {
        localStorage.setItem(
            JSON.stringify(postObject),
            JSON.stringify({
                ...data,
                lastGatewayUpdate: new Date()
            })
        );
    };

    /// Render functions

    renderSliderControl = () => {
        const {widget, onSliderChange, onSwipeChange} = this.props;

        if (widget.type === "dualImagery") {
            return (
                <div>
                    <div className="toggleSwitchContainer">
                        <img
                            alt="Opacity"
                            height="20px"
                            onClick={() => onSliderChange(widget)}
                            src="img/geodash/opacity.png"
                            style={{
                                opacity: widget.sliderType === "opacity" ? "1.0" : "0.25",
                                cursor: "pointer"
                            }}
                            title="Opacity"
                            width="40px"
                        />
                        <br/>
                        <img
                            alt="Swipe"
                            height="20px"
                            onClick={() => onSliderChange(widget)}
                            src="img/geodash/swipe.png"
                            style={{
                                opacity: widget.sliderType === "swipe" ? "1.0" : "0.25",
                                cursor: "pointer"
                            }}
                            title="Swipe"
                            width="40px"
                        />
                    </div>
                    <input
                        className="mapRange dual"
                        id={"rangeWidget_" + widget.id}
                        max="1"
                        min="0"
                        onChange={e => this.onOpacityChange(parseInt(e.target.value))}
                        step=".01"
                        style={{display: widget.sliderType === "opacity" ? "block" : "none"}}
                        type="range"
                        value={this.state.opacity}
                    />
                    <input
                        className="mapRange dual"
                        id={"swipeWidget_" + widget.id}
                        max="1"
                        min="0"
                        onChange={evt => onSwipeChange(widget, evt)}
                        step=".01"
                        style={{display: widget.sliderType === "swipe" ? "block" : "none"}}
                        type="range"
                        value={this.props.widget.swipeValue}
                    />
                </div>
            );
        } else {
            return (
                <input
                    className="mapRange"
                    id={"rangeWidget_" + widget.id}
                    max="1"
                    min="0"
                    onChange={e => this.onOpacityChange(parseInt(e.target.value))}
                    step=".01"
                    type="range"
                    value={this.state.opacity}
                />
            );
        }
    };

    render() {
        const {isDegradation} = this.props;
        return (
            <>
                <div
                    className="minmapwidget"
                    id={"widgetmap_" + this.props.widget.id}
                    style={{width:"100%", minHeight:"200px"}}
                />
                {this.renderSliderControl()}
                <div className="row">
                    {isDegradation && (
                        <>
                            {this.props.degDataType === "landsat"
                                ? (
                                    <div className="col-6">
                                        <span className="ctrl-text font-weight-bold">Bands: </span>
                                        <select
                                            className="form-control"
                                            onChange={evt => this.setStretch(evt)}
                                            style={{
                                                maxWidth: "65%",
                                                display: "inline-block",
                                                fontSize: ".8rem",
                                                height: "30px"
                                            }}
                                        >
                                            <option value={321}>R,G,B</option>
                                            <option value={543}>SWIR,NIR,R</option>
                                            <option value={453}>NIR,SWIR,R</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="col-6">
                                        <span className="ctrl-text font-weight-bold">Band Combination: </span>
                                        <span className="ctrl-text">VV, VH, VV/VH </span>
                                    </div>
                                )}
                            <div className="col-6">
                                <span className="ctrl-text font-weight-bold">Data: </span>
                                <span className="ctrl-text">LANDSAT </span>
                                <Switch onChange={e => this.toggleDegDataType(e.target.checked)}/>
                                <span className="ctrl-text"> SAR</span>
                            </div>
                        </>
                    )}
                    {this.renderStretchToggle()}
                </div>
            </>
        );
    }
}

class GraphWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            graphRef: null,
            selectSarGraphBand: "VV",
            chartDataSeriesLandsat: [],
            chartDataSeriesSar: [],
            nonDegChartData: []
        };
    }

    /// Lifecycle

    componentDidMount() {
        const {widget: {type}} = this.props;
        if (type === "degradationTool") {
            this.loadDegradation();
        } else if (type === "timeSeries") {
            this.loadTimeSeries();
        } else {
            console.error("Incorrect widget type passed to the graph widget");
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.degDataType
            && (prevProps.degDataType !== this.props.degDataType
                || prevState.selectSarGraphBand !== this.state.selectSarGraphBand)) {
            this.loadDegradation();
        }
        this.handleResize();
        window.addEventListener("resize", this.handleResize);
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.handleResize);
    }

    /// API

    invalidData = data => {
        if (data.errMsg) {
            return data.errMsg;
        } else if (!data.hasOwnProperty("timeseries")) {
            return "Wrong Data Returned";
        } else if (data.timeseries.length === 0) {
            return "No data steps";
        } else {
            return null;
        }
    };

    loadDegradation = () => {
        const {chartDataSeriesLandsat, chartDataSeriesSar, selectSarGraphBand, graphRef} = this.state;
        const {widget, degDataType, plotExtentPolygon, handleSelectDate} = this.props;

        // Try to load existing data first.
        // TODO, do we need this.  My thought is that getChartOptions is called again when the state updates.
        if (degDataType === "landsat" && chartDataSeriesLandsat.length > 0) {
            graphRef.update({series: _.cloneDeep(chartDataSeriesLandsat)});
        } else if (degDataType === "sar"
            && chartDataSeriesSar.hasOwnProperty(selectSarGraphBand)
            && chartDataSeriesSar[selectSarGraphBand].length > 0) {
            graphRef.update({series: _.cloneDeep(chartDataSeriesSar[selectSarGraphBand])});
        } else {
            fetch("/geo-dash/gateway-request", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    path:  "degradationTimeSeries",
                    ...widget,
                    geometry: plotExtentPolygon
                })
            })
                .then(res => (res.ok ? res.json() : Promise.reject()))
                .then(data => {
                    const invalidCheck = this.invalidData(data);
                    if (invalidCheck) {
                        console.warn(invalidCheck);
                    } else {
                        // TODO, nested loops is a no-no
                        const theKeys = Object.keys(data.timeseries[0][1]);
                        const compiledData = [];
                        data.timeseries.forEach(d => {
                            for (let i = 0; i < theKeys.length; i += 1) {
                                const tempData = [];
                                const anObject = {};
                                anObject[theKeys[i]] = d[1][theKeys[i]];
                                tempData.push(d[0]);
                                tempData.push(anObject);
                                if (compiledData.length - 1 < i) {
                                    compiledData[i] = [];
                                }
                                compiledData[i].push(tempData);
                            }
                        });
                        // TODO, this can definitely be a .map.
                        compiledData.forEach((d, index) => {
                            const cdata = this.convertData(d);
                            const mSortData = this.sortMultiData(cdata);
                            const thisDataSeries = {
                                type: "scatter",
                                name: theKeys[index],
                                data: mSortData,
                                valueDecimals: 20,
                                connectNulls: true,
                                color: "#31bab0",
                                allowPointSelect: true,
                                point: {
                                    cursor: "pointer",
                                    events: {
                                        select: e => {
                                            handleSelectDate(formatDateISO(new Date(e.target.x)));
                                        }
                                    }
                                },
                                tooltip: {
                                    pointFormat: "<span style=\"color:{series.color}\">{point.x:%Y-%m-%d}</span>: <b>{point.y:.6f}</b><br/>",
                                    valueDecimals: 20,
                                    split: false,
                                    xDateFormat: "%Y-%m-%d"
                                }
                            };
                            if (degDataType === "landsat") {
                                this.setState({
                                    chartDataSeriesLandsat: [
                                        ...this.state.chartDataSeriesLandsat,
                                        thisDataSeries
                                    ]
                                });
                            } else {
                                this.setState({
                                    chartDataSeriesSar: {
                                        ...this.state.chartDataSeriesSar,
                                        [theKeys[index]]: [thisDataSeries]
                                    }
                                });
                            }
                        });
                    }
                })
                .catch(error => console.log(error));
        }
    };

    loadTimeSeries = () => {
        const {widget, plotExtentPolygon} = this.props;

        const {indexName} = widget;
        const path = indexName === "Custom"
            ? "timeSeriesByAsset"
            : "timeSeriesByIndex";
        fetch("/geo-dash/gateway-request", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                path,
                ...widget,
                geometry: plotExtentPolygon,
                scale: 30
            })
        })
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then(data => {
                const invalidCheck = this.invalidData(data);
                if (invalidCheck) {
                    console.warn(invalidCheck);
                } else {
                    const thisDataSeries = {
                        type: "area",
                        name: widget.graphBand || indexName,
                        data: data.timeseries
                            .filter(v => v[0]).map(v => [v[0], v[1]]).sort((a, b) => a[0] - b[0]),
                        color: "#31bab0"
                    };
                    this.setState({nonDegChartData : [thisDataSeries]});
                }
            })
            .catch(error => console.log(error));
    };

    /// Helpers

    multiComparator = (a, b) => ((a[0] < b[0]) ? -1
        : (a[0] > b[0])
            ? 1
            : 0);

    sortMultiData = data => data.sort(this.multiComparator);

    convertData = data => data.map(d => [d[0], d[1][Object.keys(d[1])[0]]]);

    handleResize = () => {
        try {
            if (this.state.graphRef && this.state.graphRef.bounds) {
                const gwidget = document.getElementById("widgetgraph_" + this.props.widget.id);
                this.state.graphRef.setSize(gwidget.clientWidth, gwidget.clientHeight, true);
            }
        } catch (e) {
            console.log("handleResize error:");
            console.log(e.message);
        }
    };

    /// High Charts

    getChartData = () => {
        const {widget, degDataType} = this.props;
        const {chartDataSeriesSar, chartDataSeriesLandsat, selectSarGraphBand, nonDegChartData} = this.state;
        return (widget.type === "degradationTool"
                && degDataType === "sar"
                && chartDataSeriesSar.hasOwnProperty(selectSarGraphBand)
                && chartDataSeriesSar[selectSarGraphBand])
            || (widget.type === "degradationTool"
                && degDataType === "landsat"
                && chartDataSeriesLandsat)
            || nonDegChartData
            || [];
    };

    getChartOptions = () => {
        const {widget} = this.props;
        return {
            chart: {zoomType: "x"},
            title: {text: ""},
            subtitle: {
                text: document.ontouchstart === undefined
                    ? "Click and drag in the plot area to zoom in"
                    : "Pinch the chart to zoom in"
            },
            xAxis: {type: "datetime"},
            yAxis: {
                title: {text: widget.indexName}
            },
            legend: {enabled: true},
            credits: {enabled: false},
            plotOptions: {
                area: {
                    connectNulls: widget.indexName.toLowerCase() === "custom",
                    fillColor: {
                        linearGradient: {
                            x1: 0,
                            y1: 0,
                            x2: 0,
                            y2: 1
                        },
                        stops: [
                            [0, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get("rgba")],
                            [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get("rgba")]
                        ]
                    },
                    marker: {radius: 2},
                    lineWidth: 1,
                    states: {
                        hover: {lineWidth: 1}
                    },
                    threshold: null
                },
                scatter: {
                    marker: {radius: 2}
                }
            },
            tooltip: {
                pointFormat: "<span style=\"color:{series.color}\">{series.name}</span>: <b>{point.y:.6f}</b><br/>",
                valueDecimals: 20,
                split: false,
                xDateFormat: "%Y-%m-%d"
            },
            series: _.cloneDeep(this.getChartData)
        };
    };

    /// Render functions

    renderSarBandOption = () => {
        const selectOptions = [
            {label: "VV", value: "VV"},
            {label: "VH", value: "VH"},
            {label: "VV/VH", value: "VV/VH"}
        ];
        return (
            <select
                className="form-control"
                onChange={e => this.setState({selectSarGraphBand: e.target.value})}
                style={{
                    maxWidth: "85%",
                    display: this.props.widget.type === "degradationTool" && this.props.degDataType === "sar"
                        ? "inline-block" : "none",
                    fontSize: ".9rem",
                    height: "30px"
                }}
            >
                {selectOptions.map(el => <option key={el.value} value={el.value}>{el.label}</option>)}
            </select>
        );
    };

    render() {
        const {widget} = this.props;
        return (
            <div className="minmapwidget" id={"widgetgraph_" + widget.id}>
                <div className="minmapwidget graphwidget normal" id={"graphcontainer_" + widget.id}>
                    {this.getChartData.length > 0
                        ? (
                            <HighchartsReact
                                callback={thisChart => this.setState({graphRef: thisChart})}
                                highcharts={Highcharts}
                                options={this.getChartOptions()}
                            />
                        ) : (
                            <img
                                alt="Loading"
                                src="img/geodash/ceo-loading.gif"
                                style={{
                                    position: "absolute",
                                    bottom: "50%",
                                    left: "50%"
                                }}
                            />
                        )}
                </div>
                <h3 id={"widgettitle_" + widget.id}>
                    {widget.indexName === "Custom" ? widget.graphBand : widget.indexName}
                </h3>
                {this.renderSarBandOption()}
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
