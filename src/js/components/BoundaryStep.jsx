import React, { useEffect } from 'react';
import { useAtom } from 'jotai';
import { boundaryAtom } from '../state/projectWizard';
import { mapDrawingAtom } from '../state/map';
import { NewMap } from './NewMap';
import SvgIcon from './svg/SvgIcon';


export const BoundaryStep = () => {
  const [boundary, setBoundary] = useAtom(boundaryAtom);
  const [drawnMapBounds, setDrawnMapBounds] = useAtom(mapDrawingAtom);

  useEffect(() => {
    if (drawnMapBounds) {
      // Sync map drawing to your local boundary state
      setBoundary(prev => ({
        ...prev,
        ...drawnMapBounds
      }));
    }
  }, [drawnMapBounds]);

  const updateBounds = (side, val) => setBoundary(prev => ({ ...prev, [side]: val }));

  return (
    <div className="imagery-step-layout">
      <div className="imagery-sidebar">
                
        {/* Section 1: Selection */}
        <div className="card" style={{ width: '100%', margin: '0 0 20px 0' }}>
          <p className="card-title">SELECT PROJECT BOUNDARY GENERATION METHOD <span style={{color:'red'}}>*</span></p>
          {['draw', 'upload', 'shp'].map(m => (
            <div key={m} className="labeled-input" onClick={() => setBoundary(prev => ({...prev, method: m}))}>
              <span>{boundary.method === m ? <SvgIcon icon="radioChecked" size="1.2rem" /> : <SvgIcon icon="radio" size="1.2rem"/>}</span>
              <label className="text-label">
                {m === 'draw' && "Draw Project Boundary on Map"}
                {m === 'upload' && "Upload .shp File"}
                {m === 'shp' && "Define AOI with .shp file"}
              </label>
            </div>
          ))}
        </div>

        {/* Section 2: Conditional Inputs */}
        {boundary.method === 'draw' ? (
          <div className="card" style={{ width: '100%', margin: '0 0 20px 0' }}>
            <p className="card-title">DRAW PROJECT BOUNDARY <span style={{color:'red'}}>*</span></p>
            <p style={{fontSize: '0.8rem', color: '#666', marginBottom: '20px'}}>
              To draw a project boundary on the map, hold <strong>Ctrl</strong> and then click and drag on the map.
            </p>
                        
            {/* Use a simple container for the compass layout */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '10px' }}>
              <div className="coord-group">
                <label className="text-label-sm">North Latitude</label>
                <input className="text-input coord-input" type="number" step="any"
                  value={boundary.north} onChange={e => updateBounds('north', e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <div className="coord-group">
                  <label className="text-label-sm">West Longitude</label>
                  <input className="text-input coord-input" type="number" step="any"
                    value={boundary.west} onChange={e => updateBounds('west', e.target.value)} />
                </div>

                <div style={{ width: '50px', height: '50px', border: '2px solid #ffc107', backgroundColor: '#fff8e1', flexShrink: 0 }} />

                <div className="coord-group">
                  <label className="text-label-sm">East Longitude</label>
                  <input className="text-input coord-input" type="number" step="any"
                    value={boundary.east} onChange={e => updateBounds('east', e.target.value)} />
                </div>
              </div>

              <div className="coord-group">
                <label className="text-label-sm">South Latitude</label>
                <input className="text-input coord-input" type="number" step="any"
                  value={boundary.south} onChange={e => updateBounds('south', e.target.value)} />
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ width: '100%', margin: '0 0 20px 0' }}>
            <p className="card-title">UPLOAD <span style={{color:'red'}}>*</span></p>
            <button className="btn btn-outline-secondary" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <SvgIcon icon="file" size="1.2rem" />
              Upload .shp File
            </button>
          </div>
        )}
      </div>
            
      <div className="map-area" style={{ position: 'relative', height: '100%' }}>
        <div className="map-title-overlay">PROJECT BOUNDARY PREVIEW</div>
        <NewMap
          pan={false}
          allowDrawing={true} />
      </div>
    </div>
  );
};
