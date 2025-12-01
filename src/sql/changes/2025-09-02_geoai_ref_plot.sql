ALTER TABLE projects add reference_plot_rid integer REFERENCES plots (plot_uid) ON DELETE CASCADE ON UPDATE CASCADE;
