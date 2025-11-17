import React from "react";
import PropTypes from "prop-types";
import { requiredBy } from "airbnb-prop-types";

/**
 * Component for a generic modal.
 * To display a confirm button, use `confirmLabel` and `onConfirm`
 *
 * @example
 * <Modal title={title} onClose={() => setState({showModal: false})}>
 *   <p>Your changes have been saved</p>
 * </Modal>
 */
export default function Modal({
  title,
  danger,
  children,
  closeText,
  confirmText,
  onClose,
  onConfirm,  
}) {
  return (
    <div
      className="modal fade show"
      id="confirmModal"
      onClick={onClose}
      style={{ display: "block", backgroundColor: "rgba(0, 0, 0, 0.4)" }}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="modal-content" id="confirmModalContent">
          <div className={danger ? "alert-header" : "modal-header"}>
            <h5 className="modal-title" id="confirmModalTitle">
              {title}
            </h5>
            <button aria-label="Close" className="close" onClick={onClose} type="button">
              &times;
            </button>
          </div>
          <div className="modal-body" style={{"white-space": "pre-line"}}>{children}</div>
          <div className="modal-footer">
            <button className="btn btn-secondary btn-sm" onClick={onClose} type="button">
              {closeText}
            </button>
            {typeof onConfirm === "function" && (
              <button
                className={`btn btn-sm ${danger ? "btn-danger" : ""}`}
                style={{backgroundColor: "#2d6f74",
                        color: "#fff"}}
                onClick={onConfirm}
                type="button"
              >
                {confirmText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Modal.propTypes = {
  closeText: PropTypes.string,
  confirmText: requiredBy("onConfirm", PropTypes.string),
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func,
  title: PropTypes.string.isRequired,
};

Modal.defaultProps = {
  closeText: "OK",
  confirmText: null,
  onConfirm: null,
};
