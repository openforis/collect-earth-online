-- Unflag plot
CREATE OR REPLACE FUNCTION unflag_plot(_plot_rid integer, _user_rid integer)
 RETURNS integer AS $$

    UPDATE user_plots
    SET flagged = FALSE
    WHERE plot_rid = _plot_rid
        AND user_rid = _user_rid
    RETURNING _plot_rid

$$ LANGUAGE SQL;
