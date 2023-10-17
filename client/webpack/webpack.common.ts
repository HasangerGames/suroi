import { createHash, randomBytes } from "crypto";
import CSSMinimizerPlugin from "css-minimizer-webpack-plugin";
import HTMLWebpackPlugin from "html-webpack-plugin";
import MiniCSSExtractPlugin from "mini-css-extract-plugin";
import * as path from "path";
import { SpritesheetWebpackPlugin } from "spritesheet-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";
import * as Webpack from "webpack";
import type WDS from "webpack-dev-server";
import { version } from "../../package.json";

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
        usedExports: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    output: { comments: false },
                    compress: {
                        passes: 3,
                        pure_getters: true,
                        unsafe: true
                    },
                    ecma: undefined,
                    parse: { html5_comments: false },
                    mangle: true,
                    module: false,
                    toplevel: false,
                    nameCache: undefined,
                    ie8: false,
                    keep_classnames: false,
                    keep_fnames: false,
                    safari10: false
                }
            }),
            new CSSMinimizerPlugin({ minimizerOptions: { preset: ["default", { discardComments: { removeAll: true } }] } })
        ]
    },

    performance: { hints: false },
    stats: "minimal"
};

export default config;
