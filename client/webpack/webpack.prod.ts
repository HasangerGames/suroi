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
        filename: "assets/js/[name].[chunkhash:8].js",
        clean: true
    },

    plugins: [
        new DefinePlugin({
            API_URL: "\"/api\""
        }),
        new CopyPlugin({
            patterns: [{
                from: path.resolve(__dirname, "../public"),
                to: path.resolve(__dirname, "../dist"),
                globOptions: {
                    ignore: [
                        "**/index.html",
                        "**/leaderboard.html"
                    ]
                }
            }]
        }),
        new CleanWebpackPlugin({
            cleanAfterEveryBuildPatterns: ["**/*.LICENSE.txt"],
            protectWebpackAssets: false
        })
    ]
});

export default config;
