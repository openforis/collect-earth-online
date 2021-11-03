import React, {useContext, useState} from "react";

import BaseMapSelector from "./form/BaseMapSelector";
import GDDateRange from "./form/GDDateRange";
import GDInput from "./form/GDInput";
import GDTextArea from "./form/GDTextArea";
import GetBands from "./form/GetBands";

import {EditorContext} from "./constants";

export default function ImageCollectionAssetDesigner() {
    const [bands, setBands] = useState(null);
    const {widgetDesign} = useContext(EditorContext);
    return (
        <>
            <BaseMapSelector/>
            {/* FIXME this key should be asset name */}
            <GDInput
                dataKey="imageCollection"
                placeholder="LANDSAT/LC8_L1T_TOA"
                title="GEE Image Collection Asset Name"
            />
            <GetBands
                asset={widgetDesign.imageCollection}
                bands={bands}
                setBands={setBands}
                type="imageCollection"
            />
            <GDTextArea
                dataKey="visParams"
                placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
                title="Image Parameters (json format)"
            />
            <GDDateRange optional/>
        </>
    );
}
