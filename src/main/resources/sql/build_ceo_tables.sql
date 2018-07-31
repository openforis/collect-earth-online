-- Create tables

CREATE TABLE projects (
  id                serial primary key,
  institution_id    integer not null references institutions (id) on delete cascade on update cascade,
  availability      text,
  name              text not null,
  description       text,
  privacy_level     text,
  boundary          geometry(Polygon,4326),
  base_map_source   text,
  plot_distribution text,
  num_plots         integer,
  plot_spacing      float,
  plot_shape        text,
  plot_size         integer,
  sample_distribution text,
  samples_per_plot  integer,
  sample_resolution float,
  sample_values     jsonb
);

CREATE TABLE plots (
  id         serial primary key,
  project_id integer not null references projects (id) on delete cascade on update cascade,
  center     geometry(Point,4326),
  flagged    integer default 0,
  assigned   integer default 0
);

CREATE TABLE samples (
  id      serial primary key,
  plot_id integer not null references plots (id) on delete cascade on update cascade,
  point   geometry(Point,4326)
);

CREATE TABLE imagery (
    id              serial primary key,
    institution_id  integer references institutions (id) on delete cascade on update cascade,
    visibility      text not null,
    title           text not null,
    attribution     text not null,
    extent          geometry(Polygon,4326),
    source_config   jsonb
);

CREATE TABLE users (
  id        serial primary key,
  email     text not null,
  password  text not null,
  role      text not null,
  reset_key text
);

CREATE TABLE institutions (
  id            serial primary key,
  name          text not null,
  logo          text not null,
  description   text not null,
  url           text not null,
  archived      boolean
);

CREATE TABLE institution_users {
    id              serial primary key,
    institution_id  integer not null references institutions (id),
    user_id         integer not null references users (id),
    role_id         integer not null references roles (id)
};

CREATE TABLE roles {
    id      serial primary key,
    title   text not null
};

CREATE TABLE user_plots(
	id          serial primary key,
	user_id     integer not null references users (id) on delete cascade on update cascade,
    plot_id     integer not null references plots (id) on delete cascade on update cascade,
    flagged     boolean default false,
	confidence  integer default 0 for values from (0) to (100),
	collection_time timestamp with time zone   
)

CREATE TABLE sample_values(
	id             serial primary key,
	user_plot_id   integer not null references user_plots (id) on delete cascade on update cascade,
    sample_id      integer not null references samples (id) on delete cascade on update cascade,     
	value          jsonb
)

CREATE INDEX projects_id ON projects (id);
CREATE INDEX plots_id ON plots (id);
CREATE INDEX samples_id ON samples (id);
CREATE INDEX imagery_id ON imagery (id);
CREATE INDEX users_id ON users (id);
CREATE INDEX institutions_id ON institutions (id);
CREATE INDEX institution_users_id ON institution_users (id);
CREATE INDEX roles_id ON roles (id);
CREATE INDEX user_plots_id ON user_plots (id);
CREATE INDEX sample_values_id ON sample_values (id);

-- Populate the mapcha.imagery table

INSERT INTO imagery (title, date, url, attribution) VALUES
 ('DigitalGlobeRecentImagery', '2015-01-01'::date, 'http://api.tiles.mapbox.com/v4/digitalglobe.nal0g75k/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZGlnaXRhbGdsb2JlIiwiYSI6ImNpcTJ3ZTlyZTAwOWNuam00ZWU3aTkxdWIifQ.9OFrmevVe0YB2dJokKhhdA', 'DigitalGlobe Maps API: Recent Imagery | June 2015 | © DigitalGlobe, Inc'),
 ('DigitalGlobeRecentImagery+Streets', '2015-01-01'::date, 'http://api.tiles.mapbox.com/v4/digitalglobe.nal0mpda/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZGlnaXRhbGdsb2JlIiwiYSI6ImNpcTJ3ZTlyZTAwOWNuam00ZWU3aTkxdWIifQ.9OFrmevVe0YB2dJokKhhdA', 'DigitalGlobe Maps API: Recent Imagery+Streets | June 2015 | © DigitalGlobe, Inc'),
 ('BingAerial', '2016-11-04'::date, 'https://www.bingmapsportal.com', 'Bing Maps API: Aerial | © Microsoft Corporation'),
 ('BingAerialWithLabels', '2016-11-04'::date, 'https://www.bingmapsportal.com', 'Bing Maps API: Aerial with Labels | © Microsoft Corporation'),
 ('NASASERVIRChipset2002', '2002-01-01', 'http://pyrite.sig-gis.com/geoserver/wms', 'June 2002 Imagery Data Courtesy of DigitalGlobe');
