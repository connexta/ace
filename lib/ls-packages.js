import { sync } from 'glob'
import { resolve } from 'path'
import { createRequire } from "module"; // Bring in the ability to create the 'require' method
const require = createRequire(import.meta.url); // construct the require method

const flatten = (l, v) => l.concat(v)

export default (dirs) => {
  return dirs
    .filter((dir) => !dir.match('target'))
    .map((d) => resolve(d))
    .map((d) => sync(d + '/package.json'))
    .reduce(flatten, [])
    .map((d) => {
      const json = require(d)
      json.__path = d
      return json
    })
}
