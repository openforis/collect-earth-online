import React, { useState } from 'react';
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
  const [sampleFeatures, setSampleFeatures] = useState([]);

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

  const isFileDistribution = ['csv', 'shp', 'geojson'].includes(sampleDistribution);
  const samplesToShow = isFileDistribution
    ? sampleFeatures
    : generatePreviewSamples(
      rawPlotGeom,
      sampleDistribution,
      samplesPerPlot,
      sampleResolution
    );

  return (
    <div className="wizard-step-layout">
      <div className="wizard-sidebar">
        <SampleGenerationCard setSampleFeatures={setSampleFeatures} />
        <UserDrawnSamplesCard />
      </div>
      <div className="map-area">
        <div className="map-title-overlay">SAMPLE PREVIEW</div>
        <NewMap 
          pan={false} 
          allowDrawing={false} 
          aoiToShow={aoiToShow}
          preview={true}
          plotsToShow={[]} 
          samplesToShow={samplesToShow}
        />
      </div>
    </div>
  );
};

export const SampleGenerationCard = ({ setSampleFeatures }) => {
  const sampleDistribution = useSubscription([sub_ids.samples.sampleDistribution]) || "random";
  const samplesPerPlot = useSubscription([sub_ids.samples.samplesPerPlot]) || 1;
  const sampleResolution = useSubscription([sub_ids.samples.sampleResolution]) || 0;
  const sampleFileName = useSubscription([sub_ids.samples.sampleFileName]) || "";
  const extension = sampleDistribution === 'shp' ? 'zip' : sampleDistribution;

  const distributionOptions = [
    ["random", "Random", false],
    ["gridded", "Gridded", false],
    ["center", "Center", false],
    ["csv", "CSV File", false],
    ["shp", "SHP File", false],
    ["geojson", "GeoJSON File", false]
  ];

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    dispatch([event_ids.samples.sampleFileName, file.name]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result.split(',')[1];
      dispatch([event_ids.samples.sampleFileBase64 || 'samples.sampleFileBase64', base64]);
    };
    reader.readAsDataURL(file);

    try {
      let rawFeatures = [];

      if (sampleDistribution === 'geojson') {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (parsed.type === 'FeatureCollection') {
          rawFeatures = parsed.features || [];
        } else if (parsed.type === 'Feature') {
          rawFeatures = [parsed];
        } else if (parsed.type === 'GeometryCollection') {
          rawFeatures = parsed.geometries.map(g => ({ type: 'Feature', geometry: g }));
        } else if (Array.isArray(parsed)) {
          rawFeatures = parsed;
        } else {
          rawFeatures = [parsed];
        }

      } else if (sampleDistribution === 'csv') {
        const text = await file.text();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.toLowerCase().trim());
          const latIdx = headers.findIndex(h => h === 'lat' || h === 'latitude');
          const lonIdx = headers.findIndex(h => h === 'lon' || h === 'longitude' || h === 'lng');
          if (latIdx !== -1 && lonIdx !== -1) {
            rawFeatures = lines.slice(1).reduce((acc, line) => {
              const cols = line.split(',');
              const lat = parseFloat(cols[latIdx]);
              const lon = parseFloat(cols[lonIdx]);
              if (!isNaN(lat) && !isNaN(lon)) {
                acc.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] } });
              }
              return acc;
            }, []);
          }
        }

      } else if (sampleDistribution === 'shp') {
        if (window.shp) {
          const buffer = await file.arrayBuffer();
          const parsed = await window.shp(buffer);
          if (Array.isArray(parsed)) {
            rawFeatures = parsed.reduce((acc, fc) => acc.concat(fc.features || []), []);
          } else if (parsed.type === 'FeatureCollection') {
            rawFeatures = parsed.features || [];
          } else if (parsed.type === 'Feature') {
            rawFeatures = [parsed];
          }
        }
      }

      const geometries = rawFeatures
        .map(f => f.type === 'Feature' ? f.geometry : f)
        .filter(geom => geom && geom.type && geom.coordinates);
        
      setSampleFeatures(geometries);
    } catch (err) {
      console.error("Error parsing sample file:", err);
    }
  };
  return (
    <div className="wizard-card">
      <h5 className="card-title">SAMPLE GENERATION *</h5>
      <Select 
        label="Spatial Distribution"
        options={distributionOptions}
        value={sampleDistribution}
        onChange={(e) => {
          const val = e.target.value;
          dispatch([event_ids.samples.sampleDistribution, val]);
          if (!['csv', 'shp', 'geojson'].includes(val)) {
            dispatch([event_ids.samples.sampleFileName, '']);
            dispatch([event_ids.samples.sampleFileBase64 || 'samples.sampleFileBase64', null]);
            setSampleFeatures([]);
          }
        }}
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

      {['csv', 'shp', 'geojson'].includes(sampleDistribution) && (
        <div className="form-group mt-3">
          <label className="text-label-sm" style={{fontWeight: 'bold'}}>
            UPLOAD SAMPLE FILE <span style={{ color: 'red' }}>*</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <label
              className="btn btn-sm btn-outline-lightgreen py-2 px-3 text-nowrap"
              htmlFor="sample-file-upload-input"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}
            >
              <SvgIcon icon="plus" size="0.9rem" />
              Upload {sampleDistribution.toUpperCase()} file
              <input
                type="file"
                id="sample-file-upload-input"
                accept={
                  sampleDistribution === 'csv' ? '.csv' :
                    sampleDistribution === 'shp' ? '.zip,.shp' :
                      '.geojson,.json'
                }
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </label>
            <span className="text-label-sm" style={{ color: sampleFileName ? '#333' : '#999', fontStyle: !sampleFileName ? 'italic' : 'normal' }}>
              {sampleFileName ? `File: ${sampleFileName}` : 'No dataset file uploaded'}
            </span>
          </div>
          <a href={`test_data/sample-${sampleDistribution}-example.${extension}`} className="text-label-sm mb-3" style={{ textDecoration: 'underline', color: '#007bff' }}>
          Download example sample file
        </a>
        </div>
      )}
    </div>
  );
};

export const UserDrawnSamplesCard = () => {
  const designSettings = useSubscription([sub_ids.plots.designSettings]) || {};
  const allowDrawnSamples = useSubscription([sub_ids.samples.allowDrawnSamples]) || false;
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
