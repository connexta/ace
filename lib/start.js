import openBrowser from 'react-dev-utils/openBrowser.js'
import webpack from 'webpack'
import WebpackDevServer from 'webpack-dev-server'
import Chalk from 'chalk'
const yellow = Chalk.yellow

import { retrieveClientConfig } from './webpack.config.js'

export default ({ args, getPackage }) => {
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
  console.log(client)
  const devServerConfiguration = { host, port, ...client.devServer }

  const clientCompiler = webpack(client)

  const webpackDevServer = new WebpackDevServer({
    ...devServerConfiguration,
  }, clientCompiler)

  webpackDevServer.listen(port, host, (err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    } else if (args.open) {
      let site = `http://${host}:${port}${publicPath}`
      site = site.replace(/\/+$/, '') + '/'
      openBrowser(site)
    }
  })
}
