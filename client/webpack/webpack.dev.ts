import merge from "webpack-merge";
import common from "./webpack.common";

import { DefinePlugin } from "webpack";

import * as path from "path";

const config = merge(common, {
    mode: "development",
    devtool: "source-map",

    output: {
        path: path.resolve(__dirname, "../dist"),
        filename: "assets/js/[name].[chunkhash:8].js"
    },

    devServer: {
        devMiddleware: { publicPath: "http://localhost:3000" },
        static: { directory: path.resolve(__dirname, "../public") },
        historyApiFallback: true,
        port: 3000
    },

    plugins: [
        new DefinePlugin({ API_URL: "\"http://localhost:8000/api\"" })
    ]
});

export default config;
