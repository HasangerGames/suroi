import { version } from "../../package.json";

import * as Webpack from "webpack";
import type WDS from "webpack-dev-server";

import HTMLWebpackPlugin from "html-webpack-plugin";
import MiniCSSExtractPlugin from "mini-css-extract-plugin";
import CSSMinimizerPlugin from "css-minimizer-webpack-plugin";
import { SpritesheetWebpackPlugin } from "spritesheet-webpack-plugin";

import * as path from "path";
import { createHash, randomBytes } from "crypto";

interface Configuration extends Webpack.Configuration {
    devServer?: WDS.Configuration
}

const ATLAS_HASH = createHash("sha256").update(randomBytes(512)).digest("hex").slice(0, 8);

const config: Configuration = {
    entry: {
        app: path.resolve(__dirname, "../src/index.ts"),
        changelog: path.resolve(__dirname, "../src/changelog.ts"),
        leaderboard: path.resolve(__dirname, "../src/leaderboard.ts"),
        news: path.resolve(__dirname, "../src/news.ts"),
        rules: path.resolve(__dirname, "../src/rules.ts")
    },

    devtool: "source-map",

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
                        ]
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
        new Webpack.ProgressPlugin(),
        new Webpack.DefinePlugin({
            APP_VERSION: `"${version}"`,
            ATLAS_HASH: `"${ATLAS_HASH}"`
        }),
        new HTMLWebpackPlugin({
            inject: true,
            template: path.resolve(__dirname, "../src/pages/index.html"),
            chunks: ["app"],

            templateParameters: { APP_VERSION: version },

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
        new HTMLWebpackPlugin({
            inject: true,
            template: path.resolve(__dirname, "../src/pages/rules.html"),
            chunks: ["rules"],
            filename: "./rules/index.html",

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
        new SpritesheetWebpackPlugin({
            patterns: [{
                rootDir: path.resolve(__dirname, "../public/img/game"),
                outDir: "img/atlases",
                filename: `main.${ATLAS_HASH}.png`
            }],
            compilerOptions: { margin: 4 }
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
