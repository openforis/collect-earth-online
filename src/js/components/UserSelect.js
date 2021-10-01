import React, {useState} from "react";

import Select from "./Select";

export default function UserSelect({label, id, possibleUsers = [], addUser}) {
    const [selectedUserId, setSelectedUserId] = useState(-1);

    return (
        <div className="form-row">
            <Select
                disabled={possibleUsers.length === 1}
                id={id}
                label={label}
                labelKey="email"
                onChange={e => setSelectedUserId(parseInt(e.target.value))}
                options={possibleUsers.length > 1 ? possibleUsers : ["No users to assign."]}
                value={selectedUserId}
                valueKey="id"
            />
            <div className="col-1">
                <button
                    className="btn btn-sm btn-success"
                    disabled={possibleUsers.length === 1 || selectedUserId === -1}
                    onClick={() => {
                        addUser(selectedUserId);
                        setSelectedUserId(-1);
                    }}
                    title="Add User"
                    type="button"
                >
                        +
                </button>
            </div>
        </div>
    );
}
