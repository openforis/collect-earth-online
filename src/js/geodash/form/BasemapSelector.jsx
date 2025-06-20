import React, { useContext, useState, useEffect } from "react";

import { EditorContext } from "../constants";
import SvgIcon from "../../components/svg/SvgIcon";


export default function BasemapSelector() {
  const { widget, widgetDesign, setWidgetDesign, getWidgetDesign, imagery, getInstitutionImagery, institutionId } =
        useContext(EditorContext);
  const [TFOLayers, setTFOLayers] = useState([]);
  const [imageryType, setImageryType] = useState("");
  const [basemap, setBasemap] = useState(imagery.filter((i)=>i.id === getWidgetDesign("basemapId")));

  function tfoDateSelector(){
    const options = (
      tfoLayers || []).map(
        (l)=>{
          const name = l.slice(34, l.length - 7); 
          return (
            <option
              value={l}
              key={name}
            >
              {name}
            </option>);}
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
            getWidgetDesign("basemapTFODate")}         
        >          
          {options}
        </select>
      </div>);
  }
  
  const getTFOLayers = () => {
    fetch("/get-tfo-dates")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((layers) => {
        setTFOLayers(layers);
        setWidgetDesign("basemapTFODate", widget[0].basemapTFODate);        
      })
      .catch((error) => console.error(error));
  };
  
  useEffect(()=> {
    setWidgetDesign("basemapType", imageryType);
    (imageryType === "PlanetTFO") ?
      getTFOLayers() 
      : setWidgetDesign("basemapTFODate", null);
  }, [imageryType]);
  
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
