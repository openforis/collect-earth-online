import React from "react";
import { mercator } from "../../js/mercator";
import { formatDateISO } from "../utils/dateUtils";

export function PlanetMenus({
    imageryYearPlanet,
    setImageryYearPlanet,
    imageryMonthPlanet,
    setImageryMonthPlanet,
    imageryMonthNamePlanet,
}) {
    return (
        <div className="PlanetsMenu my-2">
            <div className="slidecontainer form-control form-control-sm">
                <input
                    type="range"
                    min="2016"
                    max={new Date().getFullYear()}
                    value={imageryYearPlanet}
                    className="slider"
                    id="myRange"
                    onChange={e => setImageryYearPlanet(parseInt(e.target.value))}
                />
                <p>Year: <span id="demo">{imageryYearPlanet}</span></p>
            </div>
            <div className="slidecontainer form-control form-control-sm">
                <input
                    type="range"
                    min="1"
                    max="12"
                    value={imageryMonthPlanet}
                    className="slider"
                    id="myRangemonth"
                    onChange={e => setImageryMonthPlanet(parseInt(e.target.value))}
                />
                <p>Month: <span id="demo">{imageryMonthNamePlanet}</span></p>
            </div>
        </div>
    );
}

export function PlanetDailyMenus({
    imageryStartDatePlanetDaily,
    setImageryStartDatePlanetDaily,
    imageryEndDatePlanetDaily,
    setImageryEndDatePlanetDaily,
}) {
    return (
        <div className="PlanetsDailyMenu my-2">
            <label>Start Date</label>
            <div className="slidecontainer form-control form-control-sm">
                <input
                    type="date"
                    id="planetDailyStartDate"
                    value={imageryStartDatePlanetDaily}
                    max={new Date().toJSON().split("T")[0]}
                    min="2010-01-01"
                    style={{ width: "100%" }}
                    onChange={e => setImageryStartDatePlanetDaily(e.target.value)}
                />
            </div>
            <label>End Date</label>
            <div className="slidecontainer form-control form-control-sm">
                <input
                    type="date"
                    id="planetDailyEndDate"
                    value={imageryEndDatePlanetDaily}
                    max={new Date().toJSON().split("T")[0]}
                    min="2010-01-01"
                    style={{ width: "100%" }}
                    onChange={e => setImageryEndDatePlanetDaily(e.target.value)}
                />
            </div>
        </div>
    );
}

export function SecureWatchMenus({ imagerySecureWatchAvailableDates, onChangeSecureWatchSingleLayer }) {
    return (
        <div className="SecureWatchMenu my-2 mb-3">
            <div className="form-control form-control-sm">
                <label>Available Layers</label>
                {imagerySecureWatchAvailableDates && imagerySecureWatchAvailableDates.length > 0
                    ?
                        <select
                            className="form-control form-control-sm"
                            onChange={e => onChangeSecureWatchSingleLayer(e.target)}
                            id="securewatch-option-select"
                        >
                            {imagerySecureWatchAvailableDates.map((obj, uid) =>
                                <option key={uid} value={obj.featureId} date={obj.acquisitionDate} cloud={obj.cloudCover}>
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
                                {imagerySecureWatchAvailableDates
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

export class SentinelMenus extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            imageryYearSentinel1: "",
            imageryMonthSentinel1: "",
            bandCombinationSentinel1: "",
            imageryYearSentinel2: "",
            imageryMonthSentinel2: "",
            bandCombinationSentinel2: "",
        };
    }

    componentDidMount () {
        const year = this.props.sourceConfig.year;
        const month = this.props.sourceConfig.month;
        const startDate = parseInt(year) + "-" + (parseInt(month) > 9 ? "" : "0") + parseInt(month) + "-01";
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        this.setState({
            [this.props.sourceConfig.type === "Sentinel1" ? "imageryYearSentinel1" : "imageryYearSentinel2"]: year,
            [this.props.sourceConfig.type === "Sentinel1" ? "imageryMonthSentinel1" : "imageryMonthSentinel2"]: month,
            [this.props.sourceConfig.type === "Sentinel1"
                ? "bandCombinationSentinel1"
                : "bandCombinationSentinel2"]: this.props.sourceConfig.bandCombination,
        });
        this.props.setImageryAttribution(this.props.imageryAttribution + " | "
            + startDate + " to " + formatDateISO(endDate));
    }

    componentDidUpdate (prevProps, prevState) {
        if (this.state.imageryMonthSentinel1 !== prevState.imageryMonthSentinel1
            || this.state.imageryYearSentinel1 !== prevState.imageryYearSentinel1
            || this.state.bandCombinationSentinel1 !== prevState.bandCombinationSentinel1) {
            this.updateSentinelLayer("sentinel1");
        }

        if (this.state.imageryMonthSentinel2 !== prevState.imageryMonthSentinel2
            || this.state.imageryYearSentinel2 !== prevState.imageryYearSentinel2
            || this.state.bandCombinationSentinel2 !== prevState.bandCombinationSentinel2) {
            this.updateSentinelLayer("sentinel2");
        }
    }

    updateSentinelLayer = (type) => {
        const {
            imageryMonthSentinel2, imageryYearSentinel2, bandCombinationSentinel2,
            imageryMonthSentinel1, imageryYearSentinel1, bandCombinationSentinel1,
        } = this.state;
        mercator.updateLayerSource(this.props.mapConfig,
                                   this.props.currentImageryId,
                                   this.props.currentProjectBoundary,
                                   sourceConfig => ({
                                       ...sourceConfig,
                                       month: (type === "sentinel1") ? imageryMonthSentinel1 : imageryMonthSentinel2,
                                       year: (type === "sentinel1") ? imageryYearSentinel1 : imageryYearSentinel2,
                                       bandCombination: (type === "sentinel1")
                                           ? bandCombinationSentinel1
                                           : bandCombinationSentinel2,
                                   }),
                                   this);
    };

    setImageryYearSentinel = (newYear, sentinel1 = true) => {
        const imageryMonth = sentinel1 ? this.state.imageryMonthSentinel1 : this.state.imageryMonthSentinel2;
        const startDate = newYear + "-" + (imageryMonth > 9 ? "" : "0") + imageryMonth + "-01";
        const endDate = new Date(newYear, imageryMonth, 0);
        this.setState({ [sentinel1 ? "imageryYearSentinel1" : "imageryYearSentinel2"] : newYear });
        this.props.setImageryAttribution(this.props.imageryAttribution + " | "
            + startDate + " to " + formatDateISO(endDate));
    };

    setImageryMonthSentinel = (newMonth, sentinel1 = true) => {
        const imageryYear = sentinel1 ? this.state.imageryYearSentinel1 : this.state.imageryYearSentinel2;
        const startDate = imageryYear + "-" + (newMonth > 9 ? "" : "0") + newMonth + "-01";
        const endDate = new Date(imageryYear, newMonth, 0);
        this.setState({ [sentinel1 ? "imageryMonthSentinel1" : "imageryMonthSentinel2"] : newMonth });
        this.props.setImageryAttribution(this.props.imageryAttribution + " | "
            + startDate + " to " + formatDateISO(endDate));
    };

    setBandCombinationSentinel = (newBandCombination, sentinel1 = true) =>
        this.setState({
            [sentinel1 ? "bandCombinationSentinel1" : "bandCombinationSentinel2"] : newBandCombination,
        });

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
            <div className="Sentinel2Menu my-2">
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="range"
                        min="2015"
                        max={new Date().getFullYear()}
                        value={this.props.sourceConfig.type === "Sentinel1"
                            ? this.state.imageryYearSentinel1
                            : this.state.imageryYearSentinel2}
                        className="slider"
                        id="sentinel2-year"
                        onChange={e => this.setImageryYearSentinel(e.target.value,
                                                                   this.props.sourceConfig.type === "Sentinel1")}
                    />
                    <p>Year:
                        <span>
                            {this.props.sourceConfig.type === "Sentinel1"
                                ? this.state.imageryYearSentinel1
                                : this.state.imageryYearSentinel2}
                        </span>
                    </p>
                </div>
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="range"
                        min="1"
                        max="12"
                        value={this.props.sourceConfig.type === "Sentinel1"
                            ? this.state.imageryMonthSentinel1
                            : this.state.imageryMonthSentinel2}
                        className="slider"
                        id="sentinel2-month"
                        onChange={e => this.setImageryMonthSentinel(e.target.value,
                                                                    this.props.sourceConfig.type === "Sentinel1")}
                    />
                    <p>Month:
                        <span id="demo">
                            {this.props.sourceConfig.type === "Sentinel1"
                                ? this.state.imageryMonthSentinel1
                                : this.state.imageryMonthSentinel2}
                        </span>
                    </p>
                </div>
                <div className="form-control form-control-sm" >
                    <div className="mb-3">
                        <label>Band Combination</label>
                        <select
                            className="form-control"
                            id="sentinel2-bandCombination"
                            value={this.props.sourceConfig.type === "Sentinel1"
                                ? this.state.bandCombinationSentinel1
                                : this.state.bandCombinationSentinel2}
                            onChange={e => this.setBandCombinationSentinel(e.target.value,
                                                                           this.props.sourceConfig.type === "Sentinel1")}
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
            geeImageryVisParams: "",
        };
    }

    componentDidMount = () => this.setState({ geeImageryVisParams: this.props.imageVisParams });

    updateGEEImagery = () =>
        mercator.updateLayerSource(
            this.props.mapConfig,
            this.props.currentImageryId,
            this.props.currentProjectBoundary,
            sourceConfig => ({
                ...sourceConfig,
                imageVisParams: this.state.geeImageryVisParams,
            }),
            this
        );

    render() {
        return (
            <div className="GEEImageMenu my-2">
                <div className="form-control form-control-sm">
                    <label>Visualization Parameters</label>
                    <textarea
                        className="form-control"
                        id="geeImageVisParams"
                        value={this.state.geeImageryVisParams}
                        onChange={e => this.setState({ geeImageryVisParams: e.target.value })}
                    >
                        {this.state.geeImageryVisParams}
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
            geeImageCollectionStartDate: "",
            geeImageCollectionEndDate: "",
            geeImageCollectionVisParams: "",
        };
    }

    componentDidMount = () =>
        this.setState({
            geeImageCollectionStartDate: this.props.sourceConfig.startDate,
            geeImageCollectionEndDate: this.props.sourceConfig.endDate,
            geeImageCollectionVisParams: this.props.sourceConfig.collectionVisParams,
        });

    updateGEEImageCollection = () => {
        const { geeImageCollectionStartDate, geeImageCollectionEndDate } = this.state;
        if (new Date(geeImageCollectionStartDate) > new Date(geeImageCollectionEndDate)) {
            alert("Start date must be smaller than the end date.");
        } else {
            mercator.updateLayerSource(
                this.props.mapConfig,
                this.props.currentImageryId,
                this.props.currentProjectBoundary,
                sourceConfig => ({
                    ...sourceConfig,
                    collectionVisParams: this.state.geeImageCollectionVisParams,
                    startDate: this.state.geeImageCollectionStartDate,
                    endDate: this.state.geeImageCollectionEndDate,
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
                            value={this.state.geeImageCollectionStartDate}
                            max={new Date().toJSON().split("T")[0]}
                            style={{ width: "100%" }}
                            onChange={e => this.setState({ geeImageCollectionStartDate: e.target.value })}
                        />
                    </div>
                    <label>End Date</label>
                    <div className="slidecontainer form-control form-control-sm">
                        <input
                            type="date"
                            id="geeImageCollectionEndDate"
                            value={this.state.geeImageCollectionEndDate}
                            max={new Date().toJSON().split("T")[0]}
                            style={{ width: "100%" }}
                            onChange={e => this.setState({ geeImageCollectionEndDate: e.target.value })}
                        />
                    </div>
                    <label>Visualization Parameters</label>
                    <textarea
                        className="form-control"
                        id="geeImageCollectionVisParams"
                        value={this.state.geeImageCollectionVisParams}
                        onChange={e => this.setState({ geeImageCollectionVisParams: e.target.value })}
                    >
                        {this.state.geeImageCollectionVisParams}
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
