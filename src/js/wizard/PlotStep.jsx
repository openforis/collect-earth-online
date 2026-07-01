import React, { useEffect, useState, useMemo } from 'react';
import { useSubscription, dispatch } from '@flexsurfer/reflex';
import DatePicker from 'react-datepicker';

import { NewMap } from '../components/NewMap';
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

export const PlotStep = () => {
  const boundaryMethod = useSubscription([sub_ids.boundary.generationMethod]) || "manual";
  const aoiFeatures = useSubscription([sub_ids.boundary.aoiFeatures]) || [];
  const plotFeatures = useSubscription([sub_ids.plots.plotFeatures]) || [];
  const institutionUsers = useSubscription([sub_ids.institution.users]) || [];
  const plotDistribution = useSubscription([sub_ids.plots.plotDistribution]) || "random";
  const numPlots = useSubscription([sub_ids.plots.numPlots]) || "";
  const plotSize = useSubscription([sub_ids.plots.plotSize]) || "";
  const plotShape = useSubscription([sub_ids.plots.plotShape]) || "circle";
  const plotSpacing = useSubscription([sub_ids.plots.plotSpacing]) || "";
  const shufflePlots = useSubscription([sub_ids.plots.shufflePlots]) || false;
  const totalPlotsCalculated = useSubscription([sub_ids.plots.totalPlots]) || 0;
  const plotFileName = useSubscription([sub_ids.plots.plotFileName]) || "";
  const modal = useSubscription([sub_ids.modal]);
  const designSettings = useSubscription([sub_ids.plots.designSettings]) || {};
  const activeAreaGeometry = aoiFeatures[0];

  const [plotLimitError, setPlotLimitError] = useState("");
  const [uploadedPlotIds, setUploadedPlotIds] = useState([]);

  const isBoundaryFileDriven = boundaryMethod === "plotFile" || boundaryMethod === "shpFile";

  const acceptedMimeTypes = {
    csv: "text/csv",
    shp: "application/zip",
    geojson: "application/json",
  };

  const plotIdList = useMemo(() => {
    if (['random', 'gridded'].includes(plotDistribution)) {
      if (totalPlotsCalculated === 0) return [];
      return Array.from({ length: Math.min(totalPlotsCalculated, 5000) }, (_, i) => i + 1);
    } else {
      return uploadedPlotIds;
    }
  }, [plotDistribution, totalPlotsCalculated, uploadedPlotIds]);

  useEffect(() => {
    if (!activeAreaGeometry || ["shp", "geojson", "csv"].includes(plotDistribution)) {
      setPlotLimitError("");
      return;
    }

    const handler = setTimeout(() => {
      let generatedPlots = [];
      setPlotLimitError("");

      if (plotDistribution === "random" && numPlots > 0 && plotSize > 0) {
        if (numPlots > 5000) {
          setPlotLimitError("A maximum of 5,000 plots is allowed for random distribution.");
          dispatch([event_ids.plots.totalPlots, 0]);
          dispatch([event_ids.plots.plotFeatures, []]);
          return;
        }
        generatedPlots = generateRandomPlots(activeAreaGeometry, numPlots);
      } else if (plotDistribution === "gridded" && plotSpacing > 0 && plotSize > 0) {
        const estimatedCount = estimateGriddedPlotCount(activeAreaGeometry, plotSpacing);
        if (estimatedCount > 5000) {
          setPlotLimitError(`Current spacing results in ~${formatNumberWithCommas(estimatedCount)} plots (Max 5,000). Please increase plot spacing.`);
          dispatch([event_ids.plots.totalPlots, 0]);
          dispatch([event_ids.plots.plotFeatures, []]);
          return;
        }
        generatedPlots = generateGriddedPlots(activeAreaGeometry, plotSpacing, plotSize);

        if (generatedPlots.length > 5000) {
          setPlotLimitError(`Generated ${formatNumberWithCommas(generatedPlots.length)} plots (Max 5,000). Please slightly increase plot spacing.`);
          dispatch([event_ids.plots.totalPlots, 0]);
          dispatch([event_ids.plots.plotFeatures, []]);
          return;
        }
      }

      if (generatedPlots.length > 0) {
        dispatch([event_ids.plots.totalPlots, generatedPlots.length]);
        dispatch([event_ids.plots.plotFeatures, generatedPlots]);
      } else if ((numPlots > 0 || plotSpacing > 0) && plotSize > 0) {
        dispatch([event_ids.plots.totalPlots, 0]);
        dispatch([event_ids.plots.plotFeatures, []]);
      }
    }, 600);

    return () => clearTimeout(handler);
  }, [plotDistribution, numPlots, plotSpacing, plotSize, activeAreaGeometry]);

  useEffect(() => {
    const randomDisabled = isBoundaryFileDriven;
    const fileDisabled = !isBoundaryFileDriven;

    if (plotDistribution === "random" || plotDistribution === "gridded") {
      if (randomDisabled) {
        dispatch([event_ids.plots.plotDistribution, "shp"]);
      }
    } else if (["shp", "geojson", "csv"].includes(plotDistribution)) {
      if (fileDisabled) {
        dispatch([event_ids.plots.plotDistribution, "random"]);
      }
    }
  }, [boundaryMethod, plotDistribution, isBoundaryFileDriven]);

  useEffect(() => {
    dispatch([event_ids.plots.plotFeatures, []]);
    dispatch([event_ids.plots.plotFileName, ""]);
    dispatch([event_ids.plots.totalPlots, 0]);
    setPlotLimitError("");
    setUploadedPlotIds([]);
  }, [plotDistribution]);

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
        dispatch([event_ids.plots.totalPlots, data.plots?.length]);
        dispatch([event_ids.plots.plotFileName, fileName]);
        dispatch([event_ids.plots.designSettings, {
          ...designSettings,
          userAssignment: data.userAssignment,
          qaqcAssignment: data.qaqcAssignment
        }]);
        
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
          const extractedIds = data.plots.map(p => {
            const props = p.properties || p;
            const keys = Object.keys(props);
            const k = keys.find((key) => ["visible_id", "plotid", "plot_id", "PlotID", "plotId", "PLOTID"].includes(key));
            return k ? props[k] : undefined;
          }).filter(v => v != null);

          setUploadedPlotIds(extractedIds);

          const parsedGeometries = data.plots.map(p => {
            if (!p) return null;
            return p.type ? p : (p.plot_geom || p.plotGeom);
          }).filter(Boolean);

          dispatch([event_ids.plots.plotFeatures, parsedGeometries]);
        }
      })
      .catch((err) => {
        console.error(err);
        dispatch([event_ids.modal, { title: "Plot File Error", message: "Failed to parse file." }]);
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

  const renderPlotShapeInput = () => (
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
  );

  const renderPlotSizeInput = () => (
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
  );

  const renderRandomLayout = () => (
    <>
      <div className="form-group mb-3">
        <label className="text-label-sm">Number of Plots this project will contain <span style={{ color: 'red' }}>*</span></label>
        <input 
          type="number" 
          className="text-input" 
          placeholder="Enter Number (Max 5000)"
          value={numPlots}
          max="5000"
          onChange={(e) => dispatch([event_ids.plots.numPlots, Number(e.target.value)])}
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

  const renderFileBasedLayout = (fileType) => (
    <div className="d-flex flex-column mb-3">
      <label className="text-label-sm" style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
        UPLOAD PLOT FILE <span style={{ color: 'red' }}>*</span>
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
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
      {fileType === 'csv' && (
        <>
          {renderPlotSizeInput()}
          {renderPlotShapeInput()}
        </>
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

  return (
    <div className="wizard-step-layout">
      {modal?.message && (
        <Modal title={modal.title} onClose={() => dispatch([event_ids.modal, null])}>
          <p>{modal.message}</p>
        </Modal>
      )}

      <div className="wizard-sidebar">
        <div className="wizard-card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plot Generation</h5>
            <SvgIcon icon="info" size="1.2rem" color="#666" />
          </div>

          {activeAreaGeometry && (
            <div className="mb-3 text-secondary small" style={{ fontWeight: '500' }}>
              Plot Properties: <span style={{ color: '#333' }}>Strata 1: Area {formatNumberWithCommas(Math.round(calculateGeoJsonArea(activeAreaGeometry)))} ha</span>
            </div>
          )}

          <div className="form-group mb-4">
            <Select
              id="spatial-distribution"
              label="Spatial Distribution *"
              options={[
                ["random", "Random", isBoundaryFileDriven],
                ["gridded", "Gridded", isBoundaryFileDriven],
                ["shp", "Zipped Shapefile (.shp)", !isBoundaryFileDriven],
                ["geojson", "GeoJSON File", !isBoundaryFileDriven],
                ["csv", "CSV Vector Points Table", !isBoundaryFileDriven]
              ]}
              value={plotDistribution}
              onChange={(e) => dispatch([event_ids.plots.plotDistribution, e.target.value])}
              colSize="text-input"
            />
          </div>

          {distributionStrategies[plotDistribution]?.renderer()}

          {["random", "gridded"].includes(plotDistribution) && renderPlotShapeInput()}

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
                This project will contain around {formatNumberWithCommas(totalPlotsCalculated)} plots.
              </p>
            </div>
          )}
        </div>
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
          plotsToShow={plotFeatures}
        />
      </div>
    </div>
  );
};

export const PlotSimilarityCard = ({ plotIdList = [] }) => {
  const plotSimilarity = useSubscription([sub_ids.overview.projectOptions.plotSimilarity]) || false;
  const plotSimilarityDetails = useSubscription([sub_ids.plots.plotSimilarityDetails]) || { referencePlotId: "", years: [] };
  const { referencePlotId, years } = plotSimilarityDetails;

  const setPlotSimilarityDetails = (updates) => {
    dispatch([event_ids.plots.plotSimilarityDetails, { ...plotSimilarityDetails, ...updates }]);
  };

  return (
    <div className="card" style={{ width: '100%', padding: '20px', marginTop: '20px' }}>
      <h5 className="card-title" style={{ color: 'var(--Neutral-Dark-gray)', marginBottom: '15px', textTransform: 'uppercase' }}>
        Plot Similarity Configuration
      </h5>
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

  const setUserAssignment = (updates) => {
    dispatch([event_ids.plots.designSettings, {
      ...designSettings,
      userAssignment: { ...userAssignment, ...updates }
    }]);
  };

  const addUser = (userId) => {
    setUserAssignment({ 
      users: [userId, ...users], 
      percents: [0, ...percents] 
    });
  };

  const removeUser = (userId) => {
    const idx = users.indexOf(userId);
    setUserAssignment({
      users: users.filter(u => u !== userId),
      percents: percents.filter((_, i) => i !== idx)
    });
  };

  const updatePercent = (idx, val) => {
    const newPercents = [...percents];
    newPercents[idx] = parseInt(val) || 0;
    setUserAssignment({ percents: newPercents });
  };

  return (
    <div className="card" style={{ width: '100%', padding: '20px', marginTop: '20px' }}>
      <h5 className="card-title" style={{ color: 'var(--Neutral-Dark-gray)', marginBottom: '15px' }}>ASSIGN PLOTS</h5>
      
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
        if (!user) return null;
        return (
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

  const setQaqcAssignment = (updates) => {
    dispatch([event_ids.plots.designSettings, {
      ...designSettings,
      qaqcAssignment: { ...qaqcAssignment, ...updates }
    }]);
  };

  return (
    <div className="card" style={{ width: '100%', padding: '20px', marginTop: '20px' }}>
      <h5 className="card-title" style={{ color: 'var(--Neutral-Dark-gray)', marginBottom: '15px' }}>QUALITY CONTROL</h5>
      
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
