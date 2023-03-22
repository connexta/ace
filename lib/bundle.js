import webpack from 'webpack'

import { retrieveClientConfig } from './webpack.config.js'

const logWithWorkaround = (message) => {
  // long console.log messages are cut off when running with lerna
  // work around this by printing one line at time:
  let lines = message.split('\n')
  for (let i = 0; i < lines.length; i++) {
    console.error(lines[i])
  }
}

export default ({ args, getPackage }) => {
  const pkg = getPackage()
  const env = args.env || process.env.NODE_ENV || 'development'
  /**
   * Webpack does not set this, but the processes it calls (like tailwind) need it to be set.
   * See https://github.com/webpack/webpack/issues/7074 for a long thread on this
   */
  process.env.NODE_ENV = env

  const configuration = {
    env,
    main: pkg.main,
    alias: pkg.alias,
    tsTranspileOnly: args.tsTranspileOnly === 'true',
    packageJson: pkg,
    publicPath: pkg['context-path'],
  }

  const client = retrieveClientConfig(configuration)
  const builds = [client]
  console.log(client.module.rules[9])
  webpack(builds, (err, stats) => {
    if (err) {
      logWithWorkaround(err.stack || err)
      if (err.details) {
        logWithWorkaround(err.details)
      }
      process.exit(1)
    }

    stats.stats.forEach(stat => {
      logWithWorkaround(stat.toString())
    })
    if (stats.hasErrors()) {
      logWithWorkaround(stats.toString())
      process.exit(1)
    }

    if (stats.hasWarnings()) {
      logWithWorkaround(stats.toString())
    }
  })
}
