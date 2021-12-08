import React, {} from "react";

import {isArray} from "../../utils/generalUtils";

export default function GetBands({bands, setBands, assetName, assetType, hideLabel}) {
    const getBandsFromGateway = () => {
        console.log(assetName);
        if (assetName.length) {
            const postObject = {
                path: "getAvailableBands",
                assetName,
                assetType
            };
            fetch("/geo-dash/gateway-request", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(postObject)
            })
                .then(res => (res.ok ? res.json() : Promise.reject()))
                .then(data => {
                    if (data.hasOwnProperty("bands")) {
                        setBands(data.bands);
                    } else if (data.hasOwnProperty("errMsg")) {
                        setBands(data.errMsg);
                    } else {
                        setBands(null);
                    }
                })
                .catch(error => {
                    console.error(error);
                    setBands(null);
                });
        }
    };

    return (
        <>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <label>Available Bands</label>
                {/* TODO, depending on DualImage, move fetch function to this js file */}
                <button
                    className="btn btn-sm btn-secondary mb-1"
                    onClick={getBandsFromGateway}
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
                            ? bands.join(", ")
                            : bands }
                </label>
            )}
        </>
    );
}
