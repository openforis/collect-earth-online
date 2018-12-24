import React from 'react';
// import PropTypes from 'prop-types'

function SectionBlock({ title, children }) {
    return (
        <div className={"row mb-3"}>
            <div className="col">
                <h2 className="header px-0">{title}</h2>
                {children}
            </div>
        </div>
    )
}

// SectionBlock.propTypes = {
//     title: PropTypes.string.isRequired,
//     }

export default SectionBlock
