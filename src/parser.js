const katex = require('katex')
const beautify = require('js-beautify')
const lodash = require('lodash')
const { Decimal } = require('decimal.js')
const Operators = require('./operators')
const is = require('./is')

class Parser {
  constructor () {
    this._results = []
    this._cache = {
      currentParsePosition: 0
    }
  }

  /**
   * Position currently being parsed
   */
  _curPos (index) {
    if (index != null) {
      this._cache.currentParsePosition = index
    }

    return this._cache.currentParsePosition
  }

  /**
   * Result currently being parsed
   */
  _curRes (result) {
    if (result != null) {
      this._results[this._curPos()] = result
    }

    return this._results[this._curPos()]
  }

  initialData () {
    return {
      latex: '',
      ignoredVars: [],
      args: [],
      executions: [''],
      func: () => {
        throw new Error('no set latex')
      },
      code: ''
    }
  }

  result (index = 0) {
    return this._results[index]
  }

  addArg (variable) {
    const result = this._curRes()
    const isExistsArg = result.args.some(arg => arg === variable)

    if (isExistsArg) return null

    const isIgnoredVar = result.ignoredVars.some(
      ignoredVar => ignoredVar === variable
    )

    if (isIgnoredVar) return null

    result.args.push(variable)
  }

  addIgnoredVar (variable) {
    const result = this._curRes()
    const isExistsArg = result.ignoredVars.some(
      ignoredVar => ignoredVar === variable
    )

    if (!isExistsArg) result.ignoredVars.push(variable)
  }

  addExecutions (codes) {
    const result = this._curRes()
    const baseExecutions = result.executions

    result.executions = []

    for (let code of codes) {
      const executions = lodash.cloneDeep(baseExecutions)
      result.executions.push(
        ...executions.map(execution => `${execution}${code}`)
      )
    }
  }

  addCode (code) {
    const result = this._curRes()

    for (let i = 0; i < result.executions.length; ++i) {
      result.executions[i] += code
    }
  }

  funcStr () {
    const result = this._curRes()

    if (result.executions.length === 1) {
      return `return [${result.executions[0]}]`
    }

    return `return [...new Set([${result.executions.join(
      ','
    )}])].sort((a, b) => a - b)`
  }

  attachFuncCode () {
    const result = this._curRes()

    // eslint-disable-next-line no-new-func
    result.func = new Function(...result.args, this.funcStr())
    result.code = beautify(result.func.toString())
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

  parseKatexItem (index, items, depth) {
    const item = items[index]
    const prevItem = items[index - 1]

    // 機能追加時に以下のログを有効にし確認する
    console.info(
      `--------\n`,
      `depth: ${depth}\n`,
      `args: ${this._curRes().args}\n\n`,
      `executions: ${this._curRes().executions[0]}\n\n`,
      Object.assign({}, item, { loc: undefined })
    )

    let additionalInfo = {
      skipCount: 0
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
      const skipCount = this.addSubsupInfo(item, items, depth)

      if (skipCount) additionalInfo.skipCount += skipCount
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

    function isEnd (currentItem) {
      if (status.firstParentheses && status.parenthesesCount === 0) return true
      if (option.delta && is.delta(currentItem)) return true
      if (!status.firstParentheses && is.diffOperators(currentItem)) return true

      return false
    }

    for (let index = firstIndex; index < items.length; index++) {
      const prevItem = items[index - 1]
      const currentItem = items[index]
      const nextItem = items[index + 1]

      if (index === firstIndex && is.open(currentItem)) {
        status.firstParentheses = true
      }

      if (is.open(currentItem)) {
        ++status.parenthesesCount
      }

      if (prevItem && is.close(prevItem)) {
        --status.parenthesesCount
      }

      if (option.delta && is.delta(currentItem)) {
        deltaVarName = nextItem.text
        relatedItemLength += 2
      }

      if (isEnd(currentItem)) {
        break
      }

      relatedItems.push(currentItem)
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

      this.addIgnoredVar(varName)
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

      this.addIgnoredVar(beginningVar)
      this.addArg(endVar)
      this.addCode(prefixCode)
      this.setKatexData(relatedItems, depth + 1)
      this.addCode(suffixCode)

      return relatedItems.length
    }
  }

  katex (items, depth = 0) {
    for (let i = 0; i < items.length; i++) {
      const additionalInfo = this.parseKatexItem(i, items, depth)
      i += additionalInfo.skipCount
    }

    this.attachFuncCode()

    return this._curRes()
  }

  latex (latex, index = 0) {
    this._curPos(index)
    this._curRes(this.initialData())

    // 参考URL: https://github.com/KaTeX/KaTeX/issues/554
    // 正式なparserが出たらそっちに移行する。
    const items = katex.__parse(latex)
    const result = this.katex(items)

    return result
  }

  latexes (latexes) {
    this.latex(latexes[0], 0)
    // const _results = latexes.map((item, i) => this.latex(item, i))
    // return result

    return []
  }
}

module.exports = Parser
