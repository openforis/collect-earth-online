import React from "react";
import {encodeFileAsBase64} from "../utils/generalUtils.js";
import TextArea from "../components/form/text-area";
import TextInput from "../components/form/text-input";
import UrlInput from "../components/form/url-input";
import Checkbox from "../components/form/checkbox";

export default function InstitutionEditor({
    title,
    name,
    description,
    url,
    acceptTerms,
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
                    <TextInput
                        name="institution-name"
                        label="Insitution Name"
                        className="mb-1 mr-sm-2"
                        value={name}
                        onChange={e => setInstitutionDetails("name", e.target.value)}
                        invalidText="Institution must have a name."
                        maxLength="400"
                        isRequired
                    />
                </div>
                <UrlInput
                    className="mb-3"
                    label="URL"
                    name="institution-url"
                    value={url}
                    onChange={e => setInstitutionDetails("url", e.target.value)}
                    maxLength="400"
                />
                <div className="mb-3">
                    <label>Logo</label>
                    <div className="custom-file">
                        <input
                            id="institution-logo"
                            className="custom-file-input mb-1 mr-sm-2"
                            type="file"
                            accept="image/*"
                            onChange={e => {
                                setInstitutionDetails("logo", e.target.files[0].name);
                                encodeFileAsBase64(e.target.files[0], r => setInstitutionDetails("base64Image", r));
                            }}
                        />
                        <label className="custom-file-label" htmlFor="institution-logo">Choose an image...</label>
                    </div>
                </div>
                <TextArea
                    className="mb-3"
                    name="institution-description"
                    rows={4}
                    label="Description"
                    value={description}
                    onChange={e => setInstitutionDetails("description", e.target.value)}
                    maxLength="2000"
                    invalidText="Institution must have a description."
                    isRequired
                />
                {acceptTerms !== undefined &&
                    <Checkbox
                        className="mb-3"
                        name="accept-terms"
                        isSelected={acceptTerms}
                        onCheckboxChange={() => setInstitutionDetails("acceptTerms", !acceptTerms)}
                        isRequired
                        helpText="You must agree to the Terms of Service before creating an institution."
                    >
                        I agree to the <a target="_blank" href="/terms">Terms of Service</a>.
                    </Checkbox>}
                {buttonGroup()}
            </div>
        </div>
    );

}
