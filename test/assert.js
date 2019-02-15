const lodash = require('lodash')
const { Parser } = require('../src')

function isAllowableRange (values, expected, ratio) {
  return values.every((value, i) => {
    const [min, max] = [
      expected[i] * (1 + ratio),
      expected[i] * (1 - ratio)
    ].sort((a, b) => a - b)

    return value > min && value < max
  })
}

function errorMsg ({ latex, args, vars, expected, option, values, code }) {
  return `
----------- Error Detail -----------
Latex:
  ${latex}

args (${[args]}): ${vars}

expected: ${expected} ${
  option.allowableRatio ? `(± ${option.allowableRatio * 100}%)` : ''
}

but values: ${values}

------ generated code ------
${code}
`
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
  const result = parser.latex(latex)
  const values = result.func(...vars)

  function condition () {
    if (option.allowableRatio === 0) return lodash.isEqual(values, expected)

    return isAllowableRange(values, expected, option.allowableRatio)
  }

  if (!condition()) {
    throw new Error(
      errorMsg({
        latex,
        args: parser.args,
        vars,
        expected,
        option,
        values,
        code: parser.code
      })
    )
  }
}

exports.assertLatex = assertLatex

function assertLatexes (
  latexes,
  vars,
  expected,
  option = {
    allowableRatio: 0
  }
) {
  const parser = new Parser()
  const results = parser.latexes(latexes)
  const lastResult = results[results.length - 1]

  const values = lastResult.func(...vars)

  function condition () {
    if (option.allowableRatio === 0) return lodash.isEqual(values, expected)

    return isAllowableRange(values, expected, option.allowableRatio)
  }

  if (!condition()) {
    throw new Error(
      errorMsg({
        latex: latexes.join('\n  '),
        args: lastResult.args,
        vars,
        expected,
        option,
        values,
        code: lastResult.code
      })
    )
  }
}

exports.assertLatexes = assertLatexes
