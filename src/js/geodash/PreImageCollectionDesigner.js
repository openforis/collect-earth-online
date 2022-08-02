import React, { useContext } from "react";

import BasemapSelector from "./form/BasemapSelector";
import GDInput from "./form/GDInput";
import GDDateRange from "./form/GDDateRange";
import GDSelect from "./form/GDSelect";

import { EditorContext } from "./constants";

export default function PreImageCollectionDesigner({ isDual = false, prefixPath = "" }) {
  const { getWidgetDesign } = useContext(EditorContext);
  const currentIndex = getWidgetDesign("indexName", prefixPath);
  const availableBands = {
    LANDSAT5: "B1, B2, B3, B4, B5, B6, B7, BQA",
    LANDSAT7: "B1, B2, B3, B4, B5, B6_VCID_1, B6_VCID_2, B7, B8, BQA",
    LANDSAT8: "B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11, BQA",
    Sentinel2: "B1, B2, B3, B4, B5, B6, B7, B8, B8A, B9, B10, B11, B12, QA10, QA20, QA60",
  };

  return (
    <>
      {!isDual && <BasemapSelector />}
      <GDSelect
        dataKey="indexName"
        items={[
          "NDVI",
          "EVI",
          "EVI 2",
          "NDMI",
          "NDWI",
          "LANDSAT 5",
          "LANDSAT 7",
          "LANDSAT 8",
          "Sentinel-2",
        ]}
        prefixPath={prefixPath}
        title="Data Type"
      />
      <GDDateRange prefixPath={prefixPath} />
      {["LANDSAT5", "LANDSAT7", "LANDSAT8", "Sentinel2"].includes(currentIndex) && (
        <>
          <label>Available Bands</label>
          <label>{availableBands[currentIndex]}</label>
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
