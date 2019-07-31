const path = require('path')
const storybook = require('@storybook/react/standalone')

module.exports = ({ args }) => {
  const port = args.port || process.env.PORT || 8080
  const host = args.host || process.env.HOST || 'localhost'
  const static = args.static || false

  // The only way to pass this variable through to our webpack config is
  // via a global variable since the @storybook/react/standalone api
  // doesn't allow us to pass through such information.
  process.__STORYBOOK_ROOT__ = path.resolve(args.root || 'src/main/webapp')
  console.log(
    `Using ${
      process.__STORYBOOK_ROOT__
    } as root directory to search for stories.`
  )

  storybook({
    mode: static ? 'static' : 'dev',
    host,
    port,
    configDir: __dirname,
    outputDir: path.resolve('target/storybook'),
  })
}
