ALTER TABLE user_plots ADD COLUMN flagging_reason text;

ALTER TYPE plot_return ADD ATTRIBUTE flagging_reason TEXT;

ALTER TYPE plot_collection_return DROP ATTRIBUTE extra_plot_info;
ALTER TYPE plot_collection_return ADD ATTRIBUTE flagging_reason TEXT;
ALTER TYPE plot_collection_return ADD ATTRIBUTE extra_plot_info jsonb;
