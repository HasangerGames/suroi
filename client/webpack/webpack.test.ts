import CopyPlugin from "copy-webpack-plugin";
import { resolve } from "path";
import { DefinePlugin } from "webpack";
import merge from "webpack-merge";
import common from "./webpack.common";

const config = merge(common, {
    mode: "development",

    output: {
        path: resolve(__dirname, "../dist"),
        filename: "js/[name].[chunkhash:8].js",
        clean: true
    },

    plugins: [
        new DefinePlugin({ API_URL: "\"/api\"" }),
        new CopyPlugin({
            patterns: [{
                from: resolve(__dirname, "../public"),
                to: resolve(__dirname, "../dist")
            }]
        })
    ]
});

export default config;
