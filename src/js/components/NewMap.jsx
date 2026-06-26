import React, { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { Map, View } from 'ol';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { defaults as defaultInteractions } from 'ol/interaction';
import { fromLonLat } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import Point from 'ol/geom/Point';
import { getCenter } from 'ol/extent';

import { mapImageryLibraryAtom, activeMapLayerIdsAtom } from '../state/map';
import * as mercator from '../utils/newMercator';

const plotCentroidStyle = new Style({
  image: new CircleStyle({
    radius: 4,
    stroke: new Stroke({ color: '#ffffff', width: 2 }),
    fill: new Fill({ color: '#3399cc' })
  }),
  geometry: function (feature) {
    const geometry = feature.getGeometry();
    if (!geometry) return null;
    const type = geometry.getType();
    if (type === 'Polygon') {
      return geometry.getInteriorPoint();
    } else if (type === 'MultiPolygon') {
      return new Point(getCenter(geometry.getExtent()));
    }
    return geometry;
  }
});

const samplePointStyle = new Style({
  image: new CircleStyle({
    radius: 5,
    stroke: new Stroke({ color: '#000', width: 1.5 }),
  })
});

export const NewMap = ({
  pan = true,
  allowDrawing = false,
  initCenter = [-98.5795, 39.8283],
  initZoom = 4,
  aoiToShow = [],
  plotsToShow = [],
  samplesToShow = [],
  onDrawComplete = () => {}
}) => {
  const mapElement = useRef();
  const mapRef = useRef();
  const aoiSourceRef = useRef(new VectorSource());
  const plotsSourceRef = useRef(new VectorSource());
  const samplesSourceRef = useRef(new VectorSource());
  const layerCache = useRef(new Map());
  const library = useAtomValue(mapImageryLibraryAtom);
  const activeIds = useAtomValue(activeMapLayerIdsAtom);

  useEffect(() => {
    if (!mapElement.current) return;

    const aoiLayer = new VectorLayer({
      source: aoiSourceRef.current,
      style: mercator.boundaryStyle,
      zIndex: 1000
    });

    const plotsLayer = new VectorLayer({
      source: plotsSourceRef.current,
      style: plotCentroidStyle,
      zIndex: 1100
    });

    const samplesLayer = new VectorLayer({
      source: samplesSourceRef.current,
      style:  samplePointStyle,
      zIndex: 1200
    });

    const map = new Map({
      target: mapElement.current,
      layers: [aoiLayer, plotsLayer, samplesLayer],
      interactions: defaultInteractions({
        dragPan: pan,
        mouseWheelZoom: true,
        doubleClickZoom: true
      }),
      view: new View({
        center: fromLonLat(initCenter),
        zoom: initZoom,
        projection: 'EPSG:3857'
      }),
      controls: []
    });

    mapRef.current = map;

    const observer = new ResizeObserver(() => map.updateSize());
    observer.observe(mapElement.current);

    return () => {
      observer.disconnect();
      map.setTarget(null);
    };
  }, [pan]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let dragBoxInteraction;
    if (allowDrawing) {
      dragBoxInteraction = mercator.createBoxDrawInteraction(
        aoiSourceRef.current,
        (coords, geometry) => {
          mercator.zoomMapToExtent(map, geometry);

          const format = new GeoJSON();
          const geoJsonGeometry = format.writeGeometryObject(geometry, {
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4326'
          });

          onDrawComplete(geoJsonGeometry);
        }
      );
      map.addInteraction(dragBoxInteraction);
    }

    return () => {
      if (dragBoxInteraction) map.removeInteraction(dragBoxInteraction);
    };
  }, [allowDrawing]);

  const synchronizeLayerSource = (source, featuresData) => {
    source.clear();
    if (!featuresData || featuresData.length === 0) return;

    const format = new GeoJSON();
    featuresData.forEach((geom) => {
      const featureObj = {
        type: 'Feature',
        geometry: geom,
        properties: {}
      };

      const olFeature = format.readFeature(featureObj, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });

      source.addFeature(olFeature);
    });
  };

  useEffect(() => {
    synchronizeLayerSource(aoiSourceRef.current, aoiToShow);

    const map = mapRef.current;
    if (map && aoiToShow.length > 0) {
      const extent = aoiSourceRef.current.getExtent();
      if (extent && extent[0] !== Infinity) {
        map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 0 });
      }
    }
  }, [aoiToShow]);

  useEffect(() => {
    synchronizeLayerSource(plotsSourceRef.current, plotsToShow);
    
    const map = mapRef.current;
    if (map && plotsToShow.length > 0) {
      const extent = plotsSourceRef.current.getExtent();
      if (extent && extent[0] !== Infinity) {
        map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 0 });
      }
    }
  }, [plotsToShow]);

  useEffect(() => {
    synchronizeLayerSource(samplesSourceRef.current, samplesToShow);
    const map = mapRef.current;

    if (map && samplesToShow.length > 0) {
      const extent = plotsSourceRef.current.getExtent();
      if (extent && extent[0] !== Infinity) {
        map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 0 });
      }
    }
  }, [samplesToShow]);
  
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !library.length) return;

    const olLayers = map.getLayers();
    olLayers.getArray().forEach(layer => {
      const id = layer.get('id');
      if (id && !activeIds.has(id)) olLayers.remove(layer);
    });
    activeIds.forEach(id => {
      const onMap = olLayers.getArray().some(l => l.get('id') === id);
      if (!onMap) {
        let layer = layerCache.current.get(id);
        if (!layer) {
          const config = library.find(i => i.id === id);
          if (config) {
            layer = mercator.createImageryLayer(config);
            if (layer) {
              layer.set('id', id);
              layerCache.current.set(id, layer);
            }
          }
        }
        if (layer) map.addLayer(layer);
      }
    });
  }, [activeIds, library]);

  return (
    <div 
      ref={mapElement} 
      className="new-map-canvas"
      style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: '#cbd5e1',
        position: 'relative',
        cursor: allowDrawing ? 'crosshair' : (pan ? 'grab' : 'default'),
        overflow: 'hidden'
      }} 
    />
  );
};
