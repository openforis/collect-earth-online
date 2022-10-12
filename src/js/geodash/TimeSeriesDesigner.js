import React, { useContext, useState } from "react";

import GDDateRange from "./form/GDDateRange";
import GDInput from "./form/GDInput";
import GDSelect from "./form/GDSelect";
import GetBands from "./form/GetBands";

import { EditorContext } from "./constants";

export const getBandsFromGateway = (setBands, assetId, assetType) => {
  if (assetId?.length) {
    fetch("/geo-dash/gateway-request", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: "getAvailableBands",
        assetId,
        assetType,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data.hasOwnProperty("bands")) {
          setBands(data.bands);
        } else if (data.hasOwnProperty("errMsg")) {
          setBands(data.errMsg);
        } else {
          setBands(null);
        }
      })
      .catch((error) => {
        console.error(error);
        setBands(null);
      });
  }
};

export default function TimeSeriesDesigner() {
  const [bands, setBands] = useState(null);
  const { getWidgetDesign } = useContext(EditorContext);
  const assetId = getWidgetDesign("assetId");
  const assetType = "imageCollection";

  return (
    <>
      <GDSelect
        dataKey="indexName"
        items={["NDVI", "EVI", "EVI 2", "NDMI", "NDWI", "Custom"]}
        title="Data Type"
      />
      {getWidgetDesign("indexName") === "Custom" && (
        <>
          <GDInput
            dataKey="assetId"
            placeholder="LANDSAT/LC8_L1T_TOA"
            title="GEE Image Collection Asset ID"
            onBlur={() => getBandsFromGateway(setBands, assetId, assetType)}
            onKeyPress={(e) =>
              e.key === "Enter" && getBandsFromGateway(setBands, assetId, assetType)
            }
          />
          <GetBands
            assetId={assetId}
            assetType="imageCollection"
            bands={bands}
            hideLabel
            setBands={setBands}
          />
          <GDSelect dataKey="band" disabled items={bands} title="Band to graph" />
          <GDSelect
            dataKey="reducer"
            items={["Min", "Max", "Mean", "Median", "Mode"]}
            title="Reducer"
          />
        </>
      )}
      <GDDateRange />
    </>
  );
}
