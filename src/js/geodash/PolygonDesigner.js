import React from "react";

import BaseMapSelector from "./form/BaseMapSelector";
import GDInput from "./form/GDInput";
import GDTextArea from "./form/GDTextArea";

export default function PolygonDesigner() {
    return (
        <>
            <BaseMapSelector/>
            <GDInput
                dataKey="featureCollection"
                placeholder="users/username/collectionName"
                title="GEE Feature Collection Asset"
            />
            <GDInput
                dataKey="matchField"
                placeholder="OBJECTID"
                title="Field to match PLOTID"
            />
            <GDTextArea
                dataKey="visParams"
                placeholder={"{\"bands\": \"B4, B3, B2\", \n\"min\":0, \n\"max\": 0.3}"}
                title="Image Parameters (json format)"
            />
        </>
    );
}
