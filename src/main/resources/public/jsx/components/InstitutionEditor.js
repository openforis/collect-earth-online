import React from "react";
import { encodeImageFileAsURL } from "../utils/fileUtils.js";

export default function InstitutionEditor({
    title,
    name,
    description,
    url,
    buttonGroup,
    setInstitutionDetails,
}) {

    return (
        <div id="institution-details" className="row justify-content-center">
            <div id="institution-edit" className="col-xl-6 col-lg-6 border pb-3 mb-2">
                <h2 className="header">
                    {title}
                </h2>
                <div className="mb-3">
                    <label htmlFor="institution-name">Name</label>
                    <input
                        id="institution-name"
                        className="form-control mb-1 mr-sm-2"
                        type="text"
                        value={name}
                        onChange={e => setInstitutionDetails("name", e.target.value)}
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="institution-url">URL</label>
                    <input
                        id="institution-url"
                        type="text"
                        className="form-control mb-1 mr-sm-2"
                        value={url}
                        onChange={e => setInstitutionDetails("url", e.target.value)}
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="institution-logo">Logo</label>
                    <input
                        id="institution-logo"
                        className="form-control mb-1 mr-sm-2"
                        type="file"
                        accept="image/*"
                        onChange={e => {
                            setInstitutionDetails("logo", e.target.files[0].name);
                            encodeImageFileAsURL(e.target.files[0], r => setInstitutionDetails("base64Image", r));
                        }}
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="institution-description">Description</label>
                    <textarea
                        id="institution-description"
                        className="form-control"
                        rows="4"
                        value={description}
                        onChange={e => setInstitutionDetails("description", e.target.value)}
                    />
                </div>
                {buttonGroup()}
            </div>
        </div>
    );

}
