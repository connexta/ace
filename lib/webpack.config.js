const path = require('path')
const exec = require('child_process').execSync
const fs = require('fs')
const { existsSync } = fs
const { sync } = require('glob')
const webpack = require('webpack')
const { ContextReplacementPlugin, DefinePlugin } = webpack
const merge = require('webpack-merge')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const SimpleProgressWebpackPlugin = require('simple-progress-webpack-plugin')
const WebpackBundleAnalyzerPlugin =
  require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const getPackageWhitelist = require('./package-utils').getPackageWhitelist
const getResolves = require('./package-utils').getResolves
const getTemplatePath = require('./package-utils').getTemplatePath
const getTestPath = require('./package-utils').getTestPath
const getTestSetupPath = require('./package-utils').getTestSetupPath
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')
const resolve = (place) => path.resolve(place)
const nodeResolve = (place) => require.resolve(place)
const MochaLoader = nodeResolve('mocha-loader')

const gitEnv = () => {
  const commitHash = exec('git rev-parse --short HEAD').toString()

  const isDirty =
    exec('git status').toString().indexOf('working directory clean') === -1

  const commitDate = exec('git log -1 --pretty=format:%cI').toString()

  return {
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __IS_DIRTY__: JSON.stringify(isDirty),
    __COMMIT_DATE__: JSON.stringify(commitDate),
  }
}

const babelLoader = (plugins = []) => ({
  loader: nodeResolve('babel-loader'),
  options: {
    presets: ['@babel/preset-env'],
    cacheDirectory: true,
    // plugins: [nodeResolve('react-hot-loader/babel'), ...plugins],
  },
})

const generateIncludeInWebpackBuild = (packageJson) => {
  const packageWhitelist = getPackageWhitelist(packageJson)
  return (modulePath) => {
    // Include files not in node_modules
    if (!modulePath.includes('node_modules')) {
      return true
    }

    // Include files in whitelisted packages
    return packageWhitelist.some((pkg) => {
      return (
        modulePath.includes(pkg) &&
        // Don't include items in nested node_modules
        modulePath.lastIndexOf(pkg) > modulePath.lastIndexOf('node_modules')
      )
    })
  }
}

const generateExcludeFromWebpackBuild = (packageJson) => {
  const generatedIncludeInWebpackBuild =
    generateIncludeInWebpackBuild(packageJson)
  return (modulePath) => !generatedIncludeInWebpackBuild(modulePath)
}

const ensureTrailingSlash = (url) =>
  url ? url.replace(/\/+$/, '') + '/' : null

const base = ({
  alias = {},
  env,
  tsTranspileOnly,
  packageJson,
  publicPath,
}) => ({
  entry: [nodeResolve('babel-polyfill'), nodeResolve('whatwg-fetch')],
  output: {
    path: resolve('./target/webapp'),
    publicPath: ensureTrailingSlash(publicPath),
    filename: '[name].[hash].js',
    chunkFilename: '[name].[hash].chunk.js',
    globalObject: 'this',
  },
  plugins: [
    // Keeps causing out of memory errors, disabling for now
    new WebpackBundleAnalyzerPlugin({
      openAnalyzer: false,
      analyzerMode: 'static',
      reportFilename: resolve('target/report.html'),
    }),
    new NodePolyfillPlugin(),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new ContextReplacementPlugin(
      /graphql-language-service-interface[\\/]dist$/,
      new RegExp(`^\\./.*\\.js$`)
    ),
    new DefinePlugin({
      ...gitEnv(),
      __ENV__: JSON.stringify(env),
      __package__json__: JSON.stringify(packageJson), // allow access to package json information, such as context path
    }),
  ],
  externals: {
    'react/addons': true,
    'react/lib/ExecutionEnvironment': true,
    'react/lib/ReactContext': true,
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(png|gif|jpg|jpeg)$/,
        use: nodeResolve('file-loader'),
      },
      {
        test: /Cesium\.js$/,
        use: [
          {
            loader: nodeResolve('exports-loader'),
            options: { exports: 'default Cesium' },
          },
          nodeResolve('script-loader'),
        ],
      },
      {
        test: /jquery-ui/,
        use: {
          loader: nodeResolve('imports-loader'),
          options: {
            jQuery: 'jquery',
            $: 'jquery',
            jqueryui: 'jquery-ui',
          },
        },
      },
      {
        test: /bootstrap/,
        use: {
          loader: nodeResolve('imports-loader'),
          options: { jQuery: 'jquery' },
        },
      },
      {
        test: /((?<!\.spec)\.jsx?)$/,
        exclude: /node_modules/,
        // exclude: generateExcludeFromWebpackBuild(packageJson),
        use: babelLoader(),
      },
      {
        test: /((?<!\.spec)\.tsx?)$/,
        use: [
          {
            loader: nodeResolve('ts-loader'),
            options: {
              allowTsInNodeModules: true,
              transpileOnly: env === 'production' || tsTranspileOnly,
            },
          },
        ],
      },
      {
        test: /\.(html)$/,
        use: {
          loader: 'html-loader',
        },
      },
    ].concat(
      env !== 'production'
        ? [
            {
              test: /\.css$/,
              use: [
                nodeResolve('style-loader'),
                nodeResolve('css-loader'),
                nodeResolve('postcss-loader'),
              ],
            },
          ]
        : []
    ),
  },
  resolve: {
    alias: {
      ...alias,
      ...getResolves(packageJson).reduce((blob, { key, value }) => {
        blob[key] = require.resolve(value)
        return blob
      }, {}),
    },
    extensions: ['.mjs', '.js', '.json', '.jsx', '.ts', '.tsx'],
    modules: [
      'src/main/webapp/',
      'src/main/webapp/js',
      'src/main/webapp/css',
      'src/main/webapp/lib/',
      'node_modules',
    ],
  },
})

const getTemplateFile = (packageJson) => {
  const templatePath = getTemplatePath(packageJson)
  if (templatePath !== undefined) {
    return resolve(templatePath)
  }

  const html = resolve('src/main/webapp/index.html')
  if (existsSync(html)) {
    return html
  }

  const js = resolve('src/main/webapp/index.js')
  if (existsSync(js)) {
    return js
  }

  return join(__dirname, 'index.html')
}

const dev = (base, { main, packageJson }) => {
  return merge.smart(base, {
    mode: 'development',
    devtool: 'eval-cheap-module-source-map',
    entry: [nodeResolve('console-polyfill'), resolve(main)],
    plugins: [
      new HtmlWebpackPlugin({
        title: 'My App',
        filename: 'index.html',
        template: getTemplateFile(packageJson),
      }),
      new MiniCssExtractPlugin(),
      new SimpleProgressWebpackPlugin({
        format: 'compact',
      }),
    ],
  })
}

const test = (base, { main, tsTranspileOnly, packageJson }) =>
  merge.smart(base, {
    stats: 'verbose',
    mode: 'development',
    devtool: 'eval-cheap-module-source-map',
    node: {
      __filename: true,
    },
    entry: [
      nodeResolve('console-polyfill'),
      path.resolve(__dirname, 'uncaught-exception.js'),
    ]
      .concat(
        getTestSetupPath(packageJson)
          ? [resolve(`${getTestSetupPath(packageJson)}`)]
          : []
      )
      .concat(sync(`${getTestPath(packageJson)}**/*spec.ts`).map(resolve))
      .concat(sync(`${getTestPath(packageJson)}**/*spec.tsx`).map(resolve)),
    output: {
      path: resolve('target/test/'),
      filename: 'test.js',
      publicPath: './',
    },
    plugins: [
      new MiniCssExtractPlugin({ filename: 'styles.[hash].css' }),
      new HtmlWebpackPlugin(),
    ],
    module: {
      rules: [
        {
          test: /\.spec\.tsx?$/,
          use: [
            MochaLoader,
            // specLoader,
            {
              loader: nodeResolve('ts-loader'),
              options: {
                allowTsInNodeModules: true,
                transpileOnly: true,
              },
            },
          ],
          exclude: /node_modules/,
        },
        // {
        //   test: /\.(css)$/,
        //   loader: [
        //     MiniCssExtractPlugin.loader,
        //     {
        //       loader: nodeResolve('css-loader'),
        //       options: { sourceMap: true },
        //     },
        //     {
        //       loader: nodeResolve('postcss-loader'),
        //       options: { sourceMap: true },
        //     },
        //   ],
        // },
      ],
    },
  })

const prod = (base, { main, packageJson }) => {
  let template,
    templatePath = getTemplatePath(packageJson)
  if (templatePath !== undefined) {
    template = resolve(templatePath)
  } else {
    template = existsSync(resolve('src/main/webapp/index.html'))
      ? resolve('src/main/webapp/index.html')
      : resolve('src/main/webapp/index.js')
  }
  return merge.smart(base, {
    mode: 'production',
    entry: [resolve(main)],
    plugins: [
      new MiniCssExtractPlugin({ filename: 'styles.[hash].css' }),
      new HtmlWebpackPlugin({
        title: 'My App',
        filename: 'index.html',
        template,
      }),
    ],
    module: {
      rules: [
        {
          test: /\.(css)$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: nodeResolve('css-loader'),
              options: { sourceMap: true },
            },
            {
              loader: nodeResolve('postcss-loader'),
              options: { sourceMap: true },
            },
          ],
        },
      ],
    },
  })
}

const devServer = ({ auth, target, publicPath }) => ({
  devMiddleware: {
    publicPath,
  },
  compress: true,
  server: 'spdy',
  hot: 'only',
  allowedHosts: 'all',
  historyApiFallback: true,
  static: {
    directory: resolve('src/main/resources/'),
  },
  proxy: [
    '/admin',
    '/search',
    '/services',
    '/webjars',
    '/direct',
    '/custom/direct',
  ].reduce((o, url) => {
    o[url] = {
      auth,
      target,
      ws: true,
      secure: false,
      headers: { Origin: target },
    }
    return o
  }, {}),
})

const retrieveBaseConfig = (opts) => {
  const {
    env = 'development',
    auth,
    proxy,
    publicPath,
    tsTranspileOnly = false,
    packageJson,
  } = opts
  const alias = Object.keys(opts.alias || {}).reduce((o, key) => {
    const [pkg, ...rest] = opts.alias[key].split('/')

    if (pkg === '.') {
      const dirname = path.dirname(
        require.resolve(pkg + '/package.json', {
          paths: [process.cwd()],
        })
      )
      o[key] = path.join(dirname, ...rest)
    } else {
      o[key] = opts.alias[key]
    }

    return o
  }, {})

  return {
    ...base({ env, alias, tsTranspileOnly, packageJson, publicPath }),
    devServer: devServer({ auth, publicPath, target: proxy }),
  }
}

const retrieveClientConfig = (opts) => {
  const { main, packageJson, env = 'development' } = opts
  const baseConfig = retrieveBaseConfig(opts)
  switch (env) {
    case 'production':
      return prod(baseConfig, { main, packageJson })
    case 'test':
      return test(baseConfig, { main, packageJson })
    case 'development':
    default:
      return dev(baseConfig, { main, packageJson })
  }
}

module.exports = {
  retrieveClientConfig,
}
