import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'

export default {
  input: 'src/func-info.js',
  output: {
    file: 'dist/func-info.js',
    format: 'iife'
  },
  plugins: [
    nodeResolve({
      jsnext: true,
      main: true
    }),

    commonjs({
      include: 'node_modules/**',
      sourceMap: false
    })
  ]
}
