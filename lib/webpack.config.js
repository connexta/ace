import { resolve as _resolve, join, dirname as _dirname } from 'path'
import { execSync as exec } from 'child_process'
import { existsSync } from 'fs'

import glob from 'glob'
const {sync} = glob

import webpack from 'webpack'
const { ContextReplacementPlugin, DefinePlugin } = webpack
import webpackMerge from 'webpack-merge'
const {merge} = webpackMerge

import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'

import MiniCssExtractPlugin from 'mini-css-extract-plugin'
const { loader: _loader } = MiniCssExtractPlugin
import HtmlWebpackPlugin from 'html-webpack-plugin'
import SimpleProgressWebpackPlugin from 'simple-progress-webpack-plugin'
import { BundleAnalyzerPlugin as WebpackBundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import { getPackageWhitelist } from './package-utils.js'
import { getResolves } from './package-utils.js'
import { getTemplatePath } from './package-utils.js'
import { getTestPath } from './package-utils.js'
import { getTestSetupPath } from './package-utils.js'
import specLoader from './spec-loader.js'
import { createRequire } from "module"; // Bring in the ability to create the 'require' method
const require = createRequire(import.meta.url); // construct the require method
import * as urlImport from 'url';
const __dirname = urlImport.fileURLToPath(new URL('.', import.meta.url));
const resolve = (place) => {
  return _resolve(place)
}
const nodeResolve = (place) => require.resolve(place)

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
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
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
            options: { exports: "default Cesium" },
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
        exclude: /node_modules/,
        // exclude: generateExcludeFromWebpackBuild(packageJson),
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
        test: /\.tsx?$/,
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
  return merge(base, {
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

const test = (base, { main, packageJson }) =>
  merge(base, {
    mode: 'development',
    devtool: 'eval-cheap-module-source-map',
    node: {
      __filename: true,
    },
    entry: [_resolve(__dirname, 'uncaught-exception.js')]
      .concat(
        getTestSetupPath(packageJson)
          ? [_resolve(`${getTestSetupPath(packageJson)}`)]
          : []
      )
      .concat(sync(`${getTestPath(packageJson)}**/*spec.js`).map(resolve))
      .concat(
        sync(`${getTestPath(packageJson)}**/*spec.jsx`).map(resolve)
      ),
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
          test: /.*spec\.jsx?$/,
          use: [
            {
              loader: nodeResolve('mocha-loader'),
              options: {
                bail: true,
              },
            },
            // specLoader,
            babelLoader(),
          ],
          exclude: /node_modules/,
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
    template = existsSync(resolve('src/main/webapp/index.html'))
      ? resolve('src/main/webapp/index.html')
      : resolve('src/main/webapp/index.js')
  }
  return merge(base, {
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
            _loader,
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
  devMiddleware:{
    publicPath
  },
  compress: true,
  server: 'spdy',
  hot: 'only',
  allowedHosts: 'all',
  historyApiFallback: true,
  static: {
    directory: resolve('src/main/resources/')
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
      const dirname = _dirname(
        require.resolve(pkg + '/package.json', {
          paths: [process.cwd()],
        })
      )
      o[key] = join(dirname, ...rest)
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

export const retrieveClientConfig = (opts) => {
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
