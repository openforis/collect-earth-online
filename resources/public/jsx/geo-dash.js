import React from "react";
import ReactDOM from "react-dom";
import { mercator } from "../js/mercator.js";
import { UnicodeIcon } from "./utils/textUtils";
import { formatDateISO } from "./utils/dateUtils";
import { getGatewayPath } from "./utils/geodashUtils";
import { GeoDashNavigationBar } from "./components/PageComponents";
import { Feature, Map, View } from "ol";
import { buffer as ExtentBuffer } from "ol/extent";
import { Circle, Polygon, Point } from "ol/geom";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { transform as projTransform } from "ol/proj";
import { OSM, Vector, XYZ } from "ol/source";
import { Style, Stroke } from "ol/style";
import { getArea as sphereGetArea } from "ol/sphere";

class Geodash extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            widgets: [ ],
            callbackComplete: false,
            left: 0,
            ptop: 0,
            institutionId: this.getParameterByName("institutionId") ? this.getParameterByName("institutionId") : "3",
            projAOI: this.getParameterByName("aoi"),
            projPairAOI: "",
            projectId: this.getParameterByName("projectId"),
            mapCenter:null,
            mapZoom:null,
            imageryList:[],
            initCenter:null,
            initZoom:null,
        };
        const theSplit = decodeURI(this.state.projAOI)
            .replace("[", "")
            .replace("]", "")
            .split(",");
        this.state.projPairAOI = "[["
            + theSplit[0] + ","
            + theSplit[1] + "],["
            + theSplit[2] + ","
            + theSplit[1] + "],["
            + theSplit[2] + ","
            + theSplit[3] + "],["
            + theSplit[0] + ","
            + theSplit[3] + "],["
            + theSplit[0] + ","
            + theSplit[1] + "]]";
    }

    componentDidMount() {
        fetch(this.props.documentRoot + "/get-institution-imagery?institutionId=" + this.state.institutionId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ imageryList: data }))
            .then(() =>
                fetch(this.props.documentRoot + "/geo-dash/get-by-projid?projectId=" + this.state.projectId)
                    .then(response => response.json())
                    .then(data => data.widgets.map(widget => {
                        widget.isFull = false;
                        widget.opacity = "0.9";
                        widget.sliderType = "opacity";
                        widget.swipeValue = "1.0";
                        return widget;
                    }))
                    .then(data => this.setState({ widgets: data, callbackComplete: true }))
            );
    }

    getParameterByName = (name, url) => {
        const regex = new RegExp("[?&]" + name.replace(/[[\]]/g, "\\$&") + "(=([^&#]*)|&|#|$)");
        const results = regex.exec(decodeURIComponent(url || window.location.href));
        return results
            ? results[2]
                ? decodeURIComponent(results[2].replace(/\+/g, " "))
                : ""
            : null;
    };

    handleFullScreen = (widget) => {
        const widgets = [...this.state.widgets];
        const index = widgets.indexOf(widget);
        widgets[index] = { ...widget };
        widgets[index].isFull = !widgets[index].isFull;
        this.setState({ widgets },
                      () => {
                          this.updateSize(widget);
                      }
        );
    };

    handleSliderChange = widget => {
        const widgets = [...this.state.widgets];
        const index = widgets.indexOf(widget);
        widgets[index] = { ...widget };
        widgets[index].sliderType = widgets[index].sliderType === "opacity" ? "swipe" : "opacity";
        this.setState({ widgets });
    };

    handleSwipeChange = (widget, id, evt) => {
        const widgets = [...this.state.widgets];
        const index = widgets.indexOf(widget);
        widgets[index] = { ...widget };
        widgets[index].swipeValue = evt.target.value;
        this.setState({ widgets });
    };

    setCenterAndZoom = (center, zoom) => {
        !this.state.initCenter
            ? this.setState({
                initCenter:center,
                initZoom:zoom,
                mapCenter:center,
                mapZoom:zoom,
            })
            : this.setState({
                mapCenter:center,
                mapZoom:zoom,
            });
    };

    resetCenterAndZoom = () => {
        this.setCenterAndZoom(this.state.initCenter, this.state.initZoom);
    };

    updateSize = which => {
        which.isFull ? document.body.classList.remove("bodyfull") : document.body.classList.add("bodyfull");
        const doc = document.documentElement;
        if ((window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0) === 0 && (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0) === 0) {
            window.scrollTo(this.state.left, this.state.ptop);
            this.setState({ left: 0, ptop: 0 });
        } else {
            this.setState({ left: (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0), ptop: (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0) });
            window.scrollTo(0, 0);
        }
    };

    render() {
        return (
            <div className="container-fluid">
                <Widgets
                    widgets={this.state.widgets}
                    projAOI={this.state.projAOI}
                    projPairAOI={this.state.projPairAOI}
                    onFullScreen={this.handleFullScreen}
                    onSliderChange={this.handleSliderChange}
                    onSwipeChange={this.handleSwipeChange}
                    callbackComplete={this.state.callbackComplete}
                    getParameterByName={this.getParameterByName}
                    documentRoot={this.props.documentRoot}
                    mapCenter={this.state.mapCenter}
                    mapZoom={this.state.mapZoom}
                    setCenterAndZoom={this.setCenterAndZoom}
                    imageryList={this.state.imageryList}
                    resetCenterAndZoom={this.resetCenterAndZoom}
                    initCenter={this.mapCenter}
                />
            </div>
        );
    }
}

class Widgets extends React.Component {
    render() {
        if (this.props.widgets.length > 0) {
            return (
                <div className="row placeholders">
                    {this.props.widgets.map(widget => (
                        <Widget
                            key={widget.id}
                            id={widget.id}
                            widget={widget}
                            projAOI={this.props.projAOI}
                            projPairAOI={this.props.projPairAOI}
                            onFullScreen ={this.props.onFullScreen}
                            onSliderChange = {this.props.onSliderChange}
                            onSwipeChange = {this.props.onSwipeChange}
                            getParameterByName={this.props.getParameterByName}
                            documentRoot={this.props.documentRoot}
                            mapCenter={this.props.mapCenter}
                            mapZoom={this.props.mapZoom}
                            setCenterAndZoom={this.props.setCenterAndZoom}
                            imageryList={this.props.imageryList}
                            resetCenterAndZoom={this.props.resetCenterAndZoom}
                            initCenter={this.props.initCenter}
                        />
                    ))}
                </div>
            );
        } else {
            return (
                <div className="row placeholders">
                    <div className="placeholder columnSpan3 rowSpan2" style={{ gridArea: "1 / 1 / span 2 / span 12" }}>
                        <h1 id="noWidgetMessage">
                            {this.props.callbackComplete
                                ? "The Administrator has not configured any Geo-Dash Widgets for this project"
                                : "Retrieving Geo-Dash configuration for this project"}
                        </h1>
                    </div>
                </div>
            );
        }
    }
}

class Widget extends React.Component {
    constructor(props) {
        super(props);
        this.imageCollectionList = ["ImageElevation",
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
        this.graphControlList = ["customTimeSeries",
                                 "timeSeriesGraph",
                                 "ndviTimeSeries",
                                 "ndwiTimeSeries",
                                 "eviTimeSeries",
                                 "evi2TimeSeries",
                                 "ndmiTimeSeries",
                                 "mekong_tc_l_c"];
    }

    generateGridColumn = (x, w) => (x + 1) + " / span " + w;

    generateGridRow = (y, h) => (y + 1) + " / span " + h;

    getColumnClass = c => c.includes("span 12") ? " fullcolumnspan" : c.includes("span 9") ? " columnSpan9" : c.includes("span 6") ? " columnSpan6" : " columnSpan3";

    getRowClass = r => r.includes("span 2") ? " rowSpan2" : r.includes("span 3") ? " rowSpan3" : " rowSpan1";

    getClassNames = (fullState, c, r) => fullState ? "placeholder fullwidget" : "placeholder" + this.getColumnClass(c) + this.getRowClass(r);

    getWidgetHtml = (widget, onSliderChange, onSwipeChange) => {
        if (widget.gridcolumn || widget.layout) {
            return (
                <div
                    className={
                        this.getClassNames(widget.isFull,
                                           widget.gridcolumn || "",
                                           widget.gridrow || (widget.layout && "span " + widget.layout.h) || ""
                        )
                    }
                    style={{
                        gridColumn:widget.gridcolumn != null
                            ? widget.gridcolumn
                            : this.generateGridColumn(widget.layout.x, widget.layout.w),
                        gridRow:widget.gridrow != null
                            ? widget.gridrow
                            : this.generateGridRow(widget.layout.y, widget.layout.h),
                    }}
                >
                    {this.getCommonWidgetLayout(widget, onSliderChange, onSwipeChange)}
                </div>
            );
        } else {
            return (
                <div
                    className={widget.isFull
                        ? "fullwidget columnSpan3 rowSpan1 placeholder"
                        : "columnSpan3 rowSpan1 placeholder"}
                >
                    {this.getCommonWidgetLayout(widget, onSliderChange, onSwipeChange)}
                </div>);
        }
    };

    getCommonWidgetLayout = (widget, onSliderChange, onSwipeChange) => <div className="panel panel-default" id={"widget_" + widget.id}>
        <div className="panel-heading">
            <ul className="list-inline panel-actions pull-right">
                <li style={{ display: "inline" }}>{widget.name}</li>
                <li style={{ display: "inline" }}>
                    <a
                        className="list-inline panel-actions panel-fullscreen"
                        onClick={() => this.props.onFullScreen(this.props.widget)}
                        style={{ color: "#31BAB0" }}
                        role="button"
                        title="Toggle Fullscreen"
                    >
                        {widget.isFull ? <UnicodeIcon icon="collapse"/> : <UnicodeIcon icon="expand"/>}
                    </a>
                </li>
                {this.getResetMapButton(widget)}
            </ul>
        </div>
        <div id={"widget-container_" + widget.id} className="widget-container">
            {this.getWidgetInnerHtml(widget, onSliderChange, onSwipeChange)}
        </div>
    </div>;

    getResetMapButton = widget => {
        if (this.isMapWidget(widget)) {
            return <li style={{ display: "inline" }}>
                <a
                    className="list-inline panel-actions panel-fullscreen"
                    onClick={() => this.props.resetCenterAndZoom()}
                    role="button"
                    title="Recenter"
                    style={{ marginRight: "10px" }}
                >
                    <img src={"img/ceoicon.png"} alt="Collect Earth Online"/>
                </a>
            </li>;
        }
    };

    getWidgetInnerHtml = (widget, onSliderChange, onSwipeChange) => {
        if (this.isMapWidget(widget)) {
            return <div className="front">
                <MapWidget
                    widget={widget}
                    mapCenter={this.props.mapCenter}
                    mapZoom={this.props.mapZoom}
                    projAOI={this.props.projAOI}
                    projPairAOI={this.props.projPairAOI}
                    onSliderChange={onSliderChange}
                    onSwipeChange={onSwipeChange}
                    syncMapWidgets={this.syncMapWidgets}
                    getParameterByName={this.props.getParameterByName}
                    documentRoot={this.props.documentRoot}
                    setCenterAndZoom={this.props.setCenterAndZoom}
                    imageryList={this.props.imageryList}
                    resetCenterAndZoom={this.props.resetCenterAndZoom}
                />
            </div>;
        } else if (this.graphControlList.includes(widget.properties[0])) {
            return <div className="front">
                <GraphWidget
                    widget={widget}
                    projPairAOI={this.props.projPairAOI}
                    getParameterByName={this.props.getParameterByName}
                    documentRoot={this.props.documentRoot}
                    initCenter={this.props.initCenter}
                />
            </div>;
        } else if (widget.properties[0] === "getStats") {
            return <div className="front">
                <StatsWidget
                    widget={widget}
                    projPairAOI={this.props.projPairAOI}
                    documentRoot={this.props.documentRoot}
                />
            </div>;
        } else if (widget.properties[0] === "DegradationTool") {
            return <div className="front">
                <DegradationWidget
                    widget={widget}
                    projPairAOI={this.props.projPairAOI}
                    getParameterByName={this.props.getParameterByName}
                    documentRoot={this.props.documentRoot}
                    initCenter={this.props.initCenter}
                    mapCenter={this.props.mapCenter}
                    mapZoom={this.props.mapZoom}
                    projAOI={this.props.projAOI}
                    onSliderChange={onSliderChange}
                    onSwipeChange={onSwipeChange}
                    syncMapWidgets={this.syncMapWidgets}
                    setCenterAndZoom={this.props.setCenterAndZoom}
                    imageryList={this.props.imageryList}
                    resetCenterAndZoom={this.props.resetCenterAndZoom}
                />
            </div>;
        } else {
            return <img src="data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==" width ="200" height ="200" className="img-responsive" alt="Blank Widget"/>;
        }
    };

    isMapWidget = widget => this.imageCollectionList.includes(widget.properties[0])
        || (widget.dualImageCollection)
        || (widget.ImageAsset && widget.ImageAsset.length > 0)
        || (widget.ImageCollectionAsset && widget.ImageCollectionAsset.length > 0)
        || (widget.featureCollection && widget.featureCollection.length > 0);

    render() {
        const { widget } = this.props;
        return (<React.Fragment>{ this.getWidgetHtml(widget, this.props.onSliderChange, this.props.onSwipeChange) }</React.Fragment>);
    }
}

class DegradationWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedDate: "",
            degDataType: "landsat",
        };
    }

    handleDegDataType = (dataType) => {
        this.setState({
            degDataType: dataType,
        });
    };

    handleSelectDate = (date) => {
        this.setState({ selectedDate: date });
    };

    render() {
        return <React.Fragment>
            <div id={"degradation_" + this.props.widget.id} style={{ width: "100%", minHeight: "200px" }}>
                <div style={{ display: "table", position: "absolute", width: "100%", height: "calc(100% - 45px)" }}>
                    <div style={{ display: "table-row", height: "65%" }}>
                        <div style={{ display: "table-cell", position: "relative" }}>
                            <div className="front">
                                <MapWidget
                                    widget={this.props.widget}
                                    mapCenter={this.props.mapCenter}
                                    mapZoom={this.props.mapZoom}
                                    projAOI={this.props.projAOI}
                                    projPairAOI={this.props.projPairAOI}
                                    onSliderChange={this.props.onSliderChange}
                                    onSwipeChange={this.props.onSwipeChange}
                                    syncMapWidgets={this.syncMapWidgets}
                                    getParameterByName={this.props.getParameterByName}
                                    documentRoot={this.props.documentRoot}
                                    setCenterAndZoom={this.props.setCenterAndZoom}
                                    imageryList={this.props.imageryList}
                                    resetCenterAndZoom={this.props.resetCenterAndZoom}
                                    selectedDate={this.state.selectedDate}
                                    degDataType={this.state.degDataType}
                                    handleDegDataType={this.handleDegDataType}
                                    isDegradation
                                />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "table-row" }}>
                        <div style={{ display: "table-cell", position: "relative" }}>
                            <div className="front">
                                <GraphWidget
                                    widget={this.props.widget}
                                    projPairAOI={this.props.projPairAOI}
                                    getParameterByName={this.props.getParameterByName}
                                    documentRoot={this.props.documentRoot}
                                    initCenter={this.props.initCenter}
                                    handleSelectDate={this.handleSelectDate}
                                    degDataType={this.state.degDataType}
                                    isDegradation
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment>;
    }
}

class MapWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            mapRef: null,
            opacity: 90,
            geeTimeOut: null,
            stretch: 321,
        };
    }

    componentDidMount() {
        const widget = this.props.widget;
        const raster = this.getRasterByBasemapConfig(this.getInstitutionBaseMap(widget.baseMap));
        let projAOI = this.props.projAOI;
        const projPairAOI = this.props.projPairAOI;

        const mapdiv = "widgetmap_" + widget.id;
        const map = new Map({
            layers: [raster],
            target: mapdiv,
            view: new View({
                center: [0, 0],
                projection: "EPSG:3857",
                zoom: 4,
            }),
            id: "widgetmapobject_" + widget.id,
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

        if (projAOI === "") {
            projAOI = [-108.30322265625, 21.33544921875, -105.347900390625, 23.53271484375];
        } else {
            if (typeof projAOI === "string") {
                projAOI = JSON.parse(projAOI);
            }
        }
        map.getView().fit(
            projTransform([projAOI[0], projAOI[1]], "EPSG:4326", "EPSG:3857").concat(projTransform([projAOI[2], projAOI[3]], "EPSG:4326", "EPSG:3857")),
            map.getSize()
        );

        if (!this.props.mapCenter) {
            this.props.setCenterAndZoom(map.getView().getCenter(), map.getView().getZoom());
        }

        this.setState({
            mapRef: map,
        });

        const postObject = {};
        let collectionName = "";
        let dateFrom = "";
        let dateTo = "";
        let requestedIndex = "";
        let url = "";
        let path = "";
        let dualImageObject = null;
        let bands = "";
        if (widget.properties.length === 5) {
            bands = widget.properties[4];
        }
        widget.bands = bands;

        if (widget.properties[0] === "DegradationTool") {
            postObject.imageDate = this.props.selectedDate;
            postObject.stretch = this.props.degDataType && this.props.degDataType === "landsat" ? this.state.stretch : "SAR";
            path = "getDegraditionTileUrl";
        } else if (widget.dualImageCollection) {

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
            shortWidget.ImageAsset = firstImage.imageAsset;
            shortWidget.ImageCollectionAsset = firstImage.ImageCollectionAsset;
            url = this.props.documentRoot + "/geo-dash/gateway-request";
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
            //Create the fetch object for the second call here
            dualImageObject = {};
            dualImageObject.collectionName = secondImage.collectionType;
            dualImageObject.index = this.getRequestedIndex(dualImageObject.collectionName);
            dualImageObject.collectionName = this.convertCollectionName(dualImageObject.collectionName);
            dualImageObject.dateFrom = secondImage.startDate;
            dualImageObject.dateTo = secondImage.endDate;

            const shortWidget2 = {};
            shortWidget2.filterType = secondImage.filterType;
            shortWidget2.properties = [];
            shortWidget2.properties.push(dualImageObject.collectionName);
            shortWidget2.ImageAsset = secondImage.imageAsset;
            shortWidget2.ImageCollectionAsset = secondImage.ImageCollectionAsset;
            dualImageObject.url = this.props.documentRoot + "/geo-dash/gateway-request";
            dualImageObject. path = getGatewayPath(shortWidget2, dualImageObject.collectionName);
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
            // work on image asset here there will be a variable imageAsset in the dualImageCollection in which case we should call the gateway /image with imageParams
            if (firstImage.imageAsset) {
                postObject.ImageAsset = firstImage.imageAsset;
                postObject.imageName = firstImage.imageAsset;
                postObject.visParams = firstImage.visParams;
            }
            if (secondImage.imageAsset) {
                dualImageObject.ImageAsset = secondImage.imageAsset;
                dualImageObject.imageName = secondImage.imageAsset;
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
            if (widget.properties[0] === "ImageElevation") {
                widget.ImageAsset = "USGS/SRTMGL1_003";
            }
            url = this.props.documentRoot + "/geo-dash/gateway-request";
            path = getGatewayPath(widget, collectionName);
            postObject.visParams = this.getImageParams(widget);
            postObject.featureCollection = widget.featureCollection;
            postObject.matchID = this.props.getParameterByName("plotId");
            postObject.field = widget.field;

            if (postObject.visParams.cloudLessThan) {
                postObject.bands = postObject.visParams.bands;
                postObject.min = postObject.visParams.min;
                postObject.max = postObject.visParams.max;
                postObject.cloudLessThan = parseInt(postObject.visParams.cloudLessThan);
            }
            if (widget.ImageAsset) {
                postObject.imageName = widget.ImageAsset;
                postObject.ImageAsset = widget.ImageAsset;
            } else if (widget.ImageCollectionAsset) {
                postObject.ImageCollectionAsset = widget.ImageCollectionAsset;
                postObject.imageName = widget.ImageCollectionAsset;
            }
        }

        postObject.collectionName = collectionName;
        postObject.dateFrom = dateFrom;
        postObject.dateTo = dateTo;
        postObject.geometry = JSON.parse(projPairAOI);
        postObject.index = requestedIndex;
        postObject.path = path;
        // see if we need to fetch or just add the tile server
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        if (typeof(Storage) !== "undefined"
            && (this.checkForCache(postObject, widget, false)
                || (widget.dualImageCollection && dualImageObject && this.checkForCache(dualImageObject, widget, true)))) {
            this.fetchMapInfo(postObject, url, widget, dualImageObject);
        }
        window.addEventListener("resize", () => this.handleResize());
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
            if (this.props.widget.properties[0] === "DegradationTool" && this.props.selectedDate !== "") {
                const postObject = {};
                postObject.imageDate = this.props.selectedDate;
                postObject.stretch = this.props.degDataType && this.props.degDataType === "landsat" ? this.state.stretch : "SAR";
                postObject.dataType = this.props.degDataType;
                postObject.path = "getDegraditionTileUrl";
                postObject.geometry = JSON.parse(this.props.projPairAOI);
                const map = this.state.mapRef;
                try {
                    map.getLayers().getArray().filter(layer =>
                        layer.get("id") !== undefined && layer.get("id") === "widgetmap_" + this.props.widget.id
                    ).forEach(layer => map.removeLayer(layer));
                } catch (e) {
                    console.log("removal error");
                }
                if (typeof(Storage) !== "undefined"
                    && this.checkForCache(postObject, this.props.widget, false)) {
                    this.fetchMapInfo(postObject, this.props.documentRoot + "/geo-dash/gateway-request", this.props.widget, null);
                }
            }
        }
    }

    checkForCache = (postObject, widget, isSecond) => localStorage.getItem(postObject.ImageAsset + JSON.stringify(postObject.visParams))
            ? this.createTileServerFromCache(postObject.ImageAsset + JSON.stringify(postObject.visParams), widget.id, isSecond)
        : localStorage.getItem(postObject.ImageCollectionAsset + JSON.stringify(postObject.visParams))
            ? this.createTileServerFromCache(postObject.ImageCollectionAsset + JSON.stringify(postObject.visParams), widget.id, isSecond)
        : postObject.index && localStorage.getItem(postObject.index + postObject.dateFrom + postObject.dateTo)
            ? this.createTileServerFromCache(postObject.index + postObject.dateFrom + postObject.dateTo, widget.id, isSecond)
        : postObject.path && localStorage.getItem(postObject.path + postObject.dateFrom + postObject.dateTo)
            ? this.createTileServerFromCache(postObject.path + postObject.dateFrom + postObject.dateTo, widget.id, isSecond)
        : localStorage.getItem(JSON.stringify(postObject))
            ? this.createTileServerFromCache(JSON.stringify(postObject), widget.id, isSecond)
        : true;

    fetchMapInfo = (postObject, url, widget, dualImageObject) => {
        if (postObject.path === "getDegraditionTileUrl" && url.trim() === "") {
            return;
        }
        fetch(url, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(postObject),
        })
            .then(res => {
                if (res.ok) {
                    return res.json();
                } else {
                    Promise.reject();
                }
            })
            .then(data => {
                if (data.hasOwnProperty("url")) {
                    data.lastGatewayUpdate = new Date();
                    if (postObject.ImageAsset && JSON.stringify(postObject.visParams)) {
                        localStorage.setItem(postObject.ImageAsset + JSON.stringify(postObject.visParams), JSON.stringify(data));
                    } else if (postObject.ImageCollectionAsset && JSON.stringify(postObject.visParams)) {
                        localStorage.setItem(postObject.ImageCollectionAsset + JSON.stringify(postObject.visParams), JSON.stringify(data));
                    } else if (postObject.index && postObject.dateFrom + postObject.dateTo) {
                        localStorage.setItem(postObject.index + postObject.dateFrom + postObject.dateTo, JSON.stringify(data));
                    } else if (postObject.path && postObject.dateFrom + postObject.dateTo) {
                        localStorage.setItem(postObject.path + postObject.dateFrom + postObject.dateTo, JSON.stringify(data));
                    } else {
                        localStorage.setItem(JSON.stringify(postObject), JSON.stringify(data));
                    }
                    this.addTileServer(data.url, data.token, "widgetmap_" + widget.id);
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
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(postObject),
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.hasOwnProperty("url")) {
                                    data.lastGatewayUpdate = new Date();
                                    if (postObject.ImageAsset && JSON.stringify(postObject.visParams)) {
                                        localStorage.setItem(postObject.ImageAsset + JSON.stringify(postObject.visParams), JSON.stringify(data));
                                    } else if (postObject.ImageCollectionAsset && JSON.stringify(postObject.visParams)) {
                                        localStorage.setItem(postObject.ImageCollectionAsset + JSON.stringify(postObject.visParams), JSON.stringify(data));
                                    } else if (postObject.index && postObject.dateFrom + postObject.dateTo) {
                                        localStorage.setItem(postObject.index + postObject.dateFrom + postObject.dateTo, JSON.stringify(data));
                                    } else {
                                        localStorage.setItem(JSON.stringify(postObject), JSON.stringify(data));
                                    }
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
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify(workingObject),
                            })
                                .then(res => res.json())
                                .then(data => {
                                    if (data.hasOwnProperty("url")) {
                                        data.lastGatewayUpdate = new Date();
                                        if (dualImageObject.ImageAsset && JSON.stringify(dualImageObject.visParams)) {
                                            localStorage.setItem(dualImageObject.ImageAsset + JSON.stringify(dualImageObject.visParams), JSON.stringify(data));
                                        } else if (dualImageObject.ImageCollectionAsset && JSON.stringify(dualImageObject.visParams)) {
                                            localStorage.setItem(dualImageObject.ImageCollectionAsset + JSON.stringify(dualImageObject.visParams), JSON.stringify(data));
                                        } else if (dualImageObject.index && dualImageObject.dateFrom + dualImageObject.dateTo) {
                                            localStorage.setItem(dualImageObject.index + dualImageObject.dateFrom + dualImageObject.dateTo, JSON.stringify(data));
                                        } else {
                                            localStorage.setItem(JSON.stringify(dualImageObject), JSON.stringify(data));
                                        }
                                        this.addDualLayer(data.url, data.token, "widgetmap_" + widget.id);
                                    } else {
                                        console.warn("Wrong Data Returned");
                                    }
                                });
                        }
                    }
                }
            })
            .catch(error => {
                console.log(error);
            });
    };

    getRasterByBasemapConfig = basemap =>
        new TileLayer({
            source: (!basemap || basemap.id === "osm")
                ? new OSM()
                : mercator.createSource(basemap.sourceConfig, basemap.id, this.props.documentRoot),
        });

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
        } else if (widget.type === "polygonCompare") {
            return {};
        } else {
            return {
                min: (widget.min && widget.min > 0) ? widget.min : null,
                max: (widget.max && widget.max > 0) ? widget.max : null,
                bands: widget.bands,
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

    getRequestedIndex = collectionName =>
        ["ImageCollectionNDVI",
         "ImageCollectionEVI",
         "ImageCollectionEVI2",
         "ImageCollectionNDMI",
         "ImageCollectionNDWI"].includes(collectionName)
            ? collectionName.replace("ImageCollection", "")
            : "";

    convertCollectionName = collectionName =>
        ["ImageCollectionNDVI",
         "ImageCollectionEVI",
         "ImageCollectionEVI2",
         "ImageCollectionNDMI",
         "ImageCollectionNDWI"].includes(collectionName)
            ? ""
            : collectionName;

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

    getInstitutionBaseMap = basemap => !basemap
        ? this.props.imageryList[0]
        : this.props.imageryList.find(imagery => imagery.id === basemap.id);

    createTileServerFromCache = (storageItem, widgetId, isSecond) => {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        const mapinfo = JSON.parse(localStorage.getItem(storageItem));
        if (new Date(mapinfo.lastGatewayUpdate) > currentDate) {
            if (isSecond) {
                this.addSecondMapLayer(mapinfo.url, mapinfo.token, "widgetmap_" + widgetId);
            } else {
                this.addTileServer(mapinfo.url, mapinfo.token, "widgetmap_" + widgetId);
            }
            return false;
        }
        return true;
    };

    getSliderControl = () => {
        const widget = this.props.widget;
        const onSliderChange = this.props.onSliderChange;
        const onSwipeChange = this.props.onSwipeChange;

        if (widget.dualLayer || widget.dualImageCollection) {
            const oStyle = { display: widget.sliderType === "opacity" ? "block" : "none" };
            const sStyle = { display: widget.sliderType === "swipe" ? "block" : "none" };
            return <div>
                <input type="button" value={this.props.widget.sliderType === "opacity" ? "swipe" : "opacity"} style={{ width: "80px", float: "left", margin: "8px 0 0 5px" }} onClick={() => onSliderChange(widget)}/>
                <input
                    type = "range"
                    className = "mapRange dual"
                    id = {"rangeWidget_" + widget.id}
                    value = {this.state.opacity}
                    min = "0"
                    max = "1"
                    step = ".01"
                    onChange = {evt => this.onOpacityChange(evt)}
                    onInput = {evt => this.onOpacityChange(evt)}
                    style={oStyle}
                />
                <input
                    type="range"
                    className="mapRange dual"
                    id={"swipeWidget_" + widget.id}
                    min="0"
                    max="1"
                    step=".01"
                    value={this.props.widget.swipeValue}
                    onChange = {evt => onSwipeChange(widget, widget.id, evt )}
                    onInput = {evt => onSwipeChange(widget, widget.id, evt )}
                    style={sStyle}
                />
            </div>;
        } else {
            return (
                <input
                    type = "range"
                    className = "mapRange"
                    id = {"rangeWidget_" + widget.id}
                    value = {this.state.opacity}
                    min = "0"
                    max = "1"
                    step = ".01"
                    onChange = {evt => this.onOpacityChange(evt)}
                    onInput = {evt => this.onOpacityChange(evt)}
                />);
        }
    };

    onOpacityChange = evt => {
        try {
            this.setState({ opacity: evt.target.value });
            this.state.mapRef.getLayers().forEach(lyr => {
                if ("widgetmap_" + this.props.widget.id === lyr.get("id") || "widgetmap_" + this.props.widget.id + "_dual" === lyr.get("id")) {
                    lyr.setOpacity(evt.target.value);
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
                this.setState({ geeTimeOut: null });
            }
            this.setState({
                geeTimeOut: window.setTimeout(() => {
                    const layers = e.target.getLayers().getArray();
                    layers.forEach(lyr => {
                        if (lyr.get("id") && lyr.get("id").indexOf("widget") === 0) {
                            lyr.setVisible(true);
                        }
                    });
                }, Math.floor(Math.random() * (1250 - 950 + 1) + 950)),
            });
        } catch (e) {
            console.log(e.message);
        }
    };

    addTileServer = (url, token, mapdiv, isDual) => {
        window.setTimeout(() => {
            const source = new XYZ({
                url: url,
            });
            source.on("tileloaderror", function(error) {
                try {
                    window.setTimeout(function() {
                        console.log("trying to reload the tile: " );
                        console.log(error.tile);
                        error.tile.load();
                    }, Math.floor(Math.random() * (1250 - 950 + 1) + 950));
                } catch (e) {
                    console.log(e.message);
                }
            });
            this.state.mapRef.addLayer(new TileLayer({
                source: source,
                id: mapdiv,
            }));
            if (!isDual) {
                this.addBuffer(this.state.mapRef);
            }
        }, Math.floor(Math.random() * (300 - 200 + 1) + 200));
    };

    addDualLayer = (url, token, mapdiv) => {
        const googleLayer = new TileLayer({
            source: new XYZ({
                url: url,
            }),
            id: mapdiv + "_dual",
        });
        this.state.mapRef.addLayer(googleLayer);
        const swipe = document.getElementById("swipeWidget_" + mapdiv.replace("widgetmap_", ""));
        googleLayer.on("precompose", event => {
            const ctx = event.context;
            const width = ctx.canvas.width * (swipe.value);
            ctx.save();
            ctx.beginPath();
            ctx.rect(width, 0, ctx.canvas.width - width, ctx.canvas.height);
            ctx.clip();
        });

        googleLayer.on("postcompose", event => {
            const ctx = event.context;
            ctx.restore();
        });
        swipe.addEventListener("input", () => {
            this.state.mapRef.render();
        }, false);
        this.addBuffer(this.state.mapRef);
    };

    addBuffer = whichMap => {
        try {
            const bradius = this.props.getParameterByName("bradius");
            const bcenter = this.props.getParameterByName("bcenter");
            const plotshape = this.props.getParameterByName("plotShape");
            const projectID = this.props.getParameterByName("projectId");
            const plotID = this.props.getParameterByName("plotId");
            if (plotshape && plotshape === "square") {
                const centerPoint = new Point(projTransform(JSON.parse(bcenter).coordinates, "EPSG:4326", "EPSG:3857"));
                const pointFeature = new Feature(centerPoint);
                const poitnExtent = pointFeature.getGeometry().getExtent();
                const bufferedExtent = new ExtentBuffer(poitnExtent, parseInt(bradius));
                const bufferPolygon = new Polygon(
                    [
                        [[bufferedExtent[0], bufferedExtent[1]],
                         [bufferedExtent[0], bufferedExtent[3]],
                         [bufferedExtent[2], bufferedExtent[3]],
                         [bufferedExtent[2], bufferedExtent[1]],
                         [bufferedExtent[0], bufferedExtent[1]]],
                    ]
                );
                const bufferedFeature = new Feature(bufferPolygon);
                const vectorSource = new Vector({});
                vectorSource.addFeatures([bufferedFeature]);
                const layer = new VectorLayer({
                    source: vectorSource,
                    style: [
                        new Style({
                            stroke: new Stroke({
                                color: "#8b2323",
                                width: 2,
                            }),
                            fill: null,
                        }),
                    ],
                });
                whichMap.addLayer(layer);
            } else if (plotshape && plotshape === "circle") {
                const circle = new Circle(projTransform(JSON.parse(bcenter).coordinates, "EPSG:4326", "EPSG:3857"), bradius * 1);
                const CircleFeature = new Feature(circle);
                const vectorSource = new Vector({});
                vectorSource.addFeatures([CircleFeature]);
                const layer = new VectorLayer({
                    source: vectorSource,
                    style: [
                        new Style({
                            stroke: new Stroke({
                                color: "#8b2323",
                                width: 2,
                            }),
                            fill: null,
                        }),
                    ],
                });
                whichMap.addLayer(layer);
            } else {
                fetch(this.props.documentRoot + "/get-proj-plot?projectId=" + projectID + "&plotId=" + plotID)
                    .then(res => res.json())
                    .then(data => {
                        const geoJsonObject = typeof(data) === "string" ? JSON.parse(data) : data;
                        const vectorSource = mercator.geometryToVectorSource(mercator.parseGeoJson(geoJsonObject.geom, true));
                        const mapConfig = {};
                        mapConfig.map = whichMap;
                        const style = [
                            new Style({
                                stroke: new Stroke({
                                    color: "yellow",
                                    width: 3,
                                }),
                                fill: null,
                            }),
                        ];
                        mercator.addVectorLayer(mapConfig, "geeLayer", vectorSource, style);

                        if (geoJsonObject.samples) {
                            geoJsonObject.samples.forEach(element => {
                                if (element.geom) {
                                    const vectorSource = mercator.geometryToVectorSource(mercator.parseGeoJson(element.geom, true));
                                    mercator.addVectorLayer(mapConfig, "geeLayer", vectorSource, style);
                                }
                            });
                        }
                    });
            }
        } catch (e) {
            console.warn("buffer failed: " + e.message);
        }
    };

    setStretch = evt => this.setState({ stretch: parseInt(evt.target.value) });

    toggleDegDataType = evt => this.props.handleDegDataType(evt.target.checked ? "sar" : "landsat");

    getStretchToggle = () => this.props.degDataType === "landsat"
        ?
            <div className="col-6">
                <span className="ctrlText font-weight-bold">Bands: </span>
                <select
                    className={"form-control"}
                    style={{
                        maxWidth: "65%",
                        display: "inline-block",
                        fontSize: ".8rem",
                        height: "30px",
                    }}
                    onChange={evt => this.setStretch(evt)}
                >
                    <option value={321}>R,G,B</option>
                    <option value={543}>SWIR,NIR,R</option>
                    <option value={453}>NIR,SWIR,R</option>
                </select>
            </div>
        : this.props.isDegradation
            ?
                <div className="col-6">
                    <span className="ctrlText font-weight-bold">Band Combination: </span>
                    <span className="ctrlText">VV, VH, VV/VH </span>
                </div>
        : "";

    getDegDataTypeToggle = () => this.props.isDegradation
        ?
            <div className="col-6">
                <span className="ctrlText font-weight-bold">Data: </span>
                <span className="ctrlText">LANDSAT </span>
                <label className="switch">
                    <input type="checkbox" onChange={evt => this.toggleDegDataType(evt)}/>
                    <span className="switchslider round"/>
                </label>
                <span className="ctrlText"> SAR</span>
            </div>
        : "";

    render() {
        return <React.Fragment>
            <div id={"widgetmap_" + this.props.widget.id} className="minmapwidget" style={{ width:"100%", minHeight:"200px" }}/>
            {this.getSliderControl()}
            <div className="row">
                {this.getStretchToggle()}
                {this.getDegDataTypeToggle()}
            </div>
        </React.Fragment>;
    }
}

class GraphWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            graphRef: null,
            selectSarGraphBand: "VV",
            graphLoading: true,
            chartData: {
                landsat:{ data:[] },
                sar:{ data:[] },
            },
        };
    }

    componentDidMount() {
        this.loadGraph(this.props.widget);
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.degDataType
            && (prevProps.degDataType !== this.props.degDataType
                || prevState.selectSarGraphBand !== this.state.selectSarGraphBand)) {
            if (this.state.graphLoading !== true) {
                this.setState({
                    graphLoading: this.state.chartData[this.props.degDataType]
                        && this.state.chartData[this.props.degDataType].data.length === 0,
                }, this.loadGraph(this.props.widget));
            }
        }
        this.handleResize();
    }

    loadGraph = (widget) =>{
        const centerPoint = JSON.parse(this.props.getParameterByName("bcenter")).coordinates;
        const widgetType = widget.type || "";
        const collectionName = widget.properties[1];
        const indexName = widget.properties[4];
        const path = widgetType === "DegradationTool" ? "getImagePlotDegradition"
            : collectionName.trim() === "timeSeriesAssetForPoint" ? "timeSeriesAssetForPoint"
            : collectionName.trim().length > 0 ? "timeSeriesIndex"
            : "timeSeriesIndex2";
        if (this.state.chartData[this.props.degDataType] && this.state.chartData[this.props.degDataType].data.length > 0) {
            this.setState({
                graphRef: this.createChart(
                    widget.id,
                    widget.graphBand || indexName,
                    this.state.chartData[this.props.degDataType].data
                ),
                graphLoading: false,
            });
        } else {
            // check if this.props.degDataType is landsat, sar, or ""
            // if "" fetch is needed else check the new state variable chartData.landsat.data
            fetch(this.props.documentRoot + "/geo-dash/gateway-request", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    collectionNameTimeSeries: collectionName,
                    geometry: JSON.parse(this.props.projPairAOI),
                    indexName: widget.graphBand || indexName,
                    dateFromTimeSeries: widget.properties[2].trim().length === 10 ? widget.properties[2].trim() : "2000-01-01",
                    dateToTimeSeries: widget.properties[3].trim().length === 10 ? widget.properties[3].trim() : formatDateISO(new Date()),
                    reducer: widget.graphReducer != null ? widget.graphReducer.toLowerCase() : "",
                    scale: 30,
                    path: path,
                    point: centerPoint,
                    start: widget.startDate || "",
                    end: widget.endDate || "",
                    band: widget.graphBand || "",
                    dataType: this.props.degDataType || "",
                }),
            })
                .then(res => res.json())
                .then(res => {
                    if (res.errMsg) {
                        console.warn(res.errMsg);
                    } else {
                        if (res.hasOwnProperty("timeseries")) {
                            let chartStorage = {};
                            const pData = [];
                            if (res.timeseries.length === 0) {
                                console.log("no data");
                            } else if (Object.keys(res.timeseries[0][1]).length === 0) {
                                pData.push({
                                    type: "area",
                                    name: widget.graphBand || indexName,
                                    data: res.timeseries.filter(v => v[0]).map(v => [v[0], v[1]]).sort((a, b) => a[0] - b[0]),
                                    color: "#31bab0",
                                });
                            } else {
                                // this is where degData ends up
                                const theKeys = Object.keys(res.timeseries[0][1]);
                                const compiledData = [];
                                res.timeseries.forEach(d => {
                                    for (let i = 0; i < theKeys.length; i++) {
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
                                    if (widgetType !== "DegradationTool"
                                        || this.props.degDataType !== "sar"
                                        || (this.props.degDataType === "sar" && theKeys[index] === this.state.selectSarGraphBand)) {
                                        pData.push({
                                            type: widgetType === "DegradationTool" ? "scatter" : "area",
                                            name: theKeys[index],
                                            data: this.sortMultiData(cdata),
                                            valueDecimals: 20,
                                            connectNulls: widgetType !== "DegradationTool",
                                            color: "#31bab0",
                                            allowPointSelect: true,
                                            point: {
                                                events: {
                                                    select: e => {
                                                        this.props.handleSelectDate(formatDateISO(new Date(e.target.x)));
                                                    },
                                                },
                                            },
                                            tooltip: {
                                                pointFormat: "<span style=\"color:{series.color}\">{point.x:%Y-%m-%d}</span>: <b>{point.y:.6f}</b><br/>",
                                                valueDecimals: 20,
                                                split: false,
                                                xDateFormat: "%Y-%m-%d",
                                            },
                                        });
                                    }
                                });

                                chartStorage = this.state.chartData;
                                chartStorage[this.props.degDataType].data = pData;
                            }
                            this.setState({
                                graphLoading: false,
                                graphRef: this.createChart(widget.id, indexName, pData),
                                chartData: chartStorage,
                            });
                        } else {
                            console.warn("Wrong Data Returned");
                        }
                    }
                })
                .catch(error => console.log(error));
            window.addEventListener("resize", () => this.handleResize());
        }
    };

    multiComparator = (a, b) =>
        (a[0] < b[0]) ? -1 :
            (a[0] > b[0]) ? 1 :
                0;

    sortMultiData = data => data.sort(this.multiComparator);

    convertData = data => data.map(d => [d[0], d[1][Object.keys(d[1])[0]]]);

    handleResize = () => {
        try {
            if (this.state.graphRef && this.state.graphRef.bounds) {
                const gwidget = document.getElementById("widgetgraph_" + this.props.widget.id);
                this.state.graphRef.setSize(gwidget.clientWidth, gwidget.clientHeight, true);
            }
        } catch (e) {
            console.log(e.message);
        }
    };

    createChart = (wIndex, wText, series) => {
        "use strict";
        return Highcharts.chart("graphcontainer_" + wIndex, {
            chart: {
                zoomType: "x",
            },
            title: {
                text: "",
            },
            subtitle: {
                text: document.ontouchstart === undefined
                    ? "Click and drag in the plot area to zoom in"
                    : "Pinch the chart to zoom in",
            },
            xAxis: {
                type: "datetime",
            },
            yAxis: {
                title: {
                    text: wText,
                },
            },
            legend: {
                enabled: true,
            },
            plotOptions: {
                area: {
                    connectNulls: wText.toLowerCase() === "custom",
                    fillColor: {
                        linearGradient: {
                            x1: 0,
                            y1: 0,
                            x2: 0,
                            y2: 1,
                        },
                        stops: [
                            [0, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get("rgba")],
                            [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get("rgba")],
                        ],
                    },
                    marker: {
                        radius: 2,
                    },
                    lineWidth: 1,
                    states: {
                        hover: {
                            lineWidth: 1,
                        },
                    },
                    threshold: null,
                },
                scatter: {
                    marker: {
                        radius: 2,
                    },
                },
            },
            tooltip: {
                pointFormat: "<span style=\"color:{series.color}\">{series.name}</span>: <b>{point.y:.6f}</b><br/>",
                valueDecimals: 20,
                split: false,
                xDateFormat: "%Y-%m-%d",
            },
            series: series,
        }, () => {
            document.getElementById("widgettitle_" + wIndex).innerHTML = wText;
        });
    };

    selectSarGraphBand = evt => {
        this.setState({
            selectSarGraphBand: evt.target.value,
            graphLoading: this.state.chartData[this.props.degDataType] && this.state.chartData[this.props.degDataType].data.length === 0,
        }, this.loadGraph(this.props.widget));
    };

    getLoading = () => this.state.graphLoading
        ? <img
            src={"img/ceo-loading.gif"}
            alt={"Loading"}
            style={{ position: "absolute", bottom: "50%", left: "50%" }}
        />
        : "";
    getSarBandOption = () => this.props.widget.type === "DegradationTool" && this.props.degDataType === "sar"
        ? <select
            className={"form-control"}
            style={{
                maxWidth: "85%",
                display: "inline-block",
                fontSize: ".9rem",
                height: "30px",
            }}
            onChange={evt => this.selectSarGraphBand(evt)}
        >
            <option>VV</option>
            <option>VH</option>
            <option>VV/VH</option>
        </select>
        : "";

    render() {
        const widget = this.props.widget;
        return <div id={"widgetgraph_" + widget.id} className="minmapwidget">
            <div id={"graphcontainer_" + widget.id} className="minmapwidget graphwidget normal">
            </div>
            {this.getLoading()}
            <h3 id={"widgettitle_" + widget.id} />
            {this.getSarBandOption()}
        </div>;
    }
}
class StatsWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = { totalPop:"", area:"", elevation:"" };
    }

    componentDidMount() {
        const projPairAOI = this.props.projPairAOI;
        fetch(this.props.documentRoot + "/geo-dash/gateway-request", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                paramValue: JSON.parse(projPairAOI),
                path: "getStats",
            }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.errMsg) {
                    console.warn(data.errMsg);
                } else {
                    let area = "N/A";
                    try {
                        area = this.calculateArea(JSON.parse(projPairAOI));
                    } catch (e) {
                        area = "N/A";
                    }
                    this.setState({
                        totalPop: this.numberWithCommas(data.pop),
                        area: area + " ha",
                        elevation: this.numberWithCommas(data.minElev) + " - " + this.numberWithCommas(data.maxElev) + " m",
                    });
                }
            })
            .catch(error => console.log(error));
    }

    numberWithCommas = x => {
        if (typeof x === "number") {
            try {
                const [quot, rem] = x.toString().split(".");
                return [quot.replace(/\B(?=(\d{3})+(?!\d))/g, ","), rem].join(".");
            } catch (e) {
                console.warn(e.message);
                return "N/A";
            }
        } else {
            return "N/A";
        }
    };

    calculateArea = poly => {
        try {
            return this.numberWithCommas(Math.round(Math.abs(sphereGetArea(poly))) / 10000);
        } catch (e) {
            return "N/A";
        }
    };

    render() {
        const widget = this.props.widget;
        const stats = this.state.totalPop;
        const area = this.state.area;
        const elevation = this.state.elevation;
        return <div id={"widgetstats_" + widget.id} className="minmapwidget" style={{ padding: "20px" }}>
            <div>
                <div className="form-group">
                    <div className="input-group">
                        <div className="input-group-addon">
                            <img
                                src={"img/icon-population.png"}
                                style={{
                                    width: "50px",
                                    height: "50px",
                                    borderRadius: "25px",
                                    backgroundColor: "#31bab0",
                                }}
                                alt="Population"
                            />
                        </div>
                        <label htmlFor={"totalPop_" + widget.id} style={{ color: "#787878", padding: "10px 20px" }}>Total population</label>
                        <h3
                            id={"totalPop_" + widget.id}
                            style={{
                                color: "#606060",
                                fontSize: "16px",
                                fontWeight: "bold",
                                paddingTop: "12px",
                            }}
                        >{stats}</h3>
                    </div>
                </div>
                <div className="form-group">
                    <div className="input-group">
                        <div className="input-group-addon">
                            <img
                                src={"img/icon-area.png"}
                                style={{
                                    width: "50px",
                                    height: "50px",
                                    borderRadius: "25px",
                                    backgroundColor: "#31bab0",
                                }}
                                alt="Area"
                            />
                        </div>
                        <label htmlFor={"totalArea_" + widget.id} style={{ color: "#787878", padding: "10px 20px" }}>Area</label>
                        <h3
                            id={"totalArea_" + widget.id}
                            style={{
                                color: "#606060",
                                fontSize: "16px",
                                fontWeight: "bold",
                                paddingTop: "12px",
                            }}
                        >{area}</h3>
                    </div>
                </div>
                <div className="form-group">
                    <div className="input-group">
                        <div className="input-group-addon">
                            <img
                                src={"img/icon-elevation.png"}
                                style={{
                                    width: "50px",
                                    height: "50px",
                                    borderRadius: "25px",
                                    backgroundColor: "#31bab0",
                                }}
                                alt="Elevation"
                            />
                        </div>
                        <label htmlFor={"elevationRange_" + widget.id} style={{ color: "#787878", padding: "10px 20px" }}>Elevation</label>
                        <h3 id={"elevationRange_" + widget.id} style={{ color: "#606060", fontSize: "16px", fontWeight: "bold", paddingTop: "12px" }}>{elevation}</h3>
                    </div>
                </div>
            </div>
        </div>;
    }
}

export function renderGeodashPage(args) {
    ReactDOM.render(
        <GeoDashNavigationBar
            userName={args.userName}
            page={() => <Geodash documentRoot=""/>}
        />,
        document.getElementById("geo-dash")
    );
}
