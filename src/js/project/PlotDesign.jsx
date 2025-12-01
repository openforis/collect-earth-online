import React, { useContext, useState, useEffect } from "react";

import shp from "shpjs";
import DatePicker from 'react-datepicker';

import {
  formatNumberWithCommas,
  isNumber,
  readFileAsBase64Url,
} from "../utils/generalUtils";

import { filterObject } from "../utils/sequence";
import { ProjectContext, plotLimit } from "./constants";
import { mercator } from "../utils/mercator";
import Modal from "../components/Modal";

export function NewPlotDesign ({aoiFeatures, institutionUserList, totalPlots, projecType}){
  const context = useContext(ProjectContext);
  const {projectId, designSettings, newPlotShape, newPlotFileName, newPlotDistribution, setProjectDetails} = context;
  const [_newPlotFileName, setNewPlotFileName] = useState(newPlotFileName);
  const [projectState, setProjectState] = useState(context);
  const [newPlotSize, setNewPlotSize] = useState("");
  const [plotState, setPlotState] = useState({lonMin: "",
                                              latMin: "",
                                              lonMax: "",
                                              latMax: "",});
  const [_totalPlots, setTotalPlots] = useState(totalPlots);

  const acceptedTypes = {
      csv: "text/csv",
      shp: "application/zip",
      geojson: "application/json",
    };

  const setPlotDetails = (newDetail) => {
    setPlotState({
        lonMin: "",
        latMin: "",
        lonMax: "",
        latMax: "",
      });
    setProjectDetails(
      Object.assign(newDetail, { plots: [] }, { aoiFeatures: [], aoiFileName: "" },)
    ); 
  };
v
  const checkPlotFile = (plotFileType, fileName, plotFileBase64) => {
    fetch("/check-plot-file", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plotFileType,
        projectId,
        plotFileName: fileName,
        plotFileBase64: plotFileBase64
      }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        const [[lonMin, latMin], [lonMax, latMax]] = data.fileBoundary;
        const aoiFeatures = [mercator.generateGeoJSON(latMin, latMax, lonMin, lonMax)];
        setTotalPlots(_totalPlots + data.filePlotCount);
        setPlotState({lonMin, lonMax, latMin, latMax});
        setProjectState({          
          aoiFileName: fileName,
          boundary: data.fileBoundary,          
          aoiFeatures});
        setNewPlotFileName(fileName);
        setProjectDetails({
          aoiFeatures, lonMin, latMin, lonMax, latMax, newPlotFileName: fileName, newPlotFileBase64: plotFileBase64, aoiFileName: fileName, newPlotDistribution: plotFileType,
          designSettings: { ...designSettings,
                            userAssignment: data.userAssignment,
                            qaqcAssignment: data.qaqcAssignment}
        });}
      );
  };

  const renderFileInput = (fileType, append) => {    
    return(
      <div className="mb-3">
        <div style={{display: "flex"}}>
          <label
            className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 text-nowrap"
            htmlFor="new-plot-distribution-file"
            id="custom-upload"
            style={{ display: "flex", alignItems: "center", width: "fit-content" }}
          >
            Upload plot file
            <input
              accept={acceptedTypes[fileType]}
              defaultValue=""
              id="new-plot-distribution-file"
              onChange={(e) => {                
                const file = e.target.files[0];
                readFileAsBase64Url (file, (base64) => {                 
                  checkPlotFile(fileType, file.name, base64);                  
                  return setPlotDetails({
                    newPlotFileName: file.name,
                    newPlotFileBase64: base64,
                    append: true,
                  }); 
                });		
              }}
              style={{ display: "none" }}
              type="file"
            />
          </label>
          <label className="ml-3 text-nowrap">
            File:{" "}
            {_newPlotFileName || (projectId > 0 ? "Use existing data" : "None")}
          </label>
            </div>
      </div>
    );  
  };
  
  const renderPlotShape = () => {    
    return (
      <div className="form-group" style={{ display: "flex", flexDirection: "column" }}>
        <label>Plot shape</label>
        <div>
          <div className="form-check form-check-inline">
            <input
              checked={newPlotShape === "circle"}
              className="form-check-input"
              id="plot-shape-circle"
              onChange={() => {setPlotDetails({ newPlotShape: "circle" });}}
              type="radio"
            />
            <label className="form-check-label" htmlFor="plot-shape-circle">
              Circle
            </label>
          </div>
          <div className="form-check form-check-inline">
            <input
              checked={newPlotShape === "square"}
              className="form-check-input"
              id="plot-shape-square"
              onChange={() => {setPlotDetails({ newPlotShape: "square"});}}
              type="radio"
            />
            <label className="form-check-label" htmlFor="plot-shape-square">
              Square
            </label>
          </div>
        </div>
      </div>
    );
  };


  const renderLabeledInput = (label, property, disabled = false) => (
    <div className="form-group" style={{ width: "fit-content" }}>
      <label htmlFor={property}>{label}</label>
      <input
        className="form-control form-control-sm"
        id={property}
        min="0"
        onChange={(e) =>{
          setNewPlotSize(e.target.value);
          setPlotDetails({ [property]: Number(e.target.value) });}}
        step="1"
        type="number"
        value={newPlotSize}
        disabled = {(context.availability === "published") || disabled}
      />
    </div>
  );


  const renderCSV = (fileType, append) => {
    const plotUnits = newPlotShape === "circle" ? "Plot diameter (m)" : "Plot width (m)";
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {renderFileInput("csv", append)}
        <div style={{ display: "flex" }}>
          <span className="mr-3">{renderPlotShape()}</span>
          {renderLabeledInput(plotUnits, "plotSize")}
        </div>
      </div>
    );
  };

  const plotOptions = {
      csv: {
        display: "CSV File",
        description:
          "Specify your own plot centers by uploading a CSV with these fields: LON,LAT,PLOTID. Each plot center must have a unique PLOTID value.",
        layout: renderCSV,
      },
      shp: {
        display: "SHP File",
        alert: "Please ensure your shapefile does not include duplicate plots.",
        description:
          "Specify your own plot boundaries by uploading a zipped Shapefile (containing SHP, SHX, DBF, and PRJ files) of polygon features. Each feature must have a unique PLOTID value.",
        layout: renderFileInput,
      },
      geojson: {
        display: "GeoJSON File",
        alert: "CEO may overestimate the number of project plots when using a ShapeFile.",
        description:
          "Specify your own plot boundaries by uploading a GeoJSON file of polygon features. Each feature must have a unique PLOTID value in the properties map.",
        layout: renderFileInput,
      },
    };

  return (
    <div id="new-plot-design">
      <h3 className="mb-3">Add New Plot(s)</h3>
      <div className="ml-3">
        <div className="d-flex flex-column">
          <div className="form-group" style={{width:"fit-content"}}>
            <label>Spatial Distribution</label>
            <div style={{ position: "relative" }}>
              {plotOptions[newPlotDistribution].alert &&
               <p className="alert"> {plotOptions[newPlotDistribution].alert}</p>}
              <select
                className="form-control form-control-sm"
                onChange={(e)=>{
                  setPlotDetails({ newPlotDistribution: e.target.value});}}
                value={newPlotDistribution}>
                {Object.entries (plotOptions).map (([key, options]) => (
                  <option key={key} value={key}>
                    {options.display}
                  </option>
                ))}
              </select>
            </div>            
          </div>
          <p className="font-italic ml-2">{`- ${plotOptions[newPlotDistribution].description}`}</p>          
        </div>
        <div>          
          {plotOptions[newPlotDistribution].layout(newPlotDistribution, true)}</div>
	<p
         className="font-italic ml-2 small"
         style={{
           color: _totalPlots > plotLimit ? "#8B0000" : "#006400",
           fontSize: "1rem",
           whiteSpace: "pre-line",
         }}
	 >
       {_totalPlots > 0 &&
              `This project will contain around ${formatNumberWithCommas(_totalPlots)} plots.`}
            {totalPlots > 0 &&
              totalPlots > plotLimit &&
              `\n* The maximum allowed number for the selected plot distribution is ${formatNumberWithCommas(
                plotLimit
              )}.`}
       </p>
      </div>
    </div>
  );
};

export function PlotDesign ({totalPlots, aoiFeatures}) {
  const initState = {
      lonMin: "",
      latMin: "",
      lonMax: "",
      latMax: "",
      modal: null,
      plotIdList: [],
      totalPlots: "",
  };
  const [state, setState] = useState(initState);

  const context = useContext(ProjectContext);

  const lastNumPlots = null;
  const lastCalculatedPlots = null;
  const lastCalcInputs = {};
  
  const setCoordsFromBoundary = () => {
    if (aoiFeatures?.length === 1) {
      const boundaryExtent = mercator.parseGeoJson(aoiFeatures[0], false).getExtent();
      setState((s)=> (
        { ...s,
          lonMin: boundaryExtent[0],
          latMin: boundaryExtent[1],
          lonMax: boundaryExtent[2],
          latMax: boundaryExtent[3],
        }));
    } else {
      setState((s)=>(
        { ...s,
          lonMin: "",
          latMin: "",
          lonMax: "",
          latMax: "",
        }));
    }
  };

  const validBoundary = (latMin, latMax, lonMin, lonMax) =>
        isNumber(latMin) &&
        isNumber(latMax) &&
        isNumber(lonMin) &&
        isNumber(lonMax) &&
        latMax > latMin &&
        lonMax > lonMin;

  const setPlotDetails = (newDetail) => {
    const resetAOI = ["csv", "shp", "geojson"].includes(newDetail.plotDistribution);
    if (resetAOI) {
      this.setState({
        lonMin: "",
        latMin: "",
        lonMax: "",
        latMax: "",
      });
    }
    context.setProjectDetails(
      Object.assign(newDetail, { plots: [] }, resetAOI ? { aoiFeatures: [], aoiFileName: "" } : {})
    );
    
  };
  
  const updateBoundaryFromCoords = (newCoord) => {
    setState(newCoord, () => {
      const { latMin, latMax, lonMin, lonMax } = state;
      if (validBoundary(latMin, latMax, lonMin, lonMax)) {
        setPlotDetails({
          aoiFeatures: [mercator.generateGeoJSON(latMin, latMax, lonMin, lonMax)],
        });
      }
    });
  };
  
  const setSimplifiedProjectDetails = () => {
    const { lonMin, lonMax, latMin } = state;
    const plotWidth = mercator.calculatePlotWidth(latMin, lonMin, lonMax);
    const designSettings = context.designSettings;
    
    context.setProjectDetails({
      ...context,
      sampleDistribution: "center",
      numPlots: 1,
      plotSize: Math.floor(plotWidth / 2),
      allowDrawnSamples: true,
      plotDistribution: "simplified",
      designSettings: {
        ...designSettings,
        sampleGeometries: {"lines": true, "points": true, "polygons": true}} });
  };


  useEffect(()=> {    
    setCoordsFromBoundary();
    if (totalPlots &&
        totalPlots <= 5000
       ) {
      const plotIds = Array.from({ length: totalPlots }, (_, i) => i + 1);
      setState({ plotIdList: plotIds,
                 totalPlots: plotIds.length});
    }  
  }, []);

  const renderLabeledInput = (label, property, disabled = false) => (
    <div className="form-group" style={{ width: "fit-content" }}>
      <label htmlFor={property}>{label}</label>
      <input
        className="form-control form-control-sm"
        id={property}
        min="0"
        onChange={(e) => setPlotDetails({ [property]: Number(e.target.value) })}
        step="1"
        type="number"
        value={context[property] || ""}
        disabled = {disabled}
      />
    </div>
  );

  const renderShufflePlots = () => {
    const { shufflePlots } = context;
    return (
      <div className="form-check">
        <input
          checked={shufflePlots}
          className="form-check-input"
          id="shufflePlots"
          onChange={() => setPlotDetails({ shufflePlots: !shufflePlots })}
          type="checkbox"
          disabled={context.availability==="published"}
        />
        <label className="form-check-label" htmlFor="shufflePlots">
          Shuffle plot order
        </label>
      </div>
    );
  };

  const renderPlotShape = () => {
    const { plotShape } = context;
    return (
      <div className="form-group" style={{ display: "flex", flexDirection: "column" }}>
        <label>Plot shape</label>
        <div>
          <div className="form-check form-check-inline">
            <input
              checked={plotShape === "circle"}
              className="form-check-input"
              id="plot-shape-circle"
              onChange={() => setPlotDetails({ plotShape: "circle" })}
              type="radio"
              disabled={context.availability==="published"}
            />
            <label className="form-check-label" htmlFor="plot-shape-circle">
              Circle
            </label>
          </div>
          <div className="form-check form-check-inline">
            <input
              checked={plotShape === "square"}
              className="form-check-input"
              id="plot-shape-square"
              onChange={() => setPlotDetails({ plotShape: "square" })}
              type="radio"
              disabled={context.availability==="published"}
            />
            <label className="form-check-label" htmlFor="plot-shape-square">
              Square
            </label>
          </div>
        </div>
      </div>
    );
  };

  const renderAOICoords = () => {
    const { latMax, lonMin, lonMax, latMin , availability} = state;
    return (
      <div style={{ width: "20rem" }}>
        <div className="form-group ml-3">
          <div className="row">
            <div className="col-md-6 offset-md-3">
              <input
                className="form-control form-control-sm"
                max="90.0"
                min="-90.0"
                onChange={(e) =>
                  updateBoundaryFromCoords({ latMax: parseFloat(e.target.value) })
                }
                placeholder="North"
                step="any"
                type="number"
                value={latMax}
                disabled={availability==="published"}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <input
                className="form-control form-control-sm"
                max="180.0"
                min="-180.0"
                onChange={(e) =>
                  updateBoundaryFromCoords({ lonMin: parseFloat(e.target.value) })
                }
                placeholder="West"
                step="any"
                type="number"
                value={lonMin}
                disabled={availability==="published"}
              />
            </div>
            <div className="col-md-6">
              <input
                className="form-control form-control-sm"
                max="180.0"
                min="-180.0"
                onChange={(e) =>
                  updateBoundaryFromCoords({ lonMax: parseFloat(e.target.value) })
                }
                placeholder="East"
                step="any"
                type="number"
                value={lonMax}
                disabled={availability==="published"}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-md-6 offset-md-3">
              <input
                className="form-control form-control-sm"
                max="90.0"
                min="-90.0"
                onChange={(e) =>
                  updateBoundaryFromCoords({ latMin: parseFloat(e.target.value) })
                }
                placeholder="South"
                step="any"
                type="number"
                value={latMin}
                disabled={availability==="published"}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const loadGeoJson = (shpFile) => {
    try {
      shp(shpFile).then((g) => {
        context.setProjectDetails({
          aoiDataDebug: g.features,
          aoiFeatures: g.features.map((f) => f.geometry),
          aoiFileName: g.fileName,
        });
      });
    } catch {
      setState ((s)=> ({...s, modal: {alert: {alertType: "ShapeFile Error", alertMessage: "Unknown error loading shape file."}}}));
    }
  };

  const renderBoundaryFileInput = () => {
    const { aoiFileName, availability } = context;
    return (
      <div className="d-flex flex-column">
        {state.modal?.alert &&
         <Modal title={state.modal.alert.alertType}
                onClose={()=>{setState((s)=> ({...s, modal: null}));}}>
           {state.modal.alert.alertMessage}
         </Modal>}

        <div className="d-flex">
          <label
            className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 text-nowrap"
            htmlFor="project-boundary-file"
            id="custom-upload"
            style={{ display: "flex", alignItems: "center", width: "fit-content" }}
          >
            Upload shp file (zip)
            <input
              accept="application/zip"
              defaultValue=""
              id="project-boundary-file"
              onChange={(e) => {
                const file = e.target.files[0];
                readFileAsArrayBuffer(file, loadGeoJson);
              }}
              style={{ display: "none" }}
              type="file"
              disabled={availability==="published"}
            />
          </label>
          <label className="ml-3 text-nowrap">File: {aoiFileName}</label>
        </div>
      </div>
    );
  };

  const renderAOISelector = () => {
    const { boundaryType, type, availability } = context;
    const boundaryOptions = [
      { value: "manual", label: "Input coordinates" },
      { value: "file", label: "Upload shp file" },
    ];
    return (
      <>
        <div className="form-group" style={{ width: "fit-content" }}>
          <label>Boundary type</label>
          <select
            className="form-control form-control-sm"
            onChange={(e) => setPlotDetails({ boundaryType: e.target.value })}
            value={boundaryType}
            disabled={availability==="published"}
          >
            {boundaryOptions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {boundaryType === "manual" ? renderAOICoords() : renderBoundaryFileInput()}
      </>
    );
  };

  const readFileAsArrayBuffer = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsArrayBuffer(file);
    });

  const readFileAsText = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
            r.readAsText(file);
    });

  const getPlotIdFromProps = (props = {}) => {
    if (!props) return undefined;
    const keys = Object.keys(props);
    const k = keys.find((key) =>
      ["plotid","plot_id","PlotID","plotId","PLOTID"].includes(key)
    );
    return k ? props[k] : undefined;
  };

  // SHP file
  const parseZipShapefileToIds = async (file) => {
    const geojson = await shp(file);
    const features = geojson?.type === "FeatureCollection" ? geojson.features : [];
    return features
      .map((f) => getPlotIdFromProps(f?.properties))
      .filter((v) => v != null);
  };

  // GeoJSON / JSON
  const parseGeoJSONToIds = (text) => {
    const data = JSON.parse(text);
    const features = data?.type === "FeatureCollection" ? data.features : [];
    return features
      .map((f) => getPlotIdFromProps(f?.properties))
      .filter((v) => v != null);
  };

  // CSV (first column = plotid)
  const parseCsvToIds = (text) => {
    const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    const firstRow = lines[0].split(/,(.+)?/)[0].trim();
    const hasHeader =
          /^[A-Za-z_]+$/.test(firstRow) || firstRow.toLowerCase() === "plotid";

    const startIdx = hasHeader ? 1 : 0;

    const ids = [];
    for (let i = startIdx; i < lines.length; i++) {
      const firstCell = lines[i].split(/,(.+)?/)[0].trim();
      if (firstCell !== "") ids.push(firstCell);
    }
    return ids;
  };

  const readPlotIdsFromFile = async (file) => {
    const name = (file?.name || "").toLowerCase();

    if (name.endsWith(".zip")) {
      const ab = await readFileAsArrayBuffer(file);
      return await parseZipShapefileToIds(ab);
    }

    if (name.endsWith(".geojson") || name.endsWith(".json")) {
      const text = await readFileAsText(file);
      return parseGeoJSONToIds(text);
    }

    if (name.endsWith(".csv")) {
      const text = await readFileAsText(file);
      return parseCsvToIds(text);
    }

    throw new Error("Unsupported file type. Please upload .zip (shp), .geojson/.json, or .csv.");
  };

  const checkPlotFile = (plotFileType, plotFileName, plotFileBase64) => {
    const { projectId, designSettings } = context;
    fetch("/check-plot-file", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plotFileType,
        projectId,
        plotFileName,
        plotFileBase64
      }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        setState((s) => ({... s, totalPlots: data.filePlotCount}));
        context.setProjectDetails({
          designSettings: { ...designSettings,
                            userAssignment: data.userAssignment,
                            qaqcAssignment: data.qaqcAssignment}
        });
      });
  };

  const renderFileInput = (fileType, append) => {
    const acceptedTypes = {
      csv: "text/csv",
      shp: "application/zip",
      geojson: "application/json",
    };
    const exampleFileType = fileType === "shp" ? "shape" : fileType;
    return (
      <div className="mb-3">
        <div style={{ display: "flex" }}>
          <label
            className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 text-nowrap"
            htmlFor="plot-distribution-file"
            id="custom-upload"
            style={{ display: "flex", alignItems: "center", width: "fit-content" }}
          >
            Upload plot file
            <input
              accept={acceptedTypes[fileType]}
              defaultValue=""
              id="plot-distribution-file"
              onChange={(e) => {
                const file = e.target.files[0];
                readPlotIdsFromFile(file).then((plotIds) =>
                  setState((s) => ({...s,  plotIdList: plotIds}))
                );
                readFileAsBase64Url(file, (base64) => {
                  checkPlotFile(fileType, file.name, base64);
                  return setPlotDetails({
                    plotFileName: file.name,
                    plotFileBase64: base64,
                    append: false
                  });
                });
              }}
              style={{ display: "none" }}
              type="file"
            />
          </label>
          <label className="ml-3 text-nowrap">
            File:{" "}
            {context.plotFileName || (context.projectId > 0 ? "Use existing data" : "None")}
          </label>
        </div>
        <a
          href={
            `test_data/sample-${exampleFileType}-example.${fileType === "shp" ? "zip" : fileType}`
          }
        >
          Download example plot {fileType} file
        </a>
      </div>
    );
  };
  
  const renderCSV = (fileType, append) => {
    const { plotShape } = context;
    const plotUnits = plotShape === "circle" ? "Plot diameter (m)" : "Plot width (m)";
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {renderFileInput("csv", append)}
        <div style={{ display: "flex" }}>
          <span className="mr-3">{renderPlotShape()}</span>
          {renderLabeledInput(plotUnits, "plotSize")}
        </div>
      </div>
    );
  };

  const renderStrataRow = (feature, idx) => (
    <div
      key={idx}
      onMouseEnter={() => setPlotDetails({ selectedStrata: idx })}
      onMouseLeave={() => setPlotDetails({ selectedStrata: -1 })}
      style={{
        background: "rgba(255,255,255,0.5)",
        border: "1px solid black",
        borderRadius: "3px",
        display: "flex",
        minWidth: "50%",
        padding: ".5rem",
        marginBottom: ".25rem",
      }}
    >
      {`Strata ${idx + 1}: Area ${Math.round(mercator.calculateGeoJsonArea(feature))} ha`}
    </div>
  );

  const renderRandom = () => {
    const { aoiFeatures, plotShape, type } = context;
    const disabled = type === "simplified";
    const plotUnits = plotShape === "circle" ? "Plot diameter (m)" : "Plot width (m)";
    return (
      <div>
        {renderAOISelector()}
        <label>Plot properties</label>
        {aoiFeatures.map(renderStrataRow)}
        <div className="d-flex">
          {renderLabeledInput("Number of plots", "numPlots", disabled)}
          <span className="mx-3">{renderPlotShape()}</span>
          {renderLabeledInput(plotUnits, "plotSize")}
        </div>
      </div>
    );
  };

  const renderGridded = () => {
    const { aoiFeatures, plotShape } = context;
    const plotUnits = plotShape === "circle" ? "Plot diameter (m)" : "Plot width (m)";
    return (
      <div>
        {renderAOISelector()}
        {aoiFeatures.map(renderStrataRow)}
        <div className="d-flex">
          {renderLabeledInput("Plot spacing (m)", "plotSpacing")}
          <span className="mx-3">{renderPlotShape()}</span>
          {renderLabeledInput(plotUnits, "plotSize")}
        </div>
        {renderShufflePlots()}
      </div>
    );
  };

  const renderSimplifiedSelector = () => {
    const { aoiFeatures } = context;
    return (
      <div>
        {renderAOISelector()}
        {aoiFeatures.map(renderStrataRow)}
      </div>
    );
  };
  
  const { plotDistribution, designSettings } = context;
  
  const plotOptions = {
    random: {
      display: "Random",
      description: "Plot centers will be randomly distributed within the project boundary.",
      layout: renderRandom,
    },
    gridded: {
      display: "Gridded",
      description:
      "Plot centers will be arranged on a grid within the AOI using the plot spacing selected below.",
      layout: renderGridded,
    },
    csv: {
      display: "CSV File",
      description:
      "Specify your own plot centers by uploading a CSV with these fields: LON,LAT,PLOTID. Each plot center must have a unique PLOTID value.",
      layout: renderCSV,
    },
    shp: {
      display: "SHP File",
      alert: "CEO may overestimate the number of project plots when using a ShapeFile.",
      description:
      "Specify your own plot boundaries by uploading a zipped Shapefile (containing SHP, SHX, DBF, and PRJ files) of polygon features. Each feature must have a unique PLOTID value.",
      layout: renderFileInput,
    },
    geojson: {
      display: "GeoJSON File",
      alert: "CEO may overestimate the number of project plots when using a ShapeFile.",
      description:
      "Specify your own plot boundaries by uploading a GeoJSON file of polygon features. Each feature must have a unique PLOTID value in the properties map.",
      layout: renderFileInput,
    },
  };

  const simplifiedPlotOptions = {
    ...filterObject(
      plotOptions,
      ([_id, item]) => item.display !== "Random" && item.display !== "Gridded"
    ),
    simplified: {
      display: "Simplified AOI",
      description: "Use the map preview or the coordinate inputs to create the project plot",
      layout: renderSimplifiedSelector,
    },
  };

  const spatialDistributionOptions = context.type === 'simplified' ? simplifiedPlotOptions : plotOptions;

  return (
    <div id="plot-design">
      <h3 className="mb-3">Plot Generation</h3>
      <div className="ml-3">
        <div className="d-flex flex-column">
          <div className="form-group" style={{ width: "fit-content" }}>
            <label>Spatial distribution</label>
            <div style={{position: "relative"}}>
              {spatialDistributionOptions[plotDistribution].alert &&
               <p className="alert">- {spatialDistributionOptions[plotDistribution].alert}</p>}
              <select
                className="form-control form-control-sm"
                onChange={(e) =>
                  designSettings?.userAssignment?.userMethod === "file" ?
                    setPlotDetails({
                      plotDistribution: e.target.value,
                      designSettings: { ...designSettings,
                                        userAssignment: {userMethod: "none", users: [], percents: []},
                                        qaqcAssignment: {qaqcMethod: "none", smes: [], overlap: 0}}})
                    : setPlotDetails({ plotDistribution: e.target.value })
                }
                value={plotDistribution}
              >
                {Object.entries(spatialDistributionOptions).map(([key, options]) => (
                  <option key={key} value={key}>
                    {options.display}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="font-italic ml-2">{`- ${spatialDistributionOptions[plotDistribution].description}`}</p>
          
        </div>
        <div>{spatialDistributionOptions[plotDistribution].layout(plotDistribution, false)}</div>
        <p
          className="font-italic ml-2 small"
          style={{
            color: state.totalPlots > plotLimit ? "#8B0000" : "#006400",
            fontSize: "1rem",
            whiteSpace: "pre-line",
          }}
        >
          {state.totalPlots > 0 &&
           `This project will contain around ${formatNumberWithCommas(totalPlots)} plots.`}
          {state.totalPlots > 0 &&
           state.totalPlots > plotLimit &&
           `\n* The maximum allowed number for the selected plot distribution is ${formatNumberWithCommas(
                plotLimit
              )}.`}
        </p>
        {(context.type != "simplified") && (
          <>
            <h3 className="mb-3">Plot Similarity Configuration</h3>
            <div className="form-check">
              <input
                checked={context.projectOptions.plotSimilarity}
                className="form-check-input"
                id="similarPlots"
                onChange={() =>
                  context.setProjectDetails({
                    projectOptions: { ...context.projectOptions, plotSimilarity: !context.projectOptions.plotSimilarity },
                  })
                }
                type="checkbox"
              />
              <label className="form-check-label" htmlFor="similarPlots">
                Enable navigation by similarity
              </label>
              {context.projectOptions.plotSimilarity && (
                <>
                  <div className="form-group">
                    <label htmlFor="referencePlotId"> Reference plot ID: {"  "}</label>
                    <select
                      id="referencePlotId"
                      value={context.plotSimilarityDetails?.referencePlotId || ""}
                      onChange={(e) =>
                        context.setProjectDetails({
                          plotSimilarityDetails: {
                            ...context.plotSimilarityDetails,
                            referencePlotId: e.target.value,
                          },
                        })
                      }
                    >
                      <option value="" disabled>
                        Select a plot ID
                      </option>
                      {state.plotIdList?.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                    <br/>
                    <label htmlFor="year"> Year for comparison: {"  "} </label>
                    <DatePicker
                      selected={
                        context.plotSimilarityDetails?.years?.[0]
                          ? new Date(context.plotSimilarityDetails.years[0], 0, 1)
                          : new Date()
                      }
                      onChange={(d) => {
                        const year = d.getFullYear();

                        context.setProjectDetails({
                          plotSimilarityDetails: {
                            ...context.plotSimilarityDetails,
                            years: [year]
                          },
                        });
                      }}
                      className="form-control"
                      showYearPicker
                      dateFormat="yyyy"
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <hr/>
    </div>
  );
};


export function PlotDesignReview() {
  const { institutionImagery } = useContext(ProjectContext);
  return (
    <div className="d-flex">
      <div className="col-6">
        <PlotReview />
      </div>
      <div className="col-6">
        <AOIReview
          imagery={[institutionImagery[0]]}
        />
      </div>
    </div>
  );
}

export function PlotReview() {
  const {
    numPlots,
    plotDistribution,
    plotFileName,
    plotShape,
    plotSize,
    plotSpacing,
    useTemplatePlots,
  } = useContext(ProjectContext);
  return (
    <div id="plot-review">
      {useTemplatePlots && <h3 className="mb-3">Plots will be copied from template project</h3>}
      <div className="d-flex">
        <div id="plot-review-col1">
          <table className="table table-sm" id="plot-review-table">
            <tbody>
              <tr>
                <td className="w-80 pr-5">Spatial distribution</td>
                <td className="w-20 text-center">
                  <span className="badge badge-pill bg-lightgreen">{plotDistribution}</span>
                </td>
              </tr>
              <tr>
                <td className="w-80">Number of plots</td>
                <td className="w-20 text-center">
                  <span className="badge badge-pill bg-lightgreen">{numPlots} plots</span>
                </td>
              </tr>
              {plotDistribution === "gridded" && (
                <tr>
                  <td className="w-80">Plot spacing</td>
                  <td className="w-20 text-center">
                    <span className="badge badge-pill bg-lightgreen">{plotSpacing} m</span>
                  </td>
                </tr>
              )}
              {plotDistribution !== "shp" && (
                <>
                  <tr>
                    <td className="w-80">Plot shape</td>
                    <td className="w-20 text-center">
                      <span className="badge badge-pill bg-lightgreen">{plotShape}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-80">Plot size</td>
                    <td className="w-20 text-center">
                      <span className="badge badge-pill bg-lightgreen">{plotSize} m</span>
                    </td>
                  </tr>
                </>
              )}
              {["shp", "csv"].includes(plotDistribution) && (
                <tr>
                  <td className="w-80">Plot file</td>
                  <td className="w-20 text-center">
                    <span
                      className="badge badge-pill bg-lightgreen tooltip_wrapper"
                      style={{ color: "white" }}
                    >
                      {plotFileName
                        ? plotFileName.length > 13
                          ? `${plotFileName.substring(0, 13)}...`
                          : plotFileName
                        : "Unknown"}
                      {plotFileName && <div className="tooltip_content">{plotFileName}</div>}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AOIReview() {
  const { aoiFeatures, aoiFileName } = useContext(ProjectContext);
  const boundaryExtent = mercator.parseGeoJson(aoiFeatures[0], false).getExtent();
  return (
    <div id="aoi-review">
      {aoiFileName.length ? (
        <label>Boundary will be calculated from {aoiFileName}</label>
      ) : (
        <>
          <label>Boundary Coordinates</label>
          <div className="form-group mx-4">
            <div className="row">
              <div className="col-md-6 offset-md-3">
                <label>
                  <b>North: </b>
                  {boundaryExtent[3]}
                </label>
              </div>
            </div>
            <div className="row">
              <div className="col-md-6">
                <label>
                  <b>West: </b>
                  {boundaryExtent[0]}
                </label>
              </div>
              <div className="col-md-6">
                <label>
                  <b>East: </b>
                  {boundaryExtent[2]}
                </label>
              </div>
            </div>
            <div className="row">
              <div className="col-md-6 offset-md-3">
                <label>
                  <b>South: </b>
                  {boundaryExtent[1]}
                </label>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
