const path = require('path')
const maven = require('maven-deploy')

const extract = ($, selectors) =>
  Object.keys(selectors).reduce((o, key) => {
    o[key] = $(selectors[key]).text()
    return o
  }, {})

const info = {
  version: 'project > parent > version',
  groupId: 'project > groupId',
  artifactId: 'project > artifactId',
}

module.exports = ({ args, getPackage, getPom }) => {
  const pkg = getPackage()
  maven.config(
    Object.assign(
      {
        classifier: pkg.name,
        buildDir: '.',
        type: 'jar',
      },
      extract(getPom(), info)
    )
  )
  maven.install(path.resolve('target', pkg.name + '.jar'))
}
