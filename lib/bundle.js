const webpack = require('webpack')

const {
  retrieveServerConfig,
  retrieveClientConfig,
} = require('./webpack.config')

module.exports = ({ args, getPackage }) => {
  const pkg = getPackage()

  const configuration = {
    env: args.env || process.env.NODE_ENV || 'development',
    main: pkg.main,
    alias: pkg.alias,
    tsTranspileOnly: args.tsTranspileOnly === 'true',
    packageJson: pkg,
    publicPath: pkg['context-path'],
  }

  const client = retrieveClientConfig(configuration)
  const builds = [client]

  if (args.middleware) {
    const server = retrieveServerConfig({
      ...configuration,
      main: args.middleware,
    })
    builds.push(server)
  }

  webpack(builds, (err, stats) => {
    if (err || stats.hasErrors()) {
      console.log(err || stats.toString())
      process.exit(1)
    }
  })
}
