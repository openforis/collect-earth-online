import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSubscription, dispatch } from '@flexsurfer/reflex';
import { useSetAtom } from 'jotai';
import DatePicker from 'react-datepicker';

import { NewMap } from '../components/NewMap';
import { mapImageryLibraryAtom, activeMapLayerIdsAtom } from '../state/map';
import Select from '../components/Select';
import UserSelect from '../components/UserSelect';
import SvgIcon from '../components/svg/SvgIcon';
import Modal from '../components/Modal';
import { formatNumberWithCommas, readFileAsBase64Url } from '../utils/generalUtils';
import {
  calculateGeoJsonArea,
  generateRandomPlots,
  generateGriddedPlots,
  estimateGriddedPlotCount
} from '../utils/newMercator';
import {
  event_ids,
  sub_ids
} from '../state/projectWizard';
import { InfoTooltip } from '../components/PageComponents';

// -------------------
// CONSTANTS
// -------------------

const PLOT_LIMIT = 5000;

const FILE_DISTRIBUTIONS = ['shp', 'geojson', 'csv'];

const GENERATED_DISTRIBUTIONS = ['random', 'gridded'];

const ACCEPTED_MIME_TYPES = {
  csv: 'text/csv',
  shp: 'application/zip',
  geojson: 'application/json',
};

const PLOT_ID_KEYS = ['visible_id', 'plotid', 'plot_id', 'PlotID', 'plotId', 'PLOTID'];

const DISTRIBUTION_LABELS = {
  random: 'Random',
  gridded: 'Gridded',
  shp: 'Zipped Shapefile (.shp)',
  geojson: 'GeoJSON File',
  csv: 'CSV Vector Points Table',
};

const PLOT_GENERATION_MODES = {
  standard: {
    title: 'PLOT GENERATION',
    fileOnly: false,
    banner: (total) => `This project will contain around ${formatNumberWithCommas(total)} plots.`,
    subs: {
      distribution: sub_ids.plots.plotDistribution,
      plotSize: sub_ids.plots.plotSize,
      plotShape: sub_ids.plots.plotShape,
      totalPlots: sub_ids.plots.totalPlots,
      plotFileName: sub_ids.plots.plotFileName,
    },
    events: {
      distribution: event_ids.plots.plotDistribution,
      plotSize: event_ids.plots.plotSize,
      plotShape: event_ids.plots.plotShape,
      totalPlots: event_ids.plots.totalPlots,
      plotFeatures: event_ids.plots.plotFeatures,
      plotFileName: event_ids.plots.plotFileName,
      plotFileBase64: event_ids.plots.plotFileBase64,
    },
  },
  append: {
    title: 'NEW PLOT GENERATION',
    fileOnly: true,
    banner: (total) => `${formatNumberWithCommas(total)} new plots will be added to this project.`,
    subs: {
      distribution: sub_ids.plots.newPlotDistribution,
      plotSize: sub_ids.plots.newPlotSize,
      plotShape: sub_ids.plots.newPlotShape,
      totalPlots: sub_ids.plots.newTotalPlots,
      plotFileName: sub_ids.plots.newPlotFileName,
    },
    events: {
      distribution: event_ids.plots.newPlotDistribution,
      plotSize: event_ids.plots.newPlotSize,
      plotShape: event_ids.plots.newPlotShape,
      totalPlots: event_ids.plots.newTotalPlots,
      plotFeatures: event_ids.plots.newPlotFeatures,
      plotFileName: event_ids.plots.newPlotFileName,
      plotFileBase64: event_ids.plots.newPlotFileBase64,
    },
  },
};

// -------------------
// PURE HELPERS
// -------------------

const sanitizeDecimal = (value) =>
  value !== '' && /^[0-9]*\.?[0-9]*$/.test(value) ? value : value.slice(0, -1);

const sanitizePlotCount = (value) =>
  /^[0-9]*$/.test(value) && Number(value) > 0 && Number(value) <= PLOT_LIMIT
    ? value
    : value.slice(0, -1);

const computePlotGeneration = ({ distribution, numPlots, plotSpacing, plotSize, aoi }) => {
  if (distribution === 'random' && numPlots > 0 && plotSize > 0) {
    return numPlots > PLOT_LIMIT
      ? { kind: 'error', message: 'A maximum of 5,000 plots is allowed for random distribution.' }
      : { kind: 'plots', plots: generateRandomPlots(aoi, numPlots) };
  }

  if (distribution === 'gridded' && plotSpacing > 0 && plotSize > 0) {
    const estimatedCount = estimateGriddedPlotCount(aoi, plotSpacing);
    if (estimatedCount > PLOT_LIMIT) {
      return {
        kind: 'error',
        message: `Current spacing results in ~${formatNumberWithCommas(estimatedCount)} plots (Max 5,000). Please increase plot spacing.`
      };
    }
    const plots = generateGriddedPlots(aoi, plotSpacing, plotSize);
    return plots.length > PLOT_LIMIT
      ? {
        kind: 'error',
        message: `Generated ${formatNumberWithCommas(plots.length)} plots (Max 5,000). Please slightly increase plot spacing.`
      }
      : { kind: 'plots', plots };
  }

  return (numPlots > 0 || plotSpacing > 0) && plotSize > 0
    ? { kind: 'clear' }
    : { kind: 'noop' };
};

// Extracts visible ids from plot file.
const extractPlotIds = (plots) =>
  plots
    .map((plot) => {
      const props = plot.properties || plot;
      const idKey = Object.keys(props).find((key) => PLOT_ID_KEYS.includes(key));
      return idKey ? props[idKey] : undefined;
    })
    .filter((id) => id != null);

// Extracts geometries from plot file.
const extractPlotGeometries = (plots) =>
  plots
    .map((plot) => (plot ? (plot.type ? plot : plot.plot_geom || plot.plotGeom) : null))
    .filter(Boolean);

// Builds a rectangular AOI polygon from a file's [[lonMin, latMin], [lonMax, latMax]] extent.
const boundaryBoxFromExtent = ([[lonMin, latMin], [lonMax, latMax]]) => [
  {
    type: 'Polygon',
    coordinates: [
      [
        [lonMin, latMax],
        [lonMax, latMax],
        [lonMax, latMin],
        [lonMin, latMin],
        [lonMin, latMax]
      ]
    ]
  }
];

// -------------------
// PLOT STEP
// -------------------

export const PlotStep = ({ imageryList = [] }) => {
  const aoiFeatures = useSubscription([sub_ids.boundary.aoiFeatures]) || [];
  const plotFeatures = useSubscription([sub_ids.plots.plotFeatures]) || [];
  const institutionUsers = useSubscription([sub_ids.institution.users]) || [];
  const plotDistribution = useSubscription([sub_ids.plots.plotDistribution]) || 'random';
  const totalPlotsCalculated = useSubscription([sub_ids.plots.totalPlots]) || 0;
  const modal = useSubscription([sub_ids.modal]);
  const [uploadedPlotIds, setUploadedPlotIds] = useState([]);
  const setMapLibrary = useSetAtom(mapImageryLibraryAtom);
  const setActiveMapLayers = useSetAtom(activeMapLayerIdsAtom);
  const initializedMap = useRef(false);
  const newPlotFeatures = useSubscription([sub_ids.plots.newPlotFeatures]) || [];

  useEffect(() => {
    setMapLibrary(imageryList);
    if (imageryList && imageryList.length > 0 && !initializedMap.current) {
      const [defaultImagery] = imageryList.filter((img) => img.visibility === 'platform');
      setActiveMapLayers(new Set([defaultImagery]));
      initializedMap.current = true;
    }
  }, [imageryList]);

  const plotIdList = useMemo(
    () =>
      GENERATED_DISTRIBUTIONS.includes(plotDistribution)
        ? Array.from(
          { length: Math.min(totalPlotsCalculated, PLOT_LIMIT) },
          (_, i) => i + 1
        )
        : uploadedPlotIds,
    [plotDistribution, totalPlotsCalculated, uploadedPlotIds]
  );

  const plotsToDisplay = useMemo(
    () => [...plotFeatures, ...newPlotFeatures],
    [plotFeatures, newPlotFeatures]
  );

  return (
    <div className="wizard-step-layout">
      {modal?.message && (
        <Modal title={modal.title} onClose={() => dispatch([event_ids.modal, null])}>
          <p>{modal.message}</p>
        </Modal>
      )}

      <div className="wizard-sidebar">
        <ExistingPlotsCard />
        <PlotGenerationCard onUploadedPlotIds={setUploadedPlotIds} />
        <PlotSimilarityCard plotIdList={plotIdList} />
        <AssignPlotsCard totalPlots={totalPlotsCalculated} institutionUserList={institutionUsers}/>
        <QualityControlCard totalPlots={totalPlotsCalculated} institutionUserList={institutionUsers}/>
      </div>

      <div className="map-area">
        <div className="map-title-overlay">PLOT PREVIEW</div>
        <NewMap
          pan={false}
          allowDrawing={false}
          preview={true}
          aoiToShow={aoiFeatures}
          plotsToShow={plotsToDisplay}
        />
      </div>
    </div>
  );
};

export const PlotGenerationCard = ({ onUploadedPlotIds }) => {
  const availability = useSubscription([sub_ids.availability]) || '';
  const isPublished = availability === 'published';
  const mode = PLOT_GENERATION_MODES[isPublished ? 'append' : 'standard'];

  const projectId = useSubscription([sub_ids.projectId]) || -1;
  const boundaryMethod = useSubscription([sub_ids.boundary.generationMethod]) || 'manual';
  const aoiFeatures = useSubscription([sub_ids.boundary.aoiFeatures]) || [];
  const plotsSource = useSubscription([sub_ids.plots.plotsSource]);
  const designSettings = useSubscription([sub_ids.plots.designSettings]) || {};
  // standard-mode-only fields (always subscribed; only rendered in standard mode)
  const numPlots = useSubscription([sub_ids.plots.numPlots]) || '';
  const plotSpacing = useSubscription([sub_ids.plots.plotSpacing]) || '';
  const shufflePlots = useSubscription([sub_ids.plots.shufflePlots]) || false;
  // mode-routed fields
  const plotDistribution = useSubscription([mode.subs.distribution]) || (mode.fileOnly ? 'csv' : 'random');
  const plotSize = useSubscription([mode.subs.plotSize]) || '';
  const plotShape = useSubscription([mode.subs.plotShape]) || 'circle';
  const totalPlotsCalculated = useSubscription([mode.subs.totalPlots]) || 0;
  const plotFileName = useSubscription([mode.subs.plotFileName]) || '';

  const [plotLimitError, setPlotLimitError] = useState('');

  const activeAreaGeometry = aoiFeatures[0];
  const isBoundaryFileDriven = boundaryMethod === 'plotFile' || boundaryMethod === 'shpFile';

  // Debounced random/gridded generation — standard mode only.
  useEffect(() => {
    if (isPublished || plotsSource === 'server') return undefined;
    if (!activeAreaGeometry || FILE_DISTRIBUTIONS.includes(plotDistribution)) {
      setPlotLimitError('');
      return undefined;
    }

    const applyGeneration = () => {
      const result = computePlotGeneration({
        distribution: plotDistribution,
        numPlots,
        plotSpacing,
        plotSize,
        aoi: activeAreaGeometry
      });

      setPlotLimitError(result.kind === 'error' ? result.message : '');

      if (result.kind === 'plots' && result.plots.length > 0) {
        dispatch([event_ids.plots.totalPlots, result.plots.length]);
        dispatch([event_ids.plots.plotFeatures, result.plots]);
      } else if (result.kind !== 'noop') {
        dispatch([event_ids.plots.totalPlots, 0]);
        dispatch([event_ids.plots.plotFeatures, []]);
      }
    };

    const handler = setTimeout(applyGeneration, 600);
    return () => clearTimeout(handler);
  }, [isPublished, plotDistribution, numPlots, plotSpacing, plotSize, activeAreaGeometry, plotsSource]);

  // Keeps the distribution compatible with the boundary method — standard mode only.
  useEffect(() => {
    if (isPublished) return;
    const nextDistribution =
      GENERATED_DISTRIBUTIONS.includes(plotDistribution) && isBoundaryFileDriven
        ? 'shp'
        : FILE_DISTRIBUTIONS.includes(plotDistribution) && !isBoundaryFileDriven
          ? 'random'
          : null;

    nextDistribution && dispatch([event_ids.plots.plotDistribution, nextDistribution]);
  }, [isPublished, boundaryMethod, plotDistribution, isBoundaryFileDriven]);

  const checkUploadedPlotFile = (fileType, fileName, base64Payload) => {
    fetch('/check-plot-file', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plotFileType: fileType,
        projectId: isPublished ? projectId : 0,
        plotFileName: fileName,
        plotFileBase64: base64Payload
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        dispatch([mode.events.totalPlots, data.plots?.length]);
        dispatch([mode.events.plotFileName, fileName]);
        dispatch([mode.events.plotFileBase64, base64Payload]);

        // Only the original design flow may take assignments and AOI from the file;
        // appends must not touch the published project's boundary or assignments.
        if (!isPublished) {
          dispatch([event_ids.plots.designSettings, {
            ...designSettings,
            userAssignment: data.userAssignment,
            qaqcAssignment: data.qaqcAssignment
          }]);
          data.fileBoundary &&
            dispatch([event_ids.boundary.aoiFeatures, boundaryBoxFromExtent(data.fileBoundary)]);
        }

        if (data.plots && data.plots.length > 0) {
          onUploadedPlotIds && onUploadedPlotIds(extractPlotIds(data.plots));
          dispatch([mode.events.plotFeatures, extractPlotGeometries(data.plots)]);
        }
      })
      .catch((err) => {
        console.error(err);
        dispatch([event_ids.errors, [['File Error', ['Failed to parse file']]]]);
      });
  };

  const processIncomingDataFile = (e, fileType) => {
    const [file] = e.target.files;
    file && readFileAsBase64Url(file, (base64String) => {
      checkUploadedPlotFile(fileType, file.name, base64String);
    });
  };

    const labelPlotDimensionUnits = plotShape === 'circle' ? 'Plot Diameter (m)' : 'Plot Width (m)';

  const renderPlotShapeInput = () => (
    <div className="form-group mb-3">
      <label>Plot Shape <span style={{ color: 'red' }}>*</span></label>
      <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => dispatch([event_ids.plots.plotShape, "circle"])}>
          <SvgIcon icon={plotShape === "circle" ? "radioChecked" : "radio"} size="1.2rem" />
          <span className="text-label-sm" style={{ margin: 0 }}>Circle</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => dispatch([event_ids.plots.plotShape, "square"])}>
          <SvgIcon icon={plotShape === "square" ? "radioChecked" : "radio"} size="1.2rem" />
          <span className="text-label-sm" style={{ margin: 0 }}>Square</span>
        </div>
      </div>
    </div>
  );

  const renderPlotSizeInput = () => (
    <div className="form-group mb-3">
      <label className="text-label-sm">{labelPlotDimensionUnits} <span style={{ color: 'red' }}>*</span></label>
      <input
        type="text"
        className="text-input"
        placeholder="Enter Number"
        value={plotSize}
        onChange={(e) => dispatch([event_ids.plots.plotSize, sanitizeDecimal(e.target.value)])}
      />
    </div>
  );

  const renderRandomLayout = () => (
    <>
      <div className="form-group mb-3">
        <label>Number of Plots <span style={{ color: 'red' }}>*</span></label>
        <input
          type="text"
          className="text-input"
          placeholder="Enter Number (Max 5000)"
          value={numPlots}
          onChange={(e) => dispatch([event_ids.plots.numPlots, sanitizePlotCount(e.target.value)])}
        />
      </div>
      {renderPlotSizeInput()}
    </>
  );

  const renderGriddedLayout = () => (
    <>
      <div className="form-group mb-3">
        <label className="text-label-sm">Plot Spacing (m) <span style={{ color: 'red' }}>*</span></label>
        <input
          type="number"
          className="text-input"
          placeholder="Enter Number"
          value={plotSpacing}
          onChange={(e) => dispatch([event_ids.plots.plotSpacing, Number(e.target.value)])}
        />
      </div>
      {renderPlotSizeInput()}
      <div className="form-check mb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => dispatch([event_ids.plots.shufflePlots, !shufflePlots])}>
        <SvgIcon icon={shufflePlots ? "checkboxChecked" : "checkboxUnchecked"} size="1.2rem" />
        <label className="text-label-sm" style={{ margin: 0, cursor: 'pointer' }}>Shuffle plot distribution matrix order</label>
      </div>
    </>
  );

  const renderFileBasedLayout = (fileType) => {
    const extension = fileType === 'shp' ? 'zip' : fileType;
    const downloadHref = `test_data/plot-${fileType}-example.${extension}`;

    return (
      <div className="d-flex flex-column mb-3">
        <label className="text-label-sm" style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
          UPLOAD PLOT FILE <span style={{ color: 'red' }}>*</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
          <label
            className="btn btn-sm btn-outline-darkgreen py-2 px-3 text-nowrap"
            htmlFor="plot-file-upload-input"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}
          >
            <SvgIcon icon="plus" size="0.9rem" />
            Upload {fileType.toUpperCase()} file
            <input
              type="file"
              id="plot-file-upload-input"
              accept={ACCEPTED_MIME_TYPES[fileType]}
              style={{ display: 'none' }}
              onChange={(e) => processIncomingDataFile(e, fileType)}
            />
          </label>
          <span className="text-label-sm" style={{ color: plotFileName ? '#333' : '#999', fontStyle: !plotFileName ? 'italic' : 'normal' }}>
            {plotFileName ? `File: ${plotFileName}` : 'No dataset file uploaded'}
          </span>
        </div>
        <a href={downloadHref} className="text-label-sm mb-3" style={{ textDecoration: 'underline' }}>
          Download example {fileType.toUpperCase()} file
        </a>
        {fileType === 'csv' && (
          <>
            {renderPlotSizeInput()}
            {renderPlotShapeInput()}
          </>
        )}
      </div>
    );
  };

  const distributions = {
    ...(!mode.fileOnly && {
      random: { label: DISTRIBUTION_LABELS.random,
        disabled: isBoundaryFileDriven,
        renderer: renderRandomLayout },
      gridded: { label: DISTRIBUTION_LABELS.gridded,
        disabled: isBoundaryFileDriven,
        renderer: renderGriddedLayout },
    }),
    shp: { label: DISTRIBUTION_LABELS.shp,
      disabled: !mode.fileOnly && !isBoundaryFileDriven,
      renderer: () => renderFileBasedLayout('shp') },
    geojson: { label: DISTRIBUTION_LABELS.geojson,
      disabled: !mode.fileOnly && !isBoundaryFileDriven,
      renderer: () => renderFileBasedLayout('geojson') },
    csv: { label: DISTRIBUTION_LABELS.csv,
      disabled: !mode.fileOnly && !isBoundaryFileDriven,
      renderer: () => renderFileBasedLayout('csv') },
  };

  const distributionOptions = Object.entries(distributions)
    .map(([value, { label, disabled }]) => [value, label, disabled]);
  
  return (
    <div className="wizard-card">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="card-title">{mode.title}</h5>
        <InfoTooltip
          title="Plot Generation"
          align="end"
          text={
            <>
              Plot designs are areas where you will then have samples to provide an unbiased estimate of some population measure.
              <a href="https://collect-earth-online-doc.readthedocs.io/en/latest/project/plotsample.html" target="_blank"> Learn more</a>
            </>
          } />
      </div>

      {activeAreaGeometry && (
        <div className="mb-3 text-secondary small" style={{ fontWeight: '500' }}>
          Plot Properties:
          <span>
            Strata 1: Area {formatNumberWithCommas(Math.round(calculateGeoJsonArea(activeAreaGeometry)))} ha
          </span>
        </div>
      )}

      <div className="form-group mb-4">
        <Select
          id="spatial-distribution"
          label="Spatial Distribution"
          options={distributionOptions}
          value={plotDistribution}
          onChange={(e) => dispatch([mode.events.distribution, e.target.value])}
          colSize="text-input"
        />
      </div>

      {distributions[plotDistribution]?.renderer()}

      {!mode.fileOnly && GENERATED_DISTRIBUTIONS.includes(plotDistribution) && renderPlotShapeInput()}

      {plotLimitError && (
        <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#fff0f0', border: '1px solid #ffcccc' }}>
          <p style={{ margin: 0, color: '#cc0000', fontSize: '0.9rem', fontWeight: '500' }}>
            {plotLimitError}
          </p>
        </div>
      )}

      {!plotLimitError && totalPlotsCalculated > 0 && (
        <div className="mt-4 p-3 rounded" style={{ backgroundColor: '#e6f4f4', border: '1px solid #2d6f74' }}>
          <p className="font-italic" style={{ margin: 0, color: '#2d6f74', fontSize: '0.9rem', fontWeight: '500' }}>
            {mode.banner(totalPlotsCalculated)}
          </p>
        </div>
      )}
    </div>
  );
};

export const PlotSimilarityCard = ({ plotIdList = [] }) => {
  const plotSimilarity = useSubscription([sub_ids.overview.projectOptions.plotSimilarity]) || false;
  const plotSimilarityDetails = useSubscription([sub_ids.plots.plotSimilarityDetails]) || { referencePlotId: "", years: [] };
  const { referencePlotId, years } = plotSimilarityDetails;
  const setPlotSimilarityDetails = (updates) =>
    dispatch([event_ids.plots.plotSimilarityDetails, { ...plotSimilarityDetails, ...updates }]);

  return (
    <div className="wizard-card" style={{ marginTop: '10px' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="card-title">
          PLOT SIMILARITY CONFIGURATION
        </h5>
        <InfoTooltip
          title="Plot Similarity"
          align="end"
          text={
            <>
              Use this feature to let data collectors navigate based on similar plot features.
              <a href="https://collect-earth-online-doc.readthedocs.io/en/latest/project/plotsample.html" target="_blank"> Learn more</a>
            </>
          } />
      </div>
      <div
        className="form-check mb-3"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        onClick={() => dispatch([event_ids.overview.projectOptions.plotSimilarity])}
      >
        <SvgIcon icon={plotSimilarity ? "checkboxChecked" : "checkboxUnchecked"} size="1.2rem" />
        <label className="text-label-sm" style={{ margin: 0, cursor: 'pointer' }}>
          Enable navigation by similarity
        </label>
      </div>
      {plotSimilarity && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div className="form-group mb-0" style={{ flex: 1, minWidth: '200px' }}>
            <label className="text-label-sm" style={{ display: 'block', marginBottom: '8px' }}>
              Reference Plot ID
            </label>
            <select
              className="text-input"
              style={{ width: '100%' }}
              value={referencePlotId}
              onChange={(e) => setPlotSimilarityDetails({ referencePlotId: e.target.value })}
            >
              <option value="" disabled>Select a plot ID</option>
              {plotIdList.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>

          <div className="form-group mb-0" style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <label className="text-label-sm" style={{ display: 'block', marginBottom: '8px' }}>
              Year for comparison
            </label>
            <div style={{ display: 'block', width: '100%' }}>
              <DatePicker
                selected={years[0] ? new Date(years[0], 0, 1) : new Date(new Date().getFullYear() - 1, 0, 1)}
                onChange={(d) => setPlotSimilarityDetails({ years: [d.getFullYear()] })}
                className="text-input"
                wrapperClassName="w-100"
                style={{ width: '100%' }}
                showYearPicker
                dateFormat="yyyy"
                maxDate={new Date()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AssignPlotsCard = ({ totalPlots, institutionUserList }) => {
  const designSettings = useSubscription([sub_ids.plots.designSettings]) || {};
  const userAssignment = designSettings.userAssignment || { userMethod: "none", users: [], percents: [] };
  const { userMethod, users, percents } = userAssignment;
  const { qaqcAssignment } = designSettings;
  const qaqcMethod = qaqcAssignment?.qaqcMethod || "none";
  const smes = qaqcAssignment?.smes || [];
  const availability = useSubscription([sub_ids.availability]) || '';
  const isPublished = availability === 'published';

  const methods = [
    ["none", "No assignments", false],
    ["equal", "Equal assignments", false],
    ["percent", "Percentage of plots", false],
  ];
  const possibleUsers = [
    { id: -1, email: "Select user..." },
    ...institutionUserList.filter(u =>
      !users.includes(u.id) && (qaqcMethod !== "sme" || !smes.includes(u.id))
    ),
  ];

  const setUserAssignment = (updates) =>
    dispatch([event_ids.plots.designSettings, {
      ...designSettings,
      userAssignment: { ...userAssignment, ...updates }
    }]);

  const addUser = (userId) =>
    setUserAssignment({
      users: [userId, ...users],
      percents: [0, ...percents]
    });

  const removeUser = (userId) => {
    const idx = users.indexOf(userId);
    setUserAssignment({
      users: users.filter(u => u !== userId),
      percents: percents.filter((_, i) => i !== idx)
    });
  };

  const updatePercent = (idx, val) =>
    setUserAssignment({
      percents: percents.map((p, i) => (i === idx ? parseInt(val) || 0 : p))
    });

  return (
    <div
      className="wizard-card"
      aria-disabled={isPublished}
      style={{ marginTop: '10px',
        ...(isPublished && { opacity: 0.55, pointerEvents: 'none', userSelect: 'none' })}}>
      <h5 className="card-title" style={{ marginBottom: '15px' }}>ASSIGN PLOTS</h5>

      <div className="form-group mb-3">
        <Select
          id="user-assignment"
          label="User Assignment"
          options={methods}
          value={userMethod}
          onChange={(e) => setUserAssignment({ userMethod: e.target.value })}
          colSize="text-input"
        />
      </div>

      {(userMethod === "equal" || userMethod === "percent") && (
        <UserSelect
          addUser={addUser}
          possibleUsers={possibleUsers}
          label="Assigned Users"
        />
      )}

      {users.map((userId, idx) => {
        const user = institutionUserList.find(u => u.id === userId);
        return user && (
          <div key={userId} className="d-flex align-items-center mb-2">
            {userMethod === "percent" && (
              <div className="d-flex flex-column" style={{ marginRight: '10px' }}>
                <input
                  type="number" className="text-input" style={{ width: '60px' }}
                  value={percents[idx]} onChange={(e) => updatePercent(idx, e.target.value)}
                />
                <small style={{ color: 'var(--Neutral-Text-gray)' }}>
                  ~{formatNumberWithCommas(Math.round((percents[idx] / 100) * totalPlots))} plots
                </small>
              </div>
            )}
            <span className="flex-grow-1" style={{ fontSize: '0.9rem' }}>{user.email}</span>
            <button
              className="btn btn-sm"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--Primary-Red)',
                color: 'var(--Primary-Red)'
              }}
              onClick={() => removeUser(userId)}
            >
              <SvgIcon icon="minus" size="0.8rem" color="var(--Primary-Red)" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const QualityControlCard = ({ institutionUserList = [], totalPlots, allowDrawnSamples = false }) => {
  const designSettings = useSubscription([sub_ids.plots.designSettings]) || {};
  const { qaqcAssignment, userAssignment } = designSettings;
  const { qaqcMethod = "none", percent = 0, smes = [], timesToReview = 2 } = qaqcAssignment || {};
  const { userMethod, users } = userAssignment || { userMethod: "none", users: [] };
  const plotsToReview = Math.round(totalPlots * (percent / 100));
  const plotsPerSME = smes.length > 0 ? Math.round(plotsToReview / smes.length) : 0;
  const assignedSMEs = institutionUserList.filter(({ id }) => smes.includes(id));
  const availability = useSubscription([sub_ids.availability]) || '';
  const isPublished = availability === 'published';

  const qualityMethods = [
    ["none", "None", false],
    ["overlap", "Overlap", false],
    ["sme", "SME Verification", false],
    ["file", "File", true],
  ];

  const possibleSMEs = [
    { id: -1, email: "Select user..." },
    ...institutionUserList.filter((u) => !users.includes(u.id) && !smes.includes(u.id)),
  ];

  const setQaqcAssignment = (updates) =>
    dispatch([event_ids.plots.designSettings, {
      ...designSettings,
      qaqcAssignment: { ...qaqcAssignment, ...updates }
    }]);

  return (
    <div
      className="wizard-card"
      aria-disabled={isPublished}
      style={{
        marginTop: '10px',
        ...(isPublished && { opacity: 0.55, pointerEvents: 'none', userSelect: 'none' })
      }}
    >
      <h5 className="card-title" style={{  marginBottom: '15px' }}>QUALITY CONTROL</h5>

      <div className="form-group mb-3">
        <Select
          disabled={allowDrawnSamples || userMethod === "none" || qaqcMethod === "file"}
          id="quality-mode"
          label="Quality Mode"
          options={qualityMethods}
          value={qaqcMethod}
          onChange={(e) => setQaqcAssignment({ qaqcMethod: e.target.value })}
          colSize="text-input"
        />
      </div>

      {(qaqcMethod === "overlap" || qaqcMethod === "sme") && (
        <div className="mb-3">
          <label>Percent: {percent}%</label>
          <input
            type="range" className="form-control-range" min="0" max="100" step="5"
            value={percent} onChange={(e) => setQaqcAssignment({ percent: parseInt(e.target.value) })}
          />
        </div>
      )}

      {qaqcMethod === "overlap" && (
        <div className="mb-3">
          <label># of Reviews:</label>
          <input
            type="number" className="text-input" min="2" max={Math.max(users.length, 2)}
            value={timesToReview} onChange={(e) => setQaqcAssignment({ timesToReview: parseInt(e.target.value) })}
          />
          <small className="d-block mt-1">
            {formatNumberWithCommas(plotsToReview)} plots reviewed {timesToReview} times.
          </small>
        </div>
      )}

      {qaqcMethod === "sme" && (
        <>
          <UserSelect
            addUser={(id) => setQaqcAssignment({ smes: [...smes, id] })}
            id="assigned-smes"
            label="Assigned SMEs"
            possibleUsers={possibleSMEs}
          />
          {assignedSMEs.map(sme => (
            <div key={sme.id} className="d-flex align-items-center mb-2">
              <span className="flex-grow-1" style={{ fontSize: '0.9rem' }}>{sme.email}</span>
              <button
                className="btn btn-sm"
                style={{ border: '1px solid var(--Primary-Red)', color: 'var(--Primary-Red)' }}
                onClick={() => setQaqcAssignment({ smes: smes.filter(id => id !== sme.id) })}
              >
                <SvgIcon icon="minus" size="0.8rem" color="var(--Primary-Red)" />
              </button>
            </div>
          ))}
          {smes.length > 0 && <small>- Each SME reviews ~{formatNumberWithCommas(plotsPerSME)} plots.</small>}
        </>
      )}
    </div>
  );
};

export const ExistingPlotsCard = () => {
  const availability = useSubscription([sub_ids.availability]) || '';
  const publishedDate = useSubscription([sub_ids.publishedDate]) || '';
  const plotDistribution = useSubscription([sub_ids.plots.plotDistribution]) || '';
  const totalPlots = useSubscription([sub_ids.plots.totalPlots]) || 0;
  const plotShape = useSubscription([sub_ids.plots.plotShape]) || '';
  const plotSize = useSubscription([sub_ids.plots.plotSize]) || '';
  const plotSpacing = useSubscription([sub_ids.plots.plotSpacing]);

  if (availability !== 'published') return null;

  const sizeLabel = plotShape === 'circle' ? 'Plot Diameter (m)' : 'Plot Width (m)';

  const rows = [
    ['Spatial Distribution', DISTRIBUTION_LABELS[plotDistribution] || plotDistribution],
    ['Total Plots', formatNumberWithCommas(totalPlots)],
    ...(plotDistribution === 'gridded' && plotSpacing > 0
      ? [['Plot Spacing (m)', formatNumberWithCommas(plotSpacing)]]
      : []),
    ...(plotShape ? [['Plot Shape', plotShape === 'circle' ? 'Circle' : 'Square']] : []),
    ...(plotSize > 0 ? [[sizeLabel, formatNumberWithCommas(plotSize)]] : []),
    ...(publishedDate ? [['Published', publishedDate]] : []),
  ];

  return (
    <div className="wizard-card" style={{marginBottom: '10px'}}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="card-title">EXISTING PLOTS</h5>
        <InfoTooltip
          title="Existing Plots"
          align="end"
          text="These plots belong to the published project and cannot be modified. New plots added below will be appended to them."
        />
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className="d-flex justify-content-between mb-2">
          <span className="text-label-sm" style={{ color: 'var(--Neutral-Text-gray)', margin: 0 }}>{label}</span>
          <span className="text-label-sm" style={{ color: '#333', fontWeight: 500, margin: 0 }}>{value}</span>
        </div>
      ))}
    </div>
  );
};
