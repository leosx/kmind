const { merge } = require("webpack-merge");
const base = require("./base.webpack.config");
module.exports = merge(base, {
    mode: "production"
});