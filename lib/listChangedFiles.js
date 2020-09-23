'use strict'

// Based on similar script in Facebook/React
// https://github.com/facebook/react/blob/e8e62ebb595434db40ee9a079189b1ee7e111ffe/scripts/shared/listChangedFiles.js
const path = require('path')
const execFileSync = require('child_process').execFileSync

const exec = (command, args) => {
  console.log('> ' + [command].concat(args).join(' '))
  const options = {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
    encoding: 'utf-8',
  }
  return execFileSync(command, args, options)
}

const execGitCmd = (args) => exec('git', args).trim().toString().split('\n')

const listChangedFiles = () => {
  const rootDir = execGitCmd(['rev-parse', '--show-toplevel'])[0]
  const mergeBase = execGitCmd(['merge-base', 'HEAD', 'origin/master'])
  return [
    ...execGitCmd(['diff', '--name-only', '--diff-filter=ACMRTUB', mergeBase]),
    ...execGitCmd([
      'ls-files',
      '--full-name',
      '--others',
      '--modified',
      '--exclude-standard',
    ]),
  ].map((file) => path.resolve(path.join(rootDir, file)))
}

module.exports = listChangedFiles
