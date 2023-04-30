import { version } from '../package.json';

import * as Webpack from 'webpack';
import type WDS from 'webpack-dev-server';

import SveltePreprocess from 'svelte-preprocess';

import { WebpackManifestPlugin } from 'webpack-manifest-plugin';
import HTMLWebpackPlugin from 'html-webpack-plugin';
import MiniCSSExtractPlugin from 'mini-css-extract-plugin';
import CSSMinimizerPlugin from 'css-minimizer-webpack-plugin';

import * as path from 'path';

interface Configuration extends Webpack.Configuration {
    devServer?: WDS.Configuration
}

const mode = (process.env.NODE_ENV as `production` | `development`) ?? `development`;
const prod = mode === `production`;

const config: Configuration = {
    entry: {
        app: path.resolve(__dirname, `../src/index.ts`)
    },

    resolve: {
        alias: {
            svelte: path.dirname(require.resolve(`svelte/package.json`))
        },
        extensions: [`.js`, `.jsx`, `.mjs`, `.ts`, `.tsx`, `.svelte`],
        mainFields: [`svelte`, `browser`, `module`, `main`],
        conditionNames: [`svelte`],
    },  

    module: {
        rules: [
            {
                test: /\.svelte$/,
                use: {
                    loader: `svelte-loader`,
                    options: {
                        compilerOptions: {
                            dev: !prod
                        },
                        emitCss: true,
                        preprocess: SveltePreprocess({ postcss: true }),
                        hotReload: !prod
                    }
                }
            },
            {
                test: /node_modules\/svelte\/.*\.mjs$/,
                resolve: {
                    fullySpecified: false
                }
            },
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: `ts-loader`,
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
                    loader: `babel-loader`,
                    options: {
                        presets: [
                            [`@babel/preset-env`, { targets: `defaults` }]
                        ],
                        plugins: [`@babel/plugin-proposal-class-properties`]
                    }
                }
            },
            {
                test: require.resolve(`jquery`),
                loader: `expose-loader`,
                options: {
                    exposes: [`$`, `jQuery`]
                }
            },
            {
                test: /\.css$/,
                use: [
                    MiniCSSExtractPlugin.loader,
                    `css-loader`,
                    `postcss-loader`
                ]
            },
            {
                test: /\.s[ac]ss$/i,
                use: [MiniCSSExtractPlugin.loader, `css-loader`, `postcss-loader`, `sass-loader`]
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: `asset/resource`,
                generator: {
                    filename: `assets/img/static/[contenthash:8][ext]`
                }
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: `asset/resource`,
                generator: {
                    filename: `assets/fonts/static/[contenthash:8][ext]`
                }
            }
        ]
    },

    plugins: [
        new Webpack.ProgressPlugin(),
        new Webpack.DefinePlugin({
            APP_VERSION: `"${version}"`
        }),
        new WebpackManifestPlugin({}),
        new HTMLWebpackPlugin({
            inject: true,
            template: path.resolve(__dirname, `../public/index.html`),

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
        new MiniCSSExtractPlugin({ filename: `assets/css/[name].[contenthash:8].css` }),
        new Webpack.ProvidePlugin({
            $: `jquery`
        })
    ],

    optimization: {
        runtimeChunk: {
            name: `manifest`
        },
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: `vendor`,
                    chunks: `all`
                }
            }
        },
        minimizer: [
            `...`,
            new CSSMinimizerPlugin({
                minimizerOptions: {
                    preset: [`default`, { discardComments: { removeAll: true } }]
                }
            })
        ]
    },

    performance: {
        hints: false
    }
};

export default config;
