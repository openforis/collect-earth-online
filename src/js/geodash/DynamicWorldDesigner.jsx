import React, { useContext, useState } from "react";
import _ from "lodash";

import GDDateRange from "./form/GDDateRange";
import BasemapSelector from "./form/BasemapSelector";
import GDTextArea from "./form/GDTextArea";


export default function DynamicWorldDesigner({prefixPath = ""}) {

  return (
    <>
      <GDTextArea
        dataKey="visParams"
        placeholder={'{"min":0, "max": 8}'}
        prefixPath={prefixPath}
        title="Image Parameters (JSON format)"
      />
      <GDDateRange prefixPath={prefixPath} />
      <BasemapSelector />
    </>
  );
}
