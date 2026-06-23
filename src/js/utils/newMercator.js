import { Feature, Map, Overlay, View } from 'ol';
import { Tile as TileLayer, Group as LayerGroup, Vector as VectorLayer } from 'ol/layer';
import { TileWMS, XYZ, OSM, BingMaps, Vector as VectorSource } from 'ol/source';
import { Style, Stroke, Fill } from 'ol/style';
import { toLonLat } from 'ol/proj';
import { platformModifierKeyOnly } from 'ol/events/condition';
import { getCenter, getExtent } from 'ol/extent';
import Collection from 'ol/Collection';
import DragBox from 'ol/interaction/DragBox';
import GeoJSON from 'ol/format/GeoJSON';
import Point from 'ol/geom/Point';


export const createVectorSource = () => new VectorSource();

export const boundaryStyle = new Style({
  stroke: new Stroke({ color: '#ffc107', width: 3 }),
  fill: new Fill({ color: 'rgba(255, 248, 225, 0.3)' }),
});

export const calculateArea = (obj) => {
  try {
    return getArea(obj, { projection: "EPSG:4326" }) / 10000;
  } catch (e) {
    return "N/A";
  }
};

export const parseGeoJson = (geoJson, reprojectToMap) => {
  if (geoJson) {
    try {
      const format = new GeoJSON();
      const geometry = format.readGeometry(geoJson);
      if (reprojectToMap) {
        return geometry.transform("EPSG:4326", "EPSG:3857");
      } else {
        return geometry;
      }
    } catch (e) {
      return new Point([0, 0]);
    }
  } else {
    return new Point([0, 0]);
  }
};

export const calculateGeoJsonArea = (geoJson) =>
  calculateArea(parseGeoJson(geoJson, false));

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


// Simulating plot generation for project wizard
/**
 * Generates random points within the bounding box of a GeoJSON geometry.
 * @param {Object} aoiGeoJSON - The GeoJSON feature for the project area.
 * @param {number} numPlots - Total number of points to generate.
 * @returns {Array} Array of Point feature objects.
 */
export const generateRandomPlots = (aoiGeoJSON, numPlots) => {
  const format = new GeoJSON();
  
  // Read the geometry and calculate the bounding box extent
  const feature = format.readFeature(aoiGeoJSON, { 
    dataProjection: 'EPSG:4326', 
    featureProjection: 'EPSG:4326' 
  });
  
  const extent = feature.getGeometry().getExtent(); // [minLon, minLat, maxLon, maxLat]
  const [minLon, minLat, maxLon, maxLat] = extent;
  
  const plots = [];
  for (let i = 0; i < numPlots; i++) {
    const lon = minLon + Math.random() * (maxLon - minLon);
    const lat = minLat + Math.random() * (maxLat - minLat);
    
    plots.push({ 
      type: "Point", 
      coordinates: [lon, lat] 
    });
  }
  
  return plots;
};


/**
 * Generates a grid of points within the AOI, accounting for plot size 
 * and using spacing as the boundary padding.
 * @param {Object} aoiGeoJSON - The GeoJSON feature for the project area.
 * @param {number} spacing - Distance between points in meters.
 * @param {number} plotSize - Diameter (or width) of the plot in meters.
 * @returns {Array} Array of Point feature objects.
 */
export const generateGriddedPlots = (aoiGeoJSON, spacing, plotSize) => {
  if (!spacing || spacing <= 0) return [];

  const format = new GeoJSON();
  const feature = format.readFeature(aoiGeoJSON, { 
    dataProjection: 'EPSG:4326', 
    featureProjection: 'EPSG:4326' 
  });
  const extent = feature.getGeometry().getExtent(); 
  
  const degSpacing = spacing / 111320;
  const degPlotRadius = (plotSize / 2) / 111320;
  const degPadding = degSpacing / 4;

  // Define the usable area
  const usableMinLon = extent[0] + degPlotRadius + degPadding;
  const usableMinLat = extent[1] + degPlotRadius + degPadding;
  const usableMaxLon = extent[2] - degPlotRadius - degPadding;
  const usableMaxLat = extent[3] - degPlotRadius - degPadding;

  const width = usableMaxLon - usableMinLon;
  const height = usableMaxLat - usableMinLat;

  if (width < 0 || height < 0) return [];

  // Calculate number of steps
  const xSteps = Math.floor(width / degSpacing);
  const ySteps = Math.floor(height / degSpacing);

  // Center the grid by calculating the remainder
  const xRemainder = width - (xSteps * degSpacing);
  const yRemainder = height - (ySteps * degSpacing);

  const startLon = usableMinLon + (xRemainder / 2);
  const startLat = usableMinLat + (yRemainder / 2);

  const plots = [];
  for (let i = 0; i <= xSteps; i++) {
    for (let j = 0; j <= ySteps; j++) {
      plots.push({ 
        type: "Point", 
        coordinates: [
          startLon + (i * degSpacing), 
          startLat + (j * degSpacing)
        ] 
      });
      if (plots.length > 50000) break;
    }
  }
  return plots;
};

/**
 * Estimates the number of plots a gridded distribution will generate.
 * @param {Object} aoiGeoJSON - The GeoJSON feature for the project area.
 * @param {number} spacing - Distance between points in meters.
 * @param {number} plotSize - Diameter (or width) of the plot in meters.
 * @returns {number} Estimated total plot count.
 */
export const estimateGriddedPlotCount = (aoiGeoJSON, spacing, plotSize) => {
  if (!spacing || spacing <= 0) return 0;

  try {
    const format = new GeoJSON();
    const feature = format.readFeature(aoiGeoJSON, { 
      dataProjection: 'EPSG:4326', 
      featureProjection: 'EPSG:4326' 
    });
    const extent = feature.getGeometry().getExtent();
    
    const degSpacing = spacing / 111320;
    const degPlotRadius = (plotSize / 2) / 111320;
    const degPadding = degSpacing; // Padding is equal to spacing

    // Usable area: Total - (2 * Radius) - (2 * Padding)
    const usableWidth = (extent[2] - extent[0]) - (2 * degPlotRadius) - (2 * degPadding);
    const usableHeight = (extent[3] - extent[1]) - (2 * degPlotRadius) - (2 * degPadding);

    if (usableWidth < 0 || usableHeight < 0) return 0;

    // We add 1 to include both start and end points of the series
    const xSteps = Math.floor(usableWidth / degSpacing) + 1;
    const ySteps = Math.floor(usableHeight / degSpacing) + 1;
    
    return xSteps * ySteps;
  } catch (e) {
    return 0;
  }
};

/**
 * Transforms a point feature into a square or circular polygon geometry 
 * based on the plot size and shape.
 * @param {Object|Array} pointFeature - GeoJSON feature, geometry object, or [lng, lat] array.
 * @param {number} plotSize - The diameter (circle) or width (square) in meters.
 * @param {string} plotShape - 'circle' or 'square'.
 * @returns {Object|null} GeoJSON Feature representing the plot polygon.
 */
export const getPlotGeometry = (pointFeature, plotSize, plotShape) => {
  let lng, lat;

  if (pointFeature.geometry && pointFeature.geometry.coordinates) {
    [lng, lat] = pointFeature.geometry.coordinates;
  } else if (pointFeature.coordinates) {
    [lng, lat] = pointFeature.coordinates;
  } else if (Array.isArray(pointFeature)) {
    [lng, lat] = pointFeature;
  } else {
    return null;
  }

  const radius = plotSize / 2;

  if (plotShape === 'circle') {
    const steps = 64;
    const coords = [];
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      const latOffset = (radius * Math.cos(angle)) / 111320;
      const lngOffset = (radius * Math.sin(angle)) / (111320 * Math.cos(lat * Math.PI / 180));
      coords.push([lng + lngOffset, lat + latOffset]);
    }
    coords.push(coords[0]);
    // RETURN RAW GEOMETRY
    return { type: 'Polygon', coordinates: [coords] };
  } else {
    const latOffset = radius / 111320;
    const lngOffset = radius / (111320 * Math.cos(lat * Math.PI / 180));
    const coords = [
      [lng - lngOffset, lat - latOffset],
      [lng + lngOffset, lat - latOffset],
      [lng + lngOffset, lat + latOffset],
      [lng - lngOffset, lat + latOffset],
      [lng - lngOffset, lat - latOffset]
    ];
    // RETURN RAW GEOMETRY
    return { type: 'Polygon', coordinates: [coords] };
  }
};


/**
 * Generates an array of GeoJSON point geometries representing sample locations within a given plot,
 * primarily intended for map previews. The calculation is performed in Web Mercator (EPSG:3857) 
 * to ensure accurate distance measurements in meters.
 *
 * @param {Object} rawPlotGeom - The base plot geometry (GeoJSON object or raw coordinate geometry) in EPSG:4326.
 * This defines the boundary within which samples are generated.
 * @param {string} distribution - The spatial distribution strategy for the samples.
 * Valid options: 'center', 'random', 'gridded', 'csv', 'shp', 'geojson'.
 * @param {number} count - The target number of samples to generate (used primarily for 'random' distribution).
 * @param {number} resolution - The spacing in meters between samples (used exclusively for 'gridded' distribution).
 * @param {Array<Object>} [fileFeatures=[]] - An optional array of parsed file features (e.g., from an uploaded CSV, SHP, or GeoJSON).
 * Used when the distribution is file-based to extract sample points.
 *
 * @returns {Array<Object>} An array of GeoJSON Feature objects representing the generated sample points, projected back to EPSG:4326.
 * Returns an empty array if the input geometry is invalid or cannot be parsed.
 */
export const generatePreviewSamples = (
  rawPlotGeom, 
  distribution, 
  count = 1, 
  resolution = 100, 
  fileFeatures = []
) => {
  if (!rawPlotGeom) return [];

  const format = new GeoJSON();
  let olGeom;
  
  try {
    // Read the EPSG:4326 plot into Web Mercator (EPSG:3857) - Units are now in METERS
    olGeom = format.readGeometry(rawPlotGeom, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });
  } catch (e) {
    console.error("Failed to parse plot geometry for samples", e);
    return [];
  }

  const extent = olGeom.getExtent();
  const generatedSamples = [];

  // --- CENTER LOGIC ---
  if (distribution === 'center') {
    if (olGeom.getType() === 'Polygon') {
      generatedSamples.push(olGeom.getInteriorPoint());
    } else {
      generatedSamples.push(new Point(getCenter(extent)));
    }
  } 
  // --- RANDOM LOGIC ---
  else if (distribution === 'random') {
    const numSamples = count > 0 ? count : 1;
    let attempts = 0;
    const maxAttempts = numSamples * 50; 

    while (generatedSamples.length < numSamples && attempts < maxAttempts) {
      const x = extent[0] + Math.random() * (extent[2] - extent[0]);
      const y = extent[1] + Math.random() * (extent[3] - extent[1]);
      
      if (olGeom.intersectsCoordinate([x, y])) {
        generatedSamples.push(new Point([x, y]));
      }
      attempts++;
    }

    if (generatedSamples.length === 0) {
      generatedSamples.push(
        olGeom.getType() === 'Polygon' ? olGeom.getInteriorPoint() : new Point(getCenter(extent))
      );
    }
  }
  // --- GRIDDED LOGIC ---
  else if (distribution === 'gridded') {
    const res = resolution > 0 ? resolution : 10; // Default to 10m to prevent divide-by-zero
    
    // 1. Calculate the bounding box dimensions in meters
    const width = extent[2] - extent[0];
    const height = extent[3] - extent[1];
    
    // Pre-check: If the resolution is so small it creates a massive grid, abort immediately
    const maxPossiblePoints = (width / res) * (height / res);
    if (maxPossiblePoints > 10000) {
      console.warn(`Grid resolution too fine. Would attempt ~${Math.round(maxPossiblePoints)} loop iterations.`);
      return []; 
    }

    // 2. Loop through the grid
    for (let x = extent[0] + (res / 2); x <= extent[2]; x += res) {
      for (let y = extent[1] + (res / 2); y <= extent[3]; y += res) {
        
        // 3. Only keep points that actually fall inside the polygon
        if (olGeom.intersectsCoordinate([x, y])) {
          generatedSamples.push(new Point([x, y]));
          
          // 4. Strict cutoff: If we hit 100 valid points, abort generation per requirements
          if (generatedSamples.length >= 100) {
            console.warn("Grid generated 100 or more samples. Aborting preview to preserve performance.");
            return [];
          }
        }
      }
    }
  }

  return generatedSamples.map(geom => format.writeGeometryObject(geom, {
    featureProjection: 'EPSG:3857',
    dataProjection: 'EPSG:4326'
  }));
};
