const webpack = require("webpack");
const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");


const tsfolder = path.join(path.dirname(__dirname), "src", "ts");
const ignoreTsFolder = ["interfaces"]

// 获取所有TS文件为一个列表
function getFilesArrary(basefolder, obj) {
    let files = fs.readdirSync(basefolder);
    files.forEach(function(item, index) {
        let subpath = path.join(basefolder, item);
        let fstat = fs.statSync(subpath);
        if (fstat.isDirectory()) {
            if (ignoreTsFolder.includes(item)) {
                return
            }
            getFilesArrary(subpath, obj)
        } else if (fstat.isFile()) {
            obj[path.basename(subpath, ".ts")] = subpath
        }
    });
}

let tsentryobj = {};
getFilesArrary(tsfolder, tsentryobj);

module.exports = {
    entry: {
        index: "./src/ts/index.ts"
    }, //tsentryobj,
    target: "web",
    output: {
        path: path.join(path.dirname(__dirname), "dist"),
        filename: "js/[name].js"
            // filename: "js/[name].[hash:8].js"
    },
    resolve: {
        extensions: ['.ts', '.js', ".css"],
    },
    module: {
        rules: [{
            test: /\.css$/,
            use: 'css-loader'
        }, {
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/
        }]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./src/index.html"
        })
    ]
};