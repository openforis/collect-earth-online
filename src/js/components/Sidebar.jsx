import React, { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { stateAtom } from "../utils/constants";
import { LoadingModal } from "./PageComponents";
import Modal from "./Modal";
import SvgIcon from "./svg/SvgIcon";
import '../../css/sidebar.css';


export const Sidebar = ({ stateAtom, style, header, children, footer, processModal}) => {
  const { modal, modalMessage } = useAtomValue(stateAtom);
  const setAppState = useSetAtom(stateAtom);

  return (
    <div className="sidebar-container"
         style={style}>
      {header && <div className="sidebar-header">{header}</div>}

      <div className="sidebar-content">{children}</div>

      {footer && (
        <div className="sidebar-footer">{footer}</div>
      )}

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
  title,
  children,
  collapsible = false,
  defaultOpen = true,
  infoButton = false,
  onInfoClick,
  infoPopup,
  showHeader = true
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const {showInfoModal} = useAtomValue(stateAtom);

  return (
    <div className="sidebar-card" style={{position: "relative"}}>
      {showInfoModal && infoPopup}
      {showHeader &&
       <div
         className="sidebar-header"
         style={{
           display: "flex",
           /* justifyContent: "space-between", */
           alignItems: "center",
           cursor: collapsible ? "pointer" : "default",
         }}
         onClick={collapsible ? () => setOpen(!open) : undefined}
       >
         {infoButton && (
           <button
             className="sidebar-info-button"
             onClick={(e) => {
	       e.stopPropagation();
	       if (onInfoClick) onInfoClick();
	     }}
           >
             <SvgIcon icon="info" size="1rem" style={{marginBottom: "3.5px"}}/>
           </button>
	 )}
         <span className="sidebar-title">{title}</span>
         <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
           
           {collapsible && (
             <button
               className="sidebar-collapse-button"
               style={{
		 background: "none",
		 border: "none",
		 padding: 2,
		 cursor: "pointer",
	       }}
               onClick={(e) => {
		 e.stopPropagation();
		 setOpen(!open);
	       }}
             >
               <SvgIcon icon={open ? "upCaret" : "downCaret"} size="1rem" />
             </button>
           )}
         </div>
       </div>}

      {(!collapsible || open) && (
        <div className="sidebar-body">{children}</div>
      )}
    </div>
  );
};
