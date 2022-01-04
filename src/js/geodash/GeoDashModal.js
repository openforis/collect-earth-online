import React from "react";
import SvgIcon from "../components/svg/SvgIcon";

export default function GeoDashModal({title, body, footer, closeDialogs}) {
    return (
        <div>
            <div className="modal fade show" style={{display: "block"}}>
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5
                                className="modal-title"
                                id="exampleModalLabel"
                            >
                                {title}
                            </h5>
                            <button
                                aria-label="Close"
                                className="close"
                                data-dismiss="modal"
                                onClick={closeDialogs}
                                type="button"
                            >
                                <SvgIcon color="currentColor" icon="close" size="1.5rem"/>
                            </button>
                        </div>
                        <div className="modal-body">
                            {body}
                        </div>
                        <div className="modal-footer">
                            {footer}
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"> </div>
        </div>
    );
}
