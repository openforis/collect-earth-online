-- NAMESPACE: dev-data

INSERT INTO users
    (user_uid, email, password, administrator, reset_key, on_mailing_list)
VALUES
    (1, 'admin@collect.earth', crypt('admin', gen_salt('bf')), true, null, false);

INSERT INTO users
    (user_uid, email, password, administrator, reset_key, on_mailing_list)
VALUES
    (2, 'user@collect.earth', crypt('user', gen_salt('bf')), false, null, false);

INSERT INTO institutions
    (institution_uid, name, logo, description, url)
VALUES
    (1, 'DEV Institution', 'img/institution-logos/institution-3.png', 'DEV Institution Description', 'https://collect.earth');

INSERT INTO institution_users
    (inst_user_uid, institution_rid, user_rid, role_rid)
VALUES
    (1, 1, 1, 1),
    (2, 1, 2, 2);

INSERT INTO imagery
    (institution_rid, visibility, title, attribution, extent, source_config)
VALUES
    (1, 'public', 'Open Street Maps', 'Open Street Maps', null, '{"type": "OSM"}');
