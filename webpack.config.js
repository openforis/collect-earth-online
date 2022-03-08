const path = require("path");
const fs = require("fs");

const outdir = "target/public/js";

module.exports = env => {
    console.log(env);
    return {
        mode: env.dev ? "development" : "production",
        devtool: env.dev ? "eval-cheap-module-source-map" : "eval",
        watch: env.dev,
        entry: {
            about                : path.resolve(__dirname, "src/js/about.js"),
            account              : path.resolve(__dirname, "src/js/account.js"),
            collection           : path.resolve(__dirname, "src/js/collection.js"),
            createInstitution    : path.resolve(__dirname, "src/js/createInstitution.js"),
            geoDash              : path.resolve(__dirname, "src/js/geoDash.js"),
            geoDashHelp          : path.resolve(__dirname, "src/js/geoDashHelp.js"),
            home                 : path.resolve(__dirname, "src/js/home.js"),
            institutionDashboard : path.resolve(__dirname, "src/js/institutionDashboard.js"),
            login                : path.resolve(__dirname, "src/js/login.js"),
            pageNotFound         : path.resolve(__dirname, "src/js/pageNotFound.js"),
            passwordReset        : path.resolve(__dirname, "src/js/passwordReset.js"),
            passwordRequest      : path.resolve(__dirname, "src/js/passwordRequest.js"),
            projectAdmin         : path.resolve(__dirname, "src/js/projectAdmin.js"),
            projectDashboard     : path.resolve(__dirname, "src/js/projectDashboard.js"),
            register             : path.resolve(__dirname, "src/js/register.js"),
            reviewInstitution    : path.resolve(__dirname, "src/js/reviewInstitution.js"),
            simpleCollection     : path.resolve(__dirname, "src/js/simpleCollection.js"),
            support              : path.resolve(__dirname, "src/js/support.js"),
            termsOfService       : path.resolve(__dirname, "src/js/termsOfService.js"),
            userDisagreement     : path.resolve(__dirname, "src/js/userDisagreement.js"),
            verifyEmail          : path.resolve(__dirname, "src/js/verifyEmail.js"),
            widgetLayoutEditor   : path.resolve(__dirname, "src/js/widgetLayoutEditor.js")
        },
        output: {
            path: path.resolve(__dirname, outdir),
            filename: pathData => (pathData.chunk.name ? "[name].[chunkhash].bundle.js" : "[chunkhash].bundle.js"),
            clean: true,
            chunkFilename: "[chunkhash].chunk.js",
            library: "[name]",
            libraryTarget: "var"
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
                                "@babel/preset-react"
                            ],
                            plugins: [
                                "@babel/plugin-proposal-class-properties",
                                "@babel/plugin-transform-runtime",
                                "lodash"
                            ]
                        }
                    }
                },
                {
                    test: /\.css$/, // TODO Find a css optimizer
                    use: [
                        "style-loader",
                        {loader: "css-loader", options: {url: false}}
                    ]
                },
                {
                    test: /\.svg$/,
                    use: [{
                        loader: "react-svg-loader",
                        options: {
                            jsx: false // We need false because we are still compiling to es6
                        }
                    }]
                }
            ]
        },
        plugins: [
            {
                apply: compiler => {
                    compiler.hooks.initialize.tap("InitializePlugin", () => {
                    // Ensure that outdir exists.
                        if (!fs.existsSync("./" + outdir)) {
                            fs.mkdirSync("./" + outdir, {recursive: true});
                        }
                    });
                    compiler.hooks.beforeCompile.tap("BeforeCompilePlugin", () => {
                    // Remove old entry-points at the beginning
                    // so a browser refresh does not show stale data.
                        if (env.dev) {
                            fs.unlink("./target/entry-points.json", () => null);
                        }
                    });
                    compiler.hooks.done.tap("DonePlugin", stats => {
                    // Map entrypoint name -> chunk files
                        const entryPoints = Array.from(stats.compilation.entrypoints.entries());
                        const newMap = entryPoints.reduce((acc, [name, ep]) =>
                            ({...acc, [name]: ep.chunks.map(c => "/js/" + c.files[0])}),
                                                          {});
                        fs.writeFile("./target/entry-points.json", JSON.stringify(newMap), "utf8", e => {
                            if (e) console.log(e);
                        });
                    });
                }
            }
        ],
        optimization: {
            minimize: true,
            splitChunks: {
                chunks: "all"
            }
        }
    };
};
