import React from "react";
import { mercator } from "../../js/mercator";
import { monthlyMapping } from "../utils/dateUtils";

export class PlanetMenus extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            imageryYearPlanet: 2018,
            imageryMonthPlanet: 1,
        };
    }

    componentDidMount = () => {
        const year = parseInt(this.props.sourceConfig.year);
        const month = parseInt(this.props.sourceConfig.month);
        this.props.setImageryAttribution(" | Monthly Mosaic of " + year + ", " + monthlyMapping[month]);
        this.setState({
            imageryYearPlanet: year,
            imageryMonthPlanet: month,
        }, () => this.props.setImageryAttributes(this.state));
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.imageryMonthPlanet !== prevState.imageryMonthPlanet
            || this.state.imageryYearPlanet !== prevState.imageryYearPlanet) {
            this.updatePlanetLayer();
        }
    }

    setImageryYearPlanet = (newImageryYearPlanet) => {
        this.props.setImageryAttribution(" | Monthly Mosaic of " + newImageryYearPlanet +
            ", " + monthlyMapping[this.state.imageryMonthPlanet]);
        this.setState({
            imageryYearPlanet: newImageryYearPlanet,
        }, () => this.props.setImageryAttributes(this.state));
    };

    setImageryMonthPlanet = (newImageryMonthPlanet) => {
        this.props.setImageryAttribution(" | Monthly Mosaic of " + this.state.imageryYearPlanet +
            ", " + monthlyMapping[newImageryMonthPlanet]);
        this.setState({
            imageryMonthPlanet: newImageryMonthPlanet,
        }, () => this.props.setImageryAttributes(this.state));
    };

    updatePlanetLayer = () => {
        const { imageryMonthPlanet, imageryYearPlanet } = this.state;
        mercator.updateLayerSource(this.props.mapConfig,
                                   this.props.currentImageryId,
                                   this.props.currentProjectBoundary,
                                   sourceConfig => ({
                                       ...sourceConfig,
                                       month: imageryMonthPlanet < 10 ? "0" + imageryMonthPlanet : imageryMonthPlanet,
                                       year: imageryYearPlanet,
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
                        value={this.state.imageryYearPlanet}
                        className="slider"
                        id="myRange"
                        onChange={e => this.setImageryYearPlanet(parseInt(e.target.value))}
                    />
                    <p>Year: <span id="demo">{this.state.imageryYearPlanet}</span></p>
                </div>
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="range"
                        min="1"
                        max="12"
                        value={this.state.imageryMonthPlanet}
                        className="slider"
                        id="myRangemonth"
                        onChange={e => this.setImageryMonthPlanet(parseInt(e.target.value))}
                    />
                    <p>Month: <span id="demo">{monthlyMapping[this.state.imageryMonthPlanet]}</span></p>
                </div>
            </div>
        );
    }
}

export class PlanetDailyMenus extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            imageryStartDatePlanetDaily: "",
            imageryEndDatePlanetDaily: "",
        };
    }

    componentDidMount () {
        this.props.setImageryAttribution(" | " + this.props.sourceConfig.startDate +
            " to " + this.props.sourceConfig.endDate);
        this.setState({
            imageryStartDatePlanetDaily: this.props.sourceConfig.startDate,
            imageryEndDatePlanetDaily: this.props.sourceConfig.endDate,
        }, () => this.updateImageryAttributes());
    }

    componentDidUpdate (prevProps, prevState) {
        if (this.state.imageryStartDatePlanetDaily !== prevState.imageryStartDatePlanetDaily
            || this.state.imageryEndDatePlanetDaily !== prevState.imageryEndDatePlanetDaily) {
            this.updatePlanetDailyLayer();
        }

        if (this.props.currentPlot && this.props.currentPlot !== prevProps.currentPlot) {
            this.updatePlanetDailyLayer();
        }
    }

    updateImageryAttributes = () =>
        this.props.setImageryAttributes({
            imageryStartDatePlanetDaily: this.state.imageryStartDatePlanetDaily,
            imageryEndDatePlanetDaily: this.state.imageryEndDatePlanetDaily,
        });

    updatePlanetDailyLayer = () => {
        const { imageryStartDatePlanetDaily, imageryEndDatePlanetDaily } = this.state;
        if (new Date(imageryStartDatePlanetDaily) > new Date(imageryEndDatePlanetDaily)) {
            alert("Start date must be smaller than the end date.");
        } else {
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
                                           startDate: imageryStartDatePlanetDaily,
                                           endDate: imageryEndDatePlanetDaily,
                                       }),
                                       this);
        }
    };

    setImageryStartDatePlanetDaily = (newDate) => {
        this.props.setImageryAttribution(" | " + newDate + " to " + this.state.imageryEndDatePlanetDaily);
        this.setState({ imageryStartDatePlanetDaily: newDate }, () => this.updateImageryAttributes());
    };

    setImageryEndDatePlanetDaily = (newDate) => {
        this.props.setImageryAttribution(" | " + this.state.imageryStartDatePlanetDaily + " to " + newDate);
        this.setState({ imageryEndDatePlanetDaily: newDate }, () => this.updateImageryAttributes());
    };

    render () {
        return (
            <div className="PlanetsDailyMenu my-2">
                <label>Start Date</label>
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="date"
                        id="planetDailyStartDate"
                        value={this.state.imageryStartDatePlanetDaily}
                        max={new Date().toJSON().split("T")[0]}
                        min="2010-01-01"
                        style={{ width: "100%" }}
                        onChange={e => this.setImageryStartDatePlanetDaily(e.target.value)}
                    />
                </div>
                <label>End Date</label>
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="date"
                        id="planetDailyEndDate"
                        value={this.state.imageryEndDatePlanetDaily}
                        max={new Date().toJSON().split("T")[0]}
                        min="2010-01-01"
                        style={{ width: "100%" }}
                        onChange={e => this.setImageryEndDatePlanetDaily(e.target.value)}
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
            imagerySecureWatchAvailableDates: [],
        };
    }

    componentDidMount = () => this.getSecureWatchAvailableDates();

    componentDidUpdate (prevProps, prevState) {
        if (this.props.currentPlot && this.props.currentPlot !== prevProps.currentPlot) {
            this.getSecureWatchAvailableDates();
        }
    }

    updateSecureWatchSingleLayer = (featureId, imagerySecureWatchDate, imagerySecureWatchCloudCover) => {
        mercator.updateLayerWmsParams(this.props.mapConfig, this.props.currentImageryId, {
            COVERAGE_CQL_FILTER: "featureId='" + featureId + "'",
        });
        this.props.setImageryAttribution((featureId
            ? " | " + imagerySecureWatchDate
                + " (" + (imagerySecureWatchCloudCover * 100).toFixed(2) + "% cloudy)"
            : " | No available layers"));
        this.props.setImageryAttributes({
            imagerySecureWatchDate: imagerySecureWatchDate,
            imagerySecureWatchCloudCover: imagerySecureWatchCloudCover,
        });
    }

    onChangeSecureWatchSingleLayer = (eventTarget) =>
        this.updateSecureWatchSingleLayer(
            eventTarget.value,
            eventTarget.options[eventTarget.selectedIndex].getAttribute("date"),
            eventTarget.options[eventTarget.options.selectedIndex].getAttribute("cloud")
        );

    getSecureWatchAvailableDates = () => {
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
            { imagerySecureWatchAvailableDates: null },
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
                            imagerySecureWatchAvailableDates: data.features
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
                            if (this.state.imagerySecureWatchAvailableDates.length === 0) {
                                this.updateSecureWatchSingleLayer(null, "", "");
                            } else {
                                this.updateSecureWatchSingleLayer(
                                    this.state.imagerySecureWatchAvailableDates[0].featureId,
                                    this.state.imagerySecureWatchAvailableDates[0].acquisitionDate,
                                    this.state.imagerySecureWatchAvailableDates[0].cloudCover,
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
                    {this.state.imagerySecureWatchAvailableDates
                        && this.state.imagerySecureWatchAvailableDates.length > 0
                        ?
                            <select
                                className="form-control form-control-sm"
                                onChange={e => this.onChangeSecureWatchSingleLayer(e.target)}
                                id="securewatch-option-select"
                            >
                                {this.state.imagerySecureWatchAvailableDates.map((obj, uid) =>
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
                                    {this.state.imagerySecureWatchAvailableDates
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
            imageryYearSentinel1: 2018,
            imageryMonthSentinel1: 1,
            bandCombinationSentinel1: "",
            imageryYearSentinel2: 2018,
            imageryMonthSentinel2: 1,
            bandCombinationSentinel2: "",
        };
    }

    componentDidMount () {
        const year = parseInt(this.props.sourceConfig.year);
        const month = parseInt(this.props.sourceConfig.month);
        this.props.setImageryAttribution(" | Monthly Mosaic of " + year + ", " + monthlyMapping[month]);
        this.setState({
            [this.props.sourceConfig.type === "Sentinel1" ? "imageryYearSentinel1" : "imageryYearSentinel2"]: year,
            [this.props.sourceConfig.type === "Sentinel1" ? "imageryMonthSentinel1" : "imageryMonthSentinel2"]: month,
            [this.props.sourceConfig.type === "Sentinel1"
                ? "bandCombinationSentinel1"
                : "bandCombinationSentinel2"]: this.props.sourceConfig.bandCombination,
        }, () => this.updateImageryAttributes());
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

    updateImageryAttributes = () => {
        this.props.setImageryAttributes({
            imageryMosaicYearMonth : this.props.sourceConfig.type === "Sentinel1"
                ? this.state.imageryYearSentinel1 + " - " +
                    monthlyMapping[this.state.imageryMonthSentinel1]
                : this.state.imageryYearSentinel2 + " - " +
                    monthlyMapping[this.state.imageryMonthSentinel2],
            imageryBandCombination: this.props.sourceConfig.type === "Sentinel1"
                ? this.state.bandCombinationSentinel1
                : this.state.bandCombinationSentinel2,
        });
    };

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
        this.props.setImageryAttribution(" | Monthly Mosaic of " + newYear + ", " + monthlyMapping[imageryMonth]);
        this.setState({
            [sentinel1 ? "imageryYearSentinel1" : "imageryYearSentinel2"] : newYear,
        }, () => this.updateImageryAttributes());
    };

    setImageryMonthSentinel = (newMonth, sentinel1 = true) => {
        const imageryYear = sentinel1 ? this.state.imageryYearSentinel1 : this.state.imageryYearSentinel2;
        this.props.setImageryAttribution(" | Monthly Mosaic of " + imageryYear + ", " + monthlyMapping[newMonth]);
        this.setState({
            [sentinel1 ? "imageryMonthSentinel1" : "imageryMonthSentinel2"] : newMonth,
        }, () => this.updateImageryAttributes());
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
                        onChange={e => this.setImageryYearSentinel(parseInt(e.target.value),
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
                        onChange={e => this.setImageryMonthSentinel(parseInt(e.target.value),
                                                                    this.props.sourceConfig.type === "Sentinel1")}
                    />
                    <p>Month:
                        <span id="demo">
                            {this.props.sourceConfig.type === "Sentinel1"
                                ? monthlyMapping[this.state.imageryMonthSentinel1]
                                : monthlyMapping[this.state.imageryMonthSentinel2]}
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
                            onChange={e => this.setState({
                                [this.props.sourceConfig.type === "Sentinel1"
                                    ? "bandCombinationSentinel1" : "bandCombinationSentinel2"] : e.target.value,
                            }, () => this.updateImageryAttributes())}
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

    componentDidMount = () => {
        this.props.setImageryAttribution("");
        this.setState({
            geeImageryVisParams: this.props.sourceConfig.imageVisParams,
        }, () => this.updateImageryAttributes());
    }

    updateImageryAttributes = () =>
        this.props.setImageryAttributes({
            geeImageryAssetId: this.props.sourceConfig.imageId,
        });

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
                        onChange={e => this.setState({
                            geeImageryVisParams: e.target.value,
                        }, () => this.updateImageryAttributes())}
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

    componentDidMount = () => {
        this.props.setImageryAttribution("");
        this.setState({
            geeImageCollectionStartDate: this.props.sourceConfig.startDate,
            geeImageCollectionEndDate: this.props.sourceConfig.endDate,
            geeImageCollectionVisParams: this.props.sourceConfig.collectionVisParams,
        }, () => this.updateImageryAttributes());
    }

    updateImageryAttributes = () =>
        this.props.setImageryAttributes({
            geeImageCollectionAssetId: this.props.sourceConfig.collectionId,
            geeImageCollectionStartDate: this.state.geeImageCollectionStartDate,
            geeImageCollectionEndDate: this.state.geeImageCollectionEndDate,
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
                            onChange={e => this.setState({
                                geeImageCollectionStartDate: e.target.value,
                            }, () => this.updateImageryAttributes())}
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
                            onChange={e => this.setState({
                                geeImageCollectionEndDate: e.target.value,
                            }, () => this.updateImageryAttributes())}
                        />
                    </div>
                    <label>Visualization Parameters</label>
                    <textarea
                        className="form-control"
                        id="geeImageCollectionVisParams"
                        value={this.state.geeImageCollectionVisParams}
                        onChange={e => this.setState({
                            geeImageCollectionVisParams: e.target.value,
                        }, () => this.updateImageryAttributes())}
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
