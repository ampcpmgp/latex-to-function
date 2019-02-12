const is = require('./is')

class LeftSide {
  static info (items) {
    const firstItem = items[0]
    const isFunction = is.function(firstItem)
    const isVariable = is.variable(firstItem)
    const name = items[0].text
    const args = []

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
      isFunction,
      isVariable,
      args // if function then set argument names
    }
  }
}

module.exports = LeftSide
