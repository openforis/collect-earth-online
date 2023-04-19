import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import _, { isArray } from "lodash";

import { formatDateISOString } from "../utils/generalUtils";

window.Highcharts = Highcharts;

export default class GraphWidget extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      graphRef: null,
      chartData: {},
    };
  }

  /// Lifecycle

  componentDidMount() {
    const {
      widget: { type },
    } = this.props;
    if (type === "degradationTool") {
      this.loadDegradation();
    } else if (type === "timeSeries") {
      this.loadTimeSeries();
    } else {
      console.error("Incorrect widget type passed to the graph widget.");
    }
  }

  componentDidUpdate(prevProps, _prevState) {
    if (
      this.props.degDataType &&
      (prevProps.degDataType !== this.props.degDataType ||
        prevProps.sarGraphBand !== this.props.sarGraphBand)
    ) {
      this.loadDegradation();
    }
    if (prevProps.isFullScreen !== this.props.isFullScreen) {
      if (this.state.graphRef) this.state.graphRef.reflow();
    }
  }

  /// API

  invalidData = (data) => {
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
    const { widget, degDataType, plotExtentPolygon } = this.props;

    // Try to load existing data first.
    const chartData = this.getChartData(this.getChartKey());

    if (!this.validArray(chartData)) {
      fetch("/geo-dash/gateway-request", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: "degradationTimeSeries",
          ...widget,
          dataType: degDataType,
          geometry: plotExtentPolygon,
        }),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          const invalidCheck = this.invalidData(data);
          if (invalidCheck) {
            console.warn(invalidCheck);
          } else {
            const objChartData = data.timeseries.reduce((acc, cur) => {
              const [time, values] = cur;
              return _.reduce(
                values,
                (acc2, value, key) => ({ ...acc2, [key]: [...(acc2[key] || []), [time, value]] }),
                acc
              );
            }, {});
            this.setState({ chartData: { ...this.state.chartData, ...objChartData } });
          }
        })
        .catch((error) => console.error(error));
    }
  };

  getScale = (widget) => {
    if (widget.sourceName === "Landsat") {
      return 30.0;
    } else if (widget.sourceName === "NICFI") {
      return 3.5;
    } else if (widget.sourceName === "Custom") {
      return Number(widget.scale);
    }
  };

  loadTimeSeries = () => {
    const { widget, plotExtentPolygon } = this.props;
    const path = this.widgetIsCustom() ? "timeSeriesByIndex" : "timeSeriesByIndex"; // how to remove this line and have fn work still..?
    fetch("/geo-dash/gateway-request", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path,
        ...widget,
        geometry: plotExtentPolygon,
        scale: this.getScale(widget),
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const invalidCheck = this.invalidData(data);
        if (invalidCheck) {
          console.error(invalidCheck);
        } else {
          const timeSeries = data.timeseries.filter((v) => v[0]).sort((a, b) => a[0] - b[0]);
          this.setState({
            chartData: {
              ...this.state.chartData,
              [this.getChartKey()]: timeSeries,
            },
          });
        }
      })
      .catch((error) => console.log(error));
  };

  /// Helpers

  validArray = (arr) => (isArray(arr) && arr.length > 0 ? arr : null);

  widgetIsCustom = () => this.props.widget.sourceName === "Custom";

  /// High Charts

  getChartKey = () => {
    const { widget, degDataType, sarGraphBand } = this.props;
    if (this.widgetIsCustom() || degDataType === "landsat") {
      return widget.band;
    } else if (degDataType === "sar") {
      return sarGraphBand;
    } else {
      return widget.indexName;
    }
  };

  getChartData = (chartKey) => {
    const { chartData } = this.state;
    return chartData[chartKey];
  };

  getChartSeries = (chartKey) => {
    const {
      widget: { type },
      handleSelectDate,
    } = this.props;
    if (type === "degradationTool") {
      return {
        type: "scatter",
        name: chartKey,
        data: _.cloneDeep(this.getChartData(chartKey)),
        valueDecimals: 20,
        connectNulls: true,
        color: "var(--lightgreen)",
        allowPointSelect: true,
        point: {
          cursor: "pointer",
          events: {
            select: (e) => {
              handleSelectDate(formatDateISOString(new Date(e.target.x)));
            },
          },
        },
        tooltip: {
          pointFormat:
            '<span style="color:{series.color}">{point.x:%Y-%m-%d}</span>: <b>{point.y:.6f}</b><br/>',
          valueDecimals: 20,
          split: false,
          xDateFormat: "%Y-%m-%d",
        },
      };
    } else {
      return {
        type: "area",
        name: chartKey,
        data: this.getChartData(chartKey),
        color: "var(--lightgreen)",
      };
    }
  };

  getChartOptions = (chartKey) => {
    const { widget } = this.props;
    return {
      chart: { zoomType: "x" },
      title: { text: "" },
      subtitle: {
        text: document.ontouchstart
          ? "Pinch the chart to zoom in"
          : "Click and drag in the plot area to zoom in",
      },
      xAxis: { type: "datetime" },
      yAxis: { title: "" },
      legend: { enabled: true },
      credits: { enabled: false },
      plotOptions: {
        area: {
          connectNulls: widget.indexName && widget.indexName.toLowerCase() === "custom",
          fillColor: {
            linearGradient: {
              x1: 0,
              y1: 0,
              x2: 0,
              y2: 1,
            },
            stops: [
              [0, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get("rgba")],
              [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get("rgba")],
            ],
          },
          marker: { radius: 2 },
          lineWidth: 1,
          states: {
            hover: { lineWidth: 1 },
          },
          threshold: null,
        },
        scatter: {
          marker: { radius: 2 },
        },
      },
      tooltip: {
        pointFormat:
          '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.6f}</b><br/>',
        valueDecimals: 20,
        split: false,
        xDateFormat: "%Y-%m-%d",
      },
      series: [this.getChartSeries(chartKey)],
    };
  };

  render() {
    const { widget } = this.props;
    const chartKey = this.getChartKey();
    return (
      <div
        id={"widget-graph_" + widget.id}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          display: "flex",
          minHeight: 0,
        }}
      >
        {this.validArray(this.getChartData(chartKey)) ? (
          <HighchartsReact
            callback={(thisChart) => this.setState({ graphRef: thisChart })}
            containerProps={{ style: { height: "100%", width: "100%" } }}
            highcharts={Highcharts}
            options={this.getChartOptions(chartKey)}
          />
        ) : (
          <img alt="Loading" src="img/geodash/ceo-loading.gif" />
        )}
      </div>
    );
  }
}
