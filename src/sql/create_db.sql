DROP DATABASE IF EXISTS ceo;
DROP ROLE IF EXISTS ceo;
CREATE ROLE ceo WITH LOGIN CREATEDB PASSWORD 'ceo';
CREATE DATABASE ceo WITH OWNER ceo;
\c ceo
CREATE EXTENSION postgis;
CREATE EXTENSION pgcrypto;
-- Schema for external tables
CREATE SCHEMA ext_tables AUTHORIZATION ceo;