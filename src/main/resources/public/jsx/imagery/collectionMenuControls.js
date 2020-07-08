import React from "react";
import { mercator } from "../../js/mercator";

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

export function Sentinel1Menus({
    imageryYearSentinel1,
    setImageryYearSentinel,
    imageryMonthSentinel1,
    setImageryMonthSentinel,
    bandCombinationSentinel1,
    setBandCombinationSentinel,
}) {
    const bandCombinationOptions = [
        { label: "VH,VV,VH/VV", value: "VH,VV,VH/VV" },
        { label: "VH,VV,VV/VH", value: "VH,VV,VV/VH" },
        { label: "VV,VH,VV/VH", value: "VV,VH,VV/VH" },
        { label: "VV,VH,VH/VV", value: "VV,VH,VH/VV" },
    ];

    return (
        <div className="Sentinel1Menu my-2">
            <div className="slidecontainer form-control form-control-sm">
                <input
                    type="range"
                    min="2014"
                    max={new Date().getFullYear()}
                    value={imageryYearSentinel1}
                    className="slider"
                    id="sentinel1-year"
                    onChange={e => setImageryYearSentinel(e.target.value, true)}
                />
                <p>Year: <span>{imageryYearSentinel1}</span></p>
            </div>
            <div className="slidecontainer form-control form-control-sm">
                <input
                    type="range"
                    min="1"
                    max="12"
                    value={imageryMonthSentinel1}
                    className="slider"
                    id="sentinel1-month"
                    onChange={e => setImageryMonthSentinel(e.target.value, true)}
                />
                <p>Month: <span id="demo">{imageryMonthSentinel1}</span></p>
            </div>
            <div className="form-control form-control-sm" >
                <div className="mb-3">
                    <label>Band Combination</label>
                    <select
                        className="form-control"
                        id="sentinel1-bandCombination"
                        value={bandCombinationSentinel1}
                        onChange={e => setBandCombinationSentinel(e.target.value, true)}
                    >
                        {bandCombinationOptions.map(el => <option value={el.value} key={el.value}>{el.label}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
}

export function Sentinel2Menus({
    imageryYearSentinel2,
    setImageryYearSentinel,
    imageryMonthSentinel2,
    setImageryMonthSentinel,
    bandCombinationSentinel2,
    setBandCombinationSentinel,
}) {
    const bandCombinationOptions = [
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
                    value={imageryYearSentinel2}
                    className="slider"
                    id="sentinel2-year"
                    onChange={e => setImageryYearSentinel(e.target.value, false)}
                />
                <p>Year: <span>{imageryYearSentinel2}</span></p>
            </div>
            <div className="slidecontainer form-control form-control-sm">
                <input
                    type="range"
                    min="1"
                    max="12"
                    value={imageryMonthSentinel2}
                    className="slider"
                    id="sentinel2-month"
                    onChange={e => setImageryMonthSentinel(e.target.value, false)}
                />
                <p>Month: <span id="demo">{imageryMonthSentinel2}</span></p>
            </div>
            <div className="form-control form-control-sm" >
                <div className="mb-3">
                    <label>Band Combination</label>
                    <select
                        className="form-control"
                        id="sentinel2-bandCombination"
                        value={bandCombinationSentinel2}
                        onChange={e => setBandCombinationSentinel(e.target.value, false)}
                    >
                        {bandCombinationOptions.map(el => <option value={el.value} key={el.value}>{el.label}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
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

    setGEEImageryVisParams = (newVisParams) => this.setState({ geeImageryVisParams: newVisParams });

    render() {
        return (
            <div className="GEEImageMenu my-2">
                <div className="form-control form-control-sm">
                    <label>Visualization Parameters</label>
                    <textarea
                        className="form-control"
                        id="geeImageVisParams"
                        value={this.state.geeImageryVisParams}
                        onChange={e => this.setGEEImageryVisParams(e.target.value)}
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

    setGEEImageCollectionStartDate = (newDate) => this.setState({ geeImageCollectionStartDate: newDate });

    setGEEImageCollectionEndDate = (newDate) => this.setState({ geeImageCollectionEndDate: newDate });

    setGEEImageCollectionVisParams = (newVisParams) => this.setState({ geeImageCollectionVisParams: newVisParams });

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
                            onChange={e => this.setGEEImageCollectionStartDate(e.target.value)}
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
                            onChange={e => this.setGEEImageCollectionEndDate(e.target.value)}
                        />
                    </div>
                    <label>Visualization Parameters</label>
                    <textarea
                        className="form-control"
                        id="geeImageCollectionVisParams"
                        value={this.state.geeImageCollectionVisParams}
                        onChange={e => this.setGEEImageCollectionVisParams(e.target.value)}
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
