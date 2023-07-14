ALTER TABLE IF EXISTS public.plot_locks DROP CONSTRAINT plot_locks_pkey;

ALTER TABLE IF EXISTS public.plot_locks ADD CONSTRAINT plot_locks_plot_rid_key UNIQUE (plot_rid);
ALTER TABLE IF EXISTS public.plot_locks ADD CONSTRAINT plot_locks_user_rid_key UNIQUE (user_rid);
