module.exports = function (structure) {
  var files = getFiles(structure)

  return {
    readFileSync: function (path, encoding) {
      if (typeof files[path] === 'string') {
        return files[path]
      } else {
        throw new Error(`File Not Found: ${path}`)
      }
    },
    readdirSync: function (path, encoding) {
      if (Array.isArray(files[path])) {
        return files[path]
      } else {
        throw new Error(`Directory Not Found: ${path}`)
      }
    },
    statSync: function (path) {
      if (Array.isArray(files[path])) {
        return {isDirectory: true}
      } else if (typeof files[path] === 'string') {
        return {isFile: true}
      } else {
        throw new Error(`Directory Not Found: ${path}`)
      }
    }
  }
}

function getFiles (structure, prefix = '/', target = {}) {
  for (var key in structure) {
    if (typeof structure[key] === 'function') {
      target[`${prefix}${key}`] = `(${structure[key].toString()})()`
    } else if (structure[key] instanceof Object) {
      target[`${prefix}${key}/`] = Object.keys(structure[key])
      getFiles(structure[key], `${prefix}${key}/`, target)
    }
  }
  return target
}
