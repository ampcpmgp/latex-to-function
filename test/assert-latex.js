const lodash = require('lodash')
const { FuncInfo } = require('../src')
const SupportedSymbols = require('../src/supported-symbols')

function isAllowableRange (value, expected, ratio) {
  const [min, max] = [expected * (1 + ratio), expected * (1 - ratio)].sort(
    (a, b) => a - b
  )

  return value > min && value < max
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
  funcInfo.setLatexData(latex)
  const value = funcInfo.func(...vars)

  function condition () {
    if (option.allowableRatio === 0) return lodash.isEqual(value, expected)

    return isAllowableRange(value, expected, option.allowableRatio)
  }

  if (!condition()) {
    const msg = `
Latex: ${latex}
${[funcInfo.args]}: ${vars}
expected: ${expected} ${
  option.allowableRatio ? `(± ${option.allowableRatio * 100}%)` : ''
}
but value: ${value}

${funcInfo.code}
`
    throw new Error(msg)
  }
}

// テストコードは上に追加するとデバッグしやすい

assertLatex('\\int_2^4 4x dx + \\sum_{i=0}^n (ia^2 + 5)', [3, 2], 68, {
  allowableRatio: 0.01
})
assertLatex('\\int_2^4 4x dx', [], 24, { allowableRatio: 0.01 })

assertLatex('2\\sum_{i=5}^n (i^2 + 1)', [6], 126)

assertLatex('x - y * z', [5, -3, 2], 11)

assertLatex('\\frac{3x}{5x + 10}', [-10], 0.75)
assertLatex('\\frac{3 * (2 + 4)}{2}', [], 9)

assertLatex(
  '1x - 3x / 2x * 5x \\div 4x * 4x^2 + \\frac{1}{2}x \\times 5x',
  [2],
  -468
)

assertLatex('2 / 5 * 4', [], 1.6)
assertLatex('2 \\div 5 \\times 4', [], 1.6)
assertLatex('10 - 20 * x / 5', [-10], 50)

assertLatex('x + x^2', [4], 20)
assertLatex('x + x^2', [-5], 20)

assertLatex(
  '\\plusmn 5 \\times x \\pm x ± 10',
  [-5],
  [-40, -30, -20, -10, 10, 20, 30, 40]
)

for (let symbol of SupportedSymbols) {
  assertLatex(symbol.latex, symbol.test.args, symbol.test.result)
}

console.info('Test all passed!!')
