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

function getGatewayPath(widget, collectionName) {
    const fts = {
        "LANDSAT5": "Landsat5Filtered",
        "LANDSAT7": "Landsat7Filtered",
        "LANDSAT8": "Landsat8Filtered",
        "Sentinel2": "FilteredSentinel"
    };
    if (widget.filterType && widget.filterType.length > 0) {
        return fts[widget.filterType];
    } else if (widget.ImageCollectionAsset && widget.ImageCollectionAsset.length > 0) {
        return "ImageCollectionAsset";
    } else if (widget.properties && widget.properties[0] === "ImageCollectionCustom") {
        return "meanImageByMosaicCollections";
    } else if (collectionName.trim().length > 0) {
        return "cloudMaskImageByMosaicCollection";
    } else {
        // FIXME, dont have a default, all paths should exist
        return "ImageCollectionbyIndex";
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
    constructor(props) {
        super(props);
        this.imageCollectionList = ["imageElevation",
                                    "ImageCollectionCustom",
                                    "addImageCollection",
                                    "ndviImageCollection",
                                    "ImageCollectionNDVI",
                                    "ImageCollectionEVI",
                                    "ImageCollectionEVI2",
                                    "ImageCollectionNDWI",
                                    "ImageCollectionNDMI",
                                    "ImageCollectionLANDSAT5",
                                    "ImageCollectionLANDSAT7",
                                    "ImageCollectionLANDSAT8",
                                    "ImageCollectionSentinel2"];
        this.graphControlList = ["timeSeries"];
    }

    generateGridColumn = (x, w) => (x + 1) + " / span " + w;

    generateGridRow = (y, h) => (y + 1) + " / span " + h;

    getWidgetHtml = (widget, onSliderChange, onSwipeChange) => (
        <div
            className={`placeholder columnSpan3 rowSpan${widget.layout.h} ${widget.isFull && "fullwidget"}`}
            style={{
                gridColumn: this.generateGridColumn(widget.layout.x, widget.layout.w),
                gridRow: this.generateGridRow(widget.layout.y, widget.layout.h)
            }}
        >
            {this.getCommonWidgetLayout(widget, onSliderChange, onSwipeChange)}
        </div>
    );

    getCommonWidgetLayout = (widget, onSliderChange, onSwipeChange) => (
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
                    {this.getResetMapButton(widget)}
                </ul>
            </div>
            <div className="widget-container" id={"widget-container_" + widget.id}>
                {this.getWidgetInnerHtml(widget, onSliderChange, onSwipeChange)}
            </div>
        </div>
    );

    getResetMapButton = widget => {
        if (this.isMapWidget(widget)) {
            return (
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
            );
        }
    };

    getWidgetInnerHtml = (widget, onSliderChange, onSwipeChange) => {
        if (this.isMapWidget(widget)) {
            return (
                <div className="front">
                    <MapWidget
                        imageryList={this.props.imageryList}
                        mapCenter={this.props.mapCenter}
                        mapZoom={this.props.mapZoom}
                        onSliderChange={onSliderChange}
                        onSwipeChange={onSwipeChange}
                        plotExtent={this.props.plotExtent}
                        plotExtentPolygon={this.props.plotExtentPolygon}
                        resetCenterAndZoom={this.props.resetCenterAndZoom}
                        setCenterAndZoom={this.props.setCenterAndZoom}
                        syncMapWidgets={this.syncMapWidgets}
                        vectorSource={this.props.vectorSource}
                        visiblePlotId={this.props.visiblePlotId}
                        widget={widget}
                    />
                </div>
            );
        } else if (this.graphControlList.includes(widget.type)) {
            return (
                <div className="front">
                    <GraphWidget
                        initCenter={this.props.initCenter}
                        plotExtentPolygon={this.props.plotExtentPolygon}
                        vectorSource={this.props.vectorSource}
                        widget={widget}
                    />
                </div>
            );
        } else if (widget.type === "statistics") {
            return (
                <div className="front">
                    <StatsWidget
                        plotExtentPolygon={this.props.plotExtentPolygon}
                        widgetId={widget.id}
                    />
                </div>
            );
        } else if (widget.type === "degradationTool") {
            return (
                <div className="front">
                    <DegradationWidget
                        imageryList={this.props.imageryList}
                        initCenter={this.props.initCenter}
                        mapCenter={this.props.mapCenter}
                        mapZoom={this.props.mapZoom}
                        onSliderChange={onSliderChange}
                        onSwipeChange={onSwipeChange}
                        plotExtent={this.props.plotExtent}
                        plotExtentPolygon={this.props.plotExtentPolygon}
                        resetCenterAndZoom={this.props.resetCenterAndZoom}
                        setCenterAndZoom={this.props.setCenterAndZoom}
                        syncMapWidgets={this.syncMapWidgets}
                        vectorSource={this.props.vectorSource}
                        visiblePlotId={this.props.visiblePlotId}
                        widget={widget}
                    />
                </div>
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

    isMapWidget = widget => this.imageCollectionList.includes(widget.properties[0])
        || (widget.dualImageCollection)
        || (widget.assetName && widget.assetName.length > 0)
        || (widget.ImageCollectionAsset && widget.ImageCollectionAsset.length > 0)
        || (widget.featureCollection && widget.featureCollection.length > 0);

    render() {
        const {widget} = this.props;
        // TODO this probably can be return this.getWidgetHtml()
        return (
            <>
                {this.getWidgetHtml(widget, this.props.onSliderChange, this.props.onSwipeChange)}
            </>
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

    componentDidMount() {
        const {widget} = this.props;
        let {plotExtent} = this.props;

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

        if (plotExtent === "") {
            plotExtent = [-108.30322265625, 21.33544921875, -105.347900390625, 23.53271484375];
        } else if (typeof plotExtent === "string") {
            plotExtent = JSON.parse(plotExtent);
        }
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

        let postObject = {};
        let collectionName = "";
        let dateFrom = "";
        let dateTo = "";
        let requestedIndex = "";
        let path = "";
        let dualImageObject = null;
        let bands = "";
        if (widget.properties.length === 5) {
            bands = widget.properties[4];
        }
        widget.bands = bands;

        // FIXME, post object should spread widget or {name, type, eeType, layout, ...payload}
        if (widget.eeType === "Image") {
            // Should be type imageAsset or imageElevation
            const {assetName, visParams} = widget;
            postObject = {
                path: "image",
                assetName,
                visParams
            };
        } else if (widget.type === "degradationTool") {
            const {stretch} = this.state;
            const {selectedDate, degDataType, plotExtentPolygon} = this.props;
            postObject = {
                path: "getDegradationTileUrl",
                imageDate: selectedDate,
                stretch: degDataType === "landsat" ? stretch : "SAR",
                geometry: plotExtentPolygon
            };
        } else if (widget.type === "polygonCompare") {
            const {assetName, field, visParams} = widget;
            postObject = {
                path: "getTileUrlFromFeatureCollection",
                assetName,
                field,
                visParams: visParams || {},
                matchID: this.props.visiblePlotId
            };
        } else if (widget.dualImageCollection) {
            const {plotExtentPolygon} = this.props;
            const firstImage = widget.dualImageCollection[0];
            const secondImage = widget.dualImageCollection[1];
            collectionName = firstImage.collectionType;
            requestedIndex = this.getRequestedIndex(collectionName);
            collectionName = this.convertCollectionName(collectionName);

            dateFrom = firstImage.startDate;
            dateTo = firstImage.endDate;
            const shortWidget = {};
            shortWidget.filterType = firstImage.filterType;
            shortWidget.properties = [];
            shortWidget.properties.push(collectionName);
            shortWidget.assetName = firstImage.assetName;
            shortWidget.ImageCollectionAsset = firstImage.ImageCollectionAsset;
            path = getGatewayPath(shortWidget, collectionName);
            shortWidget.visParams = firstImage.visParams;
            shortWidget.min = firstImage.min != null ? firstImage.min : "";
            shortWidget.max = firstImage.max != null ? firstImage.max : "";
            shortWidget.band = firstImage.band != null ? firstImage.band : "";
            postObject.visParams = this.getImageParams(shortWidget);

            if (postObject.visParams.cloudLessThan) {
                postObject.bands = postObject.visParams.bands;
                postObject.min = postObject.visParams.min;
                postObject.max = postObject.visParams.max;
                postObject.cloudLessThan = parseInt(postObject.visParams.cloudLessThan);
            }
            // Create the fetch object for the second call here
            dualImageObject = {};
            dualImageObject.collectionName = secondImage.collectionType;
            dualImageObject.index = this.getRequestedIndex(dualImageObject.collectionName);
            dualImageObject.collectionName = this.convertCollectionName(dualImageObject.collectionName);
            dualImageObject.dateFrom = secondImage.startDate;
            dualImageObject.dateTo = secondImage.endDate;
            dualImageObject.geometry = plotExtentPolygon;

            const shortWidget2 = {};
            shortWidget2.filterType = secondImage.filterType;
            shortWidget2.properties = [];
            shortWidget2.properties.push(dualImageObject.collectionName);
            shortWidget2.assetName = secondImage.assetName;
            shortWidget2.ImageCollectionAsset = secondImage.ImageCollectionAsset;
            dualImageObject.path = getGatewayPath(shortWidget2, dualImageObject.collectionName);
            shortWidget2.visParams = secondImage.visParams;
            shortWidget2.min = secondImage.min != null ? secondImage.min : "";
            shortWidget2.max = secondImage.max != null ? secondImage.max : "";
            shortWidget2.band = secondImage.band != null ? secondImage.band : "";
            if (shortWidget2.visParams && shortWidget2.visParams.cloudLessThan != null) {
                dualImageObject.bands = shortWidget2.visParams.bands;
                dualImageObject.min = shortWidget2.visParams.min;
                dualImageObject.max = shortWidget2.visParams.max;
                dualImageObject.cloudLessThan = parseInt(shortWidget2.visParams.cloudLessThan);
            }

            dualImageObject.visParams = this.getImageParams(shortWidget2);
            // work on image asset here there will be a variable assetName in the dualImageCollection in which case we should call the gateway /image with imageParams
            if (firstImage.assetName) {
                postObject.assetName = firstImage.assetName;
                postObject.imageName = firstImage.assetName;
                postObject.visParams = firstImage.visParams;
            }
            if (secondImage.assetName) {
                dualImageObject.assetName = secondImage.assetName;
                dualImageObject.imageName = secondImage.assetName;
                dualImageObject.visParams = secondImage.visParams;
            }
            if (firstImage.ImageCollectionAsset) {
                postObject.ImageCollectionAsset = firstImage.ImageCollectionAsset;
                postObject.imageName = firstImage.ImageCollectionAsset;
                postObject.visParams = firstImage.visParams;
            }
            if (secondImage.ImageCollectionAsset) {
                dualImageObject.ImageCollectionAsset = secondImage.ImageCollectionAsset;
                dualImageObject.imageName = secondImage.ImageCollectionAsset;
                dualImageObject.visParams = secondImage.visParams;
            }
        } else {
            collectionName = widget.properties[1];
            dateFrom = widget.properties[2].trim() ? widget.properties[2].trim() : widget.startDate;
            dateTo = widget.properties[3].trim() ? widget.properties[3].trim() : widget.endDate;
            requestedIndex = this.getRequestedIndex(widget.properties[0]);
            path = getGatewayPath(widget, collectionName);
            postObject.visParams = this.getImageParams(widget);

            if (postObject.visParams.cloudLessThan) {
                postObject.bands = postObject.visParams.bands;
                postObject.min = postObject.visParams.min;
                postObject.max = postObject.visParams.max;
                postObject.cloudLessThan = parseInt(postObject.visParams.cloudLessThan);
            }
            if (widget.ImageCollectionAsset) {
                postObject.ImageCollectionAsset = widget.ImageCollectionAsset;
                postObject.imageName = widget.ImageCollectionAsset;
            }
        }

        postObject.collectionName = collectionName;
        postObject.dateFrom = dateFrom;
        postObject.dateTo = dateTo;
        postObject.index = requestedIndex;
        postObject.path = path;
        // see if we need to fetch or just add the tile server
        if (typeof (Storage) !== "undefined"
            && (this.checkForCache(postObject, widget, false)
                || (widget.dualImageCollection
                    && dualImageObject
                    && this.checkForCache(dualImageObject, widget, true)))) {
            this.fetchMapInfo(postObject, "/geo-dash/gateway-request", widget, dualImageObject);
        }
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
                const postObject = {};
                postObject.imageDate = this.props.selectedDate;
                postObject.stretch = this.props.degDataType && this.props.degDataType === "landsat"
                    ? this.state.stretch
                    : "SAR";
                postObject.dataType = this.props.degDataType;
                postObject.path = "getDegradationTileUrl";
                postObject.geometry = this.props.plotExtentPolygon;
                const map = this.state.mapRef;
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

    checkForCache = (postObject, widget, isSecond) => {
        const visParams = JSON.stringify(postObject.visParams);
        return (localStorage.getItem(postObject.assetName + visParams)
            ? this.createTileServerFromCache(postObject.assetName + visParams, widget.id, isSecond)
            : localStorage.getItem(postObject.ImageCollectionAsset + visParams)
                ? this.createTileServerFromCache(postObject.ImageCollectionAsset + visParams, widget.id, isSecond)
                : postObject.index && localStorage.getItem(postObject.index + visParams + postObject.dateFrom + postObject.dateTo)
                    ? this.createTileServerFromCache(postObject.index + visParams + postObject.dateFrom + postObject.dateTo, widget.id, isSecond)
                    : postObject.path && localStorage.getItem(postObject.path + visParams + postObject.dateFrom + postObject.dateTo)
                        ? this.createTileServerFromCache(postObject.path + visParams + postObject.dateFrom + postObject.dateTo, widget.id, isSecond)
                        : localStorage.getItem(JSON.stringify(postObject))
                            ? this.createTileServerFromCache(JSON.stringify(postObject), widget.id, isSecond)
                            : true);
    };

    setCache = (postObject, data) => {
        data.lastGatewayUpdate = new Date();
        const visParams = JSON.stringify(postObject.visParams);
        if (postObject.assetName && visParams) {
            localStorage.setItem(postObject.assetName + visParams, JSON.stringify(data));
        } else if (postObject.ImageCollectionAsset && visParams) {
            localStorage.setItem(postObject.ImageCollectionAsset + visParams, JSON.stringify(data));
        } else if (postObject.index && visParams + postObject.dateFrom + postObject.dateTo) {
            localStorage.setItem(
                postObject.index + visParams + postObject.dateFrom + postObject.dateTo, JSON.stringify(data)
            );
        } else if (postObject.path && visParams + postObject.dateFrom + postObject.dateTo) {
            localStorage.setItem(
                postObject.path + visParams + postObject.dateFrom + postObject.dateTo, JSON.stringify(data)
            );
        } else {
            localStorage.setItem(JSON.stringify(postObject), JSON.stringify(data));
        }
    };

    fetchMapInfo = (postObject, url, widget, dualImageObject) => {
        if (postObject.path === "getDegradationTileUrl" && url.trim() === "") {
            return;
        }
        fetch(url, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(postObject)
        })
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then(data => {
                if (data && data.hasOwnProperty("url")) {
                    this.setCache(postObject, data);
                    this.addTileServer(data.url, "widgetmap_" + widget.id);
                    return true;
                } else {
                    console.warn("Wrong Data Returned");
                    return false;
                }
            })
            .then(isValid => {
                if (isValid) {
                    if (widget.dualLayer) {
                        postObject.dateFrom = widget.dualStart;
                        postObject.dateTo = widget.dualEnd;

                        fetch(url, {
                            method: "POST",
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(postObject)
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.hasOwnProperty("url")) {
                                    this.setCache(postObject, data);
                                    this.addDualLayer(data.url, data.token, "widgetmap_" + widget.id);
                                }
                            });
                    } else if (dualImageObject) {
                        let workingObject;
                        try {
                            workingObject = JSON.parse(dualImageObject);
                        } catch (e) {
                            workingObject = dualImageObject;
                        }
                        if (workingObject != null) {
                            fetch(workingObject.url, {
                                method: "POST",
                                headers: {
                                    "Accept": "application/json",
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify(workingObject)
                            })
                                .then(res => res.json())
                                .then(data => {
                                    if (data.hasOwnProperty("url")) {
                                        this.setCache(postObject, data);
                                        this.addDualLayer(data.url, data.token, "widgetmap_" + widget.id);
                                    } else {
                                        console.warn("Wrong Data Returned");
                                    }
                                });
                        }
                    }
                }
            })
            .catch(error => console.error(error));
    };

    // FIXME, parse all visParams in widgetLayoutEditor
    getImageParams = widget => {
        if (widget.visParams) {
            if (typeof widget.visParams === "string") {
                try {
                    return JSON.parse(widget.visParams);
                } catch (e) {
                    return widget.visParams;
                }
            } else {
                return widget.visParams;
            }
        } else {
            return {
                min: (widget.min && widget.min > 0) ? widget.min : null,
                max: (widget.max && widget.max > 0) ? widget.max : null,
                bands: widget.bands
            };
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

    getRequestedIndex = collectionName => (
        ["ImageCollectionNDVI",
         "ImageCollectionEVI",
         "ImageCollectionEVI2",
         "ImageCollectionNDMI",
         "ImageCollectionNDWI"].includes(collectionName)
            ? collectionName.replace("ImageCollection", "")
            : "");

    convertCollectionName = collectionName => (
        ["ImageCollectionNDVI",
         "ImageCollectionEVI",
         "ImageCollectionEVI2",
         "ImageCollectionNDMI",
         "ImageCollectionNDWI"].includes(collectionName)
            ? ""
            : collectionName);

    addSecondMapLayer = (url, token, widgetid) => {
        if (this.state.mapRef) {
            this.addDualLayer(url, token, widgetid);
        } else {
            setTimeout(() => {
                this.addDualLayer(url, token, widgetid);
            }, 1000);
        }
    };

    centerAndZoomMap = (center, zoom) => {
        const map = this.state.mapRef;
        map.getView().setCenter(center);
        map.getView().setZoom(zoom);
    };

    createTileServerFromCache = (storageItem, widgetId, isSecond) => {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        const mapinfo = JSON.parse(localStorage.getItem(storageItem));
        if (new Date(mapinfo.lastGatewayUpdate) > currentDate) {
            if (isSecond) {
                this.addSecondMapLayer(mapinfo.url, mapinfo.token, "widgetmap_" + widgetId);
            } else {
                this.addTileServer(mapinfo.url, "widgetmap_" + widgetId);
            }
            return false;
        }
        return true;
    };

    getSliderControl = () => {
        const {widget, onSliderChange, onSwipeChange} = this.props;

        if (widget.dualLayer || widget.dualImageCollection) {
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
                        onChange={evt => this.onOpacityChange(evt)}
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
                    onChange={evt => this.onOpacityChange(evt)}
                    step=".01"
                    type="range"
                    value={this.state.opacity}
                />
            );
        }
    };

    onOpacityChange = evt => {
        try {
            const opacity = Number(evt.target.value);
            this.setState({opacity});
            this.state.mapRef.getLayers().forEach(lyr => {
                if (lyr.get("id") && lyr.get("id").includes(this.props.widget.id)) {
                    lyr.setOpacity(opacity);
                }
            });
        } catch (e) {
            console.log(e.message);
        }
    };

    handleResize = () => {
        try {
            this.state.mapRef.updateSize();
        } catch (e) {
            console.log("resize issue");
        }
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

    addTileServer = (url, mapdiv) => {
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
                id: mapdiv
            }));
        }, Math.floor(Math.random() * (300 - 200 + 1) + 200));
    };

    addDualLayer = (url, token, mapdiv) => {
        const googleLayer = new TileLayer({
            source: new XYZ({
                url
            }),
            id: mapdiv + "_dual"
        });
        this.state.mapRef.addLayer(googleLayer);
        const swipe = document.getElementById("swipeWidget_" + mapdiv.replace("widgetmap_", ""));
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
        swipe.addEventListener("input", () => {
            this.state.mapRef.render();
        }, false);
    };

    setStretch = evt => this.setState({stretch: parseInt(evt.target.value)});

    toggleDegDataType = checked => this.props.handleDegDataType(checked ? "sar" : "landsat");

    getStretchToggle = () => (this.props.degDataType === "landsat"
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
        )
        : this.props.isDegradation
            ? (
                <div className="col-6">
                    <span className="ctrl-text font-weight-bold">Band Combination: </span>
                    <span className="ctrl-text">VV, VH, VV/VH </span>
                </div>
            )
            : "");

    getDegDataTypeToggle = () => (
        <div className="col-6" style={{display: this.props.isDegradation ? "block" : "none"}}>
            <span className="ctrl-text font-weight-bold">Data: </span>
            <span className="ctrl-text">LANDSAT </span>
            <Switch onChange={evt => this.toggleDegDataType(evt.target.checked)}/>
            <span className="ctrl-text"> SAR</span>
        </div>
    );

    render() {
        return (
            <>
                <div
                    className="minmapwidget"
                    id={"widgetmap_" + this.props.widget.id}
                    style={{width:"100%", minHeight:"200px"}}
                />
                {this.getSliderControl()}
                <div className="row">
                    {this.getStretchToggle()}
                    {this.getDegDataTypeToggle()}
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

    componentDidMount() {
        this.loadGraph();
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.degDataType
            && (prevProps.degDataType !== this.props.degDataType
                || prevState.selectSarGraphBand !== this.state.selectSarGraphBand)) {
            this.loadGraph();
        }
        this.handleResize();
    }

    loadGraph = () => {
        const {chartDataSeriesLandsat, chartDataSeriesSar, selectSarGraphBand, graphRef} = this.state;
        const {widget, degDataType, plotExtentPolygon, handleSelectDate, vectorSource} = this.props;

        // For degradation
        if (degDataType === "landsat" && chartDataSeriesLandsat.length > 0) {
            graphRef.update({series: _.cloneDeep(chartDataSeriesLandsat)});
        // For degradation
        } else if (degDataType === "sar"
            && chartDataSeriesSar.hasOwnProperty(selectSarGraphBand)
            && chartDataSeriesSar[selectSarGraphBand].length > 0) {
            graphRef.update({series: _.cloneDeep(chartDataSeriesSar[selectSarGraphBand])});
        } else {
            const {type, indexName} = widget;
            const centerPoint = mercator.getFeatureCenter(vectorSource);
            const path = type === "degradationTool"
                ? "getImagePlotDegradation"
                : indexName === "Custom"
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
                    scale: 30,
                    point: centerPoint
                })
            })
                .then(res => res.json())
                .then(res => {
                    if (res.errMsg) {
                        console.warn(res.errMsg);
                    } else if (res.hasOwnProperty("timeseries")) {
                        if (res.timeseries.length === 0) {
                            console.log("no data");
                        } else if (Object.keys(res.timeseries[0][1]).length === 0) {
                            const thisDataSeries = {
                                type: "area",
                                name: widget.graphBand || indexName,
                                data: res.timeseries
                                    .filter(v => v[0]).map(v => [v[0], v[1]]).sort((a, b) => a[0] - b[0]),
                                color: "#31bab0"
                            };
                            this.setState({nonDegChartData : [thisDataSeries]});
                        } else {
                            // this is where degData ends up
                            const theKeys = Object.keys(res.timeseries[0][1]);
                            const compiledData = [];
                            res.timeseries.forEach(d => {
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
                    } else {
                        console.warn("Wrong Data Returned");
                    }
                })
                .catch(error => console.log(error));
            window.addEventListener("resize", this.handleResize);
        }
    };

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

    onSelectSarGraphBand = newValue => this.setState({selectSarGraphBand: newValue});

    getSarBandOption = () => {
        const selectOptions = [
            {label: "VV", value: "VV"},
            {label: "VH", value: "VH"},
            {label: "VV/VH", value: "VV/VH"}
        ];
        return (
            <select
                className="form-control"
                onChange={evt => this.onSelectSarGraphBand(evt.target.value)}
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

    getChartOptions = () => {
        const {widget, degDataType} = this.props;
        const {chartDataSeriesLandsat, chartDataSeriesSar, selectSarGraphBand, nonDegChartData} = this.state;
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
            series:
                widget.type === "degradationTool"
                    ? degDataType === "landsat" && chartDataSeriesLandsat.length > 0
                        ? _.cloneDeep(chartDataSeriesLandsat)
                        : degDataType === "sar" && chartDataSeriesSar.hasOwnProperty(selectSarGraphBand)
                            && chartDataSeriesSar[selectSarGraphBand].length > 0
                            ? _.cloneDeep(chartDataSeriesSar[selectSarGraphBand])
                            : []
                    : _.cloneDeep(nonDegChartData)
        };
    };

    render() {
        const {widget, degDataType} = this.props;
        const {chartDataSeriesSar, chartDataSeriesLandsat, selectSarGraphBand, nonDegChartData} = this.state;
        return (
            <div className="minmapwidget" id={"widgetgraph_" + widget.id}>
                <div className="minmapwidget graphwidget normal" id={"graphcontainer_" + widget.id}>
                    {(widget.type === "degradationTool"
                        && degDataType === "sar"
                        && chartDataSeriesSar.hasOwnProperty(selectSarGraphBand)
                        && chartDataSeriesSar[selectSarGraphBand].length > 0)
                    || (widget.type === "degradationTool"
                        && degDataType === "landsat"
                        && chartDataSeriesLandsat.length > 0)
                    || nonDegChartData.length > 0
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
                <h3 id={"widgettitle_" + widget.id}>{widget.properties[4]}</h3>
                {this.getSarBandOption()}
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
