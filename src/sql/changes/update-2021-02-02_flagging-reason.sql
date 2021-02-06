ALTER TABLE user_plots ADD COLUMN flagged_reason text;

ALTER TYPE plot_return ADD ATTRIBUTE flagged_reason TEXT;

ALTER TYPE plot_collection_return DROP ATTRIBUTE extra_plot_info;
ALTER TYPE plot_collection_return ADD ATTRIBUTE flagged_reason TEXT;
ALTER TYPE plot_collection_return ADD ATTRIBUTE extra_plot_info jsonb;
