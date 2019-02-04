module.exports = {
  // 参考URL: https://katex.org/docs/supported.html#relations
  '+': '+',
  '-': '-',
  '*': '*',
  '\\times': '*',
  '/': '/',
  '\\div': '/',
  '±': ['+', '-'],
  '\\pm': ['+', '-'], // plusmn
  '(': '(',
  '\\left': '(', // big, bigl, bigm, bigr
  // | は textordなので、別物扱いかもしれない。要調査。
  // '\\mid': '|', // middle, Big, Bigl, Bigm, Bigr,
  ')': ')',
  '\\right': ')' // bigg, biggl, biggm, biggr, Bigg, Biggl, Biggm, Biggr
}
