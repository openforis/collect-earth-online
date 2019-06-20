CREATE OR REPLACE FUNCTION ext_table_count(_project_uid integer)
 RETURNS TABLE(plot_count integer, sample_count integer) AS $$

    DECLARE
        _plots_ext_table text;
        _samples_ext_table text;
        _plots_count integer;
        _samples_count integer;
    BEGIN
        SELECT plots_ext_table INTO _plots_ext_table FROM projects WHERE project_uid = _project_uid;
        SELECT samples_ext_table INTO _samples_ext_table FROM projects WHERE project_uid = _project_uid;

        IF _plots_ext_table = '' OR _plots_ext_table IS NULL THEN
            _plots_count = 0;
        ELSE
            EXECUTE 'SELECT COUNT(1)::int FROM ext_tables.' || _plots_ext_table INTO _plots_count;
        END IF;

        IF _samples_ext_table = '' OR _samples_ext_table IS NULL THEN
            _samples_count = 0;
        ELSE
            EXECUTE 'SELECT COUNT(1)::int FROM ext_tables.' || _samples_ext_table INTO _samples_count;
        END IF;

        RETURN QUERY SELECT _plots_count, _samples_count;
    END

$$ LANGUAGE PLPGSQL;