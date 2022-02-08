CREATE INDEX projects_institution_rid    ON projects (institution_rid);
CREATE INDEX project_imagery_project_rid ON project_imagery (project_rid);
CREATE INDEX ext_samples_plot_rid        ON ext_samples (plot_rid);
CREATE INDEX plot_assignments_plot_rid   ON plot_assignments (plot_rid);
CREATE INDEX plot_assignments_user_rid   ON plot_assignments (user_rid);
