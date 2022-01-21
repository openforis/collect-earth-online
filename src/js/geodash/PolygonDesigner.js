import React from "react";

import BasemapSelector from "./form/BasemapSelector";
import GDInput from "./form/GDInput";
import GDTextArea from "./form/GDTextArea";

export default function PolygonDesigner() {
    return (
        <>
            <BasemapSelector/>
            <GDInput
                dataKey="assetId"
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
                title="Image Parameters (JSON format)"
            />
        </>
    );
}
