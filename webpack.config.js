const path = require('path');
const webpack = require('webpack');


module.exports = {
    context: __dirname,
    entry: ["@babel/polyfill", "./src/Demo.tsx", "./src/index.html"],
    output: {
        filename: "app.js",
        path: path.join(__dirname, "/demoDist"),
        publicPath: '/'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    module: {
        rules: [
            {
                test: /\.[tj]sx?$/,
                exclude: /node_modules/,
                loaders: ["babel-loader"],
            },
            {
                test: /\.html$/,
                loader: "file-loader?name=[name].[ext]",
            },
            {
                test: /\.(png|jpe?g|gif)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {},
                    },
                ],
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    plugins: [
        function () {
            this.plugin("done", function (stats) {
                if (stats.compilation.errors && stats.compilation.errors.length) {
                    console.log(stats.compilation.errors);
                    process.exit(1);
                }
            });
        },
        new webpack.HotModuleReplacementPlugin()
    ],
    devServer: {
        hot: true,
        contentBase: './demoDist',
        historyApiFallback: true
    }
}