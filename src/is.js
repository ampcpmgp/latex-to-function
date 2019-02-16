const is = {
  abs (item) {
    return item.type === 'textord' && item.text === '|'
  },

  integral (item) {
    return item.base.type === 'op' && item.base.name === '\\int'
  },

  differential (item) {
    return (
      item.type === 'supsub' &&
      item.sup &&
      item.sup.type === 'ordgroup' &&
      item.sup.body[0].text === '\\prime' &&
      !item.sub
    )
  },

  exponent (item) {
    return (
      item.type === 'supsub' &&
      item.base &&
      (item.base.type === 'mathord' || item.base.type === 'textord') &&
      item.sup &&
      (item.sup.type === 'mathord' || item.sup.type === 'textord') &&
      !item.sub
    )
  },

  equal (item) {
    return item.type === 'atom' && item.text === '='
  },

  function (item) {
    return item.type === 'mathord' && /[f-h]/.test(item.text)
  },

  variable (item) {
    return item.type === 'mathord' && !is.function(item)
  },

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
    return item.type === 'textord' && !is.abs(item)
  }
}

module.exports = is
