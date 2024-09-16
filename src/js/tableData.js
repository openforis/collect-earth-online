import { defaultThemes } from "react-data-table-component";

export const customStyles = {
  header: {
    style: {
      minHeight: "60px",
    },
  },
  headRow: {
    style: {
      borderTopStyle: "solid",
      borderTopWidth: "1px",
      borderTopColor: defaultThemes.default.divider.default,
    },
  },
  headCells: {
    style: {
      "&:not(:last-of-type)": {
	borderRightStyle: "solid",
	borderRightWidth: "1px",
	borderRightColor: defaultThemes.default.divider.default,
      },
    },
	},
  cells: {
    style: {
      "&:not(:last-of-type)": {
	borderRightStyle: "solid",
	borderRightWidth: "1px",
	borderRightColor: defaultThemes.default.divider.default,
      },
    },
  },
  table: {
    style: {
      maxHeight: "600px",
      overflowY: "auto"
    },
  },
};


export const projectConditionalRowStyles = [
  {
    when: row => row.disagreement === true,
    style: {
      backgroundColor: "rgba(242, 38, 19, 0.9)",
      color: "white",
      "&:hover": {
	cursor: "pointer",
      },
    },
  },
];

export const projectStatsColumns =  [
  {
    name: "Plot ID",
    selector: row => row.plot_id,
    sortable: true,
    reorder: true,
  },
  {
    name: "Confidence",
    selector: row => row.avg_confidence,
    sortable: true,
    reorder: true,
  },
  {
    name: "Flagged",
    selector: row => (row.num_flags ? row.numflags : "false"),
    sortable: true,
    reorder: true,
  },
  {
    name: "Disagreement",
    selector: row => (row.disagreement ? "true" : "false"),
    sortable: true,
    reorder: true,
  },
];

export const plotConditionalRowStyles = [
  {
    when: row => row.disagreement === true,
    style: {
      backgroundColor: "rgba(242, 38, 19, 0.9)",
      color: "white",
      "&:hover": {
	cursor: "pointer",
      },
    },
  },
];

export const plotStatsColumns = [
  {
    name: "Sample ID",
    selector: row => row.visibleId,
    sortable: true,
    reorder: true,
  },
  {
    name: "Interpreter",
    selector: row => row.userEmail,
    sortable: true,
    reorder: true,
  },
  {
    name: "Flaggged",
    selector: row => row.flagged ? row.flagged : "false",
    sortable: true,
    reorder: true,
  },
  {
    name: "Confidence",
    selector: row => row.confidence ? row.confidence : 100,
    sortable: true,
    reorder: true,
  },
]
