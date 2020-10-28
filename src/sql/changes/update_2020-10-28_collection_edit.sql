ALTER TABLE plot_locks
DROP CONSTRAINT  plot_locks_plot_rid_fkey,
ADD CONSTRAINT plot_locks_plot_rid_fkey FOREIGN KEY (plot_rid)
    REFERENCES public.plots (plot_uid) MATCH SIMPLE
    ON DELETE CASCADE;
