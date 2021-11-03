import React from "react";

import _ from "lodash";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

import {formatDateISO} from "../utils/generalUtils";

export default class GraphWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            graphRef: null,
            selectSarGraphBand: "VV",
            chartDataSeriesLandsat: [],
            chartDataSeriesSar: [],
            nonDegChartData: []
        };
    }

    componentDidMount() {
        const {widget: {type}} = this.props;
        if (type === "degradationTool") {
            this.loadDegradation();
        } else if (type === "timeSeries") {
            this.loadTimeSeries();
        } else {
            console.error("Incorrect widget type passed to the graph widget");
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.degDataType
            && (prevProps.degDataType !== this.props.degDataType
                || prevState.selectSarGraphBand !== this.state.selectSarGraphBand)) {
            this.loadDegradation();
        }
        this.handleResize();
        window.addEventListener("resize", this.handleResize);
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.handleResize);
    }

    invalidData = data => {
        if (data.errMsg) {
            return data.errMsg;
        } else if (!data.hasOwnProperty("timeseries")) {
            return "Wrong Data Returned";
        } else if (data.timeseries.length === 0) {
            return "No data steps";
        } else {
            return null;
        }
    };

    loadDegradation = () => {
        const {chartDataSeriesLandsat, chartDataSeriesSar, selectSarGraphBand, graphRef} = this.state;
        const {widget, degDataType, plotExtentPolygon, handleSelectDate} = this.props;

        // Try to load existing data first.
        // TODO, do we need this.  My thought is that getChartOptions is called again when the state updates.
        if (degDataType === "landsat" && chartDataSeriesLandsat.length > 0) {
            graphRef.update({series: _.cloneDeep(chartDataSeriesLandsat)});
        } else if (degDataType === "sar"
            && chartDataSeriesSar.hasOwnProperty(selectSarGraphBand)
            && chartDataSeriesSar[selectSarGraphBand].length > 0) {
            graphRef.update({series: _.cloneDeep(chartDataSeriesSar[selectSarGraphBand])});
        } else {
            fetch("/geo-dash/gateway-request", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    path:  "getImagePlotDegradation",
                    ...widget,
                    geometry: plotExtentPolygon
                })
            })
                .then(res => (res.ok ? res.json() : Promise.reject()))
                .then(data => {
                    const invalidCheck = this.invalidData(data);
                    if (invalidCheck) {
                        console.warn(invalidCheck);
                    } else {
                        // TODO, nested loops is a no-no
                        const theKeys = Object.keys(data.timeseries[0][1]);
                        const compiledData = [];
                        data.timeseries.forEach(d => {
                            for (let i = 0; i < theKeys.length; i += 1) {
                                const tempData = [];
                                const anObject = {};
                                anObject[theKeys[i]] = d[1][theKeys[i]];
                                tempData.push(d[0]);
                                tempData.push(anObject);
                                if (compiledData.length - 1 < i) {
                                    compiledData[i] = [];
                                }
                                compiledData[i].push(tempData);
                            }
                        });
                        // TODO, this can definitely be a .map.
                        compiledData.forEach((d, index) => {
                            const cdata = this.convertData(d);
                            const mSortData = this.sortMultiData(cdata);
                            const thisDataSeries = {
                                type: "scatter",
                                name: theKeys[index],
                                data: mSortData,
                                valueDecimals: 20,
                                connectNulls: true,
                                color: "#31bab0",
                                allowPointSelect: true,
                                point: {
                                    cursor: "pointer",
                                    events: {
                                        select: e => {
                                            handleSelectDate(formatDateISO(new Date(e.target.x)));
                                        }
                                    }
                                },
                                tooltip: {
                                    pointFormat: "<span style=\"color:{series.color}\">{point.x:%Y-%m-%d}</span>: <b>{point.y:.6f}</b><br/>",
                                    valueDecimals: 20,
                                    split: false,
                                    xDateFormat: "%Y-%m-%d"
                                }
                            };
                            if (degDataType === "landsat") {
                                this.setState({
                                    chartDataSeriesLandsat: [
                                        ...this.state.chartDataSeriesLandsat,
                                        thisDataSeries
                                    ]
                                });
                            } else {
                                this.setState({
                                    chartDataSeriesSar: {
                                        ...this.state.chartDataSeriesSar,
                                        [theKeys[index]]: [thisDataSeries]
                                    }
                                });
                            }
                        });
                    }
                })
                .catch(error => console.log(error));
        }
    };

    loadTimeSeries = () => {
        const {widget, plotExtentPolygon} = this.props;

        const {indexName} = widget;
        const path = indexName === "Custom"
            ? "timeSeriesByAsset"
            : "timeSeriesByIndex";
        fetch("/geo-dash/gateway-request", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                path,
                ...widget,
                geometry: plotExtentPolygon,
                scale: 30
            })
        })
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then(data => {
                const invalidCheck = this.invalidData(data);
                if (invalidCheck) {
                    console.warn(invalidCheck);
                } else {
                    const thisDataSeries = {
                        type: "area",
                        name: widget.graphBand || indexName,
                        data: data.timeseries
                            .filter(v => v[0]).map(v => [v[0], v[1]]).sort((a, b) => a[0] - b[0]),
                        color: "#31bab0"
                    };
                    this.setState({nonDegChartData : [thisDataSeries]});
                }
            })
            .catch(error => console.log(error));
    };

    multiComparator = (a, b) => ((a[0] < b[0]) ? -1
        : (a[0] > b[0])
            ? 1
            : 0);

    sortMultiData = data => data.sort(this.multiComparator);

    convertData = data => data.map(d => [d[0], d[1][Object.keys(d[1])[0]]]);

    handleResize = () => {
        try {
            if (this.state.graphRef && this.state.graphRef.bounds) {
                const gwidget = document.getElementById("widgetgraph_" + this.props.widget.id);
                this.state.graphRef.setSize(gwidget.clientWidth, gwidget.clientHeight, true);
            }
        } catch (e) {
            console.log("handleResize error:");
            console.log(e.message);
        }
    };

    getChartData = () => {
        const {widget, degDataType} = this.props;
        const {chartDataSeriesSar, chartDataSeriesLandsat, selectSarGraphBand, nonDegChartData} = this.state;
        return (widget.type === "degradationTool"
                && degDataType === "sar"
                && chartDataSeriesSar.hasOwnProperty(selectSarGraphBand)
                && chartDataSeriesSar[selectSarGraphBand])
            || (widget.type === "degradationTool"
                && degDataType === "landsat"
                && chartDataSeriesLandsat)
            || nonDegChartData
            || [];
    };

    getChartOptions = () => {
        const {widget} = this.props;
        return {
            chart: {zoomType: "x"},
            title: {text: ""},
            subtitle: {
                text: document.ontouchstart === undefined
                    ? "Click and drag in the plot area to zoom in"
                    : "Pinch the chart to zoom in"
            },
            xAxis: {type: "datetime"},
            yAxis: {
                title: {text: widget.indexName}
            },
            legend: {enabled: true},
            credits: {enabled: false},
            plotOptions: {
                area: {
                    connectNulls: widget.indexName.toLowerCase() === "custom",
                    fillColor: {
                        linearGradient: {
                            x1: 0,
                            y1: 0,
                            x2: 0,
                            y2: 1
                        },
                        stops: [
                            [0, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get("rgba")],
                            [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get("rgba")]
                        ]
                    },
                    marker: {radius: 2},
                    lineWidth: 1,
                    states: {
                        hover: {lineWidth: 1}
                    },
                    threshold: null
                },
                scatter: {
                    marker: {radius: 2}
                }
            },
            tooltip: {
                pointFormat: "<span style=\"color:{series.color}\">{series.name}</span>: <b>{point.y:.6f}</b><br/>",
                valueDecimals: 20,
                split: false,
                xDateFormat: "%Y-%m-%d"
            },
            series: _.cloneDeep(this.getChartData)
        };
    };

    render() {
        const {widget, degDataType} = this.props;
        const selectOptions = [
            {label: "VV", value: "VV"},
            {label: "VH", value: "VH"},
            {label: "VV/VH", value: "VV/VH"}
        ];
        return (
            <div className="minmapwidget" id={"widgetgraph_" + widget.id}>
                <div className="minmapwidget graphwidget normal" id={"graphcontainer_" + widget.id}>
                    {this.getChartData.length > 0
                        ? (
                            <HighchartsReact
                                callback={thisChart => this.setState({graphRef: thisChart})}
                                highcharts={Highcharts}
                                options={this.getChartOptions()}
                            />
                        ) : (
                            <img
                                alt="Loading"
                                src="img/geodash/ceo-loading.gif"
                                style={{
                                    position: "absolute",
                                    bottom: "50%",
                                    left: "50%"
                                }}
                            />
                        )}
                </div>
                <h3 id={"widgettitle_" + widget.id}>
                    {widget.indexName === "Custom" ? widget.graphBand : widget.indexName}
                </h3>
                {(widget.type === "degradationTool" && degDataType === "sar") && (
                    <select
                        className="form-control"
                        onChange={e => this.setState({selectSarGraphBand: e.target.value})}
                        style={{
                            maxWidth: "85%",
                            fontSize: ".9rem",
                            height: "30px"
                        }}
                    >
                        {selectOptions.map(el => <option key={el.value} value={el.value}>{el.label}</option>)}
                    </select>
                )}
            </div>
        );
    }
}
