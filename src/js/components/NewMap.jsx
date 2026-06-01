import React, { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Map, View } from 'ol';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { defaults as defaultInteractions } from 'ol/interaction';
import { fromLonLat } from 'ol/proj';

import { mapImageryLibraryAtom, activeMapLayerIdsAtom, mapDrawingAtom } from '../state/map';
import * as mercator from '../utils/newMercator';

export const NewMap = ({
  pan = true,
  allowDrawing = false,
  initCenter = [-98.5795, 39.8283],
  initZoom = 4
}) => {
  const mapElement = useRef();
  const mapRef = useRef();
  const vectorSourceRef = useRef(new VectorSource());
  const layerCache = useRef(new Map());
  const library = useAtomValue(mapImageryLibraryAtom);
  const activeIds = useAtomValue(activeMapLayerIdsAtom);
  const setDrawnFeature = useSetAtom(mapDrawingAtom);

  // 1. Initialize Map Shell
  useEffect(() => {
    if (!mapElement.current) return;

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      style: mercator.boundaryStyle,
      zIndex: 1000
    });

    const map = new Map({
      target: mapElement.current,
      layers: [vectorLayer],
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

    // Handle container resizing
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
        vectorSourceRef.current,
        (coords, geometry) => {
          // Update the global state
          setDrawnFeature(coords);
          // Fit the screen to the new geometry
          mercator.zoomMapToExtent(map, geometry);
        }
      );
      map.addInteraction(dragBoxInteraction);
    }

    return () => {
      if (dragBoxInteraction) map.removeInteraction(dragBoxInteraction);
    };
  }, [allowDrawing, setDrawnFeature]);

  // 3. Imagery Sync
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
