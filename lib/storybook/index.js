const path = require('path')
const storybook = require('@storybook/react/standalone')

module.exports = ({ args, getPackage }) => {
  const port = args.port || process.env.PORT || 8081
  const host = args.host || process.env.HOST || 'localhost'
  const static = args.static || false

  // The only way to pass this variable through to our webpack config is
  // via a global variable since the @storybook/react/standalone api
  // doesn't allow us to pass through such information.
  process.__STORYBOOK_OPTIONS__ = {
    root: path.resolve(args.root || 'src/main/webapp'),
    packageJson: getPackage(),
  }
  console.log(
    `Using ${
      process.__STORYBOOK_OPTIONS__.root
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
