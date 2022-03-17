import React, {useState, useContext} from "react";

import BasemapSelector from "./form/BasemapSelector";
import GDInput from "./form/GDInput";
import GDTextArea from "./form/GDTextArea";
import GetBands from "./form/GetBands";

import {EditorContext} from "./constants";

export default function ImageAssetDesigner({isDual = false, prefixPath = ""}) {
    const [bands, setBands] = useState(null);
    const {getWidgetDesign} = useContext(EditorContext);
    return (
        <>
            {!isDual && <BasemapSelector/>}
            <GDInput
                dataKey="assetId"
                placeholder="LANDSAT/LC8_L1T_TOA/LC81290502015036LGN00"
                prefixPath={prefixPath}
                title="GEE Image Asset ID"
            />
            <GetBands
                assetId={getWidgetDesign("assetId")}
                assetType="image"
                bands={bands}
                setBands={setBands}
            />
            <GDTextArea
                dataKey="visParams"
                placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
                prefixPath={prefixPath}
                title="Image Parameters (JSON format)"
            />
        </>
    );
}
