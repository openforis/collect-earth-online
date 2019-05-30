const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const path = require("path");
const exec = require("child_process").exec;

module.exports = merge(common, {
    mode: "development",
    devtool: "inline-source-map",
    watch: true,
    output: {
        path: path.resolve(__dirname, "target/classes/public/js"),
        filename: "[name].bundle.js",
        library: "[name]",
        libraryTarget: "var",
    },
});
