import React from "react";

import { Map, View } from "ol";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { XYZ } from "ol/source";
import { Style, Stroke } from "ol/style";

import { mercator } from "../utils/mercator";

import SvgIcon from "../components/svg/SvgIcon";

export default class MapWidget extends React.Component {  
  constructor(props) {
    super(props);
    this.state = {
      mapRef: null,
      timeOutRefs: [],
      overlayValue: 100,
      opacityValue: 100,
    };
  }

  /// Lifecycle

  componentDidMount() {
    this.initMap();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.isFullScreen !== this.props.isFullScreen) {
      this.state.mapRef.updateSize();
    }

    if (prevProps.mapCenter !== this.props.mapCenter || prevProps.mapZoom !== this.props.mapZoom) {
      this.centerAndZoomMap(this.props.mapCenter, this.props.mapZoom);
    }

    if (this.props.widget.type === "degradationTool") {
      if (
        prevProps.imageDate !== this.props.imageDate ||
        prevProps.stretch !== this.props.stretch ||
        prevProps.degDataType !== this.props.degDataType
      ) {
        this.pauseGeeLayer();
        if (this.props.imageDate !== "") this.loadWidgetSource();
      }
    } else if (!prevState.mapRef && this.state.mapRef) {
      this.loadWidgetSource();
    }
  }

  /// API

  fetchSourceUrl = async (postObject) => {
    const res = await fetch("/geo-dash/gateway-request", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postObject),
    });
    const data = await (res.ok ? res.json() : Promise.reject());
    if (data && data.hasOwnProperty("url")) {
      this.setCache(postObject, data.url);
      return data.url;
    } else {
      console.warn("Wrong Data Returned");
      return false;
    }
  };

  /// State

  updateOpacity = (newOpacity) => {
    this.setState({ opacityValue: newOpacity });
    this.setOpacity(newOpacity);
  };

  updateOverlay = (newOverlay) => {
    this.setState({ overlayValue: newOverlay });
    this.state.mapRef.render();
  };

  /// Get widget URL

  getPostObject = (widget) => {
    switch(widget.type) {
    case "imageAsset":
      return { path: "image", ...widget };
    case "degradationTool":
      const { stretch, imageDate, degDataType, plotExtentPolygon } = this.props;
      return {
        path: "degradationTileUrl",
        geometry: plotExtentPolygon,
        stretch,
        degDataType,
        imageDate,
        ...widget,
      };
    case "polygonCompare":
      const { visiblePlotId } = this.props;
      return { path: "featureCollection", matchID: visiblePlotId, ...widget };
    case "preImageCollection":
      const { sourceName, sourceType } = widget;
      const sourceNameToPath = {
        Landsat: "filteredLandsat",
        Sentinel2: "filteredSentinel2",
      };
      const path = (sourceType === "Composite" && sourceNameToPath[sourceName]) || "imageCollectionByIndex";
      return { path, ...widget };
    case "imageCollectionAsset":
      return { path: "imageCollection", ...widget };
    case "dynamicWorld":
      return { path: "dynamicWorld", ...widget};
    default:
      return {};
    }
  };

  /// Cache

  wrapCache = async (widget) => {
    const postObject = this.getPostObject(widget);
    const cacheUrl = this.checkForCache(postObject);
    if (cacheUrl) {
      return cacheUrl;
    } else {
      const url = await this.fetchSourceUrl(postObject);
      return url;
    }
  };

  checkForCache = (postObject) => {
    const msPerDay = 24 * 60 * 60 * 1000;
    const jsonKey = JSON.stringify(postObject);
    const { url, lastGatewayUpdate } = JSON.parse(localStorage.getItem(jsonKey)) || {};
    if (url && new Date() - new Date(lastGatewayUpdate) < msPerDay) {
      return url;
    } else {
      localStorage.removeItem(jsonKey);
      return null;
    }
  };

  setCache = (postObject, url) => {
    localStorage.setItem(
      JSON.stringify(postObject),
      JSON.stringify({ url, lastGatewayUpdate: new Date() })
    );
  };

  /// OpenLayers

  initMap = () => {
    const { widget } = this.props;
    const { sourceConfig, id, attribution, isProxied } =
      this.props.imageryList.find((imagery) => imagery.id === widget.basemapId) ||
      this.props.imageryList.find((imagery) => imagery.title === "Open Street Map") ||
      this.props.imageryList[0];
    const basemapLayer = new TileLayer({
      source: mercator.createSource(
        (widget.basemapType === "PlanetTFO") ? 
          {... sourceConfig, time: widget.basemapTFODate}
        : sourceConfig,
        id,
        attribution,
        isProxied,
      ),
    });
    const plotSampleLayer = new VectorLayer({
      source: this.props.vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: "yellow",
          width: 3,
        }),
        fill: null,
      }),
      zIndex: 100,
    });
    const map = new Map({
      layers: [basemapLayer, plotSampleLayer],
      target: "widget-map_" + widget.id,
      view: new View({
        center: [0, 0],
        projection: "EPSG:3857",
        zoom: 4,
      }),
    });

    this.setState({
      mapRef: map,
    });

    map.on("movestart", this.pauseGeeLayer);
    map.on("moveend", (e) => {
      this.props.setCenterAndZoom(e.map.getView().getCenter(), e.map.getView().getZoom());
      this.resumeGeeLayer();
    });

    map.getView().fit(plotSampleLayer.getSource().getExtent(), {
      size: map.getSize(),
      padding: [16, 16, 16, 16],
    });

    if (!this.props.mapCenter) {
      const view = map.getView();
      this.props.setCenterAndZoom(view.getCenter(), view.getZoom());
    }
  };

  addOverlay = (layer) => {
    layer.on("prerender", (event) => {
      const { overlayValue } = this.state;
      const ctx = event.context;
      const width = Math.abs(ctx.canvas.width * (overlayValue / 100.0));
      ctx.save();
      ctx.beginPath();
      if (overlayValue >= 0) {
        ctx.rect(width, 0, ctx.canvas.width - width, ctx.canvas.height);
      } else {
        // Secret code just in case.  It may not be as useful as I thought.
        ctx.rect(0, 0, ctx.canvas.width - width, ctx.canvas.height);
      }
      ctx.clip();
    });

    layer.on("postrender", (event) => {
      const ctx = event.context;
      ctx.restore();
    });
  };

  centerAndZoomMap = (center, zoom) => {
    const { mapRef } = this.state;
    const view = mapRef.getView();
    view.setCenter(center);
    view.setZoom(zoom);
  };

  setOpacity = (newOpacity) => {
    this.state.mapRef.getLayers().forEach((lyr) => {
      const layerId = lyr.get("layerId") || "";
      if (layerId.includes(this.props.widget.id)) {
        lyr.setOpacity(newOpacity / 100.0);
      }
    });
  };

  getLayerById = (layerId) => {
    const { mapRef } = this.state;
    return (
      mapRef &&
      mapRef
        .getLayers()
        .getArray()
        .find((layer) => layer.get("layerId") === layerId)
    );
  };

  pauseGeeLayer = () => {
    const { mapRef, timeOutRefs } = this.state;
    if (mapRef) {
      timeOutRefs.forEach((tor) => window.clearTimeout(tor));
      this.setState({ timeOutRefs: [] });
      mapRef.getLayers().forEach((lyr) => {
        if (lyr.get("layerId")) lyr.setVisible(false);
      });
    }
  };

  resumeGeeLayer = () => {
    const { mapRef } = this.state;
    if (mapRef) {
      const layers = mapRef.getLayers().getArray();
      const timeOutRefs = layers.map((layer) => {
        const to = 75 * (layer.get("idx") || 0);
        return window.setTimeout(() => {
          layer.setVisible(true);
        }, to);
      });
      this.setState({ timeOutRefs });
    }
  };

  addNewLayer = (url, layerId, idx = 0) => {
    const source = new XYZ({
      url,
    });
    source.on("tileloaderror", (error) => {
      if (!error.tile.reloaded) {
        window.setTimeout(() => {
          error.tile.reloaded = true; // eslint-disable-line no-param-reassign
          error.tile.load();
        }, 1000);
      }
    });
    const layer = new TileLayer({
      source,
      layerId,
      idx,
      visible: false,
    });
    return layer;
  };

  upsertTileSource = (url, widgetId, idx, newLayerCallback = () => {}) => {
    const { mapRef } = this.state;
    const layerId = "layer-" + widgetId;
    const existingLayer = this.getLayerById(layerId);
    if (existingLayer) {
      existingLayer.getSource().setUrl(url);
    } else if (url) {
      const layer = this.addNewLayer(url, layerId, idx);
      newLayerCallback(layer);
      mapRef.addLayer(layer);
    }
  };

  loadWidgetSource = async () => {
    const { widget, idx } = this.props;
    if (widget.type === "dualImagery") {
      const [url1, url2] = await Promise.all([
        this.wrapCache(widget.image1),
        this.wrapCache(widget.image2),
      ]);
      this.upsertTileSource(url1, widget.id + "-top", idx);
      this.upsertTileSource(url2, widget.id + "-bottom", idx, this.addOverlay);
    } else {
      const url = await this.wrapCache(widget);
      this.upsertTileSource(url, widget.id, idx);
    }
    this.resumeGeeLayer();
  };

  /// Render functions
  renderSlider = (value, updateFn, icon, title) => (
    <>
      <div style={{ alignItems: "center", display: "flex" }} title={title}>
        <SvgIcon color="rgb(49, 186, 176)" icon={icon} size="1.5rem" />
      </div>
      <input
        className="mapRange"
        max="100"
        min="0"
        onChange={(e) => updateFn(parseInt(e.target.value))}
        step="1"
        type="range"
        value={value}
      />
    </>
  );

  renderSliderControls = () => {
    const { overlayValue, opacityValue } = this.state;
    const { widget } = this.props;
    const dualVector = ["dualImagery", "dynamicWorld"];
    return (
      <div className="d-flex">
        {dualVector.includes(widget.type) ? (
          <>
            {this.renderSlider(opacityValue, this.updateOpacity, "opacity", "Opacity")}
            {this.renderSlider(overlayValue, this.updateOverlay, "overlay", "Overlay Layers")}
          </>
        ) : (
          this.renderSlider(opacityValue, this.updateOpacity, "opacity", "Opacity")
        )}
      </div>
    );
  };

  render() {
    const { widget } = this.props;
    return (
      <>
        <div id={"widget-map_" + widget.id} style={{ flex: 1 }} />
        {this.renderSliderControls()}
      </>
    );
  }
}
