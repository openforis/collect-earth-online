const path = require("path");
const fs = require("fs");

// get the output directory according to build tool (maven or gradle)
// maven -> target
// gradle -> build
// Note: make sure both directories don't exist; otherwise the script might not work as expected.
const outdir = fs.existsSync(path.resolve(__dirname, "target")) ? "target/classes" : "build/resources/main";

module.exports = env => ({
    mode: env.dev ? "development" : "production",
    devtool: env.dev ? "eval-cheap-module-source-map" : "",
    watch: env.dev,
    entry: {
        about                  : path.resolve(__dirname, "src/main/resources/public/jsx/about.js"),
        account                : path.resolve(__dirname, "src/main/resources/public/jsx/account.js"),
        collection             : path.resolve(__dirname, "src/main/resources/public/jsx/collection.js"),
        createInstitution      : path.resolve(__dirname, "src/main/resources/public/jsx/create-institution.js"),
        createProject          : path.resolve(__dirname, "src/main/resources/public/jsx/create-project.js"),
        geoDash                : path.resolve(__dirname, "src/main/resources/public/jsx/geo-dash.js"),
        geoDashHelp            : path.resolve(__dirname, "src/main/resources/public/jsx/geo-dash-help.js"),
        home                   : path.resolve(__dirname, "src/main/resources/public/jsx/home.js"),
        institutionDashboard   : path.resolve(__dirname, "src/main/resources/public/jsx/institution-dashboard.js"),
        login                  : path.resolve(__dirname, "src/main/resources/public/jsx/login.js"),
        mailingList            : path.resolve(__dirname, "src/main/resources/public/jsx/mailing-list.js"),
        pageNotFound           : path.resolve(__dirname, "src/main/resources/public/jsx/page-not-found.js"),
        passwordReset          : path.resolve(__dirname, "src/main/resources/public/jsx/password-reset.js"),
        passwordRequest        : path.resolve(__dirname, "src/main/resources/public/jsx/password-request.js"),
        projectDashboard       : path.resolve(__dirname, "src/main/resources/public/jsx/project-dashboard.js"),
        register               : path.resolve(__dirname, "src/main/resources/public/jsx/register.js"),
        reviewInstitution      : path.resolve(__dirname, "src/main/resources/public/jsx/review-institution.js"),
        reviewProject          : path.resolve(__dirname, "src/main/resources/public/jsx/review-project.js"),
        support                : path.resolve(__dirname, "src/main/resources/public/jsx/support.js"),
        unsubscribeMailingList : path.resolve(__dirname, "src/main/resources/public/jsx/unsubscribe-mailing-list.js"),
        widgetLayoutEditor     : path.resolve(__dirname, "src/main/resources/public/jsx/widget-layout-editor.js"),
    },
    output: {
        path: path.resolve(__dirname, outdir + "/public/js"),
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
                    fs.readdirSync("./src/main/resources/public/js/")
                        .filter(f => f.includes(".bundle.js"))
                        .forEach(f => fs.unlinkSync(path.join("./src/main/resources/public/js/", f)));
                    fs.readdirSync("./" + outdir + "/public/js/")
                        .forEach(f => fs.unlinkSync(path.join("./" + outdir + "/public/js/", f)));
                    fs.readdirSync("./" + outdir + "/template/freemarker/")
                        .forEach(f => fs.unlinkSync(path.join("./" + outdir + "/template/freemarker/", f)));
                });

                compiler.hooks.afterEmit.tap("AfterEmitPlugin", () => {
                    // Build freemarker files based on compiled js file.
                    const compiledJsList = fs.readdirSync("./" + outdir + "/public/js")
                        .filter(a => !a.endsWith(".map"))
                        .sort(a => a.includes("common") ? -1 : 1) // move common bundle to the top
                        .sort(a => a.includes("~") ? -1 : 1) // move root bundles to the bottom
                        .map(b => "<script type=\"text/javascript\" src=\"${root}/js/" + b + "\"></script>");
                    const ftlFileList = fs.readdirSync("./src/main/resources/template/freemarker");

                    ftlFileList.forEach(f => {
                        const shortF = f.replace(/.ftl/, "").replace(/-/g, "_");
                        const bundleList = compiledJsList
                            .filter(js => js.includes(shortF) || js.includes("common"))
                            .join("\n");

                        const fileIn = fs.readFileSync(path.join("./src/main/resources/template/freemarker", f), "utf-8");
                        const jsScripts = "<!-- Auto Inserted Bundles -->\n" + bundleList + "\n<!-- End Auto Inserted Bundles -->";
                        const fileOut = fileIn.replace(/<!-- Auto Inserted Bundles -->((.|\n|\r\n)*)<!-- End Auto Inserted Bundles -->/, jsScripts);

                        fs.writeFileSync(path.join("./" + outdir + "/template/freemarker", f), fileOut, "utf-8");
                    });

                    // Copy remaining JS files that do not get compiled.
                    fs.readdirSync("./src/main/resources/public/js/")
                        .forEach(f => fs.copyFileSync(path.join("./src/main/resources/public/js/", f),
                                                      path.join("./" + outdir + "/public/js/", f)));
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
                    minChunks: 5, // Any more than 5 and we lose route names in the file name.
                },
            },
        },
    },
});
