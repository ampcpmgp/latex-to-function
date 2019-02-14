const katex = require('katex')
const beautify = require('js-beautify')
const lodash = require('lodash')
const { Decimal } = require('decimal.js')
const Operators = require('./operators')
const is = require('./is')
const LeftSide = require('./left-side')

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

  initialData ({ latex = '', ignoredVars = [], args = [], type = '' }) {
    return {
      latex,
      ignoredVars,
      args,
      type,
      name: '',
      externalUsage: [],
      externals: [],
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

  addExternalFunc (funcName, codeFunc) {
    const result = this._curRes()
    const isExists = result.externalUsage[0][funcName] != null

    void isExists
    void result.externalUsage
  }

  get funcStrOption () {
    return {
      noSort: false,
      noFilter: false
    }
  }

  funcStr (option = {}) {
    const { noSort, noFilter } = { ...this.funcStrOption, ...option }
    const result = this._curRes()

    if (result.executions.length === 1) {
      return `return [${result.executions[0]}]`
    }

    function value () {
      let execution = `[${result.executions.join(',')}]`

      if (!noFilter) {
        execution = `[...new Set(${execution})]`
      }

      if (!noSort) {
        execution += `.sort((a, b) => a - b)`
      }

      return execution
    }

    return `return ${value()}`
  }

  attachFuncCode () {
    const result = this._curRes()

    // eslint-disable-next-line no-new-func
    result.func = new Function(
      ...result.args,
      `
      ${result.externals.join('\n')}

      ${this.funcStr()}
    `
    )
    // eslint-disable-next-line no-new-func
    result.rawFunc = new Function(
      ...result.args,
      `
      ${result.externals.join('\n')}

      ${this.funcStr({ noSort: true, noFilter: true })}
    `
    )
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
    global.env.info &&
      console.info(
        `--------------- katex item[${this._curPos()}] ---------------\n`,
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

    if (is.function(item)) {
      this.addCode(item.text)
    }

    if (is.variable(item)) {
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
      this.katex(item.numer.body, depth + 1)
      this.addCode(')/')
      this.addCode('(')
      this.katex(item.denom.body, depth + 1)
      this.addCode(')')
    }

    if (item.type === 'sqrt') {
      this.addCode('Math.sqrt(')
      this.katex(item.body.body, depth + 1) // type is ordgroup
      this.addCode(')')
    }

    if (item.type === 'styling') {
      this.katex(item.body, depth + 1)
    }

    // 機能追加時に以下のログを有効にし確認する
    global.env.info &&
      console.info(
        `\ndepth: ${depth}\n`,
        `args: ${this._curRes().args}\n\n`,
        `executions.length: ${this._curRes().executions.length}\n`,
        `executions[0]: ${this._curRes().executions[0]}\n`
      )

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

  get relatedFormulaOption () {
    return {
      delta: true
    }
  }

  getRelatedFormula (currentItem, items, option = this.relatedFormulaOption) {
    const { delta } = { ...this.relatedFormulaOption, ...option }

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
      if (delta && is.delta(currentItem)) return true
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
    if (item.base.type === 'textord' && is.exponent(item)) {
      const code = `Math.pow(${item.base.text}, ${item.sup.text})`

      this.addCode(code)
    }

    // x^2 等の累乗
    if (item.base.type === 'mathord' && is.exponent(item)) {
      const code = `Math.pow(${item.base.text}, ${item.sup.text})`

      this.addArg(item.base.text)
      this.addCode(code)
    }

    // 微分
    if (is.differential(item)) {
      const delta = 1e-10 // min value: 1e-15
      const funcName = item.base.text
      const { relatedItemLength, relatedItems } = this.getRelatedFormula(
        item,
        items
      )

      // add function
      this.addCode(`(${funcName}(`)
      this.katex(relatedItems, depth + 1)
      this.addCode(`+ ${delta})[${0}] - `) // TODO
      this.addCode(`${funcName}(`)
      this.katex(relatedItems, depth + 1)
      this.addCode(`)[${0}] / ${delta})`) // TODO

      return relatedItemLength
    }

    // 積分
    if (is.integral(item)) {
      const delta = 100
      const beginningValue = item.sub.text - 0
      const endValue = item.sup.text - 0
      const decimal = new Decimal(endValue).minus(beginningValue).div(delta)
      const deltaWidth = decimal.toNumber()

      const {
        relatedItems,
        relatedItemLength,
        deltaVarName
      } = this.getRelatedFormula(item, items, { delta: true })

      const varName = deltaVarName || 'x'
      const prefixCode = `Array.from(
        {length: ${delta}},
        (_, __i) => ${beginningValue} + ${deltaWidth} * __i
      ).reduce((__sum${depth}, ${varName}) => __sum${depth} + ${deltaWidth} * `

      const suffixCode = `, 0)`

      this.addIgnoredVar(varName)
      this.addCode(prefixCode)
      this.katex(relatedItems, depth + 1)
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
      this.katex(relatedItems, depth + 1)
      this.addCode(suffixCode)

      return relatedItems.length
    }
  }

  presetEternalItems (index) {
    const curPos = this._curPos()
    const curRes = this._curRes()

    for (let index = 0; index < curPos; index++) {
      const result = this._results[index]

      if (result.type === LeftSide.TYPE.FUNCTION) {
        curRes.externals.push(
          `const ${result.name} = ${result.rawFunc.toString()}`
        )
      }

      if (result.type === LeftSide.TYPE.VARIABLE) {
        curRes.externals.push(
          `const ${result.name} = [${result.executions.join(',')}]`
        )
      }
    }
  }

  divideItems (items) {
    const leftItems = []
    const rightItems = []
    const hasEqual = items.some(item => is.equal(item))

    if (!hasEqual) {
      rightItems.push(...items)
    }

    if (hasEqual) {
      let isLeft = true

      items.forEach(item => {
        if (is.equal(item)) {
          isLeft = false
          return
        }

        if (isLeft) leftItems.push(item)
        else rightItems.push(item)
      })
    }

    return {
      leftItems,
      rightItems,
      hasLeft: leftItems.length !== 0
    }
  }

  katex (items, depth = 0) {
    const { hasLeft, leftItems, rightItems } = this.divideItems(items)

    // 左辺があれば情報設定
    if (hasLeft) {
      const { name, type } = LeftSide.info(leftItems)
      const result = this._curRes()

      result.name = name
      result.type = type
    }

    // 右辺は必ずある想定で設定
    for (let i = 0; i < rightItems.length; i++) {
      const additionalInfo = this.parseKatexItem(i, rightItems, depth)
      i += additionalInfo.skipCount
    }
  }

  latex (latex, index = 0) {
    this._curPos(index)

    const ignoredVars = this._results
      .slice(0, index)
      .map(item => item.name)
      .filter(Boolean)

    const args = this._results
      .slice(0, index)
      .filter(item => item.type === LeftSide.TYPE.VARIABLE)
      .reduce((args, item) => args.concat(...item.args), [])

    this._curRes(this.initialData({ latex, ignoredVars, args }))
    this.presetEternalItems()

    // 参考URL: https://github.com/KaTeX/KaTeX/issues/554
    // 正式なparserが出たらそっちに移行する。
    const items = katex.__parse(latex)
    this.katex(items)

    this.attachFuncCode()
  }

  latexes (latexes) {
    latexes.map((item, i) => {
      this.latex(item, i)
    })

    global.env.info && console.info('--- results ---\n', this._results)

    return this._results
  }
}

module.exports = Parser
