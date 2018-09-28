const path = require('path');
module.exports = {
    entry: './src/main/resources/jsx/app.js',    // We wants our entry point to this path
    output: {
        path: path.join(__dirname, 'public'),
        filename: 'bundle.js'
    },
    module: {
        rules: [{
            loader: 'babel-loader',
            test: /\.jsx?$/,  // This will match either .js or .jsx
            exclude: /node_modules/
        }, {
            test: /\.s?css$/, // This will match either .scss or .css
            use: [
                'style-loader',
                'css-loader',
                'sass-loader'
            ]
        }]
    },
    devtool: 'cheap-module-eval-source-map',
    devServer: {
        contentBase: path.join(__dirname, 'public')
    },
    watch: true
};