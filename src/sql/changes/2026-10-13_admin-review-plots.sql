ALTER TABLE user_plots
ADD COLUMN admin_review BOOLEAN DEFAULT FALSE;
ALTER TABLE user_plots
DROP CONSTRAINT per_user_per_plot;
CREATE UNIQUE INDEX per_user_per_plot ON user_plots (user_rid, plot_rid, admin_review) WHERE (admin_review = false);
