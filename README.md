# My Project

FIXME: Describe your project here.

# Installation Requirements

- Java Development Kit (version 11+) https://jdk.java.net
- Clojure CLI tools https://clojure.org/guides/getting_started
- Postgresql https://www.postgresql.org/download

# Postgresql Database Setup

*PostgreSQL* needs to be installed on the machine that will be hosting
this website. Once the Postgresql database server is running on your
machine, you should navigate to the toplevel directory and run the
database build command as follows:

```sh
$ clojure -A:build-db build-all
```

This will begin by creating a new database and role called
*my_project* and then add the pgcrypto extension to it. Next, the
script will populate the database with the schemas, tables, and
functions that are necessary for storing and processing *my_project*'s
data. Finally, it will load some default data into these tables that
is necessary for the website to function properly.

# Email Server

To set up the email server for system emails, start by creating a file
named `email-server.edn` in the root directory of the application. Add
the following EDN object containing server details to the file,
replacing the values with your own:

```clojure
{:site-url "http://my-domain.com"
 :host     "smtp.my-domain.com"
 :user     "support@my-domain.com"
 :pass     "fooBarBaz123"
 :ssl      true}
```

# Web Server

To compile and run the web application, navigate to the toplevel
project directory and run:

```sh
$ clojure -A:compile-cljs
$ clojure -A:run-server [port] [dev|prod]
```

The website will then be available at http://localhost:8080 or on
whichever port you specified. In dev mode, server-side exceptions will
be displayed in the browser and Clojure source files will be reloaded
whenever you refresh the page. These features are disabled in prod
mode. If the second argument to run-server is omitted, it will default
to prod mode.

# Development

## Compiling Clojurescript to Javascript

To compile the Clojurescript files under src/cljs to Javascript under
target/public/cljs, navigate to the toplevel project directory and
run:

```sh
$ clojure -A:compile-cljs
```

The main Javascript entry point file will be written to
target/public/cljs/app.js. The Clojurescript compiler options are read
from the toplevel compile-prod.cljs.edn file.

## Launching Figwheel

To start the Figwheel server, navigate to the toplevel project
directory and run:

```sh
$ clojure -A:figwheel
```

This will start a webserver on http://localhost:8080, which serves up
the website in dev mode. Any changes to CLJS files will be
automatically pushed to the browser when the files are saved. Any
changes to CLJ files will be pushed to the running server process. A
CLJS browser REPL will also be launched at the terminal for you to
interactively develop your client-side code.

# License and Distribution

FIXME: Fill in this section.
