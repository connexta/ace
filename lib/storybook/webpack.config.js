const webpack = require('webpack')
const merge = require('webpack-merge')
const webpackConfig = require('../webpack.config')
const path = require('path')

module.exports = ({ config, mode }) => {
  return merge.smart(config, webpackConfig({ env: 'storybook' }))
}
