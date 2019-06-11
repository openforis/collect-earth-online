const path = require("path");

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
    optimization: {
        minimize: true,
        splitChunks: {
            chunks: "all",
            maxInitialRequests: Infinity,
            minSize: 10000,
        },
    },
};
