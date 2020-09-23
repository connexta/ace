'use strict'

// Based on similar script in Facebook/React
// https://github.com/facebook/react/blob/052a5f27f35f453ee33a075df81bddf9ced7300a/scripts/prettier/index.js

const path = require('path')
const color = require('ansi-colors')
const glob = require('glob')
const prettier = require('prettier')
const fs = require('fs')
const ora = require('ora')
const prettierrc = require('../prettierrc')
const listChangedFiles = require('./listChangedFiles')
const os = require('os')

module.exports = async ({ args }) => {
  const { write = false, modified = false, license = false } = args
  const changedFiles = modified ? listChangedFiles() : null
  const warnings = []
  const errors = []
  const spinner = ora({
    text: 'Running Format',
    spinner: 'monkey',
  }).start()

  function warn(message) {
    warnings.push(color.yellow(`\n${message}\n=> has formatting issues`))
  }

  function error(message) {
    errors.push(color.red(`\n${message}`))
  }

  function printMessages(messages) {
    messages.forEach((message) => console.log(message))
  }

  function tellUserHowToFormat() {
    console.log(
      color.red(`This project uses prettier to format numerous file types.\n`) +
        color.red(
          `The files listed in yellow above did not follow the correct format.\n`
        ) +
        color.dim(`Please run `) +
        color.bold(color.green(`yarn format -w${modified ? ' -m' : ''}`)) +
        color.dim(
          ` in the base UI directory (ddf/ui) and add changes to files listed above to your commit:`
        ) +
        `\n\n`
    )
  }

  function tellUserToCheckCodeCompilation() {
    console.log(
      color.red(
        `The files listed in red above could not be compiled, please check them and fix any errors before rerunning.\n`
      )
    )
  }

  function getPrettierOptionsForFile(file) {
    return {
      parser: prettier.getFileInfo.sync(file).inferredParser,
      ...prettierrc,
    }
  }

  async function processFiles(files) {
    return new Promise(async (outerResolve) => {
      for (var i = 0; i < files.length; i++) {
        await processFileAsync(files[i], i, files)
      }
      outerResolve()
    })
  }

  async function processFileAsync(file, index, files) {
    return new Promise(async (resolve) => {
      setTimeout(() => {
        processFile(file, index, files)
        resolve()
      }, 0)
    })
  }

  const toJavaDoc = function (str) {
    if (str == '') return ''
    const lines = str
      .split(os.EOL)
      .map((line) => line.trim())
      .map((line) => (line != '' ? ' ' + line : line))
      .map((line) => ' *' + line)

    return ['/**'].concat(lines).concat([' *', ' **/']).join(os.EOL) + os.EOL
  }

  let licenseHeader = ''
  if (license) {
    if (fs.existsSync(license)) {
      licenseHeader = toJavaDoc(fs.readFileSync(license, 'utf8').toString())
    } else {
      error(`license file ${license} was not found.`)
    }
  }

  function processFile(file, index, files) {
    spinner.text = `${(((index + 1) / files.length) * 100).toFixed(0)}%`
    const options = getPrettierOptionsForFile(file)
    try {
      const input = fs.readFileSync(file, 'utf8')
      const isMissingLicense =
        (file.endsWith('.ts') ||
          file.endsWith('.tsx') ||
          file.endsWith('.js')) &&
        licenseHeader != '' &&
        !input.includes(licenseHeader)
      if (write) {
        let output = prettier.format(input, options)
        if (isMissingLicense) {
          output = licenseHeader + output
        }
        if (output !== input) {
          fs.writeFileSync(file, output, 'utf8')
        }
      } else {
        if (isMissingLicense) {
          warnings.push(
            color.yellow(`\n${file}\n=> is missing the license header`)
          )
        }
        if (!prettier.check(input, options)) {
          warn(file)
        }
      }
    } catch (errorData) {
      error(`\n${file}\n=> has compilation issue\n=> ${errorData.message}`)
    }
  }

  function getFilesToCheck() {
    return glob
      .sync('**/*+(.ts|.tsx|.js|.jsx|.less|.json|.css)', {
        ignore: [
          '**/node_modules/**',
          '**/target/**',
          '**/node/**',
          '**/ddf-theme-cosmo.css',
          '**/ddf-theme-cyborg.css',
          '**/ddf-theme-flatly.css',
          '**/packages/*/src/main/webapp/css/styles.css',
          '**/packages/codice-icons/icons/codice.font.js',
        ],
      })
      .map((file) => path.resolve(file))
      .filter(
        (f) =>
          !modified ||
          changedFiles.filter((changedFile) => changedFile.includes(f)).length >
            0
      )
  }

  const files = getFilesToCheck()

  if (!files.length) {
    return
  }

  await processFiles(files)

  if (errors.length > 0) {
    spinner.fail()
    printMessages(errors)
    console.log('\n')
    tellUserToCheckCodeCompilation()
    process.exit(1)
  }

  if (warnings.length > 0) {
    spinner.fail()
    printMessages(warnings)
    console.log('\n')
    tellUserHowToFormat()
    process.exit(1)
  }
  spinner.succeed('Format Successful')
}
