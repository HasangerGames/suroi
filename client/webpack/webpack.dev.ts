import * as path from "path";
import { DefinePlugin } from "webpack";
import merge from "webpack-merge";
import common from "./webpack.common";

const config = merge(common, {
    mode: "development",
    devtool: "source-map",

    output: {
        path: path.resolve(__dirname, "../dist"),
        filename: "js/[name].[chunkhash:8].js"
    },

    devServer: {
        compress: true,
        allowedHosts: "all",
        client: {
            logging: "warn",
            overlay: {
                errors: true,
                warnings: false
            },
            progress: true
        },
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
