require('babel-polyfill')
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
        console.error(err)
        return reject(err)
      }

      console.log('Reloading middlware')

      const contents = fs.readFileSync(
        path.resolve(
          serverWebpackConfig.output.path,
          serverWebpackConfig.output.filename
        ),
        'utf8'
      )

      try {
        middleware = requireFromString(
          contents,
          serverWebpackConfig.output.filename
        )
        resolve()
      } catch (e) {
        reject(e)
        console.error(e)
      }
    })
  })

  app.use(async (req, res, next) => {
    try {
      await initializeMiddleware
      await middleware(req, res, next)
    } catch (e) {
      console.error(e)
      res.status(500)
      res.end(e.message)
    }
  })
}
