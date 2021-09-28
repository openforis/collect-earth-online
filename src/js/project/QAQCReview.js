import React from "react";

function Badge({children}) {
    return (
        <span className="badge badge-pill bg-lightgreen ml-1">{children}</span>
    );
}

function ReviewRow({title, content}) {
    return (
        <tr>
            <td className="w-80 pr-5">{title}</td>
            <td className="w-20 text-center">
                <Badge>{content}</Badge>
            </td>
        </tr>
    );
}

export default function QAQCReview({designSettings, institutionUserList = []}) {
    const {qaqcAssignment: {qaqcMethod, smes, percent, timesToReview}} = designSettings;

    return (
        <div className="d-flex">
            <div id="user-assignment-review">
                <table className="table table-sm" id="sample-review-table">
                    <tbody>
                        <ReviewRow content={qaqcMethod} title="Method"/>
                        {qaqcMethod === "overlap" && (
                            <ReviewRow content={timesToReview} title="Times to Review"/>
                        )}
                        <ReviewRow content={("" + percent + "%")} title="Percent"/>
                        {qaqcMethod === "sme" && (
                            <tr>
                                <td className="w-80 pr-5">SMEs</td>
                                <td className="w-20 text-center">
                                    {institutionUserList
                                        .filter(u => smes.includes(u.id))
                                        .map(({id, email}) => (<Badge key={id}>{email}</Badge>))}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
