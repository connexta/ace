const fs = require('fs')
const path = require('path')

const cheerio = require('cheerio')

const ls = require('./ls-packages')
const getWorkspaces = require('./package-utils').getWorkspaces

const mvn = ({ groupId, artifactId, version, packaging, classifier }) => {
  const format = [groupId, artifactId, version, packaging, classifier]
    .filter(v => v !== undefined)
    .join('/')

  return `mvn:${format}`
}

const features = (
  { artifactId, version },
  coors = []
) => `<features name="${artifactId}-${version}"
          xmlns="http://karaf.apache.org/xmlns/features/v1.3.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://karaf.apache.org/xmlns/features/v1.3.0 http://karaf.apache.org/xmlns/features/v1.3.0">
    <feature name="${artifactId}" install="auto" version="${version}">
        ${coors.map(coor => `<bundle>${coor}</bundle>`).join('\n        ')}
    </feature>
</features>
`
const extract = ($, selectors) =>
  Object.keys(selectors).reduce((o, key) => {
    o[key] = $(selectors[key]).text()
    return o
  }, {})

const info = {
  groupId: 'project > groupId',
  artifactId: 'project > artifactId',
  version: 'project > parent > version',
  packaging: 'project > packaging',
}

const jetty = {
  groupId: 'org.eclipse.jetty',
  artifactId: 'jetty-servlets',
  version: '9.2.19.v20160908',
  packaging: 'jar',
}

const extend = file => {
  const features = fs.readFileSync(file, { encoding: 'utf8' })
  const $ = cheerio.load(features, { xmlMode: true, decodeEntities: false })
  return $('features > feature > bundle')
    .map((i, el) =>
      $(el)
        .text()
        .trim()
    )
    .get()
}

const getBaseCoordinates = (args, project) => {
  if (args.extend !== undefined) {
    return extend(args.extend)
  }

  if (project.packaging === 'bundle') {
    return [jetty, project].map(mvn)
  }

  return [jetty].map(mvn)
}

module.exports = ({ args, getPackage, getPom }) => {
  const pkg = getPackage()
  const project = extract(getPom(), info)

  const packages = ls(getWorkspaces(pkg)).filter(
    pkg => pkg['context-path'] !== undefined
  )

  const base = getBaseCoordinates(args, project)

  const local = packages.map(({ name }) => ({
    groupId: project.groupId,
    artifactId: project.artifactId,
    packaging: 'jar',
    classifier: name,
    version: project.version,
  }))

  const coors = base.concat(local.map(mvn)).filter(coor => {
    if (!Array.isArray(args.exclude)) {
      return true
    }
    return !args.exclude.some(arg => coor.match(arg))
  })

  const absolute = path.resolve('target/features.xml')

  fs.writeFile(absolute, features(project, coors), 'utf8', err => {
    if (err) throw err
    console.log(`wrote ${absolute}`)
  })
}
