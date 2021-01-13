var sourceMappingURL = require('source-map-url')
module.exports = function (source, map) {
  this.cacheable()
  source = sourceMappingURL.removeFrom(source)
  this.callback(
    null,
    ['describe(__filename, function () {', source, '});'].join(''),
    map
  )
}
