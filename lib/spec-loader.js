import sourceMapUrl from 'source-map-url'
const { removeFrom } = sourceMapUrl
export default function (source, map) {
  this.cacheable()
  source = removeFrom(source)
  this.callback(
    null,
    ['describe(__filename, function () {', source, '});'].join(''),
    map
  )
}
