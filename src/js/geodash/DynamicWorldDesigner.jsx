import React, { useContext, useState } from "react";
import _ from "lodash";

import GDDateRange from "./form/GDDateRange";
import GDInput from "./form/GDInput";
import GDTextArea from "./form/GDTextArea";
import GDSelect from "./form/GDSelect";
import ImageCollectionAssetDesigner from "./ImageCollectionAssetDesigner";


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
    </>
  );
}

/*
{'{"min":0, "max": 8, "palette": ["#419BDF", "#397D49", "#88B053", "#7A87C6", "#E49635", "#DFC35A", "#C4281B", "#A59B8F", "#B39FE1"]}'}
 */
