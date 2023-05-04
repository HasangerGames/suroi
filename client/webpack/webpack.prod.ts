import merge from "webpack-merge";
import common from "./webpack.common";

import { DefinePlugin } from "webpack";
import CopyPlugin from "copy-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";

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
                from: path.resolve(__dirname),
                to: path.resolve(__dirname, "../dist"),
                globOptions: {
                    ignore: [
                        "**/webpack/*.ts"
                    ]
                },
                noErrorOnMissing: true
            }]
        }),
        new CleanWebpackPlugin({
            cleanAfterEveryBuildPatterns: ["**/manifest.json"],
            protectWebpackAssets: false
        })
    ]
});

export default config;
