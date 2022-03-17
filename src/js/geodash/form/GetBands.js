import React from "react";

import {isArray} from "../../utils/generalUtils";
import SvgIcon from "../../components/svg/SvgIcon";

export default function GetBands({bands, setBands, assetId, assetType, hideLabel}) {
    const getBandsFromGateway = () => {
        if (assetId.length) {
            fetch("/geo-dash/gateway-request", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    path: "getAvailableBands",
                    assetId,
                    assetType
                })
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
                <button
                    className="btn btn-sm btn-secondary mb-1"
                    onClick={getBandsFromGateway}
                    title="Refresh Available Bands"
                    type="button"
                >
                    <SvgIcon icon="refresh" size="1.2rem"/>
                </button>
            </div>
            {!hideLabel && (
                <label className="ml-3">
                    {bands === null
                        ? "Click on the refresh button to see the Available Bands."
                        : isArray(bands)
                            ? bands.join(", ")
                            : bands }
                </label>
            )}
        </>
    );
}
