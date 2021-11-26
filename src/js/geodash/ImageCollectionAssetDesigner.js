import React, {useContext, useState} from "react";

import BaseMapSelector from "./form/BaseMapSelector";
import GDDateRange from "./form/GDDateRange";
import GDInput from "./form/GDInput";
import GDTextArea from "./form/GDTextArea";
import GetBands from "./form/GetBands";

import {EditorContext} from "./constants";
import GDSelect from "./form/GDSelect";

export default function ImageCollectionAssetDesigner({isDual = false, prefixPath = ""}) {
    const [bands, setBands] = useState(null);
    const {widgetDesign} = useContext(EditorContext);
    return (
        <>
            {!isDual && <BaseMapSelector/>}
            <GDInput
                dataKey="assetName"
                placeholder="LANDSAT/LC8_L1T_TOA"
                prefixPath={prefixPath}
                title="GEE Image Collection Asset Name"
            />
            <GetBands
                asset={widgetDesign.assetName}
                bands={bands}
                setBands={setBands}
                type="imageCollection"
            />
            <GDSelect
                dataKey="reducer"
                items={["Min", "Max", "Mean", "Median", "Mode", "Mosaic"]}
                prefixPath={prefixPath}
                title="Collection Reducer"
            />
            <GDTextArea
                dataKey="visParams"
                placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
                prefixPath={prefixPath}
                title="Image Parameters (json format)"
            />
            <GDDateRange optional prefixPath={prefixPath}/>
        </>
    );
}
