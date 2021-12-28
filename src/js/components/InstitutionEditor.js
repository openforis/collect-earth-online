import React from "react";
import {encodeFileAsBase64} from "../utils/generalUtils";
import RequiredInput from "./RequiredInput";

export default function InstitutionEditor({
    title,
    name,
    description,
    imageName,
    url,
    acceptTOS,
    buttonGroup,
    setInstitutionDetails
}) {
    return (
        <div className="row justify-content-center" id="institution-details">
            <div
                className="card card-lightgreen col-xl-6 col-lg-6 pb-2"
                id="institution-edit"
            >
                <h2 className="header">
                    {title}
                </h2>
                <div className="mb-3">
                    <RequiredInput
                        id="institution-name"
                        label="Name"
                        maxLength="400"
                        onChange={e => setInstitutionDetails("name", e.target.value)}
                        value={name}
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="institution-url">URL</label>
                    <input
                        className="form-control mb-1 mr-sm-2"
                        id="institution-url"
                        maxLength="400"
                        onChange={e => setInstitutionDetails("url", e.target.value)}
                        type="text"
                        value={url}
                    />
                </div>
                <div className="mb-3 ">
                    <label>Logo</label>
                    <div className="custom-file">
                        <input
                            accept="image/*"
                            className="custom-file-input mb-1 mr-sm-2"
                            id="institution-logo"
                            onChange={e => {
                                setInstitutionDetails("imageName", e.target.files[0].name);
                                encodeFileAsBase64(e.target.files[0], r => setInstitutionDetails("base64Image", r));
                            }}
                            type="file"
                        />
                        <label className="custom-file-label" htmlFor="institution-logo">
                            {imageName === "" || imageName === null ? "Choose image..." : imageName}
                        </label>
                    </div>
                </div>
                <div className="mb-3">
                    <RequiredInput
                        id="institution-description"
                        label="Description"
                        maxLength="2000"
                        onChange={e => setInstitutionDetails("description", e.target.value)}
                        type="textarea"
                        value={description}
                    />
                </div>
                {acceptTOS !== undefined && (
                    <div className="form-check mb-3">
                        <input
                            checked={acceptTOS}
                            className="form-check-input"
                            id="tos-check"
                            onChange={() => setInstitutionDetails("acceptTOS", !acceptTOS)}
                            type="checkbox"
                        />
                        <label className="form-check-label" htmlFor="tos-check">
                            <span style={{color: "red"}}>*</span>I agree to the <a href="/terms-of-service" target="_blank">Terms of Service</a>.
                        </label>
                    </div>
                )}
                {buttonGroup()}
            </div>
        </div>
    );
}
