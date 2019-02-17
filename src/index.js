const Parser = require('./parser')
const LeftSide = require('./left-side')
const SupportedSymbols = require('./supported-symbols')

module.exports = {
  Parser,
  LeftSide,
  SupportedSymbols,

  parse (latex) {
    const parser = new Parser()
    const multiple = Array.isArray(latex)

    if (multiple) {
      return parser.latexes(latex)
    } else {
      return parser.latex(latex)
    }
  }
}
