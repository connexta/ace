const requireFromString = require('require-from-string')
const MemoryFS = require('memory-fs')
const webpack = require('webpack')
const path = require('path')

require('source-map-support').install({
  environment: 'node',
  hookRequire: true,
})

module.exports = (app, serverWebpackConfig) => {
  let middleware = null
  const initializeMiddleware = new Promise((resolve, reject) => {
    const fs = new MemoryFS()
    const serverCompiler = webpack(serverWebpackConfig)
    serverCompiler.outputFileSystem = fs

    serverCompiler.watch({}, (err, stats) => {
      if (err) {
        return reject(err)
      }

      const contents = fs.readFileSync(
        path.resolve(
          serverWebpackConfig.output.path,
          serverWebpackConfig.output.filename
        ),
        'utf8'
      )

      middleware = requireFromString(
        contents,
        serverWebpackConfig.output.filename
      ).default
      resolve()
    })
  })

  app.use(async (req, res, next) => {
    await initializeMiddleware
    await middleware(req, res, next)
  })
}
