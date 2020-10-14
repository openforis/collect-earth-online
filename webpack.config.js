const path = require("path");
const fs = require("fs");

const outdir = "target/public/js";

module.exports = env => ({
    mode: env.dev ? "development" : "production",
    devtool: env.dev ? "eval-cheap-module-source-map" : "",
    watch: env.dev,
    entry: {
        about                  : path.resolve(__dirname, "src/js/about.js"),
        account                : path.resolve(__dirname, "src/js/account.js"),
        collection             : path.resolve(__dirname, "src/js/collection.js"),
        createInstitution      : path.resolve(__dirname, "src/js/create-institution.js"),
        createProject          : path.resolve(__dirname, "src/js/create-project.js"),
        geoDash                : path.resolve(__dirname, "src/js/geo-dash.js"),
        geoDashHelp            : path.resolve(__dirname, "src/js/geo-dash-help.js"),
        home                   : path.resolve(__dirname, "src/js/home.js"),
        institutionDashboard   : path.resolve(__dirname, "src/js/institution-dashboard.js"),
        login                  : path.resolve(__dirname, "src/js/login.js"),
        mailingList            : path.resolve(__dirname, "src/js/mailing-list.js"),
        pageNotFound           : path.resolve(__dirname, "src/js/page-not-found.js"),
        passwordReset          : path.resolve(__dirname, "src/js/password-reset.js"),
        passwordRequest        : path.resolve(__dirname, "src/js/password-request.js"),
        projectDashboard       : path.resolve(__dirname, "src/js/project-dashboard.js"),
        register               : path.resolve(__dirname, "src/js/register.js"),
        reviewInstitution      : path.resolve(__dirname, "src/js/review-institution.js"),
        reviewProject          : path.resolve(__dirname, "src/js/review-project.js"),
        support                : path.resolve(__dirname, "src/js/support.js"),
        unsubscribeMailingList : path.resolve(__dirname, "src/js/unsubscribe-mailing-list.js"),
        widgetLayoutEditor     : path.resolve(__dirname, "src/js/widget-layout-editor.js"),
    },
    output: {
        path: path.resolve(__dirname, outdir),
        filename: "[name].[hash].bundle.js",
        chunkFilename: "[chunkhash].chunk.js",
        library: "[name]",
        libraryTarget: "var",
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            "@babel/preset-env",
                            "@babel/preset-react",
                        ],
                        plugins: [
                            "@babel/plugin-proposal-class-properties",
                            "lodash",
                        ],
                    },
                },
            },
            {
                test: /\.css$/, // TODO Find a css optimizer
                use: [
                    "style-loader",
                    {loader: "css-loader", options: {url: false}},
                ],
            },
        ],
    },
    plugins: [
        {
            apply: (compiler) => {
                compiler.hooks.beforeCompile.tap("BeforeCompilePlugin", () => {
                    // Ensure that outdir exists.
                    if (!fs.existsSync("./" + outdir)) {
                        fs.mkdirSync("./" + outdir, {recursive: true});
                    }
                    // Remove old files to prevent conflicts.
                    // Dev will have the old files removed at the beginning
                    // so a browser refresh does not show stale data.
                    if (env.dev) {
                        fs.unlink("./target/entry-points.json", () => null);
                        fs.readdirSync("./" + outdir)
                            .forEach(f => fs.unlinkSync(path.join("./" + outdir, f)));
                    }
                });
                compiler.hooks.emit.tap("EmitPlugin", () => {
                    // Remove old files to prevent conflicts.
                    // Production will have the old files removed immediately before
                    // the new ones are created for less interruption.
                    if (!env.dev) {
                        fs.unlink("./target/entry-points.json", () => null);
                        fs.readdirSync("./" + outdir)
                            .forEach(f => fs.unlinkSync(path.join("./" + outdir, f)));
                    }
                });
                compiler.hooks.done.tap("DonePlugin", stats => {
                    // Map entrypoint name -> chunk files
                    const entryPoints = Array.from(stats.compilation.entrypoints.entries());
                    const newMap = entryPoints.reduce((acc, [name, ep]) =>
                        ({...acc, [name]: ep.chunks.map(c => "/js/" + c.files[0])}),
                                                      {});
                    fs.writeFile("./target/entry-points.json", JSON.stringify(newMap), "utf8", (e) => {
                        if (e) console.log(e);
                    });
                });
            },
        },
    ],
    optimization: {
        minimize: true,
        splitChunks: {
            chunks: "all",
        },
    },
});
