import React from "react";

import Select from "../components/Select";
import { mercator } from "../utils/mercator";
import { monthlyMapping } from "../utils/generalUtils";
import SvgIcon from "../components/svg/SvgIcon";

export class PlanetMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      year: this.props.sourceConfig.year,
      month: this.props.sourceConfig.month,
    };
  }

  componentDidMount() {
    this.updateImageryInformation();
  }

  componentDidUpdate(prevProps) {
    if (this.props.visible && prevProps.visible !== this.props.visible) {
      this.updateImageryInformation();
    }
  }

  updateImageryInformation = () => {
    if (this.props.visible) {
      this.props.setImageryAttribution(
        " | Monthly Mosaic of " + `${this.state.year}, ${monthlyMapping[this.state.month]}`
      );
      this.props.setImageryAttributes({
        imageryYearPlanet: this.state.year,
        imageryMonthPlanet: this.state.month,
      });
    }
  };

  updatePlanetLayer = () => {
    this.updateImageryInformation();
    mercator.updateLayerSource(
      this.props.mapConfig,
      this.props.thisImageryId,
      this.props.currentProjectBoundary,
      (sourceConfig) => ({
        ...sourceConfig,
        month: (this.state.month.length === 1 ? "0" : "") + this.state.month,
        year: this.state.year,
      })
    );
  };

  render() {
    return (
      <div className="my-2" style={{ display: this.props.visible ? "block" : "none" }}>
        <div className="slide-container">
          <input
            className="slider"
            id="myRange"
            max={new Date().getFullYear()}
            min="2016"
            onChange={(e) => this.setState({ year: e.target.value })}
            type="range"
            value={this.state.year || ""}
          />
          <label>Year: {this.state.year}</label>
        </div>
        <div className="slide-container">
          <input
            className="slider"
            id="myRangemonth"
            max="12"
            min="1"
            onChange={(e) => this.setState({ month: e.target.value })}
            type="range"
            value={this.state.month || ""}
          />
          <label>Month: {monthlyMapping[this.state.month]}</label>
        </div>
        <div className="slide-container">
          <button
            className="btn btn-lightgreen btn-sm btn-block"
            onClick={this.updatePlanetLayer}
            type="button"
          >
            Update Map
          </button>
        </div>
      </div>
    );
  }
}

export class PlanetDailyMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      startDate: this.props.sourceConfig.startDate,
      endDate: this.props.sourceConfig.endDate,
    };
  }

  componentDidMount() {
    this.updateImageryInformation();
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.visible &&
      ((this.props.currentPlot && this.props.currentPlot !== prevProps.currentPlot) ||
        prevProps.visible !== this.props.visible)
    ) {
      this.updateImageryInformation();
    }
  }

  updateImageryInformation = () => {
    this.props.setImageryAttribution(` | ${this.state.startDate} to ${this.state.endDate}`);
    this.props.setImageryAttributes({
      imageryStartDatePlanetDaily: this.state.startDate,
      imageryEndDatePlanetDaily: this.state.endDate,
    });
  };

  updatePlanetDailyLayer = () => {
    if (this.props.visible) {
      const { startDate, endDate } = this.state;
      if (new Date(startDate) > new Date(endDate)) {
        alert("Start date must be smaller than the end date.");
      } else {
        this.updateImageryInformation();
        mercator.currentMap
          .getControls()
          .getArray()
          .filter((control) => control.element.classList.contains("planet-layer-switcher"))
          .map((control) => mercator.currentMap.removeControl(control));
        mercator.updateLayerSource(
          this.props.mapConfig,
          this.props.thisImageryId,
          mercator.geometryToGeoJSON(mercator.getViewPolygon(this.props.mapConfig), "EPSG:4326"),
          (sourceConfig) => ({
            ...sourceConfig,
            startDate,
            endDate,
          })
        );
      }
    }
  };

  render() {
    return (
      <div className="my-2" style={{ display: this.props.visible ? "block" : "none" }}>
        <div className="slide-container">
          <label>Start Date</label>
          <input
            className="form-control"
            id="planetDailyStartDate"
            max={new Date().toJSON().split("T")[0]}
            onChange={(e) => this.setState({ startDate: e.target.value })}
            type="date"
            value={this.state.startDate || ""}
          />
        </div>
        <div className="slide-container">
          <label>End Date</label>
          <input
            className="form-control"
            id="planetDailyEndDate"
            max={new Date().toJSON().split("T")[0]}
            onChange={(e) => this.setState({ endDate: e.target.value })}
            type="date"
            value={this.state.endDate || ""}
          />
        </div>
        <div className="slide-container">
          <button
            className="btn btn-lightgreen btn-sm btn-block"
            onClick={this.updatePlanetDailyLayer}
            type="button"
          >
            Update Map
          </button>
        </div>
      </div>
    );
  }
}

export class PlanetNICFIMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedTime: this.props.sourceConfig.time,
      selectedBand: this.props.sourceConfig.band,
      nicfiLayers: [],
      isDisabledLeft: false,
      isDisabledRight: true
    };
  }

  componentDidMount() {
    this.updatePlanetLayer();
    this.getNICFILayers();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.visible && prevProps.visible !== this.props.visible) {
      this.updateImageryInformation();
    }
   
    if (prevState.selectedTime !== this.state.selectedTime) {
      this.setState((state) => {
        const { nicfiLayers, selectedTime } = state;
        const index = nicfiLayers.indexOf(selectedTime);

        return {
          isDisabledLeft: index >= nicfiLayers.length - 1,
          isDisabledRight: index <= 0
        }
      })
    }
  }

  getNICFILayers = () => {
    fetch("/get-nicfi-dates")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((layers) => {
        this.setState(
          {
            nicfiLayers: layers,
            ...(this.props.sourceConfig.time === "newest" && { selectedTime: layers[0] }),
          },
          this.updatePlanetLayer
        );
      })
      .catch((error) => console.error(error));
  };

  updateImageryInformation = () => {
    if (this.props.visible) {
      this.props.setImageryAttribution(` | ${this.state.selectedTime} Mosaic`);
      this.props.setImageryAttributes({
        time: this.state.selectedTime,
      });
    }
  };

  switchImagery = (direction) => {
    this.setState((prevState) => {
      const { nicfiLayers, selectedTime } = prevState;
      const currentIndex = nicfiLayers.indexOf(selectedTime);

      const move = direction === "forward" ? -1 : 1;
      const newIndex = currentIndex + move;

      // Check boundary conditions
      if (newIndex < 0 || newIndex >= nicfiLayers.length) return {};

      return { selectedTime: nicfiLayers[newIndex] };
    });
  }

  updatePlanetLayer = () => {
    this.updateImageryInformation();
    mercator.updateLayerSource(
      this.props.mapConfig,
      this.props.thisImageryId,
      this.props.currentProjectBoundary,
      (sourceConfig) => ({
        ...sourceConfig,
        time: this.state.selectedTime,
        band: this.state.selectedBand,
      })
    );
  };

  render() {
    const { nicfiLayers, selectedTime, selectedBand } = this.state;
    return (
      nicfiLayers.length > 0 && (
        <div className="my-2" style={{ display: this.props.visible ? "block" : "none" }}>
          <div className="slide-container v-center justify-content-center">
            <label className="mb-0 mr-2" htmlFor="time-selection">
              Select Time
            </label>
            <select
              id="time-selection"
              onChange={(e) => this.setState({ selectedTime: e.target.value })}
              value={selectedTime}
              className="mb-0 mr-1"
            >
              {nicfiLayers.map((time) => (
                <option key={time} value={time}>
                  {time.slice(34, time.length - 7)}
                </option>
              ))}
            </select>
            <button
              className="btn btn-outline-lightgreen btn-sm mr-1"
              type="button"
              onClick={() => this.switchImagery("backward")}
              disabled={this.state.isDisabledLeft}
            >
              <SvgIcon icon="leftArrow" size="0.9rem" />
            </button>
            <button
              className="btn btn-outline-lightgreen btn-sm"
              type="button"
              onClick={() => this.switchImagery("forward")}
              disabled={this.state.isDisabledRight}
            >
              <SvgIcon icon="rightArrow" size="0.9rem" />
            </button>
          </div>
          <div className="slide-container">
            <div id="radio-group">
              <div className="form-check form-check-inline">
                <input
                  checked={selectedBand === "rgb"}
                  className="form-check-input"
                  id="visible"
                  onChange={() => this.setState({ selectedBand: "rgb" })}
                  type="radio"
                />
                <label className="form-check-label" htmlFor="visible">
                  Visible
                </label>
              </div>
              <div className="form-check form-check-inline">
                <input
                  checked={selectedBand === "cir"}
                  className="form-check-input"
                  id="infrared"
                  onChange={() => this.setState({ selectedBand: "cir" })}
                  type="radio"
                />
                <label className="form-check-label" htmlFor="infrared">
                  Infrared
                </label>
              </div>
            </div>
          </div>
          <div className="slide-container">
            <button
              className="btn btn-lightgreen btn-sm"
              onClick={this.updatePlanetLayer}
              type="button"
            >
              Update Map
            </button>
          </div>
        </div>
      )
    );
  }
}

export class SecureWatchMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      availableDates: [],
      featureId: null,
      imageryDate: "",
      imageryCloudCover: "",
    };
  }

  componentDidUpdate(prevProps) {
    const { extent, visible } = this.props;
    if (extent.length > 0 && JSON.stringify(extent) !== JSON.stringify(prevProps.extent)) {
      this.getAvailableDates();
    }
    if (prevProps.visible !== visible) {
      this.updateImageryInformation();
    }
  }

  updateImageryInformation = () => {
    if (this.props.visible) {
      const { featureId, imageryDate, imageryCloudCover } = this.state;
      this.props.setImageryAttribution(
        featureId
          ? ` | ${imageryDate}` + ` (${(imageryCloudCover * 100).toFixed(2)}% cloudy)`
          : " | No available layers"
      );
      if (featureId) {
        this.props.setImageryAttributes({
          imagerySecureWatchDate: imageryDate,
          imagerySecureWatchCloudCover: imageryCloudCover,
        });
      }
    }
  };

  updateSingleLayer = (featureId, imageryDate, imageryCloudCover) => {
    mercator.updateLayerWmsParams(
      this.props.mapConfig,
      this.props.thisImageryId,
      {
        COVERAGE_CQL_FILTER: "featureId='" + featureId + "'",
      },
      "/get-tile"
    );
    this.setState(
      {
        featureId,
        imageryDate,
        imageryCloudCover,
      },
      () => this.updateImageryInformation()
    );
  };

  onChangeSingleLayer = (eventTarget) =>
    this.updateSingleLayer(
      eventTarget.value,
      eventTarget.options[eventTarget.selectedIndex].getAttribute("date"),
      eventTarget.options[eventTarget.options.selectedIndex].getAttribute("cloud")
    );

  getAvailableDates = () => {
    const { thisImageryId, sourceConfig, visible, extent, setImageryAttribution } = this.props;
    if (visible) setImageryAttribution(" | Loading...");
    const secureWatchFeatureInfoUrl =
      "SERVICE=WMS" +
      "&VERSION=1.1.1" +
      "&REQUEST=GetFeatureInfo" +
      "&CRS=EPSG%3A3857" +
      "&BBOX=" +
      extent.join(",") +
      "&WIDTH=256" +
      "&HEIGHT=256" +
      "&LAYERS=DigitalGlobe:ImageryFootprint" +
      "&QUERY_LAYERS=DigitalGlobe:ImageryFootprint" +
      "&FEATURE_COUNT=1000" +
      "&X=0" +
      "&Y=0" +
      "&INFO_FORMAT=application/json" +
      "&imageryId=" +
      thisImageryId;
    this.setState({ availableDates: [] }, () => {
      fetch(`/get-securewatch-dates?${secureWatchFeatureInfoUrl}`)
        .then((response) => {
          if (response.ok) {
            return response.json(); // if no layers are found, the response is XML. This will fail.
          } else {
            alert("Error retrieving SecureWatch dates. See console for details.");
            return { features: [] };
          }
        })
        .catch((response) => {
          console.error(response);
          console.error(
            "It is likely that your Connect ID for Securewatch imagery is expired. See console for more details."
          );
          return { features: [] };
        })
        .then((data) => {
          this.setState(
            {
              availableDates: data.features
                .filter(
                  (feature) =>
                    Date.parse(feature.properties.acquisitionDate) <=
                      Date.parse(sourceConfig.endDate) &&
                    Date.parse(feature.properties.acquisitionDate) >=
                      Date.parse(sourceConfig.startDate)
                )
                .map((feature) => ({
                  acquisitionDate: feature.properties.acquisitionDate,
                  cloudCover: feature.properties.cloudCover,
                  featureId: feature.properties.featureId,
                })),
            },
            () => {
              if (this.state.availableDates.length === 0) {
                this.updateSingleLayer(null, "", "");
              } else {
                this.updateSingleLayer(
                  this.state.availableDates[0].featureId,
                  this.state.availableDates[0].acquisitionDate,
                  this.state.availableDates[0].cloudCover
                );
              }
            }
          );
        })
        .catch((response) => {
          console.log(response);
          alert("Error processing SecureWatch dates. See console for details.");
        });
    });
  };

  render() {
    return (
      <div className="my-2 mb-3" style={{ display: this.props.visible ? "block" : "none" }}>
        <div className="slide-container">
          <label>Available Layers</label>
          {this.state.availableDates && this.state.availableDates.length > 0 ? (
            <select
              className="form-control"
              id="securewatch-option-select"
              onChange={(e) => this.onChangeSingleLayer(e.target)}
            >
              {this.state.availableDates.map((obj) => (
                <option
                  key={obj.featureId}
                  cloud={obj.cloudCover}
                  date={obj.acquisitionDate}
                  value={obj.featureId}
                >
                  {obj.acquisitionDate + " (" + (obj.cloudCover * 100).toFixed(2) + "% cloudy)"}
                </option>
              ))}
            </select>
          ) : (
            <select className="form-control" disabled id="securewatch-option-select">
              <option>
                {this.state.availableDates ? "No available layers" : "Loading dates..."}
              </option>
            </select>
          )}
        </div>
      </div>
    );
  }
}

export class SentinelMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      year: this.props.sourceConfig.year,
      month: this.props.sourceConfig.month,
      bandCombination: this.props.sourceConfig.bandCombination,
    };
  }

  componentDidMount() {
    this.updateImageryInformation();
  }

  componentDidUpdate(prevProps) {
    if (this.props.visible && prevProps.visible !== this.props.visible) {
      this.updateImageryInformation();
    }
  }

  updateImageryInformation = () => {
    if (this.props.visible) {
      this.props.setImageryAttribution(
        " | Monthly Mosaic of " + `${this.state.year}, ${monthlyMapping[this.state.month]}`
      );
      this.props.setImageryAttributes({
        [this.props.sourceConfig.type === "Sentinel1"
          ? "sentinel1MosaicYearMonth"
          : "sentinel2MosaicYearMonth"]: this.state.year + " - " + monthlyMapping[this.state.month],
      });
    }
  };

  updateSentinelLayer = () => {
    this.updateImageryInformation();
    mercator.updateLayerSource(
      this.props.mapConfig,
      this.props.thisImageryId,
      this.props.currentProjectBoundary,
      (sourceConfig) => ({
        ...sourceConfig,
        month: (this.state.month.length === 1 ? "0" : "") + this.state.month,
        year: this.state.year,
        bandCombination: this.state.bandCombination,
      })
    );
  };

  render() {
    const bandCombinationOptions =
      this.props.sourceConfig.type === "Sentinel1"
        ? [
            { label: "VH,VV,VH/VV", value: "VH,VV,VH/VV" },
            { label: "VH,VV,VV/VH", value: "VH,VV,VV/VH" },
            { label: "VV,VH,VV/VH", value: "VV,VH,VV/VH" },
            { label: "VV,VH,VH/VV", value: "VV,VH,VH/VV" },
          ]
        : [
            { label: "True Color", value: "TrueColor" },
            { label: "False Color Infrared", value: "FalseColorInfrared" },
            { label: "False Color Urban", value: "FalseColorUrban" },
            { label: "Agriculture", value: "Agriculture" },
            { label: "Healthy Vegetation", value: "HealthyVegetation" },
            { label: "Short Wave Infrared", value: "ShortWaveInfrared" },
          ];

    return (
      <div className="my-2" style={{ display: this.props.visible ? "block" : "none" }}>
        <div className="slide-container">
          <input
            className="slider"
            id="sentinel-year"
            max={new Date().getFullYear()}
            min="2015"
            onChange={(e) => this.setState({ year: e.target.value })}
            type="range"
            value={this.state.year}
          />
          <label>Year: {this.state.year}</label>
        </div>
        <div className="slide-container">
          <input
            className="slider"
            id="sentinel-month"
            max="12"
            min="1"
            onChange={(e) => this.setState({ month: e.target.value })}
            type="range"
            value={this.state.month}
          />
          <label>Month: {monthlyMapping[this.state.month]}</label>
        </div>
        <div className="slide-container">
          <label>Band Combination</label>
          <select
            className="form-control"
            id="sentinel-bandCombination"
            onChange={(e) => this.setState({ bandCombination: e.target.value })}
            value={this.state.bandCombination}
          >
            {bandCombinationOptions.map((el) => (
              <option key={el.value} value={el.value}>
                {el.label}
              </option>
            ))}
          </select>
        </div>
        <div className="slide-container">
          <button
            className="btn btn-lightgreen btn-sm btn-block"
            onClick={this.updateSentinelLayer}
            type="button"
          >
            Update Map
          </button>
        </div>
      </div>
    );
  }
}

export class GEEImageMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visParams: this.props.sourceConfig.visParams,
    };
  }

  componentDidMount() {
    this.updateImageryInformation();
  }

  componentDidUpdate(prevProps) {
    if (this.props.visible && prevProps.visible !== this.props.visible) {
      this.updateImageryInformation();
    }
  }

  updateImageryInformation = () => {
    if (this.props.visible) {
      this.props.setImageryAttribution(` | ${this.props.sourceConfig.assetId}`);
      this.props.setImageryAttributes({
        geeImageryAssetId: this.props.sourceConfig.assetId,
      });
    }
  };

  updateGEEImagery = () => {
    this.updateImageryInformation();
    mercator.updateLayerSource(
      this.props.mapConfig,
      this.props.thisImageryId,
      this.props.currentProjectBoundary,
      (sourceConfig) => ({
        ...sourceConfig,
        visParams: this.state.visParams,
      })
    );
  };

  render() {
    return (
      <div className="my-2" style={{ display: this.props.visible ? "block" : "none" }}>
        <div className="slide-container">
          <label>Visualization Parameters</label>
          <textarea
            className="form-control"
            id="geeImageVisParams"
            onChange={(e) => this.setState({ visParams: e.target.value })}
            value={this.state.visParams}
          />
        </div>
        <div className="slide-container">
          <button
            className="btn btn-lightgreen btn-sm btn-block"
            id="update-gee-image-button"
            onClick={this.updateGEEImagery}
            type="button"
          >
            Update Map
          </button>
        </div>
      </div>
    );
  }
}

export class GEEImageCollectionMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      startDate: this.props.sourceConfig.startDate,
      endDate: this.props.sourceConfig.endDate,
      visParams: this.props.sourceConfig.visParams,
      reducer: this.props.sourceConfig.reducer,
    };
  }

  componentDidMount() {
    this.updateImageryInformation();
  }

  componentDidUpdate(prevProps) {
    if (this.props.visible && prevProps.visible !== this.props.visible) {
      this.updateImageryInformation();
    }
  }

  updateImageryInformation = () => {
    if (this.props.visible) {
      this.props.setImageryAttribution(` | ${this.props.sourceConfig.assetId}`);
      this.props.setImageryAttributes({
        geeImageCollectionAssetId: this.props.sourceConfig.assetId,
        geeImageCollectionStartDate: this.state.startDate,
        geeImageCollectionEndDate: this.state.endDate,
        geeImageCollectionReducer: this.state.reducer
      });
    }
  };

  updateGEEImageCollection = () => {
    const { startDate, endDate, visParams, reducer } = this.state;
    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date must be smaller than the end date.");
    } else {
      this.updateImageryInformation();
      mercator.updateLayerSource(
        this.props.mapConfig,
        this.props.thisImageryId,
        this.props.currentProjectBoundary,
        (sourceConfig) => ({
          ...sourceConfig,
          visParams,
          startDate,
          endDate,
          reducer,
        })
      );
    }
  };

  render() {
    return (
      <div className="my-2" style={{ display: this.props.visible ? "block" : "none" }}>
        <div className="slide-container">
          <label>Start Date</label>
          <input
            className="form-control"
            id="geeImageCollectionStartDate"
            max={new Date().toJSON().split("T")[0]}
            onChange={(e) => this.setState({ startDate: e.target.value })}
            type="date"
            value={this.state.startDate}
          />
        </div>
        <div className="slide-container">
          <label>End Date</label>
          <input
            className="form-control"
            id="geeImageCollectionEndDate"
            max={new Date().toJSON().split("T")[0]}
            onChange={(e) => this.setState({ endDate: e.target.value })}
            type="date"
            value={this.state.endDate}
          />
        </div>
        <div className="slide-container">
          <Select
            disabled={false}
            id="reducerSelect"
            label="Reducer"
            labelKey="reducer"
            onChange={(e) => this.setState({ reducer: e.target.value })}
            options={["Min", "Max", "Mean", "Median", "Mode", "Mosaic"]}
            value={this.state.reducer}
            valueKey="id"
            colSize="col-12"
          />
        </div>
        <div className="slide-container">
          <label>Visualization Parameters</label>
          <textarea
            className="form-control"
            onChange={(e) => this.setState({ visParams: e.target.value })}
            value={this.state.visParams}
          />
        </div>
        <div className="slide-container">
          <button
            className="btn btn-lightgreen btn-sm btn-block"
            onClick={this.updateGEEImageCollection}
            type="button"
          >
            Update Map
          </button>
        </div>
      </div>
    );
  }
}
