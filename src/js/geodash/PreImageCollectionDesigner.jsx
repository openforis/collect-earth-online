import React, { useContext } from "react";

import BasemapSelector from "./form/BasemapSelector";
import GDInput from "./form/GDInput";
import GDDateRange from "./form/GDDateRange";
import GDSelect from "./form/GDSelect";

import { EditorContext } from "./constants";

export default function PreImageCollectionDesigner({ isDual = false, prefixPath = "" }) {
  const { getWidgetDesign } = useContext(EditorContext);
  const currentSourceType = getWidgetDesign("sourceType", prefixPath);
  const currentSourceName = getWidgetDesign("sourceName", prefixPath);
  const availableBands = {
    Landsat: "BLUE, GREEN,RED, NIR, SWIR1, TEMP, SWIR2",
    Sentinel2: "B1, B2, B3, B4, B5, B6, B7, B8, B8A, B9, B10, B11, B12, QA10, QA20, QA60",
  };

  const sourceName = getWidgetDesign("sourceName");

  const sourceToItems = {
    Landsat: ["NDVI", "EVI", "EVI 2", "NDMI", "NDWI"],
    Sentinel2: ["NDVI", "EVI", "EVI 2", "NDMI", "NDWI"],
  };

  return (
    <>
      {!isDual && <BasemapSelector />}
      <GDSelect
        dataKey="sourceName"
        items={["Landsat", "Sentinel-2"]}
        prefixPath={prefixPath}
        title="Imagery Source"
      />
      <GDSelect
        dataKey="sourceType"
        items={["Index", "Composite"]}
        prefixPath={prefixPath}
        title="Imagery Source Type"
      />
      <GDDateRange prefixPath={prefixPath} />
      {["Index", undefined].includes(currentSourceType) && (
        <GDSelect
          dataKey="indexName"
          items={sourceToItems[sourceName] || sourceToItems["Landsat"]}
          prefixPath={prefixPath}
          title="Band to graph"
        />
      )}
      {["Composite"].includes(currentSourceType) && (
        <>
          <label>Available Bands: </label>
          <label>{availableBands[currentSourceName]}</label>
          <GDInput dataKey="bands" placeholder="XX,XX,XX" prefixPath={prefixPath} title="Bands" />
          <GDInput dataKey="min" placeholder="-1,0.5,0.7" prefixPath={prefixPath} title="Min" />
          <GDInput dataKey="max" placeholder="10,11,15" prefixPath={prefixPath} title="Max" />
          <GDInput
            dataKey="cloudLessThan"
            placeholder="90"
            prefixPath={prefixPath}
            title="Cloud Score"
          />
        </>
      )}
    </>
  );
}
