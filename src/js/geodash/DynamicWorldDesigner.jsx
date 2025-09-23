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

      <GDInput
        dataKey="assetId"
        placeholder="GOOGLE/DYNAMICWORLD/V1"
        prefixPath={prefixPath}
        title="HARDCODE THIS TO DYNAMICWORLD"
      />
        
      <GDSelect
        dataKey="reducer"
        items={["Mode"]}
        prefixPath={prefixPath}
        title="Collection Reducer"
      />
      <GDTextArea
        dataKey="visParams"
        defaultValue={'{"min":0, "max": 0.3}'}
        prefixPath={prefixPath}
        title="HARDCODE THESE FOR NOW, BUT MAYBE ALLOW USERS TO CUSTOMIZE PALLET"
      />
      <GDDateRange optional prefixPath={prefixPath} />
    </>
  );
}
