# ace

[![Build Status](https://travis-ci.org/connexta/ace.svg?branch=master)](https://travis-ci.org/connexta/ace)

Ace is an attempt at providing convention over configuration to
[codice](https://github.com/codice) and
[connexta](https://github.com/connexta) UI projects. The frontend
ecosystem has many options when it comes to UI tooling. The main issue
most face is choosing the right tools and configuring them properly to
work with their technology stack. Ace tries to gather and configure the
necessary tools to be productive when developing frontend UI for
[DDF](https://github.com/codice/ddf) based applications.

For the most part, ace acts as a wrapper to widely used frontend tooling.

Those technologies include:

- [webpack](https://webpack.js.org/)
- [react-hot-loader](http://gaearon.github.io/react-hot-loader/)
- [babel](https://babeljs.io/)
- [typescript](https://www.typescriptlang.org/)
- [eslint](https://eslint.org/)
- [mocha](https://mochajs.org/)
- [istanbul](https://istanbul.js.org/)
- [prettier](https://prettier.io/)

## Help

To get a full listing of the capabilities of ace, do:

    ace --help

## Bundling

All javascript bundling is done by webpack. The root of your application
should be specified by the `package.json` `"main"` key. The bundle
environment can be specified through `NODE_ENV` environment variable, the
`--env` command line flag or it will default to the `development`
environment.

- `production`: For building a bundle which has more aggressive
  optimizations and minification.
  - Outputs to `./target/webapp`

- `development`: For use during development.
  - Outputs to `./target/webapp`

- `test`: For bundling all `*.spec.js` files into a test bundle. The test
  bundle can be evaluated in any browser environment.
  - Writes `./target/test/index.html`
  - Writes `./target/test/test.js`

## Dev Server

To provide incremental building of javascript bundle, ace uses the webpack
dev server.

To start a dev server, do:

    ace start

To start a test server, do:

    ace start --env=test

For help on more options, do:

    ace start --help 

## Testing

Once you've bundled your tests, you can run them in a variety of
environments. You can load them in any browser, or run them in a headless
browser for continuous integration.

### Mocha API

Mocha's API consists of two global functions `describe` and `it`.

Example:

```javascript
describe('a group of tests', () => {
  it('should pass', () => {
  })
  it('should pass callback', (done) => {
    setTimeout(done, 1000)
  })
  it('should pass promise', () => {
    return Promise.resolve(new Error('fail'))
  })
  it('should fail', () => {
    throw new Error('fail')
  })
  it('should fail callback', (done) => {
    done(new Error('fail'))
  })
  it('should fail promise', () => {
    return Promise.reject(new Error('fail'))
  })
})
```

NOTE: Ace uses the default timeout of 2 seconds for tests.

### Testing in CI

To run your bundled tests in a headless chrome environment, do

    ace test target/webapp/index.html

This will also write a coverage report to `target/coverage.json`.

### Code Coverage

To enforce coverage constraints, you can use a tool like istanbul. Ace
currently don't include this but might be added in the future.

First, create a `.istanbul.yml` with the following content:

```yaml
reporting:
    dir: ./target/coverage
check:
    global:
        statements: 50
        branches: 50
        lines: 50
        functions: 50
        excludes: []
```

To check coverage, do:

    istanbul check-coverage

To generate a report to visualize coverage, do:

    istanbul report

which will write an html file to `./target/coverage/index.html`.

## Code Formatting

To check if your code conforms to ace's prettier
[config](./prettierrc.js), do:

    ace format

To update your code in place, do:

    ace format -w

If using [Visual Studio Code](https://code.visualstudio.com/), consider
installing the
[prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
extension so you can run the formatter in your editor and add a
`.prettierrc.js` with the following content to the root of your project:

```javascript
module.exports = require("@connexta/ace/prettierrc")
```

