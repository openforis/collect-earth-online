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
                extent: plotExtentPolygon,
                path: "statistics"
            })
        })
            .then(res => (res.ok ? res.json() : Promise.reject()))
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

    renderRow = (label, value, image) => (
        <div className="d-flex align-items-center mb-3">
            <img
                alt={label + " icon"}
                src={image}
                style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "25px",
                    backgroundColor: "var(--lightgreen)"
                }}
            />
            <div>
                <label style={{color: "#787878", margin: "0 0 0 .5rem"}} >
                    {label}:
                </label>
                <label
                    style={{
                        color: "#606060",
                        fontWeight: "bold",
                        margin: "0 0 0 .51rem"
                    }}
                >
                    {value}
                </label>
            </div>
        </div>
    );

    render() {
        const {area, elevation, totalPop} = this.state;
        const {widgetId} = this.props;
        return (
            <div className="minmapwidget" id={"widgetstats_" + widgetId} style={{padding: "20px"}}>
                {this.renderRow("Total population", totalPop, "img/geodash/icon-population.png")}
                {this.renderRow("Area", area, "img/geodash/icon-area.png")}
                {this.renderRow("Elevation", elevation, "img/geodash/icon-elevation.png")}
            </div>
        );
    }
}
