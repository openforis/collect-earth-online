import React, { useState, useEffect } from 'react';
import ReactDOM from "react-dom";
import { Dropdown } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

import { NavigationBar, BreadCrumbs } from "./components/PageComponents";
import "../css/metrics.css";

const MetricsDashboard = ({userId}) => {
  const [metric, setMetric] = useState('Select a Metric');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [handlerUrl, setHandlerUrl] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const metricsRoutes = {
    getImageryAccess: {
      displayName: "Imagery Access Metrics",
      route: "/metrics/get-imagery-counts"
    },
    getProjectsWithGEE: {
      displayName: "Projects with GEE Metrics",
      route: "/metrics/get-projects-with-gee"
    },
    getSamplePlotCounts: {
      displayName: "Sample Plot Counts Metrics",
      route: "/metrics/get-sample-plot-counts"
    },
    getProjectCount: {
      displayName: "Project Count Metrics",
      route: "/metrics/get-project-count"
    },
    getPlotImagery: {
      displayName: "Insitution Imagery by Plot",
      route: "/metrics/get-plot-imagery-counts"
    },
  };

  const buildUrl = (baseUrl, startDate, endDate) => {
    const url = new URL(baseUrl, window.location.origin);

    // Extract only the date part in 'YYYY-MM-DD' format
    if (startDate) {
      const formattedStartDate = startDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'
      url.searchParams.append('startDate', formattedStartDate);
    }
    if (endDate) {
      const formattedEndDate = endDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'
      url.searchParams.append('endDate', formattedEndDate);
    }
    if (metric === "Insitution Imagery by Plot") {
      url.searchParams.append('userId', userId);
    }
    return url.toString();
  };

  const fetchData = async () => {
    if (!handlerUrl || !startDate || !endDate) {
      setAlertMessage("⚠️ Please select a metric, start date, and end date before proceeding.");
      return;
    }

    setAlertMessage(''); // Clear previous alerts

    try {
      const ceoUrl = buildUrl(handlerUrl, startDate, endDate);
      const response = await fetch(ceoUrl);
      const result = await response.json();

      if (result.length === 0) {
        setAlertMessage("🚫 No data found for the selected filters.");
        setData([]); // Clear previous data
        setColumns([]); // Clear previous columns
        return;
      }

      const formatColumnName = (name) =>
        name
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/^./, (char) => char.toUpperCase());

      const cols = Object.keys(result[0]).map((key) => ({
        accessorKey: key,
        header: formatColumnName(key),
      }));

      setColumns(cols);
      setData(result);
    } catch (error) {
      console.error("Error fetching data:", error);
      setAlertMessage(`❌ Error fetching data: ${error.message}`);
    }
  };

  // Table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleMetricSelect = (selectedMetric) => {
    setMetric(selectedMetric.displayName);
    setHandlerUrl(selectedMetric.route);
    setData([]); // Clear previous data
    setColumns([]); // Clear previous columns
  };

  const handleDownloadCSV = () => {
    if (data.length === 0) {
      alert("No data available to download.");
      return;
    }

    // Generate CSV content
    const headers = columns.map((col) => col.header).join(",") + "\n";
    const rows = data
      .map((row) => columns.map((col) => row[col.accessorKey]).join(","))
      .join("\n");

    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;

    // Trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "metrics_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="container">
      <div className="bg-darkgreen mb-3 no-container-margin" style={{ margin: "0 10px" }}>
        <h1 className="text-white">Metrics Dashboard</h1>
      </div>
      <div className="metrics-dashboard">
        <div className="filters row">
          <div className="filter col-md-3">
            <label>Metric</label>
            <Dropdown>
              <Dropdown.Toggle variant="secondary" id="metric-dropdown" className="w-100">
                {metric}
              </Dropdown.Toggle>
              <Dropdown.Menu className="text-left">
                {Object.values(metricsRoutes).map((metricItem) => (
                  <Dropdown.Item
                    key={metricItem.route}
                    onClick={() => handleMetricSelect(metricItem)}
                  >
                    {metricItem.displayName}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
        <div className="filters row d-flex align-items-end">
          <div className="filter col-md-2">
            <label>From</label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              className="form-control"
              dateFormat="yyyy-MM-dd"
            />
          </div>

          <div className="filter col-md-2">
            <label>To</label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              className="form-control"
              dateFormat="yyyy-MM-dd"
            />
          </div>
          <button
            className="btn btn-success filter col-md-1 d-flex justify-content-center align-items-center"
            style={{ textAlign: "center" }}
            onClick={fetchData}
          >
            Go
          </button>
          <div className="filter col-md-2">
            <button className="btn btn-dark w-100" onClick={handleDownloadCSV}>
              Download CSV
            </button>
          </div>
        </div>
        <div className="table-container mt-4">
          {alertMessage ? (
            <div className="alert alert-warning" role="alert">
              {alertMessage}
            </div>
          ) : (
            <div>
              <table className="table-auto w-full border-collapse border border-gray-300">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="border border-gray-300 px-4 py-2"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="border border-gray-300 px-4 py-2"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <BreadCrumbs
        crumbs={[{display: "Metrics",
                id:"metrics"}]}
      />
      <MetricsDashboard userId={session.userId}/>
    </NavigationBar>,
    document.getElementById("app")
  );
}
