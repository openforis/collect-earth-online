import React, { useEffect, useState, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { dispatch, useSubscription } from '@flexsurfer/reflex';
import { sub_ids, event_ids } from '../state/projectWizard';
import { mapImageryLibraryAtom, activeMapLayerIdsAtom } from '../state/map';
import { NewMap } from '../components/NewMap';
import SvgIcon from '../components/svg/SvgIcon';

export const ImageryStep = ({ imageryList = [] }) => {
//  const [previewId, setPreviewId] = useState("");
  function setPreviewId (previewId) {dispatch([event_ids.imagery.previewId, previewId]);}
  const previewId = useSubscription([sub_ids.imagery.previewId]);
  const initialized = useRef(false);
  const setMapLibrary = useSetAtom(mapImageryLibraryAtom);
  const setActiveMapLayers = useSetAtom(activeMapLayerIdsAtom);

  function setSelectedIds (newIds) {
    dispatch([event_ids.imagery.imageryList, newIds]);
  }
  const selectedIds = useSubscription([sub_ids.imagery.imageryList]) || [];

  useEffect(() => {
    setMapLibrary(imageryList);
    if (imageryList && imageryList.length > 0 && !initialized.current) {
      const platformItems = imageryList.filter(img => img.visibility === 'platform');
      if (platformItems.length > 0) {
        setPreviewId(platformItems[0].id.toString());
      }
      initialized.current = true;
    }
  }, [imageryList]);

  useEffect(() => {
    const previewArray = previewId ? [Number(previewId)] : [];
    setActiveMapLayers(new Set(previewArray));
  }, [previewId, setActiveMapLayers]);

  const groupedImagery = (imageryList || []).reduce((acc, img) => {
    const vis = img.visibility || 'public';
    if (!acc[vis]) acc[vis] = [];
    acc[vis].push(img);
    return acc;
  }, {});

  const VisibilitySection = ({ title, type }) => {
    const items = groupedImagery[type] || [];        
    return (
      <div className="visibility-section" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <SvgIcon icon="downCaret" size="0.8rem" /> 
          <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{title} Imagery</span>
          <SvgIcon icon="info" size="1rem" color="#666" />
        </div>
        <div style={{ paddingLeft: '20px' }}>
          {items.length > 0 ? (
            items.map(img => {
              const isSelected = selectedIds.includes(img.id);
              return (
                <div 
                  key={img.id} 
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', cursor: 'pointer' }}
                  onClick={() => {
                    const newIds = isSelected
                      ? selectedIds.filter(i => i !== img.id)
                      : [...selectedIds, img.id];
                    setSelectedIds(newIds);
                  }}
                >
                  <SvgIcon 
                    icon={isSelected ? "checkboxChecked" : "checkboxUnchecked"} 
                    size="1.2rem" 
                    color={isSelected ? "#2d6f74" : "#ccc"} 
                  />
                  <label style={{ fontSize: '0.85rem', cursor: 'pointer' }}>{img.title}</label>
                </div>
              );
            })
          ) : (
            <p style={{ fontSize: '0.85rem', color: '#999', fontStyle: 'italic', margin: '5px 0' }}>
              No {title.toLowerCase()} imagery found
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="wizard-step-layout">
      <div className="wizard-sidebar">
        <div className="wizard-card">
          <section style={{ marginBottom: '30px', width: '100%' }}>
            <p className="card-title">IMAGERY PREVIEW</p>
            <select
              className="text-input"
              value={previewId}
              onChange={(e) => setPreviewId(e.target.value)}
            >
              <option value="">Select imagery to preview</option>
              {imageryList.map(img => (
                <option key={img.id} value={img.id}>{img.title}</option>
              ))}
            </select>
          </section>

          <section style={{ marginBottom: '30px', width: '100%' }}>
            <p className="card-title">DEFAULT IMAGERY <span style={{color: 'red'}}>*</span></p>
            <label className="text-label" style={{ display: 'block', marginBottom: '5px' }}>Base Map</label>
            <select
              className="text-input"
              value={selectedIds[0] || ""}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSelectedIds([val, ...selectedIds.filter(i => i !== val)]);
              }}
            >
              <option value="" disabled>Select a base map</option>
              {imageryList.map(img => (
                <option key={img.id} value={img.id}>{img.title}</option>
              ))}
            </select>
          </section>

          <section style={{ width: '100%' }}>
            <p className="card-title">ADDITIONAL IMAGERY (OPTIONAL)</p>
            <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '15px' }}>
              {selectedIds.length} Selected
            </p>
            
            <VisibilitySection title="CEO Platform" type="platform" />
            <VisibilitySection title="Institution" type="private" />
            <VisibilitySection title="Public" type="public" />
          </section>
        </div>
      </div>
      <div className="map-area">
        <NewMap
          pan={false}
          allowDrawing={false}
          initZoom={6}
        />
      </div>
    </div>
  );
};
