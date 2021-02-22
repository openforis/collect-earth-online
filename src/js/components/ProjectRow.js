import React from "react";
import PropTypes from "prop-types";

export default function ProjectRow({name, id, editable}) {
    return (
        <div className="bg-lightgrey text-center p-1 row px-auto">
            <div className={editable ? "col-lg-10 pr-lg-1" : "col mb-1 mx-0"}>
                <a
                    className="btn btn-sm btn-outline-lightgreen btn-block"
                    style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                    href={`/collection?projectId=${id}`}
                >
                    {name}
                </a>
            </div>
            {editable &&
                <edit-button className="col-lg-2 pl-lg-0">
                    <a
                        className="edit-project btn btn-sm btn-outline-yellow btn-block"
                        href={`/review-project?projectId=${id}`}
                    >
                        EDIT
                    </a>
                </edit-button>
            }
        </div>
    );
}

ProjectRow.propTypes = {
    name: PropTypes.string,
    id: PropTypes.number,
    editable: PropTypes.bool,
};

ProjectRow.defaultProps = {
    name: "*un-named*",
    editable: false,
};
