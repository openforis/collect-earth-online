import React, {useState} from "react";

import Select from "./Select";
import {ButtonSvgIcon} from "./SvgIcon";

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
                options={possibleUsers.length === 1 ? ["No users to assign."] : possibleUsers}
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
                    <ButtonSvgIcon icon="plus" size="0.9rem"/>
                </button>
            </div>
        </div>
    );
}
