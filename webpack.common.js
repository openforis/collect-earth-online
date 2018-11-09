const path = require("path");

module.exports = {
    entry: {
        home:               path.resolve(__dirname, "src/main/resources/public/jsx/home.js"),
        create_institution: path.resolve(__dirname, "src/main/resources/public/jsx/create-institution.js"),
        review_institution: path.resolve(__dirname, "src/main/resources/public/jsx/review-institution.js"),
        collection:         path.resolve(__dirname, "src/main/resources/public/jsx/collection.js"),
        create_project:     path.resolve(__dirname, "src/main/resources/public/jsx/create-project.js"),
        review_project:     path.resolve(__dirname, "src/main/resources/public/jsx/review-project.js"),
        account:            path.resolve(__dirname, "src/main/resources/public/jsx/account.js"),
        geodashreact:       path.resolve(__dirname, "src/main/resources/public/jsx/geodashreact.js"),
        widgetlayouteditor: path.resolve(__dirname, "src/main/resources/public/jsx/geo-dash-widget-editor.js")
    },
    output: {
        path: path.resolve(__dirname, "src/main/resources/public/js"),
        filename: "[name].bundle.js",
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
                            "lodash"
                        ]
                    }
                },
            },
            {
                test: /\.css$/,
                use: [
                    "style-loader",
                    "css-loader"
                ]
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: [
                    "file-loader"
                ]
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/,
                use: [
                    "file-loader"
                ]
            }
        ]
    },
    optimization: {
        splitChunks: {
            chunks: "all"
        }
    }
};
