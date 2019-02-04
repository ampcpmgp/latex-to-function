module.exports = [
  // operators
  {
    text: '+',
    latex: 'x + 2',
    test: {
      args: [1],
      result: 3
    }
  },
  {
    text: '-',
    latex: 'x - 3',
    test: {
      args: [5],
      result: 2
    }
  },
  {
    text: '*',
    latex: 'x * 4',
    test: {
      args: [3],
      result: 12
    }
  },
  {
    text: '/',
    latex: 'x / 5',
    test: {
      args: [10],
      result: 2
    }
  },
  {
    text: '\\times',
    latex: 'x \\times 3',
    test: {
      args: [3],
      result: 9
    }
  },
  {
    text: '\\div',
    latex: 'x \\div 2',
    test: {
      args: [2],
      result: 1
    }
  },
  {
    text: '\\pm',
    latex: 'x \\pm 3',
    test: {
      args: [3],
      result: [0, 6]
    }
  },
  {
    text: '\\frac',
    latex: '\\frac{x}{5}',
    test: {
      args: [5],
      result: 1
    }
  },
  {
    text: '\\sqrt',
    latex: '\\sqrt{9}',
    test: {
      args: [],
      result: 3
    }
  },
  {
    text: '\\sum',
    latex: '\\sum_{i=5}^n i^2',
    test: {
      args: [6],
      result: 61
    }
  }
]
