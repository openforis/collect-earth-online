import React from 'react';
import { useSubscription, dispatch } from '@flexsurfer/reflex';
import shp from "shpjs";

import { NewMap } from '../components/NewMap';
import SvgIcon from '../components/svg/SvgIcon';
import Modal from '../components/Modal';
import { readFileAsArrayBuffer } from '../utils/generalUtils';

import {
  event_ids,
  sub_ids
} from '../state/projectWizard';

export const BoundaryStep = () => {
  // --- REFLEX SUBSCRIPTIONS ---
  const generationMethod = useSubscription([sub_ids.boundary.generationMethod]) || "manual";
  const aoiFeatures = useSubscription([sub_ids.boundary.aoiFeatures]) || [];
  const aoiFileName = useSubscription([sub_ids.boundary.aoiFileName]) || "";
  const modal = useSubscription([sub_ids.modal]);

  // Determine drawing status dynamically based on state
  const isDrawingActive = generationMethod === "manual";

  // --- STATE HANDLERS ---
  const handleMethodChange = (method) => {
    dispatch([event_ids.boundary.clearBoundary]);
    dispatch([event_ids.boundary.generationMethod, method]);
  };

  // Generic map callback handler to sync geometry up to Reflex
  const handleMapDrawComplete = (drawnFeatureGeoJSON) => {
    const updatedFeatures = [drawnFeatureGeoJSON];
    dispatch([event_ids.boundary.aoiFeatures, updatedFeatures]);
  };

  const loadZippedShapefile = (file) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const buffer = reader.result;
        const geojson = await shp(buffer);
        const features = geojson?.type === "FeatureCollection" ? geojson.features : [];
        const geometries = features.map((f) => f.geometry);

        if (geometries.length === 0) {
          throw new Error("No valid spatial features found inside Shapefile.");
        }
        dispatch([event_ids.boundary.setBoundaryFromFile, file.name, geometries]);

      } catch (error) {
        dispatch([
          event_ids.modal, 
          {
            title: "ShapeFile Error",
            message: error.message || "Failed to properly parse chosen zipped archive."
          }
        ]);
      }
    };
    reader.onerror = () => {
      dispatch([
        event_ids.modal,
        {
          title: "File Reader Error",
          message: "Failed to read the file from your local disk space stack."
        }
      ]);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="wizard-step-layout">
      {/* Alert Modals handled centrally via app database subscription properties */}
      {modal?.message && (
        <Modal title={modal.title} onClose={() => dispatch([event_ids.modal, null])}>
          <p>{modal.message}</p>
        </Modal>
      )}

      {/* LEFT SIDE PANEL SIZING CONTAINER */}
      <div className="wizard-sidebar">
        <div className="card" style={{ width: '100%', padding: '20px' }}>
          
          {/* Method Selection Section */}
          <section style={{ marginBottom: '30px', width: '100%' }}>
            <p className="card-title">
              SELECT PROJECT BOUNDARY GENERATION METHOD <span style={{ color: 'red' }}>*</span>
            </p>

            {/* Option 1: Draw on Map */}
            <div 
              className={generationMethod === "manual" ? "radio-selected-button" : "radio-selection-button"}
              onClick={() => handleMethodChange("manual")}
              style={{ marginBottom: '12px', cursor: 'pointer' }}
            >
              <p className="radio-button-labeled">
                <SvgIcon icon={generationMethod === "manual" ? "radioChecked" : "radio"} size="1.2rem" />
                <span>Draw Project Boundary on Map</span>
              </p>
            </div>

            {/* Option 2: Define from Plots File (Placeholder for step 4/5) */}
            <div 
              className={generationMethod === "plotFile" ? "radio-selected-button" : "radio-selection-button"}
              onClick={() => handleMethodChange("plotFile")}
              style={{ marginBottom: '12px', cursor: 'pointer' }}
            >
              <p className="radio-button-labeled">
                <SvgIcon icon={generationMethod === "plotFile" ? "radioChecked" : "radio"} size="1.2rem" />
                <span>Define AOI from plots file</span>
              </p>
            </div>

            {/* Option 3: Upload Shapefile */}
            <div 
              className={generationMethod === "shpFile" ? "radio-selected-button" : "radio-selection-button"}
              onClick={() => handleMethodChange("shpFile")}
              style={{ cursor: 'pointer' }}
            >
              <p className="radio-button-labeled">
                <SvgIcon icon={generationMethod === "shpFile" ? "radioChecked" : "radio"} size="1.2rem" />
                <span>Define AOI with .shp file</span>
                <SvgIcon icon="info" size="1rem" color="#666" />
              </p>
            </div>
          </section>

          {/* Conditional Input UI Sub-render Triggers */}
          <hr style={{ borderTop: '1px solid var(--Neutral-Soft-gray)', width: '100%', margin: '20px 0' }} />

          <section style={{ width: '100%' }}>
            {generationMethod === "manual" && (
              <div>
                <p className="font-italic" style={{ fontSize: '0.85rem', color: '#555' }}>
                  * Use the map polygon layout utilities directly on the viewport to outline your project bounds canvas.
                </p>
              </div>
            )}

            {generationMethod === "plotFile" && (
              <div>
                <p className="font-italic" style={{ fontSize: '0.85rem', color: '#666' }}>
                  - No configuration required here. Your area boundary track paths will extract automatically when plots load during the next page phase.
                </p>
              </div>
            )}

            {generationMethod === "shpFile" && (
              <div className="d-flex flex-column">
                <label className="text-label-sm" style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                  UPLOAD <span style={{ color: 'red' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <label 
                    className="btn btn-sm btn-outline-lightgreen py-2 px-3 text-nowrap"
                    htmlFor="project-boundary-file"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}
                  >
                    <SvgIcon icon="plus" size="0.9rem" />
                    Upload .Shp File (zip)
                    <input 
                      type="file"
                      id="project-boundary-file"
                      accept="application/zip"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) loadZippedShapefile(file);
                      }}
                    />
                  </label>
                  <span className="text-label-sm" style={{ color: aoiFileName ? '#333' : '#999', fontStyle: !aoiFileName ? 'italic' : 'normal' }}>
                    {aoiFileName ? `File: ${aoiFileName}` : 'No archive file selected'}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* RIGHT SIDE CONTENT MAP VIEWPORT FRAME */}
      <div className="map-area">
        <div className="map-title-overlay">PROJECT BOUNDARY PREVIEW</div>
        <NewMap 
          pan={true}
          allowDrawing={isDrawingActive}
          featuresToShow={aoiFeatures}
          onDrawComplete={handleMapDrawComplete}
          initZoom={4}
        />
      </div>
    </div>
  );
};
