import merge from "webpack-merge";
import common from "./webpack.common";

import { DefinePlugin } from "webpack";

import * as path from "path";

const config = merge(common, {
    mode: "development",

    output: {
        path: path.resolve(__dirname, "../dist"),
        filename: "js/[name].[chunkhash:8].js"
    },

    devServer: {
        devMiddleware: { publicPath: "http://127.0.0.1:3000" },
        static: { directory: path.resolve(__dirname, "../public") },
        historyApiFallback: true,
        port: 3000
    },

    plugins: [
        new DefinePlugin({ API_URL: "\"http://127.0.0.1:8000/api\"" })
    ]
});

export default config;
