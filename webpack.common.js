const path = require("path");

module.exports = {
    entry: {
        home:        path.resolve(__dirname, "src/main/resources/public/jsx/home.js"),
        institution: path.resolve(__dirname, "src/main/resources/public/jsx/institution.js"),
        collection:  path.resolve(__dirname, "src/main/resources/public/jsx/collection.js"),
        project:     path.resolve(__dirname, "src/main/resources/public/jsx/project.js"),
        account:     path.resolve(__dirname, "src/main/resources/public/jsx/account.js")
    },
    output: {
        path: path.resolve(__dirname, "src/main/resources/public/js"),
        filename: "[name].bundle.js"
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
