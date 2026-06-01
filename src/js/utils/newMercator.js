import { Feature, Map, Overlay, View } from "ol";
import { Tile as TileLayer, Group as LayerGroup, Vector as VectorLayer } from 'ol/layer';
import { TileWMS, XYZ, OSM, BingMaps, Vector as VectorSource } from 'ol/source';
import DragBox from 'ol/interaction/DragBox';
import { Style, Stroke, Fill } from 'ol/style';
import { toLonLat } from 'ol/proj';
import Collection from 'ol/Collection';
import { platformModifierKeyOnly } from 'ol/events/condition';


export const createVectorSource = () => new VectorSource();

export const boundaryStyle = new Style({
  stroke: new Stroke({ color: '#ffc107', width: 3 }),
  fill: new Fill({ color: 'rgba(255, 248, 225, 0.3)' }),
});


export const zoomMapToExtent = (map, target) => {
  if (!map) return;
  const view = map.getView();
  const padding = [50, 50, 50, 50];

  view.fit(target, {
    padding: padding,
    duration: 0,
    maxZoom: 16
  });
};

export const createBoxDrawInteraction = (source, onDrawEnd) => {
  const dragBox = new DragBox({
    condition: platformModifierKeyOnly,
    className: 'ol-dragbox-style'
  });

  dragBox.on('boxend', () => {
    const geometry = dragBox.getGeometry();
    const extent = geometry.getExtent();
        
    const min = toLonLat([extent[0], extent[1]]);
    const max = toLonLat([extent[2], extent[3]]);
        
    onDrawEnd({
      west: min[0],
      south: min[1],
      east: max[0],
      north: max[1]
    }, geometry);

    const feature = new Feature(geometry);
    source.clear();
    source.addFeature(feature);
  });

  dragBox.on('boxstart', () => source.clear());

  return dragBox;
};

const sendGEERequest = (theJson, sourceConfig, imageryId, attribution) => {
  const geeSource = new XYZ({
    url: "img/source-loading.png",
    id: imageryId,
    attributions: attribution,
  });
  fetch("/geo-dash/gateway-request", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(theJson),
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      if (data && data.hasOwnProperty("url")) {
        geeSource.setUrl(data.url);
      } else {
        geeSource.setUrl("img/source-not-found.png");
        console.error(data.errMsg);
      }
    })
    .catch((response) => {
      console.error("Error loading " + sourceConfig.type + " imagery: ");
      console.error(response);
    });
  return geeSource;
};

const newestTFOLayer = () => {
  const latestDate = new Date(new Date().setDate(1));
  const month = latestDate.getMonth().toString().padStart(2, "0");
  const dateMonth = `${latestDate.getFullYear()}-${month}`;
  return `planet_medres_normalized_analytic_${dateMonth}_mosaic`;
}

// Helper for Sentinel formatting
const formatDateISO = (date) => date.toISOString().split('T')[0];

export const createImageryLayer = (config) => {
  const { id: imageryId, sourceConfig, attribution, isProxied, extent } = config;
  const { type } = sourceConfig;

  // --- 1. Proxied Handlers ---
  if (isProxied) {
    if (["SecureWatch", "GeoServer"].includes(type)) {
      return new TileLayer({
        source: new TileWMS({ url: "/get-tile", params: { imageryId }, attributions: attribution }),
        properties: { id: imageryId }
      });
    } else if (type === "Planet") {
      return new TileLayer({
        source: new XYZ({
          url: `/get-tile?imageryId=${imageryId}&z={z}&x={x}&y={y}&tile={0-3}&month=${sourceConfig.month}&year=${sourceConfig.year}`,
          attributions: attribution,
        }),
        properties: { id: imageryId }
      });
    } else {
      return new TileLayer({ source: new XYZ({ url: "img/source-not-found.png" }), properties: { id: imageryId } });
    }
  }

  // --- 2. Standard Handlers ---
  switch (type) {
    case "OSM":
      return new TileLayer({ source: new OSM(), properties: { id: imageryId } });

    case "Planet":
      return new TileLayer({
        source: new XYZ({
          url: `https://tiles{0-3}.planet.com/basemaps/v1/global_monthly_${sourceConfig.year}_${sourceConfig.month}_mosaic/gmap/{z}/{x}/{y}.png?api_key=${sourceConfig.accessToken}`,
          attributions: attribution,
        }),
        properties: { id: imageryId }
      });

    case "PlanetTFO":
      const dataLayer = (sourceConfig.time === "newest") ? newestTFOLayer() : sourceConfig.time;
      return new TileLayer({
        source: new XYZ({
          url: `get-tfo-tiles?z={z}&x={x}&y={y}&dataLayer=${dataLayer}&band=${sourceConfig.band}&imageryId=${imageryId}`,
          attributions: attribution,
        }),
        properties: { id: imageryId }
      });

    case "PlanetDaily": {
      // Return a temporary source, update it when fetch finishes
      const source = new XYZ({ url: "img/source-loading.png", attributions: attribution });
      const layerGroup = new LayerGroup({ 
        layers: [new TileLayer({ source })],
        properties: { id: imageryId, isPlanetDaily: true } 
      });

      fetch("/geo-dash/gateway-request", {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "getPlanetTile",
          apiKey: sourceConfig.accessToken,
          startDate: sourceConfig.startDate,
          endDate: sourceConfig.endDate,
          layerCount: 20,
          geometry: extent,
        })
      })
      .then(res => res.json())
      .then(data => {
        const sorted = data
          .filter(d => d.layerID && d.layerID !== "null" && d.date)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (sorted.length === 0) {
          source.setUrl("img/source-not-found.png");
        } else {
          const planetLayers = sorted.map(d => new TileLayer({
            source: new XYZ({
              url: `https://tiles0.planet.com/data/v1/layers/${d.layerID}/{z}/{x}/{y}.png`,
              attributions: attribution
            }),
            title: d.date
          }));
          layerGroup.setLayers(new Collection(planetLayers));
          // Note: PlanetLayerSwitcher control should be handled by the Map component, not the factory
        }
      });
      return layerGroup;
    }

    case "BingMaps":
      return new TileLayer({
        source: new BingMaps({
          imagerySet: sourceConfig.imageryId,
          key: sourceConfig.accessToken,
          maxZoom: 19
        }),
        properties: { id: imageryId }
      });

    case "GeoServer":
      return new TileLayer({
        source: new TileWMS({
          url: sourceConfig.geoserverUrl,
          params: sourceConfig.geoserverParams,
          attributions: attribution
        }),
        properties: { id: imageryId }
      });

    case "xyz":
      return new TileLayer({ source: new XYZ({ url: sourceConfig.url }), properties: { id: imageryId } });

    case "Sentinel2":
    case "Sentinel1": {
      const getBands = (bc) => {
        if (type === "Sentinel1") return bc;
        const lookup = {
          "FalseColorInfrared": "B8,B4,B3",
          "FalseColorUrban": "B12,B11,B4",
          "Agriculture": "B11,B8,B2",
          "HealthyVegetation": "B8,B11,B2",
          "ShortWaveInfrared": "B12,B8A,B4"
        };
        return lookup[bc] || "B4,B3,B2";
      };

      const bands = getBands(sourceConfig.bandCombination);
      const endDate = new Date(sourceConfig.year, sourceConfig.month, 0);
      const requestJson = {
        path: type === "Sentinel2" ? "filteredSentinel2" : "filteredSentinelSAR",
        bands,
        ...sourceConfig,
        cloudLessThan: type === "Sentinel2" ? parseInt(sourceConfig.cloudScore) : null,
        startDate: `${sourceConfig.year}-${sourceConfig.month.padStart(2, '0')}-01`,
        endDate: formatDateISO(endDate),
      };

      return new TileLayer({
        source: sendGEERequest(requestJson, sourceConfig, imageryId, attribution),
        properties: { id: imageryId }
      });
    }

    case "GEEImage":
    case "GEEImageCollection":
      const path = type === "GEEImage" ? "image" : "imageCollection";
      return new TileLayer({
        source: sendGEERequest({ path, ...sourceConfig }, sourceConfig, imageryId, attribution),
        properties: { id: imageryId }
      });

    case "MapBoxRaster":
      return new TileLayer({
        source: new XYZ({
          url: `https://api.mapbox.com/v4/${sourceConfig.layerName}/{z}/{x}/{y}.jpg90?access_token=${sourceConfig.accessToken}`,
          attributions: attribution
        }),
        properties: { id: imageryId }
      });

    case "MapBoxStatic":
      return new TileLayer({
        source: new XYZ({
          url: `https://api.mapbox.com/styles/v1/${sourceConfig.userName}/${sourceConfig.mapStyleId}/tiles/256/{z}/{x}/{y}?access_token=${sourceConfig.accessToken}`,
          attributions: attribution
        }),
        properties: { id: imageryId }
      });

    default:
      return new TileLayer({ source: new XYZ({ url: "img/source-not-found.png" }), properties: { id: imageryId } });
  }
};
