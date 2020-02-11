const fs = require('fs')
const path = require('path')
const glob = require('glob')
const archiver = require('archiver')
const username = require('username')

const flatten = (l, v) => l.concat(v)

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1)

const extract = ($, selectors) =>
  Object.keys(selectors).reduce((o, key) => {
    o[key] = $(selectors[key]).text()
    return o
  }, {})

const info = {
  version: 'project > parent > version',
  groupId: 'project > groupId',
  artifactId: 'project > artifactId',
  name: 'project > name',
}

module.exports = ({ args, getPackage, getPom }) => {
  const pkg = getPackage()
  const { version, name } = extract(getPom(), info)
  const output = fs.createWriteStream(
    path.resolve('target', pkg.name || 'output') + '.jar'
  )
  const archive = archiver('zip', { zlib: { level: 9 } })

  archive.pipe(output)

  archive.append(
    `Manifest-Version: 1.0
Bnd-LastModified: ${Date.now()}
Build-Jdk: 1.8.0_152
Built-By: ${username.sync()}
Bundle-Description: ${pkg.description}
Bundle-DocURL: ${pkg.homepage}
Bundle-License: ${pkg.license}
Bundle-ManifestVersion: 2
Bundle-Name: ${name +
      ' :: ' +
      pkg.name
        .split('-')
        .map(capitalize)
        .join(' ')}
Bundle-SymbolicName: ${pkg.name + '-wab'}
Bundle-Vendor: ${pkg.author}
Bundle-Version: ${version.replace('-', '.')}
Created-By: Apache Maven Bundle Plugin
Import-Package: org.eclipse.jetty.servlets;version="[9.2.19, 9.2.19]"
Require-Capability: osgi.ee;filter:="(&(osgi.ee=JavaSE)(version=1.7))"
Tool: Bnd-3.3.0.201609221906
Web-ContextPath: ${pkg['publicPath']}`,
    { name: 'META-INF/MANIFEST.MF' }
  )

  archive.append(
    `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
  <web-app xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xmlns="http://java.sun.com/xml/ns/javaee"
           xsi:schemaLocation="http://java.sun.com/xml/ns/javaee http://java.sun.com/xml/ns/javaee/web-app_3_0.xsd"
           version="3.0">

      <welcome-file-list>
          <welcome-file>index.html</welcome-file>
      </welcome-file-list>

      <context-param>
          <param-name>org.eclipse.jetty.servlet.SessionIdPathParameterName</param-name>
          <param-value>none</param-value>
      </context-param>

      <context-param>
          <param-name>org.eclipse.jetty.servlet.SessionPath</param-name>
          <param-value>/</param-value>
      </context-param>

      <filter>
          <filter-name>GzipFilter</filter-name>
          <filter-class>org.eclipse.jetty.servlets.GzipFilter</filter-class>
          <async-supported>true</async-supported>
      </filter>

      <filter-mapping>
          <filter-name>GzipFilter</filter-name>
          <url-pattern>/*</url-pattern>
      </filter-mapping>

  </web-app>`,
    { name: 'WEB-INF/web.xml' }
  )

  const allPaths = dir => {
    const paths = []
    while (dir != path.dirname(dir)) {
      paths.push(dir)
      dir = path.dirname(dir)
    }
    return paths
  }

  const files = pkg.ace && pkg.ace.files ? pkg.ace.files : pkg.files
  files
    .map(d => {
      if (!d.startsWith('node_modules')) {
        return path.resolve(d)
      }
      const paths = allPaths(process.cwd()).map(root =>
        path.join(root, 'node_modules')
      )
      const [pkg, ...rest] = d.split('/').slice(1)
      const resolved = require.resolve(pkg + '/package.json', { paths })
      return path.join(resolved, '../', ...rest)
    })
    .map(d => glob.sync(d + '/**').map(file => ({ relative: d, file })))
    .reduce(flatten, [])
    .forEach(({ relative, file }) => {
      const name = path.relative(relative, file)
      if (file.match(/\.html$/)) {
        const content = fs
          .readFileSync(file, { encoding: 'utf8' })
          .replace(/\$\{timestamp\}/g, process.env.ACE_BUILD || Date.now())
        archive.append(content, { name })
      } else {
        archive.file(file, { name })
      }
    })

  archive.finalize()
}
