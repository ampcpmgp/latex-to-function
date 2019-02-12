const lodash = require('lodash')
const { Parser } = require('../src')

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
  const parser = new Parser()
  parser.setLatex(latex)

  const values = parser.func(...vars)

  function condition () {
    if (option.allowableRatio === 0) return lodash.isEqual(values, expected)

    return isAllowableRange(values, expected, option.allowableRatio)
  }

  if (!condition()) {
    const msg = `
Latex: ${latex}
${[parser.args]}: ${vars}
expected: ${expected} ${
  option.allowableRatio ? `(± ${option.allowableRatio * 100}%)` : ''
}
but values: ${values}

${parser.code}
`
    throw new Error(msg)
  }
}

exports.assertLatex = assertLatex

function assertLatexes (
  latex,
  vars,
  expected,
  option = {
    allowableRatio: 0
  }
) {
  const parser = new Parser()
  const results = parser.latexes(latex)
  const lastResult = results[results.length - 1]

  const values = lastResult.func(...vars)

  function condition () {
    if (option.allowableRatio === 0) return lodash.isEqual(values, expected)

    return isAllowableRange(values, expected, option.allowableRatio)
  }

  if (!condition()) {
    const msg = `
Latex: ${latex}
${[parser.args]}: ${vars}
expected: ${expected} ${
  option.allowableRatio ? `(± ${option.allowableRatio * 100}%)` : ''
}
but values: ${values}

${parser.code}
`
    throw new Error(msg)
  }
}

exports.assertLatexes = assertLatexes
