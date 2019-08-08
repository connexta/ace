const webpack = require('webpack')

const config = require('./webpack.config')

module.exports = ({ args, getPackage }) => {
  const pkg = getPackage()

  const c = config({
    env: args.env || process.env.NODE_ENV || 'development',
    main: pkg.main,
    alias: pkg.alias,
    tsTranspileOnly: args.tsTranspileOnly === 'true',
    packageJson: pkg,
  })

  webpack(c, (err, stats) => {
    if (err || stats.hasErrors()) {
      console.log(err || stats.toString())
      process.exit(1)
    }
  })
}
