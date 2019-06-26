const path = require("path");
const fs = require("fs");

module.exports = {
    entry: {
        home:                   path.resolve(__dirname, "src/main/resources/public/jsx/home.js"),
        create_institution:     path.resolve(__dirname, "src/main/resources/public/jsx/create-institution.js"),
        review_institution:     path.resolve(__dirname, "src/main/resources/public/jsx/review-institution.js"),
        collection:             path.resolve(__dirname, "src/main/resources/public/jsx/collection.js"),
        create_project:         path.resolve(__dirname, "src/main/resources/public/jsx/create-project.js"),
        review_project:         path.resolve(__dirname, "src/main/resources/public/jsx/review-project.js"),
        project_dashboard:      path.resolve(__dirname, "src/main/resources/public/jsx/project-dashboard.js"),
        institution_dashboard:  path.resolve(__dirname, "src/main/resources/public/jsx/institution-dashboard.js"),
        account:                path.resolve(__dirname, "src/main/resources/public/jsx/account.js"),
        geo_dash:               path.resolve(__dirname, "src/main/resources/public/jsx/geo-dash.js"),
        widget_layout_editor:   path.resolve(__dirname, "src/main/resources/public/jsx/widget-layout-editor.js"),
    },
    output: {
        path: path.resolve(__dirname, "target/classes/public/js"),
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
                    fs.readdirSync("./target/classes/public/js/")
                        .forEach(f => fs.unlinkSync(path.join("./target/classes/public/js/", f)));
                    fs.readdirSync("./target/classes/template/freemarker/")
                        .forEach(f => fs.unlinkSync(path.join("./target/classes/template/freemarker/", f)));
                });

                compiler.hooks.afterEmit.tap("AfterEmitPlugin", () => {
                    // Build freemarker files based on compiled js file.
                    const compiledJsList = fs.readdirSync("./target/classes/public/js")
                        .sort(a => a.includes("common") ? -1 : 1) // move common bundle to the top
                        .sort(a => a.includes("~") ? -1 : 1) // move root bundles to the bottom
                        .map(b => "<script type=\"text/javascript\" src=\"${root}/js/" + b + "\"></script>");
                    const ftlFileList = fs.readdirSync("./src/main/resources/template/freemarker");

                    ftlFileList.forEach(f => {
                        const shortF = f.replace(/.ftl/, "").replace(/-/g, "_");
                        console.log(shortF)
                        const bundleList = compiledJsList
                            .filter(js => js.includes(shortF) || js.includes("common"))
                            .join("\n");

                        const fileIn = fs.readFileSync(path.join("./src/main/resources/template/freemarker", f), "utf-8");
                        const jsScripts = "<!-- Auto Inserted Bundles -->\n" + bundleList + "\n<!-- End Auto Inserted Bundles -->";
                        const fileOut = fileIn.replace(/<!-- Auto Inserted Bundles -->((.|\n)*)<!-- End Auto Inserted Bundles -->/, jsScripts);

                        fs.writeFileSync(path.join("./target/classes/template/freemarker", f), fileOut, "utf-8");
                    });

                    // Copy remaining JS files that do not get compiled.
                    fs.readdirSync("./src/main/resources/public/js/")
                        .forEach(f => fs.copyFileSync(path.join("./src/main/resources/public/js/", f),
                                                      path.join("./target/classes/public/js/", f)));
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
                    minChunks: 10, // 10 is all the pages to make this chunck items for all the pages
                },
            },
        },
    },
};
