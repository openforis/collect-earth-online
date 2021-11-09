import React from "react";

import {Map, View} from "ol";
import {Tile as TileLayer, Vector as VectorLayer} from "ol/layer";
import {transform as projTransform} from "ol/proj";
import {XYZ} from "ol/source";
import {Style, Stroke} from "ol/style";

import {mercator} from "../utils/mercator";
import Switch from "../components/Switch";

export default class MapWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            mapRef: null,
            geeTimeOut: null,
            stretch: 321,
            opacity: 0.9,
            sliderType: this.props.widget.swipeAsDefault ? "swipe" : "opacity",
            swipeValue: 1.0
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

    // TODO, move to degradation widget
    toggleDegDataType = checked => this.props.handleDegDataType(checked ? "sar" : "landsat");

    setOpacity = newOpacity => {
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
            const {visiblePlotId} = this.props;
            return {path: "featureCollection", matchID: visiblePlotId, ...widget};
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

        // TODO, what is this doing?
        function onpropertychange() {
            map.dispatchEvent("movestart");
            const view = map.getView();
            view.un("propertychange", onpropertychange);
            map.on("moveend", () => {
                view.on("propertychange", onpropertychange);
            });
        }

        map.getView().on("propertychange", onpropertychange);

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
        const {sliderType, opacity, swipeValue} = this.state;
        const {widget} = this.props;

        if (widget.type === "dualImagery") {
            return (
                <div>
                    <div className="toggleSwitchContainer">
                        <img
                            alt="Opacity"
                            height="20px"
                            onClick={() => this.setState({sliderType: "opacity"})}
                            src="img/geodash/opacity.png"
                            style={{
                                opacity: sliderType === "opacity" ? "1.0" : "0.25",
                                cursor: "pointer"
                            }}
                            title="Opacity"
                            width="40px"
                        />
                        <br/>
                        <img
                            alt="Swipe"
                            height="20px"
                            onClick={() => this.setState({sliderType: "opacity"})}
                            src="img/geodash/swipe.png"
                            style={{
                                opacity: sliderType === "swipe" ? "1.0" : "0.25",
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
                        onChange={e => this.setOpacity(parseInt(e.target.value))}
                        step=".01"
                        style={{display: sliderType === "opacity" ? "block" : "none"}}
                        type="range"
                        value={opacity}
                    />
                    <input
                        className="mapRange dual"
                        id={"swipeWidget_" + widget.id}
                        max="1"
                        min="0"
                        onChange={e => this.setState({swipeValue: parseInt(e.target.value)})}
                        step=".01"
                        style={{display: sliderType === "swipe" ? "block" : "none"}}
                        type="range"
                        value={swipeValue}
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
                    onChange={e => this.setOpacity(parseInt(e.target.value))}
                    step=".01"
                    type="range"
                    value={opacity}
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
                                            onChange={e => this.setState({stretch: parseInt(e.target.value)})}
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
