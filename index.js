'use strict'

const Langley = {}
function loadModule(mn){Langley[mn] = require(`./${mn.toLowerCase()}`)(Langley)}

loadModule('App')
loadModule('DB')
loadModule('Template')

module.exports = Langley