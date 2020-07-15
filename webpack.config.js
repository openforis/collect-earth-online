const path = require("path");
const fs = require("fs");

const outdir = "target/classes/public/js";

module.exports = env => ({
    mode: env.dev ? "development" : "production",
    devtool: env.dev ? "inline-source-map" : "source-map",
    watch: env.dev,
    entry: {
        about                  : path.resolve(__dirname, "resources/public/jsx/about.js"),
        account                : path.resolve(__dirname, "resources/public/jsx/account.js"),
        collection             : path.resolve(__dirname, "resources/public/jsx/collection.js"),
        createInstitution      : path.resolve(__dirname, "resources/public/jsx/create-institution.js"),
        createProject          : path.resolve(__dirname, "resources/public/jsx/create-project.js"),
        geoDash                : path.resolve(__dirname, "resources/public/jsx/geo-dash.js"),
        geoDashHelp            : path.resolve(__dirname, "resources/public/jsx/geo-dash-help.js"),
        home                   : path.resolve(__dirname, "resources/public/jsx/home.js"),
        institutionDashboard   : path.resolve(__dirname, "resources/public/jsx/institution-dashboard.js"),
        login                  : path.resolve(__dirname, "resources/public/jsx/login.js"),
        mailingList            : path.resolve(__dirname, "resources/public/jsx/mailing-list.js"),
        pageNotFound           : path.resolve(__dirname, "resources/public/jsx/page-not-found.js"),
        passwordReset          : path.resolve(__dirname, "resources/public/jsx/password-reset.js"),
        passwordRequest        : path.resolve(__dirname, "resources/public/jsx/password-request.js"),
        projectDashboard       : path.resolve(__dirname, "resources/public/jsx/project-dashboard.js"),
        register               : path.resolve(__dirname, "resources/public/jsx/register.js"),
        reviewInstitution      : path.resolve(__dirname, "resources/public/jsx/review-institution.js"),
        reviewProject          : path.resolve(__dirname, "resources/public/jsx/review-project.js"),
        support                : path.resolve(__dirname, "resources/public/jsx/support.js"),
        unsubscribeMailingList : path.resolve(__dirname, "resources/public/jsx/unsubscribe-mailing-list.js"),
        widgetLayoutEditor     : path.resolve(__dirname, "resources/public/jsx/widget-layout-editor.js"),
    },
    output: {
        path: path.resolve(__dirname, outdir),
        filename: "[name].bundle.js",
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
                test: /\.css$/,
                use: [
                    "style-loader",
                    "css-loader",
                ],
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: [
                    "file-loader",
                ],
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/,
                use: [
                    "file-loader",
                ],
            },
        ],
    },
    plugins: [
        {
            apply: (compiler) => {
                compiler.hooks.beforeCompile.tap("BeforeRunPlugin", () => {
                    // Remove old files to prevent conflicts.
                    fs.readdirSync("./" + outdir)
                        .forEach(f => fs.unlinkSync(path.join("./" + outdir, f)));
                });
            },
        },
    ],
    optimization: {
        minimize: true,
        splitChunks: {
            chunks: "all",
            maxInitialRequests: Infinity,
            minSize: 0,
            cacheGroups: {
                commons: {
                    name: "common~chunk",
                    chunks: "all",
                    minChunks: 5, // smaller number puts more into the common chunk
                },
            },
        },
    },
});
