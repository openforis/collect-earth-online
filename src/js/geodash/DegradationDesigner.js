import React from "react";

import BaseMapSelector from "./form/BaseMapSelector";
import GDDateRange from "./form/GDDateRange";
import GDSelect from "./form/GDSelect";

export default function DegradationDesigner() {
    return (
        <>
            <BaseMapSelector/>
            <GDSelect
                dataKey="graphBand"
                items={[
                    "NDFI",
                    "SWIR1",
                    "NIR",
                    "RED",
                    "GREEN",
                    "BLUE",
                    "SWIR2"
                ]}
                title="Band to graph"
            />
            <GDDateRange/>
        </>
    );
}
