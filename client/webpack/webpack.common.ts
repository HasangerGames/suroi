/*
Copyright (C) 2023 Henry Sanger (https://suroi.io)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// noinspection SpellCheckingInspection

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
    entry: {
        app: path.resolve(__dirname, "../src/index.ts"),
        changelog: path.resolve(__dirname, "../src/changelog.ts"),
        leaderboard: path.resolve(__dirname, "../src/leaderboard.ts"),
        news: path.resolve(__dirname, "../src/news.ts")
    },

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
                test: /\.(ogg|mp3|wav)$/i,
                type: "asset/resource",
                generator: { filename: "assets/audio/static/[contenthash:8][ext]" }
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
            template: path.resolve(__dirname, "../src/pages/changelog.html"),
            chunks: ["changelog"],
            filename: "./changelog/index.html",

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
            filename: "./leaderboard/index.html",

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
            template: path.resolve(__dirname, "../src/pages/news.html"),
            chunks: ["news"],
            filename: "./news/index.html",

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
