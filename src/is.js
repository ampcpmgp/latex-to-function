function open (item) {
  return item.type === 'atom' && item.family === 'open'
}
exports.open = open

function close (item) {
  return item.type === 'atom' && item.family === 'close'
}
exports.close = close

function parentheses (item) {
  return open(item) || close(item)
}
exports.parentheses = parentheses

function delta (item) {
  return item.type === 'mathord' && item.text === 'd'
}
exports.delta = delta
