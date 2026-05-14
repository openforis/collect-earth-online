import React, { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { Map, View } from 'ol';
import { defaults as defaultInteractions } from 'ol/interaction';
import { fromLonLat } from 'ol/proj';
import { mapImageryLibraryAtom, activeMapLayerIdsAtom } from '../state/map';
import { createImageryLayer } from '../utils/newMercator';

export const NewMap = ({curZoom, minZoom, maxZoom, pan}) => {
  const mapElement = useRef();
  const mapRef = useRef();
  const layerCache = useRef(new Map());

  const library = useAtomValue(mapImageryLibraryAtom);
  const activeIds = useAtomValue(activeMapLayerIdsAtom);

  useEffect(() => {
    if (!mapElement.current) return;

    const map = new Map({
      target: mapElement.current,
      // Disable panning by filtering out DragPan and KeyboardPan
      interactions: defaultInteractions({
        dragPan: pan || false,
        keyboardPan: pan || false,
      }),
      layers: [],
      view: new View({
        // Center on the US [Longitude, Latitude] converted to Web Mercator
        center: fromLonLat([-98.5795, 39.8283]), 
        zoom: curZoom || 6,
        minZoom: minZoom || 6,
        maxZoom: maxZoom || 6,
        projection: 'EPSG:3857'
      }),
      controls: [] 
    });

    mapRef.current = map;

    const observer = new ResizeObserver(() => {
      map.updateSize();
    });
    observer.observe(mapElement.current);

    return () => {
      observer.disconnect();
      map.setTarget(null);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !library.length) return;

    const olLayers = map.getLayers();

    // 1. Remove inactive layers
    olLayers.getArray().forEach(layer => {
      const id = layer.get('id');
      if (!activeIds.has(id)) {
        olLayers.remove(layer);
      }
    });

    // 2. Add active layers
    activeIds.forEach(id => {
      const isAlreadyOnMap = olLayers.getArray().some(l => l.get('id') === id);
      
      if (!isAlreadyOnMap) {
        let layer = layerCache.current.get(id);
        if (!layer) {
          const config = library.find(i => i.id === id);
          if (config) {
            layer = createImageryLayer(config);
            if (layer) {
              layer.set('id', id);
              layerCache.current.set(id, layer);
            }
          }
        }
        if (layer) map.addLayer(layer);
      }
    });

    map.updateSize();
  }, [activeIds, library]);

  return (
    <div 
      ref={mapElement} 
      className="new-map-canvas"
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: '#cbd5e1',
        overflow: 'hidden'
      }} 
    />
  );
};
