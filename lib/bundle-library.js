const webpack = require('webpack')
const merge = require('webpack-merge')
const nodeExternals = require('webpack-node-externals')
const path = require('path')
const { retrieveBaseConfig } = require('./webpack.config')
/*
 * The property libraryConfig must be set on the package.json for this command to work.
 * "webpackEntry" is directly passed to "entry" in the webpack config
 */
const libConfig = (base, { packageJson }) => {
  const { libraryConfig } = packageJson
  if (!libraryConfig || !libraryConfig.webpackEntry) {
    console.error('Must supply a library config in the package json.')
    return
  }

  let { webpackEntry } = libraryConfig

  webpackEntry = Object.keys(webpackEntry).reduce((acc, current) => {
    acc[current] = path.resolve(webpackEntry[current])
    return acc
  }, {})

  return merge.smart(base, {
    devtool: 'source-map',
    externals: [nodeExternals()],
    entry: {
      ...webpackEntry,
    },
    output: {
      path: path.resolve('./build/lib'),
      filename: '[name]/index.js',
      library: packageJson.name,
      libraryTarget: 'umd',
      globalObject: 'this',
    },
  })
}
module.exports = ({ args, getPackage }) => {
  const pkg = getPackage()

  const configuration = {
    env: args.env || process.env.NODE_ENV || 'development',
    main: pkg.main,
    alias: pkg.alias,
    tsTranspileOnly: args.tsTranspileOnly === 'true',
    packageJson: pkg,
    publicPath: pkg['publicPath'],
  }
  const baseConfig = retrieveBaseConfig(configuration)
  const client = libConfig(baseConfig, {
    packageJson: configuration.packageJson,
  })
  webpack(client, (err, stats) => {
    if (err || stats.hasErrors()) {
      console.log(err || stats.toString())
      process.exit(1)
    }
  })
}
