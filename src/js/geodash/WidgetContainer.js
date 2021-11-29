import React from "react";

export default function WidgetContainer({title, titleButtons, children}) {
    return (
        <div className="widget-container">
            <div className="widget-container-heading">
                <label style={{margin: 0}}>{title}</label>
                <div>
                    {titleButtons}
                </div>
            </div>
            <div className="widget-container-body">
                {children}
            </div>
        </div>
    );
}
