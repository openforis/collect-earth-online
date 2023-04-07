import React from "react";

import { isArray } from "../../utils/generalUtils";
import SvgIcon from "../../components/svg/SvgIcon";
import { getBandsFromGateway } from "../TimeSeriesDesigner";

export default function GetBands({ bands, setBands, assetId, assetType, hideLabel }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label>Available Bands</label>
        <button
          className="btn btn-sm btn-secondary mb-1"
          onClick={() => getBandsFromGateway(setBands, assetId, assetType)}
          title="Refresh Available Bands"
          type="button"
        >
          <SvgIcon icon="refresh" size="1.2rem" />
        </button>
      </div>
      {!hideLabel && (
        <label className="ml-3">
          {bands === null
            ? "Click on the refresh button to see the Available Bands."
            : isArray(bands)
            ? bands.join(", ")
            : bands}
        </label>
      )}
    </>
  );
}
