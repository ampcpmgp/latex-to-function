const Parser = require('./parser')
const SupportedSymbols = require('./supported-symbols')

module.exports = {
  Parser,
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
