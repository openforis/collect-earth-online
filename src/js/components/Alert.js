import React from "react";
import PropTypes from "prop-types";

// remains hidden, shows a styled menu when the quit button is clicked
export default function Alert({title, body, closeText, onClose}) {
    return (
        <div
            className="modal fade show"
            id="closeModal"
            onClick={onClose}
            style={{display: "block", backgroundColor: "rgba(0, 0, 0, 0.4)"}}
        >
            <div
                className="modal-dialog modal-dialog-centered"
                onClick={e => e.stopPropagation()}
                role="document"
            >
                <div className="modal-content" id="closeModalContent">
                    <div className="modal-header">
                        <h5 className="modal-title" id="closeModalTitle">{title}</h5>
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
                    </div>
                </div>
            </div>
        </div>
    );
}

Alert.propTypes = {
    body: PropTypes.string.isRequired,
    closeText: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired
};

Alert.defaultProps = {
    closeText: "OK"
};
