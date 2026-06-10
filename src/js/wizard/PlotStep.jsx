import React, { useEffect } from 'react';
import { useSubscription, dispatch } from '@flexsurfer/reflex';

import { NewMap } from '../components/NewMap';
import SvgIcon from '../components/svg/SvgIcon';
import Modal from '../components/Modal';
import { formatNumberWithCommas, readFileAsBase64Url } from '../utils/generalUtils';
import { mercator } from '../utils/mercator';

import {
  event_ids,
  sub_ids
} from '../state/projectWizard';

export const PlotStep = () => {
  const boundaryMethod = useSubscription([sub_ids.boundary.generationMethod]) || "manual";
  const aoiFeatures = useSubscription([sub_ids.boundary.aoiFeatures]) || [];
  const plotFeatures = useSubscription([sub_ids.plots.plotFeatures]) || [];
  const plotDistribution = useSubscription([sub_ids.plots.plotDistribution]) || "random";
  const numPlots = useSubscription([sub_ids.plots.numPlots]) || "";
  const plotSize = useSubscription([sub_ids.plots.plotSize]) || "";
  const plotShape = useSubscription([sub_ids.plots.plotShape]) || "circle";
  const plotSpacing = useSubscription([sub_ids.plots.plotSpacing]) || "";
  const shufflePlots = useSubscription([sub_ids.plots.shufflePlots]) || false;
  const totalPlotsCalculated = useSubscription([sub_ids.plots.totalPlots]) || 0;
  const plotFileName = useSubscription([sub_ids.plots.plotFileName]) || "";
  const modal = useSubscription([sub_ids.modal]);

  const isPlotFileModeActive = boundaryMethod === "plotFile";

  const acceptedMimeTypes = {
    csv: "text/csv",
    shp: "application/zip",
    geojson: "application/json",
  };

  const checkUploadedPlotFile = (fileType, fileName, base64Payload) => {
    fetch("/check-plot-file", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plotFileType: fileType,
        projectId: 0,
        plotFileName: fileName,
        plotFileBase64: base64Payload
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        dispatch([event_ids.plots.totalPlots, data.filePlotCount]);
        dispatch([event_ids.plots.plotFileName, fileName]);
        
        if (data.fileBoundary) {
          const [[lonMin, latMin], [lonMax, latMax]] = data.fileBoundary;
          const boundaryBox = [
            {
              type: "Polygon",
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
          dispatch([event_ids.boundary.aoiFeatures, boundaryBox]);
        }

        if (data.plots && data.plots.length > 0) {
          const parsedGeometries = data.plots.map(p => {
            if (!p) return null;
            // Extract geometry directly if it's already a raw feature vector map
            return p.type ? p : (p.plot_geom || p.plotGeom);
          }).filter(Boolean);

          dispatch([event_ids.plots.plotFeatures, parsedGeometries]);
        }
      })
      .catch((err) => {
        console.error(err);
        dispatch([event_ids.modal, { title: "Plot File Error", message: "Failed to accurately parse coordinate nodes inside uploaded data file framework." }]);
      });
  };

  const processIncomingDataFile = (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    readFileAsBase64Url(file, (base64String) => {
      checkUploadedPlotFile(fileType, file.name, base64String);
    });
  };

  const labelPlotDimensionUnits = plotShape === "circle" ? "Plot Diameter (m)" : "Plot Width (m)";

  const renderRandomLayout = () => (
    <>
      <div className="form-group mb-3">
        <label className="text-label-sm">Number of Plots this project will contain <span style={{ color: 'red' }}>*</span></label>
        <input 
          type="number" 
          className="text-input" 
          placeholder="Enter Number"
          value={numPlots}
          onChange={(e) => dispatch([event_ids.plots.numPlots, Number(e.target.value)])}
        />
      </div>
      <div className="form-group mb-3">
        <label className="text-label-sm">{labelPlotDimensionUnits} <span style={{ color: 'red' }}>*</span></label>
        <input 
          type="number" 
          className="text-input" 
          placeholder="Enter Number"
          value={plotSize}
          onChange={(e) => dispatch([event_ids.plots.plotSize, Number(e.target.value)])}
        />
      </div>
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
      <div className="form-group mb-3">
        <label className="text-label-sm">{labelPlotDimensionUnits} <span style={{ color: 'red' }}>*</span></label>
        <input 
          type="number" 
          className="text-input" 
          placeholder="Enter Number"
          value={plotSize}
          onChange={(e) => dispatch([event_ids.plots.plotSize, Number(e.target.value)])}
        />
      </div>
      <div className="form-check mb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => dispatch([event_ids.plots.shufflePlots, !shufflePlots])}>
        <SvgIcon icon={shufflePlots ? "checkboxChecked" : "checkboxUnchecked"} size="1.2rem" />
        <label className="text-label-sm" style={{ margin: 0, cursor: 'pointer' }}>Shuffle plot distribution matrix order</label>
      </div>
    </>
  );

  const renderFileBasedLayout = (fileType) => (
    <div className="d-flex flex-column mb-3">
      <label className="text-label-sm" style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
        UPLOAD PLOT FILE <span style={{ color: 'red' }}>*</span>
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <label 
          className="btn btn-sm btn-outline-lightgreen py-2 px-3 text-nowrap"
          htmlFor="plot-file-upload-input"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}
        >
          <SvgIcon icon="plus" size="0.9rem" />
          Upload {fileType.toUpperCase()} file
          <input 
            type="file"
            id="plot-file-upload-input"
            accept={acceptedMimeTypes[fileType]}
            style={{ display: 'none' }}
            onChange={(e) => processIncomingDataFile(e, fileType)}
          />
        </label>
        <span className="text-label-sm" style={{ color: plotFileName ? '#333' : '#999', fontStyle: !plotFileName ? 'italic' : 'normal' }}>
          {plotFileName ? `File: ${plotFileName}` : 'No dataset file uploaded'}
        </span>
      </div>
      {fileType === "csv" && (
        <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
          {renderRandomLayout()}
        </div>
      )}
    </div>
  );

  const distributionStrategies = {
    random: { display: "Random", renderer: renderRandomLayout },
    gridded: { display: "Gridded", renderer: renderGriddedLayout },
    csv: { display: "CSV File", renderer: () => renderFileBasedLayout("csv") },
    shp: { display: "SHP File", renderer: () => renderFileBasedLayout("shp") },
    geojson: { display: "GeoJSON File", renderer: () => renderFileBasedLayout("geojson") }
  };

  const activeAreaGeometry = aoiFeatures[0];

  return (
    <div className="wizard-step-layout">
      {modal?.message && (
        <Modal title={modal.title} onClose={() => dispatch([event_ids.modal, null])}>
          <p>{modal.message}</p>
        </Modal>
      )}

      <div className="wizard-sidebar">
        <div className="card" style={{ width: '100%', padding: '20px' }}>
          
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plot Generation</h5>
            <SvgIcon icon="info" size="1.2rem" color="#666" />
          </div>

          {activeAreaGeometry && (
            <div className="mb-3 text-secondary small" style={{ fontWeight: '500' }}>
              Plot Properties: <span style={{ color: '#333' }}>Strata 1: Area {formatNumberWithCommas(Math.round(mercator.calculateGeoJsonArea(activeAreaGeometry)))} ha</span>
            </div>
          )}

          <div className="form-group mb-4">
            <label className="text-label-sm">Spatial Distribution <span style={{ color: 'red' }}>*</span></label>
            <select
              className="text-input"
              value={plotDistribution}
              onChange={(e) => dispatch([event_ids.plots.plotDistribution, e.target.value])}
            >
              <option value="random" disabled={isPlotFileModeActive}>Random</option>
              <option value="gridded" disabled={isPlotFileModeActive}>Gridded</option>
              <option value="shp" disabled={!isPlotFileModeActive}>Zipped Shapefile (.shp)</option>
              <option value="geojson" disabled={!isPlotFileModeActive}>GeoJSON File</option>
              <option value="csv" disabled={!isPlotFileModeActive}>CSV Vector Points Table</option>
            </select>
          </div>

          {distributionStrategies[plotDistribution]?.renderer()}

          {["random", "gridded"].includes(plotDistribution) && (
            <div className="form-group mb-3">
              <label className="text-label-sm">Plot Shape <span style={{ color: 'red' }}>*</span></label>
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
          )}

          {totalPlotsCalculated > 0 && (
            <div className="mt-4 p-3 rounded" style={{ backgroundColor: '#e6f4f4', border: '1px solid #2d6f74' }}>
              <p className="font-italic" style={{ margin: 0, color: '#2d6f74', fontSize: '0.9rem', fontWeight: '500' }}>
                This project will contain around {formatNumberWithCommas(totalPlotsCalculated)} plots.
              </p>
            </div>
          )}

        </div>
      </div>

      <div className="map-area">
        <div className="map-title-overlay">PLOT PREVIEW</div>
        <NewMap 
          pan={true}
          allowDrawing={false}
          aoiToShow={aoiFeatures}
          plotsToShow={plotFeatures}
        />
      </div>

    </div>
  );
};
