import React from 'react';
import { useAtom } from 'jotai';
import { plotsAtom } from '../state/projectWizard';
import { NewMap } from './NewMap';
import SvgIcon from './svg/SvgIcon';

export const PlotStep = () => {
  const [plots, setPlots] = useAtom(plotsAtom);

  const updateBounds = (side, val) => setPLots(prev => ({ ...prev, [side]: val }));

  return (
    <div className="imagery-step-layout">
      <div className="imagery-sidebar">
        {/* CARD 1: Boundary Method */}
        <div className="card">
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

        {/* CARD 2: Coordinates (The renamed Draw card) */}
        <div className="card">
          <p className="card-title">DRAW PROJECT BOUNDARY <span style={{color:'red'}}>*</span></p>
          <p style={{fontSize: '0.8rem', color: '#666', marginBottom: '15px'}}>
            To draw a project boundary on the map, hold Ctrl and then click and drag on the map.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '10px' }}>
            <input className="text-input" style={{width: '180px', height: '40px'}} placeholder="North Latitude" 
              value={boundary.north} onChange={e => updateBounds('north', e.target.value)} />
                        
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <input className="text-input" style={{width: '180px', height: '40px'}} placeholder="West Longitude" 
                value={boundary.west} onChange={e => updateBounds('west', e.target.value)} />
              <div style={{ width: '50px', height: '50px', border: '2px solid #ffc107', backgroundColor: '#fff8e1', flexShrink: 0 }} />
              <input className="text-input" style={{width: '180px', height: '40px'}} placeholder="East Longitude" 
                value={boundary.east} onChange={e => updateBounds('east', e.target.value)} />
            </div>

            <input className="text-input" style={{width: '180px', height: '40px'}} placeholder="South Latitude" 
              value={boundary.south} onChange={e => updateBounds('south', e.target.value)} />
          </div>
        </div>

        {/* CARD 3: Plot Generation */}
        <div className="card">
          <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
            <p className="card-title">PLOT GENERATION</p>
            <SvgIcon icon="info" size="1.2rem" />
          </div>
          <p style={{fontSize: '0.85rem', margin: '10px 0'}}>Plot Properties: <strong>Strata 1: Area 3580937 ha</strong></p>
                    
          <label className="text-label" style={{marginTop: '10px'}}>Spatial Distribution <span style={{color:'red'}}>*</span></label>
          <div style={{display: 'flex', gap: '20px', margin: '5px 0'}}>
            {['random', 'gridded'].map(d => (
              <div key={d} className="labeled-input" onClick={() => setPlots(prev => ({...prev, distribution: d}))}>
                <span>{plots.distribution === d ? <SvgIcon icon="radioChecked" size="1.2rem" /> : <SvgIcon icon="radio" size="1.2rem"/>}</span>
                <label className="text-label" style={{textTransform: 'capitalize'}}>{d}</label>
              </div>
            ))}
          </div>

          <label className="text-label" style={{marginTop: '10px'}}>Number of Plots this project will contain <span style={{color:'red'}}>*</span></label>
          <input type="number" className="text-input" style={{height: '40px'}} placeholder="Enter Number" 
            value={plots.numPlots} onChange={e => setPlots(prev => ({...prev, numPlots: e.target.value}))} />

          <label className="text-label" style={{marginTop: '10px'}}>Plot Width (m) <span style={{color:'red'}}>*</span></label>
          <input type="number" className="text-input" style={{height: '40px'}} placeholder="Enter Number" 
            value={plots.plotWidth} onChange={e => setPlots(prev => ({...prev, plotWidth: e.target.value}))} />

          <label className="text-label" style={{marginTop: '10px'}}>Plot Shape <span style={{color:'red'}}>*</span></label>
          <div style={{display: 'flex', gap: '20px', marginTop: '5px'}}>
            {['circle', 'square'].map(s => (
              <div key={s} className="labeled-input" onClick={() => setPlots(prev => ({...prev, plotShape: s}))}>
                <span>{plots.plotShape === s ? <SvgIcon icon="radioChecked" size="1.2rem" /> : <SvgIcon icon="radio" size="1.2rem"/>}</span>
                <label className="text-label" style={{textTransform: 'capitalize'}}>{s}</label>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="map-area">
        <NewMap />
      </div>
    </div>
  );
};
