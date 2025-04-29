import React, { useContext, useEffect, useState } from "react";

import GDDateRange from "./form/GDDateRange";
import GDInput from "./form/GDInput";
import GDSelect from "./form/GDSelect";
import GetBands from "./form/GetBands";

import { EditorContext } from "./constants";

export async function getBandsFromGateway(setBands, assetId, assetType) {
  if (assetId?.length) {
    try {
      const res = await fetch("/geo-dash/gateway-request", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          path: "getAvailableBands",
          assetId,
          assetType,
        }),
      }
      );
      const data = await res.json();
      if (data.hasOwnProperty("bands")) {
        setBands(data.bands);
      } else if (data.hasOwnProperty("errMsg")) {
        throw data.errMsg;
      } else {
        setBands(null);
      }
    } catch (e) {
      console.error(e);
      setBands(null);
    }
  };
}

export default function TimeSeriesDesigner() {
  const [bands, setBands] = useState(null);
  const { getWidgetDesign } = useContext(EditorContext);
  const assetId = getWidgetDesign("assetId");
  const assetType = "imageCollection";

  useEffect(() => {
    getBandsFromGateway(setBands, assetId, assetType).catch(console.error);
  }, []);

  return (
    <>
      <GDSelect
        dataKey="sourceName"
        items={["Landsat", "Custom"]}
        title="Imagery Source"
      />
      {getWidgetDesign("sourceName") === "Landsat" && (
        <GDSelect
          dataKey="indexName"
          items={["NDVI", "EVI", "EVI 2", "NDMI", "NDWI", "NBR"]}
          title="Band to graph"
        />
      )}
      {getWidgetDesign("sourceName") === "Custom" && (
        <>
          <GDInput
            dataKey="assetId"
            placeholder="LANDSAT/LC8_L1T_TOA"
            title="GEE Image Collection Asset ID"
            onBlur={() => getBandsFromGateway(setBands, assetId, assetType)}
            onKeyDown={(e) =>
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
          <GDSelect dataKey="band" items={bands} title="Band to graph" />
          <GDSelect
            dataKey="reducer"
            items={["Min", "Max", "Mean", "Median", "Mode"]}
            title="Reducer"
          />
          <GDInput dataKey="scale" placeholder="30" title="Spatial scale" />
        </>
      )}
      <GDDateRange />
    </>
  );
}
