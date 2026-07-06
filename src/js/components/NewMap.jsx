import React, { useEffect, useRef, useMemo, useCallback } from 'react';
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
  geometry: (feature) => {
    const geometry = feature.getGeometry();
    if (!geometry) return null;
    const type = geometry.getType();
    if (type === 'Polygon') return geometry.getInteriorPoint();
    if (type === 'MultiPolygon') return new Point(getCenter(geometry.getExtent()));
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
  preview = false,
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

  const effectiveActiveIds = useMemo(() => {
    if (!preview) return activeIds;
    const defaultPlatform = library.find(item => item.visibility === 'platform');
    return defaultPlatform
      ? new Set([defaultPlatform.id])
      : (library.length > 0 ? new Set([library[0].id]) : new Set());
  }, [preview, activeIds, library]);

  const synchronizeLayerSource = useCallback((source, featuresData) => {
    source.clear();
    if (!featuresData?.length) return;

    const format = new GeoJSON();
    const olFeatures = featuresData.map(geom => 
      format.readFeature({ type: 'Feature', geometry: geom, properties: {} }, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      })
    );
    source.addFeatures(olFeatures);
  }, []);

  useEffect(() => {
    if (!mapElement.current) return;

    const map = new Map({
      target: mapElement.current,
      layers: [
        new VectorLayer({ source: aoiSourceRef.current, style: mercator.boundaryStyle, zIndex: 1000 }),
        new VectorLayer({ source: plotsSourceRef.current, style: plotCentroidStyle, zIndex: 1100 }),
        new VectorLayer({ source: samplesSourceRef.current, style: samplePointStyle, zIndex: 1200 })
      ],
      interactions: defaultInteractions({ dragPan: pan, mouseWheelZoom: true, doubleClickZoom: true }),
      view: new View({ center: fromLonLat(initCenter), zoom: initZoom, projection: 'EPSG:3857' }),
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
    if (!map || !allowDrawing) return;

    const interaction = mercator.createBoxDrawInteraction(aoiSourceRef.current, (coords, geometry) => {
      mercator.zoomMapToExtent(map, geometry);
      const format = new GeoJSON();
      onDrawComplete(format.writeGeometryObject(geometry, { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' }));
    });
    map.addInteraction(interaction);
    return () => map.removeInteraction(interaction);
  }, [allowDrawing, onDrawComplete]);

  useEffect(() => {
    synchronizeLayerSource(aoiSourceRef.current, aoiToShow);
    const extent = aoiSourceRef.current.getExtent();
    if (mapRef.current && extent && extent[0] !== Infinity) {
      mapRef.current.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 0 });
    }
  }, [aoiToShow, synchronizeLayerSource]);

  useEffect(() => {
    synchronizeLayerSource(plotsSourceRef.current, plotsToShow);
    const extent = plotsSourceRef.current.getExtent();
    if (mapRef.current && extent && extent[0] !== Infinity) {
      mapRef.current.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 0 });
    }
  }, [plotsToShow, synchronizeLayerSource]);

  useEffect(() => {
    synchronizeLayerSource(samplesSourceRef.current, samplesToShow);
  }, [samplesToShow, synchronizeLayerSource]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !library.length) return;

    const olLayers = map.getLayers();
    const layers = olLayers.getArray();
    
    layers.forEach(layer => {
      const id = layer.get('id');
      if (id && !effectiveActiveIds.has(id)) olLayers.remove(layer);
    });

    effectiveActiveIds.forEach(id => {
      if (!layers.some(l => l.get('id') === id)) {
        let layer = layerCache.current.get(id);
        if (!layer) {
          const config = library.find(i => i.id === id);
          if (config) {
            layer = mercator.createImageryLayer(config);
            layer?.set('id', id);
            layer?.setZIndex(0);
            if (layer) layerCache.current.set(id, layer);
          }
        }
        if (layer) map.addLayer(layer);
      }
    });
  }, [effectiveActiveIds, library]);

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
