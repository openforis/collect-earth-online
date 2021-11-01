import React from "react";

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
                                <span aria-hidden="true">X</span>
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
