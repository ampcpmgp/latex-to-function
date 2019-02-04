const is = {
  open (item) {
    return item.type === 'atom' && item.family === 'open'
  },

  close (item) {
    return item.type === 'atom' && item.family === 'close'
  },

  parentheses (item) {
    return is.open(item) || is.close(item)
  },

  delta (item) {
    return item.type === 'mathord' && item.text === 'd'
  },

  diffOperators (item) {
    if (item.type === 'atom' && item.text === '+') return true
    if (item.type === 'atom' && item.text === '-') return true
    if (item.type === 'atom' && item.text === '±') return true
    if (item.type === 'atom' && item.text === '\\pm') return true

    return false
  },

  arithmetic (item) {
    if (is.diffOperators(item)) return true
    if (item.type === 'atom' && item.text === '*') return true
    if (item.type === 'atom' && item.text === '\\times') return true
    if (item.type === 'atom' && item.text === '\\div') return true
    if (item.type === 'textord' && item.text === '/') return true

    return false
  },

  sigma (item) {
    return (
      item.type === 'supsub' &&
      item.base.type === 'op' &&
      item.base.name === '\\sum'
    )
  },

  numericValue (item) {
    return item.type === 'textord'
  }
}

module.exports = is
