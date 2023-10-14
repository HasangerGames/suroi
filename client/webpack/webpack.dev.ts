import * as path from "path";
import MiniCSSExtractPlugin from "mini-css-extract-plugin";
import { DefinePlugin } from "webpack";
import merge from "webpack-merge";
import common from "./webpack.common";

const config = merge(common, {
    mode: "development",
    devtool: "source-map",

    output: {
        path: path.resolve(__dirname, "../dist"),
        filename: "js/[name].js"
    },

    devServer: {
        compress: true,
        allowedHosts: "all",
        client: {
            logging: "warn",
            overlay: {
                errors: true,
                warnings: false
            },
            progress: true
        },
        devMiddleware: { publicPath: "http://127.0.0.1:3000" },
        static: { directory: path.resolve(__dirname, "../public") },
        historyApiFallback: true,
        port: 3000
    },

    module: {
        rules: [
            {
                test: /\.(ogg|mp3|wav)$/i,
                type: "asset/resource",
                generator: { filename: "audio/[name].[ext]" }
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: "asset/resource",
                generator: { filename: "img/[name].[ext]" }
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: "asset/resource",
                generator: { filename: "fonts/[name].[ext]" }
            }
        ]
    },

    plugins: [
        new DefinePlugin({ API_URL: "\"http://127.0.0.1:8000/api\"" }),
        new MiniCSSExtractPlugin({ filename: "css/[name].css" })
    ]
});

export default config;
