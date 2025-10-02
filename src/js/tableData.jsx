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
      height: "600px",
      overflowY: "auto",
    },
  },
};


export const projectConditionalRowStyles = [
  {
    when: row => row.disagreement > 20.0,
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
    selector: row => parseFloat(row.disagreement.toFixed(2)),
    sortable: true,
    reorder: true,
  },
];

const handleCopyToClipboard = (text) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    }).catch((err) => {
      console.error("Failed to copy to clipboard");
    });
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Fallback failed: ", err);
    }
    document.body.removeChild(textArea);
  }
};


export const plotConditionalRowStyles = [
  {
    when: row => row.disagreement,
    style: {
      backgroundColor: "rgba(242, 38, 19, 0.9)",
      color: "white",
      "&:hover": {
	cursor: "pointer",
      },
    },
  },
];

const JsonCell = ({ row }) => {
  return (
    <div
      onClick={() => handleCopyToClipboard(row.answers)}
      style={{
        maxWidth: "250px",
        maxHeight: "50px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        cursor: "pointer",
        color: "blue",
      }}
      title="Click to copy answers JSON"
    >
      <pre style={{ display: "inline", margin: 0, whiteSpace: "pre-wrap" }}>
        {row.answers}
      </pre>
    </div>
  );
};

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
  {
    name: "Answers",
    cell: row => <JsonCell row={row} />,
    sortable: false,
    reorder: false,
  }
]


export const userStatsColumns = [
  {
    name: "Interpreter",
    selector: row => row.email,
    sortable: true,
    reorder: true,
  },
  {
    name: "Analyzed",
    selector: row => row.analyzed,
    sortable: true,
    reorder: true,
  },

  {
    name: "Flaggged",
    selector: row => row.flagged ? row.flagged : 0,
    sortable: true,
    reorder: true,
  },

  {
    name: "Analysis Time",
    selector: row => row.analysisTime,
    sortable: true,
    reorder: true,
  },
  {
    name: "Total Disagreement",
    selector: row => row.disagreement ? row.disagreement : 0,
    sortable: true,
    reorder: true,
  },
]
