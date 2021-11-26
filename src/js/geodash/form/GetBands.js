import React, {useContext} from "react";

import {EditorContext} from "../constants";
import {isArray} from "../../utils/generalUtils";

export default function GetBands({bands, setBands, asset, type, hideLabel}) {
    const {getBandsFromGateway} = useContext(EditorContext);
    return (
        <>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <label>Available Bands</label>
                {/* TODO, depending on DualImage, move fetch function to this js file */}
                <button
                    className="btn btn-sm btn-secondary mb-1"
                    onClick={() => getBandsFromGateway(asset, type, setBands)}
                    type="button"
                >
                    Refresh
                </button>
            </div>
            {!hideLabel && (
                <label className="ml-3">
                    {bands === null
                        ? "Click on refresh to see the Available Bands."
                        : isArray(bands)
                            ? bands.join(",")
                            : bands }
                </label>
            )}
        </>
    );
}
