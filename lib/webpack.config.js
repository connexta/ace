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
    plugins: [nodeResolve('react-hot-loader/babel'), ...plugins],
  },
})

const base = ({ alias = {}, env, tsTranspileOnly }) => ({
  entry: [nodeResolve('babel-polyfill'), nodeResolve('whatwg-fetch')],
  output: {
    path: resolve('./target/webapp'),
    filename: 'bundle.[hash].js',
    globalObject: 'this',
  },
  plugins: [
    // Keeps causing out of memory errors, disabling for now
    // new WebpackBundleAnalyzerPlugin({
    //   openAnalyzer: false,
    //   analyzerMode: 'static',
    //   reportFilename: resolve('target/report.html'),
    // }),
    new webpack.DefinePlugin(gitEnv()),
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
        exclude: function(modulePath) {
          if (modulePath.indexOf('catalog-ui-search') > -1) {
            if (
              modulePath.lastIndexOf('node_modules') >
              modulePath.lastIndexOf('catalog-ui-search')
            ) {
              return true
            }
            return false
          }
          return modulePath.indexOf('node_modules') > -1
        },
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
        exclude: function(modulePath) {
          if (modulePath.indexOf('catalog-ui-search') > -1) {
            if (
              modulePath.lastIndexOf('node_modules') >
              modulePath.lastIndexOf('catalog-ui-search')
            ) {
              return true
            }
            return false
          }
          return modulePath.indexOf('node_modules') > -1
        },
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
    alias,
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

const dev = (base, { main }) =>
  merge.smart(base, {
    mode: 'development',
    devtool: 'cheap-module-eval-source-map',
    entry: [nodeResolve('console-polyfill'), resolve(main)],
    plugins: [
      new webpack.NamedModulesPlugin(),
      new webpack.HotModuleReplacementPlugin(),
      new HtmlWebpackPlugin({
        title: 'My App',
        filename: 'index.html',
        template: fs.existsSync(resolve('src/main/webapp/index.html'))
          ? resolve('src/main/webapp/index.html')
          : resolve('src/main/webapp/index.js'),
      }),
      new SimpleProgressWebpackPlugin({
        format: 'compact',
      }),
    ],
  })

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

const prod = (base, { main }) =>
  merge.smart(base, {
    mode: 'production',
    devtool: 'source-map',
    entry: [resolve(main)],
    plugins: [
      new MiniCssExtractPlugin({ filename: 'styles.[hash].css' }),
      new HtmlWebpackPlugin({
        title: 'My App',
        filename: 'index.html',
        template: fs.existsSync(resolve('src/main/webapp/index.html'))
          ? resolve('src/main/webapp/index.html')
          : resolve('src/main/webapp/index.js'),
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
  proxy: ['/admin', '/search', '/services', '/webjars'].reduce((o, url) => {
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

module.exports = opts => {
  const {
    env = 'development',
    main,
    auth,
    proxy,
    publicPath,
    tsTranspileOnly = false,
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

  const b = {
    ...base({ env, alias, tsTranspileOnly }),
    devServer: devServer({ auth, publicPath, target: proxy }),
  }

  switch (env) {
    case 'production':
      return prod(b, { main })
    case 'test':
      return test(b, { main })
    case 'development':
    default:
      return dev(b, { main })
  }
}
