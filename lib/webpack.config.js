const path = require('path')
const exec = require('child_process').execSync
const fs = require('fs')

const glob = require('glob')

const webpack = require('webpack')
const merge = require('webpack-merge')

const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const SimpleProgressWebpackPlugin = require('simple-progress-webpack-plugin')
const WebpackBundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin
const getPackageWhitelist = require('./package-utils').getPackageWhitelist
const getResolves = require('./package-utils').getResolves
const getTemplatePath = require('./package-utils').getTemplatePath
const nodeExternals = require('webpack-node-externals')
const ReactLoadableSSRAddon = require('react-loadable-ssr-addon')

const resolve = place => path.resolve(place)
const nodeResolve = place => require.resolve(place)

const gitEnv = () => {
  const commitHash = exec('git rev-parse --short HEAD').toString()

  const isDirty =
    exec('git status')
      .toString()
      .indexOf('working directory clean') === -1

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
    presets: [
      nodeResolve('babel-preset-react'),
      [nodeResolve('babel-preset-latest'), { modules: false }],
      nodeResolve('babel-preset-stage-0'),
    ],
    cacheDirectory: true,
    plugins: [
      nodeResolve('react-hot-loader/babel'),
      nodeResolve('react-loadable/babel'),
      ...plugins,
    ],
  },
})

const generateIncludeInWebpackBuild = packageJson => {
  const packageWhitelist = getPackageWhitelist(packageJson)
  return modulePath => {
    // Include files not in node_modules
    if (!modulePath.includes('node_modules')) {
      return true
    }

    // Include files in whitelisted packages
    return packageWhitelist.some(pkg => {
      return (
        modulePath.includes(pkg) &&
        // Don't include items in nested node_modules
        modulePath.lastIndexOf(pkg) > modulePath.lastIndexOf('node_modules')
      )
    })
  }
}

const generateExcludeFromWebpackBuild = packageJson => {
  const generatedIncludeInWebpackBuild = generateIncludeInWebpackBuild(
    packageJson
  )
  return modulePath => !generatedIncludeInWebpackBuild(modulePath)
}

const server = (base, main) => {
  return merge.smart(base, {
    target: 'node',
    node: {
      __dirname: true,
      __filename: true,
    },
    mode: 'development',
    devtool: 'cheap-module-eval-source-map',

    // Tell webpack the root file of our
    // server application
    entry: resolve(main),

    // Tell webpack where to put the output file that is generate
    output: {
      path: resolve('./target/server'),
      filename: 'bundle.middleware.js',
      globalObject: 'this',
      libraryTarget: 'umd',
    },
    plugins: [
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
      /**
       * module.require was breaking things on the node side of things with this library -- the replacement makes it valid during compile time:
       * https://github.com/apollographql/apollo-server/blob/master/packages/apollo-server-core/src/utils/createSHA.ts#L4
       */
      new webpack.DefinePlugin({ 'module.require': 'require' }),
    ],
    module: {
      rules: [
        {
          test: /\.(css|less)$/,
          loader: nodeResolve('css-loader/locals'),
        },
      ],
    },
  })
}

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
    publicPath,
    filename: 'bundle.[hash].js',
    chunkFilename: '[name].[hash].chunk.js',
    globalObject: 'this',
  },
  plugins: [
    // Keeps causing out of memory errors, disabling for now
    // new WebpackBundleAnalyzerPlugin({
    //   openAnalyzer: false,
    //   analyzerMode: 'static',
    //   reportFilename: resolve('target/report.html'),
    // }),
    new webpack.ContextReplacementPlugin(
      /graphql-language-service-interface[\\/]dist$/,
      new RegExp(`^\\./.*\\.js$`)
    ),
    new webpack.DefinePlugin({ ...gitEnv(), __ENV__: JSON.stringify(env) }),
    new ReactLoadableSSRAddon({
      filename: path.join(process.cwd(), './target/webapp/react-loadable.json'),
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
        test: /\.(png|gif|jpg|jpeg)$/,
        use: nodeResolve('file-loader'),
      },
      {
        test: /Cesium\.js$/,
        use: [
          {
            loader: nodeResolve('exports-loader'),
            options: { Cesium: true },
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
        test: /\.jsx?$/,
        exclude: generateExcludeFromWebpackBuild(packageJson),
        use: babelLoader(
          env === 'test'
            ? [
                [
                  nodeResolve('babel-plugin-istanbul'),
                  { exclude: ['**/*spec.js'] },
                ],
              ]
            : []
        ),
      },
      {
        test: /\.(hbs|handlebars)$/,
        use: {
          loader: nodeResolve('handlebars-loader'),
        },
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        use: {
          loader: nodeResolve('file-loader'),
          options: {
            name: 'fonts/[name]-[hash].[ext]',
          },
        },
      },
      {
        test: /\.(css|less)$/,
        use: [
          nodeResolve('style-loader'),
          {
            loader: nodeResolve('css-loader'),
            options: { sourceMap: true },
          },
          {
            loader: nodeResolve('less-loader'),
            options: { sourceMap: true },
          },
        ],
      },
      {
        test: /\.unless$/,
        use: [
          nodeResolve('raw-loader'),
          path.resolve(__dirname, 'concat-less.js'),
        ],
      },
      {
        test: /\.worker\.js$/,
        use: [nodeResolve('worker-loader'), babelLoader()],
      },
      {
        test: /\.tsx?$/,

        use: [
          {
            loader: nodeResolve('ts-loader'),
            options: {
              allowTsInNodeModules: true,
              transpileOnly: tsTranspileOnly,
            },
          },
          {
            loader: nodeResolve('stylelint-custom-processor-loader'),
            options: {
              configPath: path.resolve(__dirname, 'stylelintrc.json'),
            },
          },
        ],
        exclude: generateExcludeFromWebpackBuild(packageJson),
      },
      {
        test: /\.(html)$/,
        use: {
          loader: 'html-loader',
        },
      },
    ],
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

const storybook = ({ packageJson }) => ({
  mode: 'development',
  plugins: [
    new webpack.DefinePlugin({
      __STORYBOOK_ROOT__: JSON.stringify(process.__STORYBOOK_OPTIONS__.root),
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(png|gif|jpg|jpeg)$/,
        use: nodeResolve('file-loader'),
      },
      {
        test: /Cesium\.js$/,
        use: [
          {
            loader: nodeResolve('exports-loader'),
            options: { Cesium: true },
          },
          nodeResolve('script-loader'),
        ],
      },
      {
        test: /\.jsx?$/,
        exclude: generateExcludeFromWebpackBuild(packageJson),
        use: babelLoader([nodeResolve('babel-plugin-react-docgen')]),
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        use: {
          loader: nodeResolve('file-loader'),
          options: {
            name: 'fonts/[name]-[hash].[ext]',
          },
        },
      },
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: nodeResolve('ts-loader'),
            options: {
              allowTsInNodeModules: true,
              // The `transpileOnly` option is set to true because the
              // storybook environment is meant for rapid iteration and
              // not validation. We should not be using storybook to
              // enforce typing.
              transpileOnly: true,
            },
          },
          {
            loader: nodeResolve('react-docgen-typescript-loader'),
            options: { skipPropsWithoutDoc: true },
          },
          {
            loader: nodeResolve('stylelint-custom-processor-loader'),
            options: {
              configPath: path.resolve(__dirname, 'stylelintrc.json'),
            },
          },
        ],
        exclude: generateExcludeFromWebpackBuild(packageJson),
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.json', '.jsx', '.ts', '.tsx'],
    modules: [
      'src/main/webapp/',
      'src/main/webapp/js',
      'src/main/webapp/css',
      'src/main/webapp/lib/',
      'node_modules',
    ],
  },
})

const getTemplateFile = packageJson => {
  const templatePath = getTemplatePath(packageJson)
  if (templatePath !== undefined) {
    return resolve(templatePath)
  }

  const html = resolve('src/main/webapp/index.html')
  if (fs.existsSync(html)) {
    return html
  }

  const js = resolve('src/main/webapp/index.js')
  if (fs.existsSync(js)) {
    return js
  }

  return path.join(__dirname, 'index.html')
}

const dev = (base, { main, packageJson }) => {
  return merge.smart(base, {
    mode: 'development',
    devtool: 'cheap-module-eval-source-map',
    entry: [nodeResolve('console-polyfill'), resolve(main)],
    plugins: [
      new webpack.NamedModulesPlugin(),
      new webpack.HotModuleReplacementPlugin(),
      new HtmlWebpackPlugin({
        title: 'My App',
        filename: 'index.html',
        template: getTemplateFile(packageJson),
      }),
      new SimpleProgressWebpackPlugin({
        format: 'compact',
      }),
    ],
  })
}

const test = (base, { main }) =>
  merge.smart(base, {
    mode: 'development',
    devtool: 'cheap-module-eval-source-map',
    node: {
      __filename: true,
    },
    entry: [path.resolve(__dirname, 'uncaught-exception.js')].concat(
      glob.sync('src/main/webapp/**/*spec.js*').map(resolve)
    ),
    output: {
      path: resolve('target/test/'),
      filename: 'test.js',
      publicPath: './',
    },
    plugins: [
      new MiniCssExtractPlugin({ filename: 'styles.[hash].css' }),
      new HtmlWebpackPlugin(),
      new webpack.HotModuleReplacementPlugin(),
    ],
    module: {
      rules: [
        {
          test: /.*spec\.jsx?$/,
          use: [
            {
              loader: nodeResolve('mocha-loader'),
              options: {
                bail: true,
              },
            },
            path.resolve(__dirname, 'spec-loader.js'),
            babelLoader(),
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.(css|less)$/,
          loader: [
            MiniCssExtractPlugin.loader,
            {
              loader: nodeResolve('css-loader'),
              options: { sourceMap: true },
            },
            {
              loader: nodeResolve('less-loader'),
              options: { sourceMap: true },
            },
          ],
        },
      ],
    },
  })

const prod = (base, { main, packageJson }) => {
  let template,
    templatePath = getTemplatePath(packageJson)
  if (templatePath !== undefined) {
    template = resolve(templatePath)
  } else {
    template = fs.existsSync(resolve('src/main/webapp/index.html'))
      ? resolve('src/main/webapp/index.html')
      : resolve('src/main/webapp/index.js')
  }
  return merge.smart(base, {
    mode: 'production',
    devtool: 'source-map',
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
          test: /\.(css|less)$/,
          loader: [
            MiniCssExtractPlugin.loader,
            {
              loader: nodeResolve('css-loader'),
              options: { sourceMap: true },
            },
            {
              loader: nodeResolve('less-loader'),
              options: { sourceMap: true },
            },
          ],
        },
      ],
    },
  })
}

const devServer = ({ auth, target, publicPath }) => ({
  watchOptions: {
    poll: 1000,
  },
  publicPath,
  hotOnly: true,
  inline: true,
  disableHostCheck: true,
  historyApiFallback: true,
  contentBase: resolve('src/main/resources/'),
  proxy: ['/admin', '/search', '/services', '/webjars', '/direct'].reduce(
    (o, url) => {
      o[url] = {
        auth,
        target,
        ws: true,
        secure: false,
        headers: { Origin: target },
      }
      return o
    },
    {}
  ),
})

const retrieveServerConfig = opts => {
  const baseConfig = retrieveBaseConfig(opts)
  const { main } = opts
  return server(baseConfig, main)
}

const retrieveBaseConfig = opts => {
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

const retrieveClientConfig = opts => {
  const baseConfig = retrieveBaseConfig(opts)
  const { main, packageJson, env = 'development' } = opts
  switch (env) {
    case 'production':
      return prod(baseConfig, { main, packageJson })
    case 'test':
      return test(baseConfig, { main })
    case 'storybook':
      return storybook({ packageJson })
    case 'development':
    default:
      return dev(baseConfig, { main, packageJson })
  }
}

module.exports = {
  retrieveClientConfig,
  retrieveServerConfig,
}
