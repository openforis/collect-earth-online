UPDATE imagery SET extent = NULL WHERE extent = 'null';

DROP FUNCTION IF EXISTS check_institution_imagery(integer, text);
