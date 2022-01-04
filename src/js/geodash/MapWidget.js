import React from "react";

import {Map, View} from "ol";
import {Tile as TileLayer, Vector as VectorLayer} from "ol/layer";
import {XYZ} from "ol/source";
import {Style, Stroke} from "ol/style";

import {mercator} from "../utils/mercator";

export default class MapWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            mapRef: null,
            updateTimeOutRefs: [],
            swipeValue: 0,
            opacityValue: 100,
            sliderType: this.props.widget.swipeAsDefault ? "swipe" : "opacity"
        };
    }

    /// Lifecycle

    componentDidMount() {
        this.initMap();
    }

    componentDidUpdate(prevProps, prevState) {
        if (!prevState.mapRef && this.state.mapRef) {
            if (this.props.widget.type !== "degradationTool") this.loadWidgetSource();
        }

        if (prevProps.isFullScreen !== this.props.isFullScreen) {
            this.state.mapRef.updateSize();
        }

        if (prevProps.mapCenter !== this.props.mapCenter || prevProps.mapZoom !== this.props.mapZoom) {
            this.centerAndZoomMap(this.props.mapCenter, this.props.mapZoom);
        }

        if (this.props.widget.type === "degradationTool"
            && (prevProps.imageDate !== this.props.imageDate
                || prevProps.stretch !== this.props.stretch
                || prevProps.degDataType !== this.props.degDataType)) {
            this.pauseGeeLayer();
            if (this.props.imageDate !== "") this.loadWidgetSource();
        }
    }

    /// API

    fetchSourceUrl = async postObject => {
        const res = await fetch("/geo-dash/gateway-request", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(postObject)
        });
        const data = await (res.ok ? res.json() : Promise.reject());
        if (data && data.hasOwnProperty("url")) {
            this.setCache(postObject, data);
            return data.url;
        } else {
            console.warn("Wrong Data Returned");
            return false;
        }
    };

    /// State

    updateOpacity = newOpacity => {
        this.setState({opacityValue: newOpacity});
        this.setOpacity(newOpacity);
    };

    updateSwipe = newSwipe => {
        this.setState({swipeValue: newSwipe});
        this.state.mapRef.render();
    };

    toggleSliderType = () => {
        const {sliderType, opacityValue} = this.state;
        const newSliderType = sliderType === "opacity" ? "swipe" : "opacity";
        this.setState({sliderType: newSliderType});
        if (newSliderType === "opacity") {
            this.setOpacity(opacityValue);
        } else {
            this.setOpacity(100);
        }
        this.state.mapRef.render();
    };

    /// Get widget URL

    // TODO update widget to {name, type, params}
    getPostObject = widget => {
        if (widget.type === "imageAsset") {
            return {path: "image", ...widget};
        } else if (widget.type === "degradationTool") {
            const {stretch, imageDate, degDataType, plotExtentPolygon} = this.props;
            return {
                path: "degradationTileUrl",
                geometry: plotExtentPolygon,
                stretch,
                degDataType,
                imageDate,
                ...widget
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

    wrapCache = async widget => {
        const postObject = this.getPostObject(widget);
        const cacheUrl = this.checkForCache(postObject);
        if (cacheUrl) {
            return cacheUrl;
        } else {
            const url = await this.fetchSourceUrl(postObject);
            return url;
        }
    };

    loadWidgetSource = async () => {
        const {widget, idx} = this.props;
        if (widget.type === "dualImagery") {
            const [url1, url2] = await Promise.all([this.wrapCache(widget.image1), this.wrapCache(widget.image2)]);
            this.upsertFirstTileSource(url1, widget.id, idx);
            this.upsertFirstTileSource(url1, widget.id, idx);
            this.upsertSecondTileSource(url2, widget.id, idx);
        } else {
            const url = await this.wrapCache(widget);
            this.upsertFirstTileSource(url, widget.id, idx);
        }
        this.resumeGeeLayer();
    };

    /// Cache

    checkForCache = postObject => {
        const msPerDay = 24 * 60 * 60 * 1000;
        const jsonKey = JSON.stringify(postObject);
        const {url, lastGatewayUpdate} = JSON.parse(localStorage.getItem(jsonKey)) || {};
        if (url && new Date() - new Date(lastGatewayUpdate) < msPerDay) {
            return url;
        } else {
            localStorage.removeItem(jsonKey);
            return null;
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

    /// OpenLayers

    initMap = () => {
        const {widget} = this.props;
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

        const mapdiv = "widget-map_" + widget.id;
        const map = new Map({
            layers: [basemapLayer, plotSampleLayer],
            target: mapdiv,
            view: new View({
                center: [0, 0],
                projection: "EPSG:3857",
                zoom: 4
            })
        });

        // TODO, this also fires when the props change.  setCenterAndZoom is redundant and circular
        map.on("movestart", this.pauseGeeLayer);
        map.on("moveend", e => {
            this.props.setCenterAndZoom(e.map.getView().getCenter(), e.map.getView().getZoom());
            this.resumeGeeLayer();
        });

        plotSampleLayer.getSource().getExtent();

        map.getView().fit(
            plotSampleLayer.getSource().getExtent(),
            {
                size: map.getSize(),
                padding: [16, 16, 16, 16]
            }
        );

        if (!this.props.mapCenter) {
            this.props.setCenterAndZoom(map.getView().getCenter(), map.getView().getZoom());
        }

        this.setState({
            mapRef: map
        });
    };

    centerAndZoomMap = (center, zoom) => {
        const {mapRef} = this.state;
        mapRef.getView().setCenter(center);
        mapRef.getView().setZoom(zoom);
    };

    getLayerById = layerId => {
        const {mapRef} = this.state;
        return mapRef && mapRef.getLayers().getArray().find(layer => layer.get("layerId") === layerId);
    };

    pauseGeeLayer = () => {
        const {mapRef, updateTimeOutRefs} = this.state;
        if (mapRef) {
            updateTimeOutRefs.forEach(to => window.clearTimeout(to));
            this.setState({updateTimeOutRefs: []});
            mapRef.getLayers().forEach(lyr => { if (lyr.get("layerId")) lyr.setVisible(false); });
        }
    };

    resumeGeeLayer = () => {
        const {mapRef} = this.state;
        if (mapRef) {
            const layers = mapRef.getLayers().getArray();
            const updateTimeOutRefs = layers.map(layer => {
                const to = 50 * (layer.get("idx") || 0) + 250;
                return window.setTimeout(() => { layer.setVisible(true); }, to);
            });
            this.setState({updateTimeOutRefs});
        }
    };

    addNewLayer = (url, layerId, idx = 0) => {
        const source = new XYZ({
            url
        });
        source.on("tileloaderror", error => {
            if (!error.tile.attempted) {
                window.setTimeout(() => {
                    error.tile.attempted = true; // eslint-disable-line no-param-reassign
                    error.tile.load();
                }, 1000);
            }
        });
        const layer = new TileLayer({
            source,
            layerId,
            idx,
            visible: false
        });
        return layer;
    };

    upsertFirstTileSource = (url, widgetId, idx) => {
        const {mapRef} = this.state;
        const layerId = "layer-" + widgetId;
        const existingLayer = this.getLayerById(layerId);
        if (existingLayer) {
            existingLayer.getSource().setUrl(url);
        } else if (url) {
            const layer = this.addNewLayer(url, layerId, idx);
            mapRef.addLayer(layer);
        }
    };

    upsertSecondTileSource = (url, widgetId, idx) => {
        const {mapRef} = this.state;
        const layerId = "layer-" + widgetId + "-2";
        const existingLayer = this.getLayerById(layerId);
        if (existingLayer) {
            existingLayer.getSource().setUrl(url);
        } else if (url) {
            const layer = this.addNewLayer(url, layerId, idx);
            layer.on("prerender", event => {
                const {swipeValue, sliderType} = this.state;
                const ctx = event.context;
                if (sliderType === "opacity") {
                    ctx.restore();
                } else {
                    const width = Math.abs(ctx.canvas.width * (swipeValue / 100.0));
                    ctx.save();
                    ctx.beginPath();
                    if (swipeValue >= 0) {
                        ctx.rect(width, 0, ctx.canvas.width - width, ctx.canvas.height);
                    } else {
                        // Secret code just in case.  It may not be as useful as I thought.
                        ctx.rect(0, 0, ctx.canvas.width - width, ctx.canvas.height);
                    }
                    ctx.clip();
                }
            });

            layer.on("postrender", event => {
                const ctx = event.context;
                ctx.restore();
            });

            mapRef.addLayer(layer);
        }
    };

    setOpacity = newOpacity => {
        this.state.mapRef.getLayers().forEach(lyr => {
            // FIXME, this does not appear that it will work with dual layer
            // Also just use mercator.getLayerById
            const layerId = lyr.get("layerId") || "";
            if (layerId.includes(this.props.widget.id)) {
                lyr.setOpacity(newOpacity / 100.0);
            }
        });
    };

    /// Render functions

    renderSliderControl = () => {
        const {sliderType, swipeValue, opacityValue} = this.state;
        const {widget} = this.props;

        return (
            <div className="d-flex">
                {widget.type === "dualImagery" && (
                    <div className="toggleSwitchContainer">
                        <img
                            alt="toggle opacity"
                            height="20px"
                            onClick={this.toggleSliderType}
                            src={sliderType === "opacity" ? "img/geodash/opacity.png" : "img/geodash/swipe.png"}
                            style={{cursor: "pointer"}}
                            title="Opacity"
                            width="40px"
                        />
                    </div>
                )}
                {sliderType === "opacity"
                    ? (
                        <input
                            className="mapRange"
                            max="100"
                            min="0"
                            onChange={e => this.updateOpacity(parseInt(e.target.value))}
                            step="1"
                            type="range"
                            value={opacityValue}
                        />
                    ) : (
                        <input
                            className="mapRange"
                            max="100"
                            min="0"
                            onChange={e => this.updateSwipe(parseInt(e.target.value))}
                            step="1"
                            type="range"
                            value={swipeValue}
                        />
                    )}
            </div>
        );
    };

    render() {
        const {widget} = this.props;
        return (
            <>
                <div
                    id={"widget-map_" + widget.id}
                    style={{flex: 1}}
                />
                {this.renderSliderControl()}
            </>
        );
    }
}
