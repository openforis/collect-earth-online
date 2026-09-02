import React, { useEffect, useState } from 'react';
import { useSubscription, dispatch } from '@flexsurfer/reflex';
import { event_ids, sub_ids } from '../state/projectWizard';
import { NewMap } from '../components/NewMap';
import Select from '../components/Select';
import SvgIcon from '../components/svg/SvgIcon';
import { getPlotGeometry, generatePreviewSamples } from '../utils/newMercator';

// -------------------
// CONSTANTS
// -------------------

const FILE_SAMPLE_DISTRIBUTIONS = ['csv', 'shp', 'geojson'];

const SAMPLE_FILE_ACCEPT = {
  csv: '.csv',
  shp: '.zip,.shp',
  geojson: '.geojson,.json',
};

// -------------------
// PURE HELPERS
// -------------------

const sanitizeInteger = (value) =>
  /^[0-9]*$/.test(value) ? value : value.slice(0, -1);

// Derives the plot outline shown as AOI on the sample preview map.
const derivePlotPreview = (activePlot, plotSize, plotShape) => {
  if (!activePlot) return { aoiToShow: [], rawPlotGeom: null };

  const rawGeom = activePlot.geometry ? activePlot.geometry : activePlot;

  if (rawGeom.type === 'MultiPolygon' || rawGeom.type === 'Polygon') {
    return { aoiToShow: [rawGeom], rawPlotGeom: rawGeom };
  }

  const plotResult = getPlotGeometry(activePlot, plotSize, plotShape);
  const geom = plotResult ? (plotResult.geometry || plotResult) : null;
  return { aoiToShow: geom ? [geom] : [], rawPlotGeom: geom };
};

// Normalizes any parsed GeoJSON value into a flat list of Features.
const geoJsonToFeatures = (parsed) =>
  parsed.type === 'FeatureCollection' ? (parsed.features || [])
    : parsed.type === 'Feature' ? [parsed]
      : parsed.type === 'GeometryCollection' ? parsed.geometries.map((g) => ({ type: 'Feature', geometry: g }))
        : Array.isArray(parsed) ? parsed
          : [parsed];

// Parses CSV text with lat/lon columns into Point Features.
const csvToFeatures = (text) => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map((h) => h.toLowerCase().trim());
  const latIdx = headers.findIndex((h) => ['lat', 'latitude'].includes(h));
  const lonIdx = headers.findIndex((h) => ['lon', 'longitude', 'lng'].includes(h));
  if (latIdx === -1 || lonIdx === -1) return [];

  return lines
    .slice(1)
    .map((line) => line.split(','))
    .map((cols) => ({ lat: parseFloat(cols[latIdx]), lon: parseFloat(cols[lonIdx]) }))
    .filter(({ lat, lon }) => !Number.isNaN(lat) && !Number.isNaN(lon))
    .map(({ lat, lon }) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] } }));
};

// Normalizes shpjs output (array of FeatureCollections, a single collection, or a Feature).
const shpToFeatures = (parsed) =>
  Array.isArray(parsed) ? parsed.flatMap((fc) => fc.features || [])
    : parsed.type === 'FeatureCollection' ? (parsed.features || [])
      : parsed.type === 'Feature' ? [parsed]
        : [];

const featuresToGeometries = (features) =>
  features
    .map((f) => (f.type === 'Feature' ? f.geometry : f))
    .filter((geom) => geom && geom.type && geom.coordinates);

// Routes a file to the right parser and returns Features.
const parseSampleFile = (file, distribution) => {
  if (distribution === 'geojson') {
    return file.text().then((text) => geoJsonToFeatures(JSON.parse(text)));
  }
  if (distribution === 'csv') {
    return file.text().then(csvToFeatures);
  }
  if (distribution === 'shp' && window.shp) {
    return file.arrayBuffer().then((buffer) => window.shp(buffer)).then(shpToFeatures);
  }
  return Promise.resolve([]);
};

const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

// -------------------
// SAMPLE STEP
// -------------------

export const SampleStep = () => {
  const plotFeatures = useSubscription([sub_ids.plots.plotFeatures]) || [];
  const plotSize = useSubscription([sub_ids.plots.plotSize]) || 10;
  const plotShape = useSubscription([sub_ids.plots.plotShape]) || 'circle';
  const sampleDistribution = useSubscription([sub_ids.samples.sampleDistribution]) || 'random';
  const samplesPerPlot = useSubscription([sub_ids.samples.samplesPerPlot]);
  const sampleResolution = useSubscription([sub_ids.samples.sampleResolution]) || 0;
  const [sampleFeatures, setSampleFeatures] = useState([]);

  const activePlot = plotFeatures.length > 0 ? plotFeatures[0] : null;
  const { aoiToShow, rawPlotGeom } = derivePlotPreview(activePlot, plotSize, plotShape);

  const samplesToShow = FILE_SAMPLE_DISTRIBUTIONS.includes(sampleDistribution)
    ? sampleFeatures
    : generatePreviewSamples(rawPlotGeom, sampleDistribution, samplesPerPlot, sampleResolution);

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
  const sampleDistribution = useSubscription([sub_ids.samples.sampleDistribution]) || 'random';
  const samplesPerPlot = useSubscription([sub_ids.samples.samplesPerPlot]);
  const sampleResolution = useSubscription([sub_ids.samples.sampleResolution]) || 0;
  const sampleFileName = useSubscription([sub_ids.samples.sampleFileName]) || '';
  const availability = useSubscription([sub_ids.availability]) || '';
  const isPublished = availability === 'published';
  const extension = sampleDistribution === 'shp' ? 'zip' : sampleDistribution;

  // Published projects can't use file-based sample distributions; if the
  // loaded project has one, fall back to a selectable option.
  useEffect(() => {
    if (isPublished && FILE_SAMPLE_DISTRIBUTIONS.includes(sampleDistribution)) {
      dispatch([event_ids.samples.sampleDistribution, 'random']);
    }
  }, [isPublished, sampleDistribution]);

  const distributionOptions = [
    ['random', 'Random', false],
    ['gridded', 'Gridded', false],
    ['center', 'Center', false],
    ['csv', 'CSV File', isPublished],
    ['shp', 'SHP File', isPublished],
    ['geojson', 'GeoJSON File', isPublished]
  ];

  const handleDistributionChange = (e) => {
    const value = e.target.value;
    dispatch([event_ids.samples.sampleDistribution, value]);
    if (!FILE_SAMPLE_DISTRIBUTIONS.includes(value)) {
      dispatch([event_ids.samples.sampleFileName, '']);
      dispatch([event_ids.samples.sampleFileBase64, null]);
      setSampleFeatures([]);
    }
  };

  const handleFileUpload = (e) => {
    const [file] = e.target.files;
    if (!file) return;

    dispatch([event_ids.samples.sampleFileName, file.name]);

    readFileAsBase64(file)
      .then((base64) => dispatch([event_ids.samples.sampleFileBase64, base64]))
      .catch((err) => console.error('Error reading sample file:', err));

    parseSampleFile(file, sampleDistribution)
      .then((features) => setSampleFeatures(featuresToGeometries(features)))
      .catch((err) => console.error('Error parsing sample file:', err));
  };

  return (
    <div className="wizard-card">
      <h5 className="card-title">SAMPLE GENERATION *</h5>
      <Select
        label="Spatial Distribution"
        options={distributionOptions}
        value={sampleDistribution}
        onChange={handleDistributionChange}
        colSize="text-input"
      />
      <div className="mt-3 p-3" style={{ backgroundColor: '#e6f4f4', border: '1px solid #2d6f74', color: '#2d6f74', fontSize: '0.9rem' }}>
        <SvgIcon icon="info" size="1rem" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
        Sample points will be distributed within the plot boundary based on the selected method.
      </div>

      {sampleDistribution === 'random' && (
        <div className="form-group mt-3">
          <label className="text-label-sm">Number of Samples</label>
          <input
            className="text-input"
            type="text"
            value={samplesPerPlot}
            onChange={(e) => dispatch([event_ids.samples.samplesPerPlot, sanitizeInteger(e.target.value)])}
          />
        </div>
      )}

      {sampleDistribution === 'gridded' && (
        <div className="form-group mt-3">
          <label className="text-label-sm">Sample Spacing (m)</label>
          <input
            className="text-input"
            type="number"
            value={sampleResolution}
            onChange={(e) => dispatch([event_ids.samples.sampleResolution, Number(e.target.value)])}
          />
        </div>
      )}

      {FILE_SAMPLE_DISTRIBUTIONS.includes(sampleDistribution) && (
        <div className="form-group mt-3">
          <label className="text-label-sm" style={{ fontWeight: 'bold' }}>
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
                accept={SAMPLE_FILE_ACCEPT[sampleDistribution]}
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

  const toggleGeometry = (geom) =>
    dispatch([
      event_ids.plots.designSettings,
      {
        ...designSettings,
        sampleGeometries: { ...sampleGeometries, [geom]: !sampleGeometries[geom] }
      }
    ]);

  return (
    <div className="wizard-card">
      <h5 className="card-title">USER DRAWN SAMPLES</h5>
      <div className="form-check mb-2">
        <input
          type="checkbox"
          className="form-check-input"
          checked={allowDrawnSamples}
          onChange={() => dispatch([event_ids.samples.allowDrawnSamples, !allowDrawnSamples])}
        />
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
            {Object.keys(sampleGeometries).map((geom) => (
              <div key={geom} className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={sampleGeometries[geom]}
                  onChange={() => toggleGeometry(geom)}
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
