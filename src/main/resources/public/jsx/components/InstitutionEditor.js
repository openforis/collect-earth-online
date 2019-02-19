import React from "react";




export default function InstitutionEditor({
    title,
    name,
    description,
    url,
    buttonGroup,
    setInstituionDetails,
}) {
    const encodeImageFileAsURL = (file, callback) => {

        const reader = new FileReader();

        reader.onloadend = () => callback(reader.result);
        reader.readAsDataURL(file);

    };
    return (
        <div id="institution-details" className="row justify-content-center">
            <div id="institution-edit" className="col-xl-6 col-lg-6 border pb-3 mb-2">
                <form>
                    <h2 className="header">
                        {title}
                    </h2>
                    <div className="form-group">
                        <label htmlFor="institution-name">Name</label>
                        <input
                            id="institution-name"
                            className="form-control mb-1 mr-sm-2"
                            type="text"
                            value={name}
                            onChange={e => setInstituionDetails("name", e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="institution-url">URL</label>
                        <input
                            id="institution-url"
                            type="text"
                            className="form-control mb-1 mr-sm-2"
                            value={url}
                            onChange={e => setInstituionDetails("url", e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="institution-logo">Logo</label>
                        <input
                            id="institution-logo"
                            className="form-control mb-1 mr-sm-2"
                            type="file"
                            accept="image/*"
                            onChange={e => {
                                setInstituionDetails("logo", e.target.files[0]);
                                encodeImageFileAsURL(e.target.files[0], (r) => setInstituionDetails("base64Image", r));
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="institution-description">Description</label>
                        <textarea
                            id="institution-description"
                            className="form-control"
                            rows="4"
                            value={description}
                            onChange={e => setInstituionDetails("description", e.target.value)}
                        />
                    </div>
                    {buttonGroup()}
                </form>
            </div>
        </div>
    );

}
