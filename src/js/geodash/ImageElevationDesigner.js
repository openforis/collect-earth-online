import React from "react";

import BaseMapSelector from "./form/BaseMapSelector";
import GDInput from "./form/GDInput";
import GDTextArea from "./form/GDTextArea";

export default function ImageElevationDesigner() {
    return (
        <>
            <BaseMapSelector/>
            <GDInput
                dataKey="assetName"
                disabled
                title="GEE Image Asset Name"
            />
            <GDTextArea
                dataKey="visParams"
                placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
                title="Image Parameters (json format)"
            />
        </>
    );
}
