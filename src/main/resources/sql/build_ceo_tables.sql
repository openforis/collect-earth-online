CREATE SCHEMA ceo;

-- Grant user privileges

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ceo to ceo;

-- Create tables

CREATE TABLE ceo.projects (
  id                serial primary key,
  institution       integer,
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
  sample_values     jsonb,
  archived          boolean default false
);

CREATE TABLE ceo.plots (
  id         serial primary key,
  project_id integer not null references ceo.projects (id) on delete cascade on update cascade,
  center     geometry(Point,4326),
  user_id    integer,
  flagged    boolean default false,
  analyses   integer default 0
);

CREATE INDEX ceo_plots_project_id ON ceo.plots (project_id);
CREATE INDEX ceo_plots_analyses ON ceo.plots (analyses);

CREATE TABLE ceo.samples (
  id      serial primary key,
  plot_id integer not null references ceo.plots (id) on delete cascade on update cascade,
  point   geometry(Point,4326)
);

CREATE INDEX ceo_samples_plot_id ON ceo.samples (plot_id);

CREATE TABLE mapcha.imagery (
  id          serial primary key,
  title       text not null,
  date        date,
  url         text not null,
  attribution text
);

CREATE TABLE mapcha.users (
  id        serial primary key,
  email     text not null,
  password  text not null,
  role      text not null,
  reset_key text,
  ip_addr   inet
);

CREATE INDEX mapcha_users_email ON mapcha.users (email);

CREATE TABLE mapcha.user_samples (
  id           serial primary key,
  user_id      integer not null references mapcha.users (id) on delete cascade on update cascade,
  sample_id    integer not null references mapcha.samples (id) on delete cascade on update cascade,
  value_id     integer not null references mapcha.sample_values (id) on delete cascade on update cascade,
  imagery_id   integer not null references mapcha.imagery (id) on delete cascade on update cascade,
  date         date
);

CREATE INDEX mapcha_user_samples_user_id ON mapcha.user_samples (user_id);
CREATE INDEX mapcha_user_samples_sample_id ON mapcha.user_samples (sample_id);

-- Populate the mapcha.imagery table

INSERT INTO mapcha.imagery (title, date, url, attribution) VALUES
 ('DigitalGlobeRecentImagery', '2015-01-01'::date, 'http://api.tiles.mapbox.com/v4/digitalglobe.nal0g75k/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZGlnaXRhbGdsb2JlIiwiYSI6ImNpcTJ3ZTlyZTAwOWNuam00ZWU3aTkxdWIifQ.9OFrmevVe0YB2dJokKhhdA', 'DigitalGlobe Maps API: Recent Imagery | June 2015 | © DigitalGlobe, Inc'),
 ('DigitalGlobeRecentImagery+Streets', '2015-01-01'::date, 'http://api.tiles.mapbox.com/v4/digitalglobe.nal0mpda/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZGlnaXRhbGdsb2JlIiwiYSI6ImNpcTJ3ZTlyZTAwOWNuam00ZWU3aTkxdWIifQ.9OFrmevVe0YB2dJokKhhdA', 'DigitalGlobe Maps API: Recent Imagery+Streets | June 2015 | © DigitalGlobe, Inc'),
 ('BingAerial', '2016-11-04'::date, 'https://www.bingmapsportal.com', 'Bing Maps API: Aerial | © Microsoft Corporation'),
 ('BingAerialWithLabels', '2016-11-04'::date, 'https://www.bingmapsportal.com', 'Bing Maps API: Aerial with Labels | © Microsoft Corporation'),
 ('NASASERVIRChipset2002', '2002-01-01', 'http://pyrite.sig-gis.com/geoserver/wms', 'June 2002 Imagery Data Courtesy of DigitalGlobe');
