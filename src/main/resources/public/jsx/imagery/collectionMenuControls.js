import React from "react";
import { mercator } from "../../js/mercator";
import { monthlyMapping } from "../utils/dateUtils";

export class PlanetMenus extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            year: "",
            month: "",
        };
    }

    componentDidMount () {
        this.setState({
            year: this.props.sourceConfig.year,
            month: this.props.sourceConfig.month,
        }, () => this.updatePlanetLayer());
    }

    updateImageryInformation = () => {
        this.props.setImageryAttribution(" | Monthly Mosaic of "
            + this.state.year + ", " + monthlyMapping[this.state.month]);
        this.props.setImageryAttributes({
            imageryYearPlanet: this.state.year,
            imageryMonthPlanet: this.state.month,
        });
    };

    setStateAndUpdate = (key, newValue) =>
        this.setState({ [key]: newValue }, () => this.updatePlanetLayer());

    updatePlanetLayer = () => {
        this.updateImageryInformation();
        mercator.updateLayerSource(this.props.mapConfig,
                                   this.props.currentImageryId,
                                   this.props.currentProjectBoundary,
                                   sourceConfig => ({
                                       ...sourceConfig,
                                       month: (this.state.month.length === 1 ? "0" : "") + this.state.month,
                                       year: this.state.year,
                                   }),
                                   this);
    };

    render() {
        return (
            <div className="PlanetsMenu my-2">
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="range"
                        min="2016"
                        max={new Date().getFullYear()}
                        value={this.state.year}
                        className="slider"
                        id="myRange"
                        onChange={e => this.setStateAndUpdate("year", e.target.value)}
                    />
                    <p>Year: <span id="demo">{this.state.year}</span></p>
                </div>
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="range"
                        min="1"
                        max="12"
                        value={this.state.month}
                        className="slider"
                        id="myRangemonth"
                        onChange={e => this.setStateAndUpdate("month", e.target.value)}
                    />
                    <p>Month: <span id="demo">{monthlyMapping[this.state.month]}</span></p>
                </div>
            </div>
        );
    }
}

export class PlanetDailyMenus extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            startDate: "",
            endDate: "",
        };
    }

    componentDidMount () {
        this.setState({
            startDate: this.props.sourceConfig.startDate,
            endDate: this.props.sourceConfig.endDate,
        }, () => this.updatePlanetDailyLayer());
    }

    componentDidUpdate (prevProps, prevState) {
        if (this.props.currentPlot && this.props.currentPlot !== prevProps.currentPlot) {
            this.updatePlanetDailyLayer();
        }
    }

    updateImageryInformation = () => {
        this.props.setImageryAttribution(" | " + this.state.startDate + " to " + this.state.endDate);
        this.props.setImageryAttributes({
            imageryStartDatePlanetDaily: this.state.startDate,
            imageryEndDatePlanetDaily: this.state.endDate,
        });
    };

    setStateAndUpdate = (key, newValue) =>
        this.setState({ [key]: newValue }, () => this.updatePlanetDailyLayer());

    updatePlanetDailyLayer = () => {
        const { startDate, endDate } = this.state;
        if (new Date(startDate) > new Date(endDate)) {
            alert("Start date must be smaller than the end date.");
        } else {
            this.updateImageryInformation();
            mercator.currentMap.getControls().getArray()
                .filter(control => control.element.classList.contains("planet-layer-switcher"))
                .map(control => mercator.currentMap.removeControl(control));
            mercator.updateLayerSource(this.props.mapConfig,
                                       this.props.currentImageryId,
                                       mercator.geometryToGeoJSON(
                                           mercator.getViewPolygon(this.props.mapConfig),
                                           "EPSG:4326"
                                       ),
                                       sourceConfig => ({
                                           ...sourceConfig,
                                           startDate: startDate,
                                           endDate: endDate,
                                       }),
                                       this);
        }
    };

    render () {
        return (
            <div className="PlanetsDailyMenu my-2">
                <label>Start Date</label>
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="date"
                        id="planetDailyStartDate"
                        value={this.state.startDate}
                        max={new Date().toJSON().split("T")[0]}
                        style={{ width: "100%" }}
                        onChange={e => this.setStateAndUpdate("startDate", e.target.value)}
                    />
                </div>
                <label>End Date</label>
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="date"
                        id="planetDailyEndDate"
                        value={this.state.endDate}
                        max={new Date().toJSON().split("T")[0]}
                        style={{ width: "100%" }}
                        onChange={e => this.setStateAndUpdate("endDate", e.target.value)}
                    />
                </div>
            </div>
        );
    }
}

export class SecureWatchMenus extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            availableDates: [],
        };
    }

    componentDidMount () {
        this.getAvailableDates();
    }

    componentDidUpdate (prevProps, prevState) {
        if (this.props.currentPlot && this.props.currentPlot !== prevProps.currentPlot) {
            this.getAvailableDates();
        }
    }

    updateImageryInformation = (featureId, imageryDate, imageryCloudCover) => {
        this.props.setImageryAttribution((featureId
            ? " | " + imageryDate
            + " (" + (imageryCloudCover * 100).toFixed(2) + "% cloudy)"
            : " | No available layers"));
        if (featureId) {
            this.props.setImageryAttributes({
                imagerySecureWatchDate: imageryDate,
                imagerySecureWatchCloudCover: imageryCloudCover,
            });
        }
    };

    updateSingleLayer = (featureId, imageryDate, imageryCloudCover) => {
        mercator.updateLayerWmsParams(this.props.mapConfig, this.props.currentImageryId, {
            COVERAGE_CQL_FILTER: "featureId='" + featureId + "'",
        });
        this.updateImageryInformation(featureId, imageryDate, imageryCloudCover);
    };

    onChangeSingleLayer = (eventTarget) =>
        this.updateSingleLayer(
            eventTarget.value,
            eventTarget.options[eventTarget.selectedIndex].getAttribute("date"),
            eventTarget.options[eventTarget.options.selectedIndex].getAttribute("cloud")
        );

    getAvailableDates = () => {
        const { currentImageryId, mapConfig, sourceConfig } = this.props;
        this.props.setImageryAttribution(" | Loading...");
        const geometry = mercator.getViewPolygon(mapConfig).transform("EPSG:4326", "EPSG:3857");
        const secureWatchFeatureInfoUrl = "SERVICE=WMS"
            + "&VERSION=1.1.1"
            + "&REQUEST=GetFeatureInfo"
            + "&CRS=EPSG%3A3857"
            + "&BBOX=" + geometry.getExtent().join(",")
            + "&WIDTH=256"
            + "&HEIGHT=256"
            + "&LAYERS=DigitalGlobe:ImageryFootprint"
            + "&QUERY_LAYERS=DigitalGlobe:ImageryFootprint"
            + "&FEATURE_COUNT=1000"
            + "&X=0"
            + "&Y=0"
            + "&INFO_FORMAT=application/json"
            + "&imageryId=" + currentImageryId;
        this.setState(
            { availableDates: [] },
            () => {
                fetch("/get-securewatch-dates?" + secureWatchFeatureInfoUrl)
                    .then(response => {
                        if (response.ok) {
                            return response.json(); // if no layers are found, the response is XML. This will fail.
                        } else {
                            alert("Error retrieving SecureWatch dates. See console for details.");
                            return { features: [] };
                        }
                    })
                    .catch((response) => {
                        console.log(response);
                        alert("It is likely that your Connect ID is expired. See console for more details.");
                        return { features: [] };
                    })
                    .then(data => {
                        this.setState({
                            availableDates: data.features
                                .filter(feature =>
                                    Date.parse(feature.properties.acquisitionDate) <= Date.parse(sourceConfig.endDate)
                                    && Date.parse(feature.properties.acquisitionDate) >= Date.parse(sourceConfig.startDate)
                                )
                                .map(feature => ({
                                    acquisitionDate: feature.properties.acquisitionDate,
                                    cloudCover: feature.properties.cloudCover,
                                    featureId: feature.properties.featureId,
                                })),
                        }, () => {
                            if (this.state.availableDates.length === 0) {
                                this.updateSingleLayer(null, "", "");
                            } else {
                                this.updateSingleLayer(
                                    this.state.availableDates[0].featureId,
                                    this.state.availableDates[0].acquisitionDate,
                                    this.state.availableDates[0].cloudCover,
                                );
                            }
                        });
                    })
                    .catch(response => {
                        console.log(response);
                        alert("Error processing SecureWatch dates. See console for details.");
                    });
            }
        );
    };

    render() {
        return (
            <div className="SecureWatchMenu my-2 mb-3">
                <div className="form-control form-control-sm">
                    <label>Available Layers</label>
                    {this.state.availableDates
                        && this.state.availableDates.length > 0
                        ?
                            <select
                                className="form-control form-control-sm"
                                onChange={e => this.onChangeSingleLayer(e.target)}
                                id="securewatch-option-select"
                            >
                                {this.state.availableDates.map((obj, uid) =>
                                    <option
                                        key={uid}
                                        value={obj.featureId}
                                        date={obj.acquisitionDate}
                                        cloud={obj.cloudCover}
                                    >
                                        {obj.acquisitionDate + " (" + (obj.cloudCover * 100).toFixed(2) + "% cloudy)"}
                                    </option>
                                )}
                            </select>
                        :
                            <select
                                className="form-control form-control-sm"
                                id="securewatch-option-select"
                                disabled
                            >
                                <option>
                                    {this.state.availableDates
                                        ? "No available layers"
                                        : "Loading dates..."
                                    }
                                </option>
                            </select>
                    }
                </div>
            </div>
        );
    }
}

export class SentinelMenus extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            year: "",
            month: "",
            bandCombination: "",
        };
    }

    componentDidMount () {
        this.setState({
            year: this.props.sourceConfig.year,
            month: this.props.sourceConfig.month,
            bandCombination: this.props.sourceConfig.bandCombination,
        }, () => this.updateSentinelLayer());
    }

    updateImageryInformation = () => {
        this.props.setImageryAttribution(" | Monthly Mosaic of " +
            this.state.year + ", " + monthlyMapping[this.state.month]);
        this.props.setImageryAttributes({
            [this.props.sourceConfig.type === "Sentinel1"
                ? "sentinel1MosaicYearMonth"
                : "sentinel2MosaicYearMonth"]: this.state.year + " - " + monthlyMapping[this.state.month],
        });
    };

    setStateAndUpdate = (key, newValue) =>
        this.setState({ [key]: newValue }, () => this.updateSentinelLayer());

    updateSentinelLayer = () => {
        this.updateImageryInformation();
        mercator.updateLayerSource(this.props.mapConfig,
                                   this.props.currentImageryId,
                                   this.props.currentProjectBoundary,
                                   sourceConfig => ({
                                       ...sourceConfig,
                                       month: (this.state.month.length === 1 ? "0" : "") + this.state.month,
                                       year: this.state.year,
                                       bandCombination: this.state.bandCombination,
                                   }),
                                   this);
    };

    render() {
        const bandCombinationOptions = this.props.sourceConfig.type === "Sentinel1"
            ?
            [
                { label: "VH,VV,VH/VV", value: "VH,VV,VH/VV" },
                { label: "VH,VV,VV/VH", value: "VH,VV,VV/VH" },
                { label: "VV,VH,VV/VH", value: "VV,VH,VV/VH" },
                { label: "VV,VH,VH/VV", value: "VV,VH,VH/VV" },
            ]
            :
            [
                { label: "True Color", value: "TrueColor" },
                { label: "False Color Infrared", value: "FalseColorInfrared" },
                { label: "False Color Urban", value: "FalseColorUrban" },
                { label: "Agriculture", value: "Agriculture" },
                { label: "Healthy Vegetation", value: "HealthyVegetation" },
                { label: "Short Wave Infrared", value: "ShortWaveInfrared" },
            ];

        return (
            <div className="SentinelMenu my-2">
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="range"
                        min="2015"
                        max={new Date().getFullYear()}
                        value={this.state.year}
                        className="slider"
                        id="sentinel-year"
                        onChange={e => this.setStateAndUpdate("year", e.target.value)}
                    />
                    <p>Year: <span>{this.state.year}</span></p>
                </div>
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="range"
                        min="1"
                        max="12"
                        value={this.state.month}
                        className="slider"
                        id="sentinel-month"
                        onChange={e => this.setStateAndUpdate("month", e.target.value)}
                    />
                    <p>Month: <span id="demo">{monthlyMapping[this.state.month]}</span></p>
                </div>
                <div className="form-control form-control-sm" >
                    <div className="mb-3">
                        <label>Band Combination</label>
                        <select
                            className="form-control"
                            id="sentinel-bandCombination"
                            value={this.state.bandCombination}
                            onChange={e => this.setStateAndUpdate("bandCombination", e.target.value)}
                        >
                            {bandCombinationOptions.map(el => <option value={el.value} key={el.value}>{el.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        );
    }
}

export class GEEImageMenus extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            visParams: "",
        };
    }

    componentDidMount () {
        this.setState({
            visParams: this.props.sourceConfig.imageVisParams,
        }, () => this.updateGEEImagery());
    }

    updateImageryInformation = () => {
        this.props.setImageryAttribution(" | " + this.state.visParams);
        this.props.setImageryAttributes({
            geeImageryAssetId: this.props.sourceConfig.imageId,
        });
    };

    updateGEEImagery = () => {
        this.updateImageryInformation();
        mercator.updateLayerSource(
            this.props.mapConfig,
            this.props.currentImageryId,
            this.props.currentProjectBoundary,
            sourceConfig => ({
                ...sourceConfig,
                imageVisParams: this.state.visParams,
            }),
            this
        );
    };

    render() {
        return (
            <div className="GEEImageMenu my-2">
                <div className="form-control form-control-sm">
                    <label>Visualization Parameters</label>
                    <textarea
                        className="form-control"
                        id="geeImageVisParams"
                        value={this.state.visParams}
                        onChange={e => this.setState({ visParams: e.target.value })}
                    >
                        {this.state.visParams}
                    </textarea>
                    <br />
                    <button
                        type="button"
                        className="btn bg-lightgreen btn-sm btn-block"
                        id="update-gee-image-button"
                        onClick={this.updateGEEImagery}
                    >
                        Update Image
                    </button>
                </div>
            </div>
        );
    }
}

export class GEEImageCollectionMenus extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            startDate: "",
            endDate: "",
            visParams: "",
        };
    }

    componentDidMount () {
        this.setState({
            startDate: this.props.sourceConfig.startDate,
            endDate: this.props.sourceConfig.endDate,
            visParams: this.props.sourceConfig.collectionVisParams,
        }, () => this.updateGEEImageCollection());
    }

    updateImageryInformation = () => {
        this.props.setImageryAttribution(" | " + this.state.startDate + " to " +
            this.state.endDate + " | " + this.state.visParams);
        this.props.setImageryAttributes({
            geeImageCollectionAssetId: this.props.sourceConfig.collectionId,
            geeImageCollectionStartDate: this.state.startDate,
            geeImageCollectionEndDate: this.state.endDate,
        });
    };

    updateGEEImageCollection = () => {
        const { startDate, endDate } = this.state;
        if (new Date(startDate) > new Date(endDate)) {
            alert("Start date must be smaller than the end date.");
        } else {
            this.updateImageryInformation();
            mercator.updateLayerSource(
                this.props.mapConfig,
                this.props.currentImageryId,
                this.props.currentProjectBoundary,
                sourceConfig => ({
                    ...sourceConfig,
                    collectionVisParams: this.state.visParams,
                    startDate: startDate,
                    endDate: endDate,
                }),
                this
            );
        }
    };

    render() {
        return (
            <div className="GEEImageCollectionMenu my-2">
                <div className="form-control form-control-sm">
                    <label>Start Date</label>
                    <div className="slidecontainer form-control form-control-sm">
                        <input
                            type="date"
                            id="geeImageCollectionStartDate"
                            value={this.state.startDate}
                            max={new Date().toJSON().split("T")[0]}
                            style={{ width: "100%" }}
                            onChange={e => this.setState({ startDate: e.target.value })}
                        />
                    </div>
                    <label>End Date</label>
                    <div className="slidecontainer form-control form-control-sm">
                        <input
                            type="date"
                            id="geeImageCollectionEndDate"
                            value={this.state.endDate}
                            max={new Date().toJSON().split("T")[0]}
                            style={{ width: "100%" }}
                            onChange={e => this.setState({ endDate: e.target.value })}
                        />
                    </div>
                    <label>Visualization Parameters</label>
                    <textarea
                        className="form-control"
                        id="geeImageCollectionVisParams"
                        value={this.state.visParams}
                        onChange={e => this.setState({ visParams: e.target.value })}
                    >
                        {this.state.visParams}
                    </textarea>
                    <br />
                    <button
                        type="button"
                        className="btn bg-lightgreen btn-sm btn-block"
                        id="update-gee-image-button"
                        onClick={this.updateGEEImageCollection}
                    >
                        Update Image
                    </button>
                </div>
            </div>
        );
    }
}
