import React from "react";

import {Polygon} from "ol/geom";
import {getArea as sphereGetArea} from "ol/sphere";

export default class StatsWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {totalPop:"", area:"", elevation:""};
    }

    componentDidMount() {
        const {plotExtentPolygon} = this.props;
        fetch("/geo-dash/gateway-request", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                paramValue: plotExtentPolygon,
                path: "getStats"
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.errMsg) {
                    console.warn(data.errMsg);
                } else {
                    this.setState({
                        totalPop: this.numberWithCommas(data.pop),
                        area: this.numberWithCommas(this.calculateArea(plotExtentPolygon), 2) + " ha",
                        elevation: this.numberWithCommas(data.minElev)
                            + " - "
                            + this.numberWithCommas(data.maxElev)
                            + " m"
                    });
                }
            })
            .catch(error => console.log(error));
    }

    numberWithCommas = (x, decimalPlaces = 0) => {
        if (typeof x === "number") {
            try {
                const [quot, rem] = x.toString().split(".");
                const withCommas = quot.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                return (rem && decimalPlaces > 0)
                    ? [withCommas, rem.slice(0, decimalPlaces)].join(".")
                    : withCommas;
            } catch (e) {
                console.warn(e.message);
                return "N/A";
            }
        } else {
            return "N/A";
        }
    };

    calculateArea = poly => {
        try {
            return sphereGetArea(new Polygon([poly]), {projection: "EPSG:4326"}) / 10000;
        } catch (e) {
            return "N/A";
        }
    };

    render() {
        const {area, elevation, totalPop: {stats}} = this.state;
        const {widgetId} = this.props;
        return (
            <div className="minmapwidget" id={"widgetstats_" + widgetId} style={{padding: "20px"}}>
                <div>
                    <div className="form-group">
                        <div className="input-group">
                            <div className="input-group-addon">
                                <img
                                    alt="Population"
                                    src="img/geodash/icon-population.png"
                                    style={{
                                        width: "50px",
                                        height: "50px",
                                        borderRadius: "25px",
                                        backgroundColor: "#31bab0"
                                    }}
                                />
                            </div>
                            <label
                                htmlFor={"totalPop_" + widgetId}
                                style={{color: "#787878", padding: "10px 20px"}}
                            >
                                Total population
                            </label>
                            <h3
                                id={"totalPop_" + widgetId}
                                style={{
                                    color: "#606060",
                                    fontSize: "16px",
                                    fontWeight: "bold",
                                    paddingTop: "12px"
                                }}
                            >
                                {stats}
                            </h3>
                        </div>
                    </div>
                    <div className="form-group">
                        <div className="input-group">
                            <div className="input-group-addon">
                                <img
                                    alt="Area"
                                    src="img/geodash/icon-area.png"
                                    style={{
                                        width: "50px",
                                        height: "50px",
                                        borderRadius: "25px",
                                        backgroundColor: "#31bab0"
                                    }}
                                />
                            </div>
                            <label
                                htmlFor={"totalArea_" + widgetId}
                                style={{color: "#787878", padding: "10px 20px"}}
                            >
                                Area
                            </label>
                            <h3
                                id={"totalArea_" + widgetId}
                                style={{
                                    color: "#606060",
                                    fontSize: "16px",
                                    fontWeight: "bold",
                                    paddingTop: "12px"
                                }}
                            >{area}
                            </h3>
                        </div>
                    </div>
                    <div className="form-group">
                        <div className="input-group">
                            <div className="input-group-addon">
                                <img
                                    alt="Elevation"
                                    src="img/geodash/icon-elevation.png"
                                    style={{
                                        width: "50px",
                                        height: "50px",
                                        borderRadius: "25px",
                                        backgroundColor: "#31bab0"
                                    }}
                                />
                            </div>
                            <label
                                htmlFor={"elevationRange_" + widgetId}
                                style={{color: "#787878", padding: "10px 20px"}}
                            >
                                Elevation
                            </label>
                            <h3
                                id={"elevationRange_" + widgetId}
                                style={{
                                    color: "#606060",
                                    fontSize: "16px",
                                    fontWeight: "bold",
                                    paddingTop: "12px"
                                }}
                            >
                                {elevation}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
