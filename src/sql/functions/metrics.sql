-- NAMESPACE: metrics
-- REQUIRES: clear

CREATE OR REPLACE FUNCTION get_imagery_counts(start_date_param TEXT, end_date_param TEXT)
RETURNS TABLE (
    imagery_id INT,
    imagery_name TEXT,
    user_plot_count BIGINT,
    start_date TEXT,
    end_date TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.imagery_uid AS imagery_id,
        i.title AS imagery_name,
        COUNT(up.user_plot_uid) AS user_plot_count,
        start_date_param AS start_date,
        end_date_param AS end_date
    FROM 
        user_plots up
    JOIN 
        plots p ON up.plot_rid = p.plot_uid
    JOIN 
        projects proj ON p.project_rid = proj.project_uid
    LEFT JOIN 
        imagery i ON proj.imagery_rid = i.imagery_uid
    WHERE 
        up.collection_start BETWEEN start_date_param::DATE AND end_date_param::DATE
    GROUP BY 
        i.imagery_uid, i.title
    ORDER BY 
        user_plot_count DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_projects_with_gee(start_date_param TEXT, end_date_param TEXT)
RETURNS TABLE (
    show_gee_script BOOLEAN,
    project_count BIGINT,
    start_date TEXT,
    end_date TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (CASE 
            WHEN (options->>'showGEEScript')::BOOLEAN IS TRUE THEN TRUE 
            ELSE FALSE 
        END) AS show_gee_script,
        COUNT(*) AS project_count,
        start_date_param AS start_date,
        end_date_param AS end_date
    FROM 
        projects
    WHERE 
        created_date BETWEEN start_date_param::DATE AND end_date_param::DATE
    GROUP BY 
        show_gee_script;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_sample_plot_counts(start_date_param TEXT, end_date_param TEXT)
RETURNS TABLE (
    user_plot_count BIGINT,
    total_sample_count BIGINT,
    distinct_project_count BIGINT,
    start_date TEXT,
    end_date TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(up.user_plot_uid) AS user_plot_count,
        COUNT(DISTINCT p.project_rid) AS distinct_project_count,
        COALESCE(SUM(s.sample_count)::BIGINT, 0) AS total_sample_count,
        start_date_param AS start_date,
        end_date_param AS end_date
    FROM 
        user_plots up
    JOIN 
        plots p ON up.plot_rid = p.plot_uid
    LEFT JOIN (
        SELECT 
            plot_rid,
            COUNT(*) AS sample_count
        FROM 
            samples
        GROUP BY 
            plot_rid
    ) s ON p.plot_uid = s.plot_rid
    WHERE 
        up.collection_start BETWEEN start_date_param::DATE AND end_date_param::DATE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_project_count(start_date_param TEXT, end_date_param TEXT)
RETURNS TABLE (
    project_count BIGINT,
    start_date TEXT,
    end_date TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) AS project_count,
        start_date_param AS start_date,
        end_date_param AS end_date
    FROM 
        projects
    WHERE 
        created_date BETWEEN start_date_param::DATE AND end_date_param::DATE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION show_metrics_user(user_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM metric_users
        WHERE user_rid = user_id
    );
END;
$$ LANGUAGE plpgsql;
