import { version } from "../package.json";

import * as Webpack from "webpack";
import type WDS from "webpack-dev-server";

import { WebpackManifestPlugin } from "webpack-manifest-plugin";
import HTMLWebpackPlugin from "html-webpack-plugin";
import MiniCSSExtractPlugin from "mini-css-extract-plugin";
import CSSMinimizerPlugin from "css-minimizer-webpack-plugin";

import * as path from "path";

interface Configuration extends Webpack.Configuration {
    devServer?: WDS.Configuration
}

const config: Configuration = {
    entry: {
        app: path.resolve(__dirname, "../src/main.ts"),
    },

    resolve: { extensions: [".js", ".jsx", ".mjs", ".ts", ".tsx"] },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "ts-loader",
                        options: {
                            transpileOnly: true,
                            experimentalWatchApi: true
                        }
                    }
                ]
            },
            {
                test: /\.m?js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            ["@babel/preset-env", { targets: "defaults" }]
                        ],
                        plugins: ["@babel/plugin-proposal-class-properties"]
                    }
                }
            },
            {
                test: require.resolve("jquery"),
                loader: "expose-loader",
                options: { exposes: ["$", "jQuery"] }
            },
            {
                test: /\.css$/,
                use: [
                    MiniCSSExtractPlugin.loader,
                    "css-loader",
                    "postcss-loader"
                ]
            },
            {
                test: /\.s[ac]ss$/i,
                use: [MiniCSSExtractPlugin.loader, "css-loader", "postcss-loader", "sass-loader"]
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif|mp3|ttf|woff|woff2|eot|ttf|otf)$/i,
                type: "asset/resource",
                generator: { filename: "[path][name][ext]" }
            },
        ]
    },

    plugins: [
        new Webpack.ProgressPlugin(),
        new Webpack.DefinePlugin({ APP_VERSION: `"${version}"` }),
        new WebpackManifestPlugin({}),
        new HTMLWebpackPlugin({
            inject: true,
            template: path.resolve(__dirname, "../index.html"),
            chunks: ["app"],

            minify: {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true
            }
        }),
        new MiniCSSExtractPlugin({ filename: "css/[name].[contenthash:8].css" }),
        new Webpack.ProvidePlugin({ $: "jquery" })
    ],

    optimization: {
        runtimeChunk: { name: "manifest" },
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: "vendor",
                    chunks: "all"
                }
            }
        },
        minimizer: [
            "...",
            new CSSMinimizerPlugin({ minimizerOptions: { preset: ["default", { discardComments: { removeAll: true } }] } })
        ]
    },

    performance: { hints: false }
};

export default config;
