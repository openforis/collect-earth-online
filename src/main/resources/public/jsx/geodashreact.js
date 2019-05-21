import React from "react";
import ReactDOM from "react-dom";
import { mercator } from "../js/mercator-openlayers.js";

class Geodash extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            widgets: [ ],
            callbackComplete: false,
            left: 0,
            ptop: 0,
            projAOI: this.getParameterByName("aoi"),
            projPairAOI: "",
            pid: this.getParameterByName("pid"),
            mapCenter:null,
            mapZoom:null,
        };
        const theSplit = decodeURI(this.state.projAOI).replace("[", "").replace("]", "").split(",");
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

    getParameterByName = (name, url) => {
        const regex = new RegExp("[?&]" + name.replace(/[\[\]]/g, "\\$&") + "(=([^&#]*)|&|#|$)");
        const results = regex.exec(decodeURIComponent(url || window.location.href));
        return results
            ? results[2]
                ? decodeURIComponent(results[2].replace(/\+/g, " "))
                : ""
            : null;
    };

    componentDidMount() {
        fetch(this.props.documentRoot + "/geo-dash/id/" + this.state.pid)
            .then(response => response.json())
            .then(data => data.widgets.map(widget =>{
                widget.isFull = false;
                widget.opacity = "0.9";
                widget.sliderType = "opacity";
                widget.swipeValue = "1.0";
                return widget;
            }))
            .then(data => this.setState({ widgets: data, callbackComplete: true }));
    }

    handleFullScreen = widget => {
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
        this.setState({
            mapCenter:center,
            mapZoom:zoom
        });
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
            />
        );
    }
}

class Widgets extends React.Component {
    render() {
        if (this.props.widgets.length > 0) {
            return ( <div className="row placeholders">
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
                    />
                ))}
            </div> );
        } else {
            if (this.props.callbackComplete === true) {
                return (<div className="row placeholders">
                    <div className="placeholder columnSpan3 rowSpan2" style={{ gridArea: "1 / 1 / span 2 / span 12" }}>
                        <h1 id="noWidgetMessage">The
                            Administrator has not configured any Geo-Dash Widgets for this project</h1>
                    </div>
                </div>);
            } else {
                return (<div className="row placeholders">
                    <div className="placeholder columnSpan3 rowSpan2" style={{ gridArea: "1 / 1 / span 2 / span 12" }}>
                        <h1 id="noWidgetMessage">The
                            Retrieving Geo-Dash configuration for this project</h1>
                    </div>
                </div>);
            }
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
                                 "ndmiTimeSeries"];
    }

    generategridcolumn = (x, w) => (x + 1) + " / span " + w;

    generategridrow = (y, h) => (y + 1) + " / span " + h;

    getColumnClass = c => c.includes("span 12") ? " fullcolumnspan" : c.includes("span 9") ? " columnSpan9" : c.includes("span 6") ? " columnSpan6" : " columnSpan3";

    getRowClass = r => r.includes("span 2") ? " rowSpan2" : r.includes("span 3") ? " rowSpan3" : " rowSpan1";

    getClassNames = (fullState, c, r) => fullState ? "placeholder fullwidget" : "placeholder" + this.getColumnClass(c) + this.getRowClass(r);

    getWidgetHtml = (widget, onSliderChange, onSwipeChange) => {
        if (widget.gridcolumn || widget.layout) {
            return (<div
                className={this.getClassNames(widget.isFull,
                                                       widget.gridcolumn != null
                                                           ? widget.gridcolumn
                                                           : "",
                                                       widget.gridrow != null
                                                           ? widget.gridrow
                                                           : widget.layout != null
                                                               ? "span " + widget.layout.h : "")}
                style={{
                    gridColumn:widget.gridcolumn != null
                             ? widget.gridcolumn
                             : this.generategridcolumn(widget.layout.x, widget.layout.w),
                    gridRow:widget.gridrow != null
                                     ? widget.gridrow
                                     : this.generategridrow(widget.layout.y, widget.layout.h),
                }}
            >
                <div className="panel panel-default" id={"widget_" + widget.id}>
                    <div className="panel-heading">
                        <ul className="list-inline panel-actions pull-right">
                            <li style={{ display: "inline" }}>{widget.name}</li>
                            <li style={{ display: "inline" }}>
                                <a
                                    className="list-inline panel-actions panel-fullscreen"
                                    onClick={() => this.props.onFullScreen(this.props.widget)}
                                    role="button"
                                    title="Toggle Fullscreen"
                                >
                                    <span className="fas fa-expand-arrows-alt" style={{ color: "#31BAB0" }}/>
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div id={"widget-container_" + widget.id} className="widget-container">
                        {this.getWidgetInnerHtml(widget, onSliderChange, onSwipeChange)}
                    </div>
                </div>
            </div>);
        } else {
            return (
                <div
                    className={widget.isFull
                    ? "fullwidget columnSpan3 rowSpan1 placeholder"
                    : "columnSpan3 rowSpan1 placeholder"}
                >
                    <div className="panel panel-default" id={"widget_" + widget.id}>
                        <div className="panel-heading">
                            <ul className="list-inline panel-actions pull-right">
                                <li style={{ display: "inline" }}>{widget.name}</li>
                                <li style={{ display: "inline" }}>
                                    <a
                                        className="list-inline panel-actions panel-fullscreen"
                                        onClick={() => this.props.onFullScreen(this.props.widget)}
                                        role="button"
                                        title="Toggle Fullscreen"
                                    >
                                        <span className="fas fa-expand-arrows-alt" style={{ color: "#31BAB0" }}/>
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div id={"widget-container_" + widget.id} className="widget-container">
                            {this.getWidgetInnerHtml(widget, onSliderChange, onSwipeChange)}
                        </div>
                    </div>
                </div>);
        }
    };

    getWidgetInnerHtml = (widget, onSliderChange, onSwipeChange) => {
        const wtext = widget.properties[0];
        if (this.imageCollectionList.includes(wtext) || (widget.dualImageCollection && widget.dualImageCollection != null) || (widget.ImageAsset && widget.ImageAsset.length > 0) || (widget.ImageCollectionAsset && widget.ImageCollectionAsset.length > 0)) {
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
                        />

            </div>;
        } else if (this.graphControlList.includes(wtext)) {
            return <div className="front"><GraphWidget widget={widget} projPairAOI={this.props.projPairAOI} documentRoot={this.props.documentRoot}/></div>;
        } else if (wtext === "getStats") {
            return <div className="front"><StatsWidget widget={widget} projPairAOI={this.props.projPairAOI} documentRoot={this.props.documentRoot}/></div>;
        } else {
            return <img src="data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==" width ="200" height ="200" className="img-responsive" />;
        }
    };

    render() {
        const { widget } = this.props;
        return ( <React.Fragment>{ this.getWidgetHtml(widget, this.props.onSliderChange, this.props.onSwipeChange) }</React.Fragment>);
    }
}

class MapWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            mapRef: null,
            opacity: 90,
            geeTimeOut: null,
            internalExtent:null,
            mapCenter:null
        };
    }

    getRasterByBasemapConfig = basemap =>
        new ol.layer.Tile({
            source: (basemap === null || basemap.id === "osm")
                ? new ol.source.OSM()
                : (basemap.id === 1 || basemap.id === 2)
                    ? mercator.createSource({
                        "type": "EarthWatch",
                        "connectId": "f371dd55-96c4-41b7-ac26-662b3fa3d7f8",
                      })
                    : mercator.createSource(basemap.sourceConfig),
        });

    getGatewayPath = (widget, collectionName) => {
        const fts = {
            "LANDSAT5": "Landsat5Filtered",
            "LANDSAT7": "Landsat7Filtered",
            "LANDSAT8": "Landsat8Filtered",
            "Sentinel2": "FilteredSentinel",
        };
        const resourcePath = (widget.filterType && widget.filterType.length > 0)
            ? fts[widget.filterType]
            : (widget.ImageAsset && widget.ImageAsset.length > 0)
                ? "image"
                : (widget.ImageCollectionAsset && widget.ImageCollectionAsset.length > 0)
                    ? "ImageCollectionAsset"
                    : (widget.properties && "ImageCollectionCustom" === widget.properties[0])
                        ? "meanImageByMosaicCollections"
                        : (collectionName.trim().length > 0)
                            ? "cloudMaskImageByMosaicCollection"
                            : "ImageCollectionbyIndex";
        return resourcePath;
    };

    getImageParams = widget => {
        let visParams;
        if (widget.visParams) {
            if (typeof widget.visParams === "string") {
                try {
                    visParams = JSON.parse(widget.visParams);
                } catch (e) {
                    visParams = widget.visParams;
                }
            } else {
                visParams = widget.visParams;
            }
        } else {
            let min;
            let max;
            try {
                if (widget.min > 0) {
                    min = widget.min;
                }

                if (widget.max > 0) {
                    max = widget.max;
                }
            } catch (e) {
                console.log(e.message);
            }
            visParams = {
                min: min,
                max: max,
                bands: widget.bands,
            };
        }
        return visParams;
    };

    pauseGeeLayer = e => {
        const layers = e.target.getLayers().getArray();
        layers.forEach(lyr => {
            if (lyr.get("id") && lyr.get("id").indexOf("widget") === 0) {
                lyr.setVisible(false);
            }
        });
    };

    getRequestedIndex = collectionName => collectionName === "ImageCollectionNDVI"
            ? "NDVI"
            : collectionName === "ImageCollectionEVI"
                ? "EVI"
                : collectionName === "ImageCollectionEVI2"
                    ? "EVI2"
                    : collectionName === "ImageCollectionNDMI"
                        ? "NDMI"
                        : collectionName === "ImageCollectionNDWI"
                            ? "NDWI"
                            : "";

    convertCollectionName = collectionName => collectionName === "ImageCollectionNDVI"
            ? ""
            : collectionName === "ImageCollectionEVI"
                ? ""
                : collectionName === "ImageCollectionEVI2"
                    ? ""
                    : collectionName === "ImageCollectionNDMI"
                        ? ""
                        : collectionName === "ImageCollectionNDWI"
                            ? ""
                            : collectionName;

    addSecondMapLayer = (mapid, token, widgetid) => {
        if (this.state.mapRef) {
            this.addDualLayer(mapid, token, widgetid);
        } else {
            setTimeout(() => {
                this.addDualLayer(mapid, token, widgetid);
            }, 1000);
        }
    };

    centerAndZoomMap = (center, zoom) => {
        this.state.mapRef.getView().setCenter(center);
        this.state.mapRef.getView().setZoom(zoom);
    };

    componentDidMount() {
        const widget = this.props.widget;
        const basemap = widget.baseMap;
        const raster = this.getRasterByBasemapConfig(basemap);
        let projAOI = this.props.projAOI;
        const projPairAOI = this.props.projPairAOI;

        const mapdiv = "widgetmap_" + widget.id;
        const map = new ol.Map({
            layers: [raster],
            target: mapdiv,
            view: new ol.View({
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
            ol.proj.transform([projAOI[0], projAOI[1]], "EPSG:4326", "EPSG:3857").concat(ol.proj.transform([projAOI[2], projAOI[3]], "EPSG:4326", "EPSG:3857")),
            map.getSize()
        );

        if (!this.props.mapCenter) {
            this.props.setCenterAndZoom(map.getView().getCenter(), map.getView().getZoom());
        }

        this.setState({
            mapRef: map
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

        /*********************Check here if widget is dualImageCollection *********************/
        if (widget.dualImageCollection && widget.dualImageCollection != null) {

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
            path = this.getGatewayPath(shortWidget, collectionName);
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
            dualImageObject. path = this.getGatewayPath(shortWidget2, dualImageObject.collectionName);
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
            path = this.getGatewayPath(widget, collectionName);
            postObject.visParams = this.getImageParams(widget);

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
        let needFetch = true;
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        if (typeof(Storage) !== "undefined") {
            if (localStorage.getItem(postObject.ImageAsset)) {
                needFetch = this.createTileServerFromCache(postObject.ImageAsset, widget.id);
            } else if (localStorage.getItem(postObject.ImageCollectionAsset)) {
                needFetch = this.createTileServerFromCache(postObject.ImageCollectionAsset, widget.id);
            } else if (postObject.index && localStorage.getItem(postObject.index + postObject.dateFrom + postObject.dateTo)) {
                needFetch = this.createTileServerFromCache(postObject.index + postObject.dateFrom + postObject.dateTo, widget.id);
            } else if (localStorage.getItem(JSON.stringify(postObject))) {
                needFetch = this.createTileServerFromCache(JSON.stringify(postObject), widget.id);
            }
            if (widget.dualImageCollection) {
                if (localStorage.getItem(dualImageObject.ImageAsset)) {
                    needFetch = this.createTileServerFromCache(dualImageObject.ImageAsset, widget.id, true);
                } else if (localStorage.getItem(dualImageObject.ImageCollectionAsset)) {
                    needFetch = this.createTileServerFromCache(dualImageObject.ImageCollectionAsset, widget.id, true);
                } else if (dualImageObject.index && localStorage.getItem(dualImageObject.index + dualImageObject.dateFrom + dualImageObject.dateTo)) {
                    needFetch = this.createTileServerFromCache(dualImageObject.index + dualImageObject.dateFrom + dualImageObject.dateTo, widget.id, true);
                } else if (localStorage.getItem(JSON.stringify(dualImageObject))) {
                    needFetch = this.createTileServerFromCache(JSON.stringify(dualImageObject), widget.id, true);
                } else {
                    needFetch = true;
                }
            }
        }
        if (needFetch) {
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
                    if (data.hasOwnProperty("mapid")) {
                        data.lastGatewayUpdate = new Date();
                        if (postObject.ImageAsset) {
                            localStorage.setItem(postObject.ImageAsset, JSON.stringify(data));
                        } else if (postObject.ImageCollectionAsset) {
                            localStorage.setItem(postObject.ImageCollectionAsset, JSON.stringify(data));
                        } else if (postObject.index && postObject.dateFrom + postObject.dateTo) {
                            localStorage.setItem(postObject.index + postObject.dateFrom + postObject.dateTo, JSON.stringify(data));
                        } else {
                            localStorage.setItem(JSON.stringify(postObject), JSON.stringify(data));
                        }
                        this.addTileServer(data.mapid, data.token, "widgetmap_" + widget.id);
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
                                    if (data.hasOwnProperty("mapid")) {
                                        data.lastGatewayUpdate = new Date();
                                        if (postObject.ImageAsset) {
                                            localStorage.setItem(postObject.ImageAsset, JSON.stringify(data));
                                        } else if (postObject.ImageCollectionAsset) {
                                            localStorage.setItem(postObject.ImageCollectionAsset, JSON.stringify(data));
                                        } else if (postObject.index && postObject.dateFrom + postObject.dateTo) {
                                            localStorage.setItem(postObject.index + postObject.dateFrom + postObject.dateTo, JSON.stringify(data));
                                        } else {
                                            localStorage.setItem(JSON.stringify(postObject), JSON.stringify(data));
                                        }
                                        this.addDualLayer(data.mapid, data.token, "widgetmap_" + widget.id);
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
                                        if (data.hasOwnProperty("mapid")) {
                                            data.lastGatewayUpdate = new Date();
                                            if (dualImageObject.ImageAsset) {
                                                localStorage.setItem(dualImageObject.ImageAsset, JSON.stringify(data));
                                            } else if (dualImageObject.ImageCollectionAsset) {
                                                localStorage.setItem(dualImageObject.ImageCollectionAsset, JSON.stringify(data));
                                            } else if (dualImageObject.index && dualImageObject.dateFrom + dualImageObject.dateTo) {
                                                localStorage.setItem(dualImageObject.index + dualImageObject.dateFrom + dualImageObject.dateTo, JSON.stringify(data));
                                            } else {
                                                localStorage.setItem(JSON.stringify(dualImageObject), JSON.stringify(data));
                                            }
                                            this.addDualLayer(data.mapid, data.token, "widgetmap_" + widget.id);
                                        } else {
                                            console.warn("Wrong Data Returned");
                                        }
                                    });
                            }
                        }
                    }
                })
                .catch((error) => {
                    console.log(error);
                });
        }
        window.addEventListener("resize", () => this.handleResize());
    }

    createTileServerFromCache = (storageItem, widgetId, isSecond) => {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        const mapinfo = JSON.parse(localStorage.getItem(storageItem));
        if (new Date(mapinfo.lastGatewayUpdate) > currentDate) {
            if (isSecond) {
                this.addSecondMapLayer(mapinfo.mapid, mapinfo.token, "widgetmap_" + widgetId);
            } else {
                this.addTileServer(mapinfo.mapid, mapinfo.token, "widgetmap_" + widgetId);
            }
            return false;
        }
        return true;
    };

    componentDidUpdate() {
        this.state.mapRef.updateSize();

        if(this.props.mapCenter) {
            this.centerAndZoomMap(this.props.mapCenter, this.props.mapZoom);
        }
    }

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
                    onChange = {evt => this.onOpacityChange( evt )}
                    onInput = {evt => this.onOpacityChange( evt )}
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
            return <input
                type = "range"
                className = "mapRange"
                id = {"rangeWidget_" + widget.id}
                value = {this.state.opacity}
                min = "0"
                max = "1"
                step = ".01"
                onChange = {evt => this.onOpacityChange( evt )}
                onInput = {evt => this.onOpacityChange( evt )}
            />;
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
                }, Math.floor(Math.random()*(1250-950+1)+950)),
            });
        } catch (e) {
            console.log(e.message);
        }
    };

    addTileServer = (imageid, token, mapdiv, isDual) => {
        window.setTimeout(() => {
            const source = new ol.source.XYZ({
                url: "https://earthengine.googleapis.com/map/" + imageid + "/{z}/{x}/{y}?token=" + token,
            });
            source.on("tileloaderror", function(error) {
                try {
                    window.setTimeout(function() {
                        console.log("trying to reload the tile: " );
                        console.log(error.tile);
                        error.tile.load();
                    }, Math.floor(Math.random()*(1250-950+1)+950));
                } catch (e) {
                    console.log(e.message);
                }
            });
            this.state.mapRef.addLayer(new ol.layer.Tile({
                source: source,
                id: mapdiv,
            }));
            if (!isDual) {
                this.addBuffer(this.state.mapRef);
            }
        }, Math.floor(Math.random()*(300-200+1)+200));
    };

    addDualLayer = (imageid, token, mapdiv) => {
        const googleLayer = new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: "https://earthengine.googleapis.com/map/" + imageid + "/{z}/{x}/{y}?token=" + token,
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
            const plotshape = this.props.getParameterByName("plotshape");
            const projectID = this.props.getParameterByName("pid");
            const plotID = this.props.getParameterByName("plotid");
            if (plotshape && plotshape === "square") {
                const centerPoint = new ol.geom.Point(ol.proj.transform(JSON.parse(bcenter).coordinates, "EPSG:4326", "EPSG:3857"));
                const pointFeature = new ol.Feature(centerPoint);
                const poitnExtent = pointFeature.getGeometry().getExtent();
                const bufferedExtent = new ol.extent.buffer(poitnExtent, parseInt(bradius));
                const bufferPolygon = new ol.geom.Polygon(
                    [
                        [[bufferedExtent[0], bufferedExtent[1]],
                         [bufferedExtent[0], bufferedExtent[3]],
                         [bufferedExtent[2], bufferedExtent[3]],
                         [bufferedExtent[2], bufferedExtent[1]],
                         [bufferedExtent[0], bufferedExtent[1]]],
                    ]
                );
                const bufferedFeature = new ol.Feature(bufferPolygon);
                const vectorSource = new ol.source.Vector({});
                vectorSource.addFeatures([bufferedFeature]);
                const layer = new ol.layer.Vector({
                    source: vectorSource,
                    style: [
                        new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: "#8b2323",
                                width: 2,
                            }),
                            fill: null,
                        }),
                    ],
                });
                whichMap.addLayer(layer);
            } else if (plotshape && plotshape === "circle") {
                const circle = new ol.geom.Circle(ol.proj.transform(JSON.parse(bcenter).coordinates, "EPSG:4326", "EPSG:3857"), bradius * 1);
                const CircleFeature = new ol.Feature(circle);
                const vectorSource = new ol.source.Vector({});
                vectorSource.addFeatures([CircleFeature]);
                const layer = new ol.layer.Vector({
                    source: vectorSource,
                    style: [
                        new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: "#8b2323",
                                width: 2,
                            }),
                            fill: null,
                        }),
                    ],
                });
                whichMap.addLayer(layer);
            } else {
                fetch(this.props.documentRoot + "/get-proj-plot/" + projectID + "/" + plotID)
                    .then(res => res.json())
                    .then(data => {
                        const _geojson_object = typeof(data) === "string" ? JSON.parse(data) : data;
                        const vectorSource = mercator.geometryToVectorSource(mercator.parseGeoJson(_geojson_object.geom, true));
                        const mapConfig = {};
                        mapConfig.map = whichMap;
                        const style = [
                            new ol.style.Style({
                                stroke: new ol.style.Stroke({
                                    color: "yellow",
                                    width: 3,
                                }),
                                fill: null,
                            }),
                        ];
                        mercator.addVectorLayer(mapConfig, "geeLayer", vectorSource, style);

                        if (_geojson_object.samples) {
                            _geojson_object.samples.forEach(element => {
                                const vectorSource = mercator.geometryToVectorSource(mercator.parseGeoJson(element.geom, true));
                                mercator.addVectorLayer(mapConfig, "geeLayer", vectorSource, style);
                            });
                        }
                    });
            }
        } catch (e) {
            console.warn("buffer failed: " + e.message);
        }
    };

    render() {
        return <React.Fragment>
            <div id={"widgetmap_" + this.props.widget.id} className="minmapwidget" style={{ width:"100%", minHeight:"200px" }}>
            </div>
            {this.getSliderControl()}
        </React.Fragment>;
    }
}

class GraphWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            graphRef: null,
            isFull:this.props.widget.isFull,
        };
        Date.prototype.yyyymmdd = function() {
            const mm = this.getMonth() + 1; // getMonth() is zero-based
            const dd = this.getDate();

            return [this.getFullYear(),
                    (mm > 9 ? "" : "0") + mm,
                    (dd > 9 ? "" : "0") + dd,
            ].join("-");
        };
    }

    sortData = (a, b) => {
        if (a[0] < b[0]) return -1;
        if (a[0] > b[0]) return 1;
        return 0;
    };

    componentDidMount() {
        const widget = this.props.widget;
        const collectionName = widget.properties[1];
        const indexName = widget.properties[4];
        const date = new Date();
        fetch(this.props.documentRoot + "/geo-dash/gateway-request", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                collectionNameTimeSeries: collectionName,
                geometry: JSON.parse(this.props.projPairAOI),
                indexName: widget.graphBand != null ? widget.graphBand : indexName,
                dateFromTimeSeries: widget.properties[2].trim().length === 10 ? widget.properties[2].trim() : "2000-01-01",
                dateToTimeSeries: widget.properties[3].trim().length === 10 ? widget.properties[3].trim() : date.yyyymmdd(),
                reducer: widget.graphReducer != null ? widget.graphReducer.toLowerCase() : "",
                scale: 200,
                path: collectionName.trim().length > 0 ? "timeSeriesIndex" : "timeSeriesIndex2",
            }),
        })
            .then(res => res.json())
            .then(res => {
                if (res.errMsg) {
                    console.warn(res.errMsg);
                } else {
                    if (res.hasOwnProperty("timeseries")) {

                        let timeseriesData = [];
                        res.timeseries.forEach( value => {
                            if (value[0] !== null) {
                                timeseriesData.push([value[0], value[1]]);
                            }
                        });
                        timeseriesData = timeseriesData.sort(this.sortData);
                        this.setState({ graphRef: this.createChart(widget.id, indexName, timeseriesData, indexName) });
                    } else {
                        console.warn("Wrong Data Returned");
                    }
                }
            });
        window.addEventListener("resize", () => this.handleResize());
    }

    componentDidUpdate() {
        this.handleResize();
    }

    handleResize = () => {
        try {
            if (this.state.graphRef) {
                const gwidget = document.getElementById("widgetgraph_" + this.props.widget.id);
                this.state.graphRef.setSize(gwidget.clientWidth, gwidget.clientHeight, true);
            }
        } catch (e) {
            console.log(e.message);
        }
    };

    createChart = (wIndex, wText, wTimeseriesData, indexName) => {
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
                enabled: false,
            },
            plotOptions: {
                area: {
                    connectNulls: indexName.toLowerCase() === "custom",
                    fillColor: {
                        linearGradient: {
                            x1: 0,
                            y1: 0,
                            x2: 0,
                            y2: 1,
                        },
                        stops: [
                            [0, "#31bab0"],
                            [1, Highcharts.Color("#31bab0").setOpacity(0).get("rgba")],
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
            },
            tooltip: {
                pointFormat: "Value: {point.y}",
            },
            series: [{
                type: "area",
                name: wText,
                data: wTimeseriesData,
                color: "#31bab0",
            }],
        }, () => {
            document.getElementById("widgettitle_" + wIndex).innerHTML = wText;
            document.getElementsByClassName("highcharts-yaxis")[0].firstChild.innerHTML = wText;
        });
    };

    render() {
        const widget = this.props.widget;

        return <div id={"widgetgraph_" + widget.id} className="minmapwidget">
            <div id={"graphcontainer_" + widget.id} className="minmapwidget graphwidget normal">
            </div>
            <h3 id={"widgettitle_" + widget.id} />
        </div>;
    }
}
class StatsWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = { totalPop:"", area:"", elevation:"" };
    }

    numberWithCommas = x => {
        if (typeof x === "number") {
            try {
                const parts = x.toString().split(".");
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                return parts.join(".");
            } catch (e) {
                console.warn(e.message);
            }
        }
        return "N/A";
    };

    calculateArea = poly => {
        const sphere = new ol.Sphere(6378137);
        const area_m = sphere.geodesicArea(poly);
        let area_ha = area_m / 10000;
        if (area_ha < 0) {
            area_ha = area_ha * -1;
        }
        area_ha = Math.round(area_ha * Math.pow(10, 4)) / Math.pow(10, 4);
        return this.numberWithCommas(area_ha);
    };

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
                    this.setState({ totalPop: this.numberWithCommas(data.pop), area: this.calculateArea(JSON.parse(projPairAOI)) + " ha", elevation: this.numberWithCommas(data.minElev) + " - " + this.numberWithCommas(data.maxElev) + " m" });
                }
            });
    }

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
                                src="img/icon-population.png"
                                style={{
                                    width: "50px",
                                    height: "50px",
                                    borderRadius: "25px",
                                    backgroundColor: "#31bab0",
                                }}
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
                                src="img/icon-area.png"
                                style={{
                                    width: "50px",
                                    height: "50px",
                                    borderRadius: "25px",
                                    backgroundColor: "#31bab0",
                                }}
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
                                src="img/icon-elevation.png"
                                style={{
                                    width: "50px",
                                    height: "50px",
                                    borderRadius: "25px",
                                    backgroundColor: "#31bab0",
                                }}
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

export function renderGeodashPage(documentRoot) {
    ReactDOM.render(
        <Geodash documentRoot={documentRoot}/>,
        document.getElementById("dashHolder")
    );
}
