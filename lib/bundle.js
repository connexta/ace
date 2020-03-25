const webpack = require('webpack')

const {
  retrieveServerConfig,
  retrieveClientConfig,
} = require('./webpack.config')

const logWithWorkaround = message => {
  // long console.log messages are cut off when running with lerna
  // work around this by printing one line at time:
  let lines = message.split('\n')
  for (let i = 0; i < lines.length; i++) {
    console.error(lines[i])
  }
}

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
    if (err) {
      logWithWorkaround(err.stack || err)
      if (err.details) {
        logWithWorkaround(err.details)
      }
      process.exit(1)
    }

    if (stats.hasErrors()) {
      logWithWorkaround(stats.toString())
      process.exit(1)
    }

    if (stats.hasWarnings()) {
      logWithWorkaround(stats.toString())
    }
  })
}
