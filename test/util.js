const lodash = require('lodash')
const { FuncInfo } = require('../src')

function isAllowableRange (values, expected, ratio) {
  return values.every(value => {
    const [min, max] = [expected * (1 + ratio), expected * (1 - ratio)].sort(
      (a, b) => a - b
    )

    return values > min && values < max
  })
}

function assertLatex (
  latex,
  vars,
  expected,
  option = {
    allowableRatio: 0
  }
) {
  const funcInfo = new FuncInfo()
  funcInfo.setLatex(latex)

  const values = funcInfo.func(...vars)

  function condition () {
    if (option.allowableRatio === 0) return lodash.isEqual(values, expected)

    return isAllowableRange(values, expected, option.allowableRatio)
  }

  if (!condition()) {
    const msg = `
Latex: ${latex}
${[funcInfo.args]}: ${vars}
expected: ${expected} ${
  option.allowableRatio ? `(± ${option.allowableRatio * 100}%)` : ''
}
but values: ${values}

${funcInfo.code}
`
    throw new Error(msg)
  }
}

exports.assertLatex = assertLatex

function assertMultipleLatex (
  latex,
  vars,
  expected,
  option = {
    allowableRatio: 0
  }
) {
  const funcInfo = new FuncInfo()
  funcInfo.setMultipleLatex(latex)

  const values = funcInfo.func(...vars)

  function condition () {
    if (option.allowableRatio === 0) return lodash.isEqual(values, expected)

    return isAllowableRange(values, expected, option.allowableRatio)
  }

  if (!condition()) {
    const msg = `
Latex: ${latex}
${[funcInfo.args]}: ${vars}
expected: ${expected} ${
  option.allowableRatio ? `(± ${option.allowableRatio * 100}%)` : ''
}
but values: ${values}

${funcInfo.code}
`
    throw new Error(msg)
  }
}

exports.assertMultipleLatex = assertMultipleLatex
