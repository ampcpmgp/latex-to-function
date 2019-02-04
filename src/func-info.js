const katex = require('katex')
const beautify = require('js-beautify')
const lodash = require('lodash')
const { Decimal } = require('decimal.js')
const Operators = require('./operators')
const SupportedSymbols = require('./supported-symbols')
const is = require('./is')

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

  // 乗算の省略がなされているか - 例 2xy
  isSkipMultiplier (currentItem, prevItem) {
    if (!prevItem) return false

    // 2連続数値扱いのデータが来た場合
    const isContinuousNumericalItem =
      is.numericValue(currentItem) && is.numericValue(prevItem)
    if (isContinuousNumericalItem) return false

    if (is.sigma(prevItem)) return false

    // `(` で始まっているか、 `)` で終わっている場合
    if (is.open(prevItem) || is.close(currentItem)) return false

    const isCurrentArithmetic = is.arithmetic(currentItem)
    const isPrevArithmetic = is.arithmetic(prevItem)

    return !isCurrentArithmetic && !isPrevArithmetic
  }

  addInfo (index, items, depth) {
    const item = items[index]
    const prevItem = items[index - 1]

    // 機能追加時に以下のログを有効にし確認する
    // console.info(
    //   `--------\n`,
    //   `depth: ${depth}\n`,
    //   `args: ${this.args}\n\n`,
    //   `executions: ${this.executions[0]}\n\n`,
    //   item
    // )

    let additionalInfo = {
      progress: 0
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
      const progress = this.addSubsupInfo(item, items, depth)

      if (progress) additionalInfo.progress += progress
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

  getRelatedFormula (
    currentItem,
    items,
    option = {
      delta: true
    }
  ) {
    const firstIndex = items.indexOf(currentItem) + 1
    const relatedItems = []
    const status = {
      firstParentheses: false,
      parenthesesCount: 0
    }
    let deltaVarName = ''
    let relatedItemLength = 0

    function isEnd () {
      if (status.firstParentheses && status.parenthesesCount === 0) return true

      return false
    }

    for (let index = firstIndex; index < items.length; index++) {
      const prevItem = items[index - 1]
      const item = items[index]
      const nextItem = items[index + 1]

      if (index === firstIndex && is.open(item)) {
        status.firstParentheses = true
      }

      if (is.open(item)) {
        ++status.parenthesesCount
      }

      if (prevItem && is.close(prevItem)) {
        --status.parenthesesCount
      }

      if (option.delta && is.delta(item)) {
        deltaVarName = nextItem.text
        relatedItemLength += 2

        break
      }

      if (isEnd()) {
        break
      }

      relatedItems.push(item)
      ++relatedItemLength
    }

    return {
      relatedItems,
      relatedItemLength,
      deltaVarName
    }
  }

  addSubsupInfo (item, items, depth) {
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
      const deltaDivisionNum = 100
      const beginningValue = item.sub.text - 0
      const endValue = item.sup.text - 0
      const decimal = new Decimal(endValue)
        .minus(beginningValue)
        .div(deltaDivisionNum)
      const deltaWidth = decimal.toNumber()

      const {
        relatedItems,
        relatedItemLength,
        deltaVarName
      } = this.getRelatedFormula(item, items, { delta: true })

      const varName = deltaVarName || 'x'

      const prefixCode = `Array.from(
        {length: ${deltaDivisionNum}},
        (_, __i) => ${beginningValue} + ${deltaWidth} * __i
      ).reduce((__sum${depth}, ${varName}) => __sum${depth} + ${deltaWidth} * `

      const suffixCode = `, 0)`

      this.setIgnoredVar(varName)
      this.addCode(prefixCode)
      this.setKatexData(relatedItems, depth + 1)
      this.addCode(suffixCode)

      return relatedItemLength
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
      const { relatedItems } = this.getRelatedFormula(item, items)

      this.setIgnoredVar(beginningVar)
      this.addArg(endVar)
      this.addCode(prefixCode)
      this.setKatexData(relatedItems, depth + 1)
      this.addCode(suffixCode)

      return relatedItems.length
    }
  }

  setKatexData (items, depth = 0) {
    for (let index = 0; index < items.length; index++) {
      const additionalInfo = this.addInfo(index, items, depth)
      index += additionalInfo.progress
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

module.exports = {
  FuncInfo,
  SupportedSymbols
}
