import React, {useContext, useState} from "react";

import BasemapSelector from "./form/BasemapSelector";
import GDDateRange from "./form/GDDateRange";
import GDInput from "./form/GDInput";
import GDTextArea from "./form/GDTextArea";
import GDSelect from "./form/GDSelect";
import GetBands from "./form/GetBands";

import {EditorContext} from "./constants";

export default function ImageCollectionAssetDesigner({isDual = false, prefixPath = ""}) {
    const [bands, setBands] = useState(null);
    const {getWidgetDesign} = useContext(EditorContext);
    return (
        <>
            {!isDual && <BasemapSelector/>}
            <GDInput
                dataKey="assetId"
                placeholder="LANDSAT/LC8_L1T_TOA"
                prefixPath={prefixPath}
                title="GEE Image Collection Asset ID"
            />
            <GetBands
                assetId={getWidgetDesign("assetId")}
                assetType="imageCollection"
                bands={bands}
                setBands={setBands}
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
                title="Image Parameters (JSON format)"
            />
            <GDDateRange optional prefixPath={prefixPath}/>
        </>
    );
}
