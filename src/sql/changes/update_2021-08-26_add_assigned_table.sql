CREATE TABLE assigned_plots (
    user_rid    integer NOT NULL REFERENCES users(user_uid),
    plot_rid    integer NOT NULL REFERENCES plots(plot_uid) ON DELETE CASCADE,
    PRIMARY KEY(user_rid, plot_rid)
);
