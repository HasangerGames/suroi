import CopyPlugin from "copy-webpack-plugin";
import MiniCSSExtractPlugin from "mini-css-extract-plugin";
import { resolve } from "path";
import { DefinePlugin } from "webpack";
import merge from "webpack-merge";
import common from "./webpack.common";

const config = merge(common, {
    mode: "production",

    output: {
        path: resolve(__dirname, "../dist"),
        filename: "js/[name].[chunkhash:8].js",
        clean: true
    },

    module: {
        rules: [
            {
                test: /\.(ogg|mp3|wav)$/i,
                type: "asset/resource",
                generator: { filename: "audio/[name].[contenthash:8][ext]" }
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: "asset/resource",
                generator: { filename: "img/[name].[contenthash:8][ext]" }
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: "asset/resource",
                generator: { filename: "fonts/[name].[contenthash:8][ext]" }
            }
        ]
    },

    plugins: [
        new DefinePlugin({ API_URL: "\"/api\"" }),
        new MiniCSSExtractPlugin({ filename: "css/[name].[contenthash:8].css" }),
        new CopyPlugin({
            patterns: [{
                from: resolve(__dirname, "../public"),
                to: resolve(__dirname, "../dist")
            }]
        })
    ]
});

export default config;
