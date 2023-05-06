import { version } from "../package.json";

import * as Webpack from "webpack";
import type WDS from "webpack-dev-server";

import HTMLWebpackPlugin from "html-webpack-plugin";
import MiniCSSExtractPlugin from "mini-css-extract-plugin";
import CSSMinimizerPlugin from "css-minimizer-webpack-plugin";

import * as path from "path";

interface Configuration extends Webpack.Configuration {
    devServer?: WDS.Configuration
}

const config: Configuration = {
    entry: { app: path.resolve(__dirname, "../src/index.ts") },

    resolve: { extensions: [".js", ".ts"] },

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
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: "asset/resource",
                generator: { filename: "assets/img/static/[contenthash:8][ext]" }
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: "asset/resource",
                generator: { filename: "assets/fonts/static/[contenthash:8][ext]" }
            }
        ]
    },

    plugins: [
        new Webpack.ProgressPlugin(),
        new Webpack.DefinePlugin({ APP_VERSION: `"${version}"` }),
        new HTMLWebpackPlugin({
            inject: true,
            template: path.resolve(__dirname, "../src/pages/index.html"),
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
        new HTMLWebpackPlugin({
            inject: true,
            template: path.resolve(__dirname, "../src/pages/leaderboard.html"),
            chunks: ["leaderboard"],
            filename: "leaderboard.html",

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
        new MiniCSSExtractPlugin({ filename: "assets/css/[name].[contenthash:8].css" }),
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
