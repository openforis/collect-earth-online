import React from 'react';
// import PropTypes from 'prop-types'

function FormLayout({ title, children }) {
    return (
        <div className="row justify-content-center">
            <div className="col-xl-6 col-lg-8 border bg-lightgray mb-5">
                <div className="bg-darkgreen mb-3 no-container-margin">
                    <h1>{title}</h1>
                </div>
                {children}
            </div>
        </div>
    )
}

// FIXME loading proptype breaks the component
// FormLayout.propTypes = {
//     title: PropTypes.string.isRequired,
//     }

export default FormLayout