import React from "react";

import BasemapSelector from "./form/BasemapSelector";
import GDDateRange from "./form/GDDateRange";
import GDSelect from "./form/GDSelect";
import TimeSeriesDesigner from "./TimeSeriesDesigner";

export default function DegradationDesigner() {
  return (
    <>
      <BasemapSelector />
      <GDSelect
        dataKey="band"
        items={["NDFI", "SWIR1", "NIR", "RED", "GREEN", "BLUE", "SWIR2", "NDVI", "NBR", "NDWI"]}
        title="Band to graph"
      />
      <GDDateRange />
      <TimeSeriesDesigner />
    </>
  );
}
