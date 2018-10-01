const path = require("path");

module.exports = {
    entry: {
        home:        path.resolve(__dirname, "src/main/resources/public/js/home.js"),
        institution: path.resolve(__dirname, "src/main/resources/public/js/institution.js"),
        collection:  path.resolve(__dirname, "src/main/resources/public/js/collection.js"),
        project:     path.resolve(__dirname, "src/main/resources/public/js/project.js"),
        account:     path.resolve(__dirname, "src/main/resources/public/js/account.js")
    },
    output: {
        path: path.resolve(__dirname, "src/main/resources/public/js"),
        filename: "[name].bundle.js"
    },
    module: {
        rules: [
            // {
            //     test: /\.jsx?$/,
            //     loader: "babel-loader",
            //     exclude: /node_modules/
            // },
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
