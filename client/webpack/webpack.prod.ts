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
            patterns: [
                { from: "audio", to: "../dist/audio" },
                { from: "css", to: "../dist/css" },
                { from: "font", to: "../dist/font" },
                { from: "img", to: "../dist/img" }
            ]
        }),
        new CleanWebpackPlugin({
            cleanAfterEveryBuildPatterns: ["**/manifest.json"],
            protectWebpackAssets: false
        })
    ]
});

export default config;
