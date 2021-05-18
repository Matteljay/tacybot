const path = require('path')
process.env.VUE_APP_VERSION = require('./package.json').version
module.exports = {
  productionSourceMap: process.env.NODE_ENV !== 'production',
  chainWebpack: config => {
    config.optimization.delete('splitChunks')
  },
  "transpileDependencies": [
    "vuetify"
  ],
  devServer: {
    proxy: {
      '/api|/content': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  outputDir: path.resolve(__dirname, '../server/public'),
}
