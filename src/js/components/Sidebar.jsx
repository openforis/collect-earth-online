import React, { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { LoadingModal } from "./PageComponents";
import Modal from "./Modal";
import SvgIcon from "./svg/SvgIcon";
import '../../css/sidebar.css';


export const Sidebar = ({
  stateAtom,
  header = null,
  footer = null,
  children,
  processModal,
  style = {},
}) => {
  const { modal, modalMessage } = useAtomValue(stateAtom);
  const setAppState = useSetAtom(stateAtom);
  const [expandedCardId, setExpandedCardId] = useState(null);

  const handleCollapseAll = () => setExpandedCardId(null);

  return (
    <div className="sidebar-container" style={{ ...style }}>
      {header && <div className="sidebar-header">{header}</div>}
      <div className="sidebar-content">
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;
          const id = child.props.id;
          const isExpanded = expandedCardId === id;
          return React.cloneElement(child, {
            expanded: isExpanded,
            onExpand: () => setExpandedCardId(id),
            onCollapse: handleCollapseAll,
          });
        })}
      </div>
      {footer && <div className="sidebar-footer">{footer}</div>}

      {modal?.alert && (
        <Modal
          title={modal.alert.alertType}
          onClose={() => setAppState((prev) => ({ ...prev, modal: null }))}
        >
          {modal.alert.alertMessage}
        </Modal>
      )}
      {modalMessage && <LoadingModal message={modalMessage} />}
    </div>
  );
};

export const SidebarCard = ({
  id,
  title,
  children,
  collapsible = false,
  defaultOpen = true,
  enableExpand = false,
  expanded = false,
  onExpand = () => {},
  onCollapse = () => {},
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const toggleExpand = (e) => {
    e.stopPropagation();
    expanded ? onCollapse() : onExpand();
  };

  const toggleCollapse = () => {
    if (collapsible && !expanded) setOpen((prev) => !prev);
  };

  return (
    <div
      className="sidebar-card"
      style={{
        display: expanded ? "flex" : "block",
        flexDirection: "column",
        height: expanded ? "100%" : "auto",
        overflow: expanded ? "hidden" : "visible",
      }}
    >
      <div
        className="sidebar-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span className="sidebar-title" onClick={toggleCollapse} style={{ cursor: collapsible ? "pointer" : "default" }}>
          {title}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {enableExpand && (
            <button
              className="sidebar-expand-button"
              onClick={toggleExpand}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <SvgIcon icon={expanded ? "collapseIcon" : "expandIcon"} size="1rem" />
            </button>
          )}
          {collapsible && (
            <button
              className="sidebar-collapse-button"
              onClick={() => setOpen((prev) => !prev)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <SvgIcon icon={open ? "upCaretIcon" : "downCaretIcon"} size="1rem" />
            </button>
          )}
        </div>
      </div>

      {(open || expanded) && (
        <div
          className="sidebar-body"
          style={{
            flex: 1,
            overflowY: expanded ? "auto" : "visible",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};
