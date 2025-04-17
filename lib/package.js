const fs = require('fs')
const path = require('path')
const glob = require('glob')
const archiver = require('archiver')

const flatten = (l, v) => l.concat(v)

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

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

module.exports = async ({ args, getPackage, getPom }) => {
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
Built-By: ${pkg.author}
Bundle-Description: ${pkg.description}
Bundle-DocURL: ${pkg.homepage}
Bundle-License: ${pkg.license}
Bundle-ManifestVersion: 2
Bundle-Name: ${name + ' :: ' + pkg.name.split('-').map(capitalize).join(' ')}
Bundle-SymbolicName: ${pkg.name + '-wab'}
Bundle-Vendor: ${pkg.author}
Bundle-Version: ${version.replace('-', '.')}
Created-By: Apache Maven Bundle Plugin
Import-Package: org.eclipse.jetty.servlets;version="[9.2, 10.0)",org.ops4j.pax.web.extender.whiteboard.runtime;version="[8,9)",org.ops4j.pax.web.service.whiteboard;version="[8,9)"
Require-Capability: osgi.ee;filter:="(&(osgi.ee=JavaSE)(version=1.7))"
Tool: Bnd-3.3.0.201609221906,`,
    { name: 'META-INF/MANIFEST.MF' }
  )

  archive.append(
    `<?xml version="1.0" encoding="UTF-8"?>
<blueprint xmlns="http://www.osgi.org/xmlns/blueprint/v1.0.0"
           xmlns:cm="http://aries.apache.org/blueprint/xmlns/blueprint-cm/v1.1.0">
    <!-- Map the root URL "/" -->
    <bean id="resourceMapping"
          class="org.ops4j.pax.web.extender.whiteboard.runtime.DefaultResourceMapping">
    </bean>
    
    <service id="adminResources" ref="resourceMapping"
             interface="org.ops4j.pax.web.service.whiteboard.ResourceMapping">
            <service-properties>
                <entry key="osgi.http.whiteboard.resource.pattern" value="${pkg['context-path']}/*"/>
                <entry key="osgi.http.whiteboard.resource.prefix" value=""/>
                <entry key="osgi.http.whiteboard.context.select" value="(osgi.http.whiteboard.context.path=/)"/>
            </service-properties>
    </service>

    <bean id="welcomeFileMapping"
          class="org.ops4j.pax.web.extender.whiteboard.runtime.DefaultWelcomeFileMapping">
          <property name="redirect" value="false"/>
          <property name="welcomeFiles">
            <array>
            <value>index.html</value>
            </array>
          </property>
    </bean>

      <service id="welcomeFileService" ref="welcomeFileMapping" interface="org.ops4j.pax.web.service.whiteboard.WelcomeFileMapping"/>
</blueprint>
`,
    { name: 'OSGI-INF/blueprint/blueprint.xml' }
  )

  const allPaths = (dir) => {
    const paths = []
    while (dir != path.dirname(dir)) {
      paths.push(dir)
      dir = path.dirname(dir)
    }
    return paths
  }

  const files = pkg.ace && pkg.ace.files ? pkg.ace.files : pkg.files
  files
    .map((d) => {
      if (!d.startsWith('node_modules')) {
        return path.resolve(d)
      }
      const paths = allPaths(process.cwd()).map((root) =>
        path.join(root, 'node_modules')
      )
      const [pkg, ...rest] = d.split('/').slice(1)
      const resolved = require.resolve(pkg + '/package.json', { paths })
      return path.join(resolved, '../', ...rest)
    })
    .map((d) => glob.sync(d + '/**').map((file) => ({ relative: d, file })))
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
