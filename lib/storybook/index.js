const path = require('path')
const storybook = require('@storybook/react/standalone')

module.exports = ({ args }) => {
  const port = args.port || process.env.PORT || 8080
  const host = args.host || process.env.HOST || 'localhost'
  const static = args.static || false

  storybook({
    mode: static ? 'static' : 'dev',
    host,
    port,
    configDir: __dirname,
    outputDir: path.resolve('target/storybook'),
  })
}
