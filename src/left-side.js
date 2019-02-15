const is = require('./is')

class LeftSide {
  static get TYPE () {
    return {
      FUNCTION: 'FUNCTION',
      VARIABLE: 'VARIABLE'
    }
  }

  static info (items) {
    const firstItem = items[0]
    const isFunction = is.function(firstItem)
    const isVariable = is.variable(firstItem)
    const name = items[0].text
    const args = []
    const type = (() => {
      if (isFunction) return this.TYPE.FUNCTION

      if (isVariable) return this.TYPE.VARIABLE
    })()

    if (isFunction) {
      let isOpen = false

      items.forEach(item => {
        if (is.open(item)) {
          isOpen = true
          return
        }

        if (is.close(item)) {
          isOpen = false
          return
        }

        if (isOpen && is.variable(item)) {
          args.push(item.text)
        }
      })
    }

    return {
      name,
      type,
      args // if function then set argument names
    }
  }
}

module.exports = LeftSide
