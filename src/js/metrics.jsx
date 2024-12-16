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

import { LoadingModal, NavigationBar } from "./components/PageComponents";
import "../css/metrics.css";

const MetricsDashboard = () => {
  const [metric, setMetric] = useState('Select a Metric');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [handlerUrl, setHandlerUrl] = useState('');

  const metricsRoutes = {
    getImageryAccess: {
      displayName: "Imagery Access Metrics",
      route: "/metrics/get-imagery-access"
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
    }
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

    return url.toString();
  };

  useEffect(() => {
    if (!handlerUrl) return;

    const fetchData = async () => {
      try {

        const ceoUrl = buildUrl(handlerUrl, startDate, endDate); 
        const response = await fetch(ceoUrl);
        const result = await response.json();

        if (result.length > 0) {
          // Dynamically generate columns from data keys
          const cols = Object.keys(result[0]).map((key) => ({
            accessorKey: key,
            header: key.charAt(0).toUpperCase() + key.slice(1),
          }));
          setColumns(cols);
        }
        setData(result);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [handlerUrl, startDate, endDate]);

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

          <div className="filter col-md-2 d-flex align-items-center">
            <button className="btn btn-dark w-100">Download CSV</button>
          </div>
        </div>
        <div className="table-container mt-4">
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
        </div>
      </div>
    </div>
  );
};

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <MetricsDashboard />
    </NavigationBar>,
    document.getElementById("app")
  );
}
