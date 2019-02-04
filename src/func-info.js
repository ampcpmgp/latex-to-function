const katex = require('katex')
const beautify = require('js-beautify')
const lodash = require('lodash')
const Operators = require('./operators')

class FuncInfo {
  constructor () {
    this.init()
  }

  init () {
    Object.assign(this, {
      latex: '',
      ignoredVars: [],
      args: [],
      executions: [''],
      func: null,
      code: ''
    })
  }

  addArg (variable) {
    const isExistsArg = this.args.some(arg => arg === variable)

    if (isExistsArg) return null

    const isIgnoredVar = this.ignoredVars.some(
      ignoredVar => ignoredVar === variable
    )

    if (isIgnoredVar) return null

    this.args.push(variable)
  }

  setIgnoredVar (variable) {
    const isExistsArg = this.ignoredVars.some(
      ignoredVar => ignoredVar === variable
    )

    if (!isExistsArg) this.ignoredVars.push(variable)
  }

  getFuncStr () {
    if (this.executions.length === 1) {
      return `return ${this.executions[0]}`
    }

    return `return [...new Set([${this.executions.join(
      ','
    )}])].sort((a, b) => a - b)`
  }

  addExecutions (codes) {
    const baseExecutions = this.executions
    this.executions = []

    for (let code of codes) {
      const executions = lodash.cloneDeep(baseExecutions)
      this.executions.push(
        ...executions.map(execution => `${execution}${code}`)
      )
    }
  }

  addCode (code) {
    for (let i = 0; i < this.executions.length; ++i) {
      this.executions[i] += code
    }
  }

  setFuncCode () {
    // eslint-disable-next-line no-new-func
    this.func = new Function(...this.args, this.getFuncStr())
    this.code = beautify(this.func.toString())
  }

  isArithmetic (item) {
    if (item.type === 'atom' && item.text === '+') return true
    if (item.type === 'atom' && item.text === '-') return true
    if (item.type === 'atom' && item.text === '*') return true
    if (item.type === 'atom' && item.text === '\\times') return true
    if (item.type === 'atom' && item.text === '\\div') return true
    if (item.type === 'atom' && item.text === '±') return true
    if (item.type === 'atom' && item.text === '\\pm') return true
    if (item.type === 'textord' && item.text === '/') return true

    return false
  }

  isSigmaSum (item) {
    return (
      item.type === 'supsub' &&
      item.base.type === 'op' &&
      item.base.name === '\\sum'
    )
  }

  isNumericValue (item) {
    return item.type === 'textord'
  }

  // 乗算の省略がなされているか - 例 2xy
  isSkipMultiplier (currentItem, prevItem) {
    if (!prevItem) return false

    // 2連続数値扱いのデータが来た場合
    const isContinuousNumericalItem =
      this.isNumericValue(currentItem) && this.isNumericValue(prevItem)
    if (isContinuousNumericalItem) return false

    if (this.isSigmaSum(prevItem)) return false

    // `(` で始まっているか、 `)` で終わっている場合
    if (prevItem.family === 'open' || currentItem.family === 'close') {
      return false
    }

    const isCurrentArithmetic = this.isArithmetic(currentItem)
    const isPrevArithmetic = this.isArithmetic(prevItem)

    return !isCurrentArithmetic && !isPrevArithmetic
  }

  addInfo (index, items, depth) {
    const item = items[index]
    const prevItem = items[index - 1]

    // 機能追加時に以下のログを有効にし確認する
    console.info(
      `--------\n`,
      `depth: ${depth}\n`,
      `args: ${this.args}\n\n`,
      `executions: ${this.executions[0]}\n\n`,
      item
    )

    let additionalInfo = {
      suffix: ''
    }

    // 乗算の省略がなされていた場合、乗算コードを追加する
    if (this.isSkipMultiplier(item, prevItem)) {
      this.addCode('*')
    }

    // type ごとに関数コードを生成ロジックを用意する
    if (item.type === 'textord') {
      this.addCode(item.text)
    }

    if (item.type === 'mathord') {
      this.addArg(item.text)
      this.addCode(item.text)
    }

    if (item.type === 'atom') {
      this.addAtomInfo(item)
    }

    if (item.type === 'supsub') {
      additionalInfo.suffix = this.addSubsupInfo(item, depth)
    }

    if (item.type === 'genfrac') {
      this.addCode('(')
      this.setKatexData(item.numer.body, depth + 1)
      this.addCode(')/')
      this.addCode('(')
      this.setKatexData(item.denom.body, depth + 1)
      this.addCode(')')
    }

    if (item.type === 'sqrt') {
      this.addCode('Math.sqrt(')
      this.setKatexData(item.body.body, depth + 1) // type is ordgroup
      this.addCode(')')
    }

    if (item.type === 'styling') {
      this.setKatexData(item.body, depth + 1)
    }

    return additionalInfo
  }

  addAtomInfo (item) {
    const operator = Operators[item.text]

    if (!operator) {
      const msg = `operator not found: ${item.text}`

      console.error(msg)
      throw new Error(msg)
    }

    const isArray = Array.isArray(operator)

    if (isArray) {
      this.addExecutions(operator)

      return null
    }

    this.addCode(operator)
  }

  addSubsupInfo (item, depth) {
    // 3^4 等の累乗
    if (item.base.type === 'textord') {
      const code = `Math.pow(${item.base.text}, ${item.sup.text})`

      this.addCode(code)
    }

    // x^2 等の累乗
    if (item.base.type === 'mathord') {
      const code = `Math.pow(${item.base.text}, ${item.sup.text})`

      this.addArg(item.base.text)
      this.addCode(code)
    }

    // 積分
    if (item.base.type === 'op' && item.base.name === '\\int') {
      const delta = 100
      const prefixCode = `Array.from(
        {length: ${delta}},
        (_, __i) => (${item.sup.text} - ${item.sub.text}) / ${delta} * __i
      ).reduce(__width${depth} => __width${depth} *`
      const suffixCode = `, 0)`

      this.addCode(prefixCode)

      return suffixCode
    }

    // 合計値,Σ
    if (item.base.type === 'op' && item.base.name === '\\sum') {
      const beginningVar = item.sub.body[0].text
      const beginningValue = item.sub.body[2].text
      const endVar = item.sup.text
      const prefixCode = `Array.from(
        { length: (${endVar} + 1) - ${beginningValue} },
        (_, ${beginningVar}) => ${beginningVar} + ${beginningValue}
      ).reduce((__sum${depth}, i) => __sum${depth} + `
      const suffixCode = `, 0)`

      this.setIgnoredVar(beginningVar)
      this.addArg(endVar)
      this.addCode(prefixCode)

      return suffixCode
    }
  }

  setKatexData (items, depth = 0) {
    let suffix = ''

    for (let index = 0; index < items.length; index++) {
      const additionalInfo = this.addInfo(index, items, depth)

      if (additionalInfo.suffix) {
        suffix += additionalInfo.suffix
      }
    }

    if (suffix) {
      this.addCode(suffix)
    }
  }

  setLatexData (latex) {
    // 参考URL: https://github.com/KaTeX/KaTeX/issues/554
    // 正式なparserが出たらそっちに移行する。
    this.latex = latex
    const items = katex.__parse(latex)

    this.setKatexData(items)
    this.setFuncCode()
  }
}

module.exports = FuncInfo
