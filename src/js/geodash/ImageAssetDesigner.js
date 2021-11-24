import React, {useState, useContext} from "react";

import BaseMapSelector from "./form/BaseMapSelector";
import GDInput from "./form/GDInput";
import GDTextArea from "./form/GDTextArea";
import GetBands from "./form/GetBands";

import {EditorContext} from "./constants";

export default function ImageAssetDesigner({isDual = false, prefixPath = ""}) {
    const [bands, setBands] = useState(null);
    const {widgetDesign} = useContext(EditorContext);

    return (
        <>
            {!isDual && <BaseMapSelector/>}
            <GDInput
                dataKey="assetName"
                placeholder="LANDSAT/LC8_L1T_TOA/LC81290502015036LGN00"
                prefixPath={prefixPath}
                title="GEE Image Asset Name"
            />
            <GetBands
                asset={widgetDesign.assetName}
                bands={bands}
                prefixPath={prefixPath}
                setBands={setBands}
                type="image"
            />
            <GDTextArea
                dataKey="visParams"
                placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
                prefixPath={prefixPath}
                title="Image Parameters (json format)"
            />
        </>
    );
}
