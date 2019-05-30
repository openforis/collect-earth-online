const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const path = require("path");
const exec = require("child_process").exec;

module.exports = merge(common, {
    mode: "production",
    devtool: "source-map",
    output: {
        path: path.resolve(__dirname, "src/main/resources/public/js"),
        filename: "[name].bundle.js",
        library: "[name]",
        libraryTarget: "var",
    },
});
