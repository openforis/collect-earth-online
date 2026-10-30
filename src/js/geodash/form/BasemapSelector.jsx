import React, { useContext, useState, useEffect } from "react";

import { EditorContext } from "../constants";
import SvgIcon from "../../components/svg/SvgIcon";
import { fetchTfoMosaics, tfoLabel } from "../../imagery/tfo";


export default function BasemapSelector() {
  const { widgetDesign, setWidgetDesign, getWidgetDesign, imagery, getInstitutionImagery, institutionId } =
        useContext(EditorContext);
  const [TFOLayers, setTFOLayers] = useState([]);
  const [tfoError, setTfoError] = useState(null);
  const [imageryType, setImageryType] = useState("");
  const [basemap, setBasemap] = useState(imagery.filter((i)=>i.id === getWidgetDesign("basemapId")));
  const basemapId = getWidgetDesign("basemapId");

  function tfoDateSelector(){
    const options = (TFOLayers || []).map(
      (l) => (
        <option
          value={l}
          key={l}
        >
          {tfoLabel(l)}
        </option>)
    );
    return (
      <div>
        <label htmlFor="tfo-layer">Select Date:</label>
        <select
          className="form-control"
          id="tfo-layer"
          onChange={(e)=>{
            setWidgetDesign("basemapTFODate", e.target.value);
          }}
          value={
            getWidgetDesign("basemapTFODate") || "newest"}
        >
          <option value="newest">Newest available</option>
          {options}
        </select>
        {tfoError && <div style={{ color: "red", fontSize: ".85em" }}>{tfoError}</div>}
      </div>);
  }

  const getTFOLayers = () => {
    const keepOrUseNewest = (layers) => {
      const current = getWidgetDesign("basemapTFODate");
      if (!current || (current !== "newest" && !layers.includes(current))) {
        setWidgetDesign("basemapTFODate", "newest");
      }
    };
    fetchTfoMosaics(basemapId)
      .then((layers) => {
        setTFOLayers(layers);
        setTfoError(null);
        keepOrUseNewest(layers);
      })
      .catch((error) => {
        console.error(error);
        setTFOLayers([]);
        setTfoError(error.message);
        keepOrUseNewest([]);
      });
  };

  useEffect(()=> {
    if (!imageryType) return;
    setWidgetDesign("basemapType", imageryType);
    (imageryType === "PlanetTFO") ?
      getTFOLayers()
      : setWidgetDesign("basemapTFODate", null);
  }, [imageryType, basemapId]);
  
  useEffect(()=>{
    setImageryType((imagery || []).filter((i)=> i.id === getWidgetDesign("basemapId"))[0]?.sourceConfig.type);
    setBasemap((imagery || []).filter((i)=> i.id === getWidgetDesign("basemapId"))[0]);
  }, [imagery]);
  
  return (
    <div className="form-group">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label htmlFor="basemap-select">Basemap</label>
        <button
          className="btn btn-sm btn-secondary mb-1"
          onClick={getInstitutionImagery}
          title="Refresh Basemap"
          type="button"
        >
          <SvgIcon icon="refresh" size="1.2rem" />
        </button>
      </div>
      <select
        className="form-control"
        id="basemap-select"
        onChange={(e) => {
          setWidgetDesign("basemapId", parseInt(e.target.value));
          setBasemap(imagery.filter((i)=> i.id.toString() === e.target.value)[0]);
          setImageryType(imagery.filter((i)=> i.id.toString() === e.target.value)[0].sourceConfig.type);}}
        value={getWidgetDesign("basemapId")}
        required
      >
        {(imagery || []).map(({ id, title}) => (
          <option key={id} value={id}>
            {title}
          </option>
        ))}
      </select>
      {(imageryType === "PlanetTFO") && tfoDateSelector()}
      <div style={{ fontSize: ".85em", padding: "0 .5rem" }}>
        Adding imagery to basemaps is available on the&nbsp;
        <a
          href={`/review-institution?institutionId=${institutionId}`}
          rel="noreferrer noopener"
          target="_blank"
        >
          institution review page
        </a>
        &nbsp;in the imagery tab.
      </div>
    </div>
  );
}
