import React from "react";

import BaseMapSelector from "./form/BaseMapSelector";
import GDInput from "./form/GDInput";
import GDTextArea from "./form/GDTextArea";

export default function PolygonDesigner() {
    return (
        <>
            <BaseMapSelector/>
            <GDInput
                dataKey="assetName"
                placeholder="users/username/collectionName"
                title="GEE Feature Collection Asset"
            />
            <GDInput
                dataKey="field"
                placeholder="OBJECTID"
                title="Field to match PLOTID"
            />
            <GDTextArea
                dataKey="visParams"
                defaultText={"{\"max\": 1, \"palette\": [\"red\"]}"}
                title="Image Parameters (json format)"
            />
        </>
    );
}
