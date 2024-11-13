const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const { retrieveClientConfig } = require('./webpack.config')
const chalk = (await import('chalk')).default
const yellow = chalk.yellow
module.exports = async ({ args, getPackage }) => {
  const pkg = getPackage()
  const publicPath = args.contextPath || pkg['context-path']

  const main = args.main || pkg.main
  const env = process.env.NODE_ENV || args.env || 'development'
  const port = process.env.PORT || args.port || 8080
  const host = process.env.HOST || args.host || 'localhost'
  const proxy = process.env.PROXY || args.proxy || 'https://localhost:8993'

  const configuration = {
    env,
    proxy,
    publicPath,
    auth:
      args.auth ||
      console.log(
        yellow(
          'WARNING: using default basic auth (admin:admin)! See options for how to override this.'
        )
      ) ||
      'admin:admin',

    tsTranspileOnly: args.tsTranspileOnly === 'true',
    main,
    alias: pkg.alias,
    packageJson: pkg,
  }

  const client = retrieveClientConfig(configuration)
  const devServerConfiguration = { host, port, ...client.devServer }

  const clientCompiler = webpack(client)
  const server = new WebpackDevServer(devServerConfiguration, clientCompiler)

  await server.start()

  if (args.open) {
    let site = `https://${host}:${port}${publicPath}`
    site = site.replace(/\/+$/, '') + '/'
    const open = (await import('open')).default
    try {
      await open(site, { app: { name: 'google chrome' } })
    } catch (e) {
      // Fall back to default browser if Chrome isn't available
      await open(site)
    }
  }
}
