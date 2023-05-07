import merge from "webpack-merge";
import common from "./webpack.common";

import { DefinePlugin } from "webpack";
import CopyPlugin from "copy-webpack-plugin";

import * as path from "path";

const config = merge(common, {
    mode: "production",

    output: {
        path: path.resolve(__dirname, "../dist"),
        filename: "js/[name].[chunkhash:8].js",
        clean: true
    },

    plugins: [
        new DefinePlugin({ API_URL: "\"/api\"" }),
        new CopyPlugin({
            patterns: [{
                from: path.resolve(__dirname, "../public"),
                to: path.resolve(__dirname, "../dist")
            }]
        })
    ]
});

export default config;
