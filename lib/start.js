const openBrowser = require('react-dev-utils/openBrowser')
const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const chalk = require('chalk')
const initializeMiddleware = require('./initialize-middleware')
const {
  retrieveClientConfig,
  retrieveServerConfig,
} = require('./webpack.config')
const path = require('path')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

module.exports = ({ args, getPackage }) => {
  const pkg = getPackage()
  const publicPath = args.publicPath || pkg['publicPath']

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
        chalk.yellow(
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

  WebpackDevServer.addDevServerEntrypoints(client, devServerConfiguration)

  const clientCompiler = webpack(client)

  const webpackDevServer = new WebpackDevServer(clientCompiler, {
    before: app => {
      if (args.middleware) {
        const server = retrieveServerConfig({
          ...configuration,
          main: args.middleware,
        })

        app.use(async (req, res, next) => {
          const fs = clientCompiler.outputFileSystem
          const jsonFile = path.join(
            process.cwd(),
            './target/webapp/react-loadable.json'
          )

          while (!fs.existsSync(jsonFile)) {
            await sleep(100)
          }

          try {
            const clientBundles = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'))
            req.clientBundles = clientBundles
          } catch (e) {
            console.error(e)
            req.clientBundles = []
          }

          next()
        })

        initializeMiddleware(app, server)
      }
    },
    ...devServerConfiguration,
  })

  webpackDevServer.listen(port, host, err => {
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
