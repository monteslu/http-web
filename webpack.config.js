const path = require('path');

const mode = process.env.BUILD_MODE || 'development';

module.exports = {
  entry: "./http-web.js",
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: mode === 'development' ? 'http-web.js' : 'http-web.min.js'
  },
  mode,
  resolve: {
    alias: {
    }
  },
};