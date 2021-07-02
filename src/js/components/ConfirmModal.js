import React from "react";
import PropTypes from "prop-types";

// remains hidden, shows a styled menu when the quit button is clicked
export default function ConfirmModal({title, body, confirmText, closeText, danger, onClose, onConfirm}) {
    return (
        <div
            className="modal fade show"
            id="confirmModal"
            onClick={onClose}
            style={{display: "block", backgroundColor: "rgba(0, 0, 0, 0.4)"}}
        >
            <div
                className="modal-dialog modal-dialog-centered"
                onClick={e => e.stopPropagation()}
                role="document"
            >
                <div className="modal-content" id="confirmModalContent">
                    <div className="modal-header">
                        <h5 className="modal-title" id="confirmModalTitle">{title}</h5>
                        <button
                            aria-label="Close"
                            className="close"
                            onClick={onClose}
                            type="button"
                        >
                            &times;
                        </button>
                    </div>
                    <div className="modal-body">
                        <p>{body}</p>
                    </div>
                    <div className="modal-footer">
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={onClose}
                            type="button"
                        >
                            {closeText}
                        </button>
                        <button
                            className={`btn btn-sm ${danger ? "btn-danger" : "btn-success"}`}
                            onClick={onConfirm}
                            type="button"
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

ConfirmModal.propTypes = {
    body: PropTypes.string.isRequired,
    closeText: PropTypes.string,
    confirmText: PropTypes.string,
    danger: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired
};

ConfirmModal.defaultProps = {
    closeText: "No, I'm not sure",
    confirmText: "Yes, I'm sure",
    danger: false
};
