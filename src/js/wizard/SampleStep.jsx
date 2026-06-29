import React from 'react';
import { useSubscription, dispatch } from '@flexsurfer/reflex';
import { event_ids, sub_ids } from '../state/projectWizard';
import { NewMap } from '../components/NewMap';
import Select from '../components/Select';
import SvgIcon from '../components/svg/SvgIcon';
import { getPlotGeometry, generatePreviewSamples } from '../utils/newMercator';

export const SampleStep = () => {
  const plotFeatures = useSubscription([sub_ids.plots.plotFeatures]) || [];
  const plotSize = useSubscription([sub_ids.plots.plotSize]) || 10;
  const plotShape = useSubscription([sub_ids.plots.plotShape]) || 'circle';

  const sampleDistribution = useSubscription([sub_ids.samples.sampleDistribution]) || "random";
  const samplesPerPlot = useSubscription([sub_ids.samples.samplesPerPlot]) || 1;
  const sampleResolution = useSubscription([sub_ids.samples.sampleResolution]) || 0;
  const activePlot = (plotFeatures.length > 0) ? plotFeatures[0] : null;
  
  let aoiToShow = [];
  let rawPlotGeom = null;

  if (activePlot) {
    const geomType = activePlot.geometry ? activePlot.geometry.type : activePlot.type;
    const rawGeom = activePlot.geometry ? activePlot.geometry : activePlot;

    if (geomType === 'MultiPolygon' || geomType === 'Polygon') {
      rawPlotGeom = rawGeom;
      aoiToShow = [rawGeom];
    } else {
      const plotResult = getPlotGeometry(activePlot, plotSize, plotShape);
      rawPlotGeom = plotResult ? (plotResult.geometry || plotResult) : null;
      aoiToShow = rawPlotGeom ? [rawPlotGeom] : [];
    }
  }

  const samplesToShow = generatePreviewSamples(
    rawPlotGeom,
    sampleDistribution,
    samplesPerPlot,
    sampleResolution
  );

  return (
    <div className="wizard-step-layout">
      <div className="wizard-sidebar">
        <SampleGenerationCard />
        <UserDrawnSamplesCard />
      </div>
      <div className="map-area">
        <div className="map-title-overlay">SAMPLE PREVIEW</div>
        <NewMap 
          pan={false} 
          allowDrawing={false} 
          aoiToShow={aoiToShow} 
          plotsToShow={[]} 
          samplesToShow={samplesToShow}
        />
      </div>
    </div>
  );
};

export const SampleGenerationCard = () => {
  const sampleDistribution = useSubscription([sub_ids.samples.sampleDistribution]) || "random";
  const samplesPerPlot = useSubscription([sub_ids.samples.samplesPerPlot]) || 1;
  const sampleResolution = useSubscription([sub_ids.samples.sampleResolution]) || 0;

  const distributionOptions = [
    ["random", "Random", false],
    ["gridded", "Gridded", false],
    ["center", "Center", false],
    ["csv", "CSV File", false],
    ["shp", "SHP File", false],
    ["geojson", "GeoJSON File", false]
  ];

  return (
    <div className="wizard-card">
      <h5 className="card-title">SAMPLE GENERATION *</h5>
      <Select 
        label="Spatial Distribution"
        options={distributionOptions}
        value={sampleDistribution}
        onChange={(e) => dispatch([event_ids.samples.sampleDistribution, e.target.value])}
        colSize="text-input"
      />
      
      <div className="mt-3 p-3" style={{ backgroundColor: '#e6f4f4', border: '1px solid #2d6f74', color: '#2d6f74', fontSize: '0.9rem' }}>
        <SvgIcon icon="info" size="1rem" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
        Sample points will be distributed within the plot boundary based on the selected method.
      </div>

      {sampleDistribution === 'random' && (
        <div className="form-group mt-3">
          <label className="text-label-sm">Number of Samples</label>
          <input className="text-input" type="number" value={samplesPerPlot} 
            onChange={(e) => dispatch([event_ids.samples.samplesPerPlot, Number(e.target.value)])} />
        </div>
      )}

      {sampleDistribution === 'gridded' && (
        <div className="form-group mt-3">
          <label className="text-label-sm">Sample Spacing (m)</label>
          <input className="text-input" type="number" value={sampleResolution} 
            onChange={(e) => dispatch([event_ids.samples.sampleResolution, Number(e.target.value)])} />
        </div>
      )}
    </div>
  );
};

export const UserDrawnSamplesCard = () => {
  const designSettings = useSubscription([sub_ids.plots.designSettings]) || {};
  const allowDrawnSamples = useSubscription([sub_ids.samples.allowDrawnSamples]) || false;
  
  // Reading strictly from designSettings
  const sampleGeometries = designSettings.sampleGeometries || { points: true, lines: false, polygons: false };

  return (
    <div className="wizard-card">
      <h5 className="card-title">USER DRAWN SAMPLES *</h5>
      <div className="form-check mb-2">
        <input type="checkbox" className="form-check-input" checked={allowDrawnSamples} 
          onChange={() => dispatch([event_ids.samples.allowDrawnSamples, !allowDrawnSamples])} />
        <label className="form-check-label">Allow users to draw their own samples</label>
      </div>

      {allowDrawnSamples && (
        <>
          <div className="mt-3 p-3" style={{ backgroundColor: '#e6f4f4', border: '1px solid #2d6f74', color: '#2d6f74', fontSize: '0.9rem' }}>
            <SvgIcon icon="info" size="1rem" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Enable this to allow users to draw and label points, lines, and polygons during data collection.
          </div>

          <div className="mt-3">
            <label className="text-label-sm">Allowed sample geometries</label>
            {Object.keys(sampleGeometries).map(geom => (
              <div key={geom} className="form-check">
                <input 
                  type="checkbox" 
                  className="form-check-input" 
                  checked={sampleGeometries[geom]} 
                  onChange={() => {
                    // FIX: Dispatch the updated designSettings object back to the plots event
                    const updatedGeometries = { 
                      ...sampleGeometries, 
                      [geom]: !sampleGeometries[geom] 
                    };
                    
                    dispatch([
                      event_ids.plots.designSettings, 
                      { ...designSettings, sampleGeometries: updatedGeometries }
                    ]);
                  }} 
                />
                <label className="form-check-label text-capitalize">{geom}</label>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
