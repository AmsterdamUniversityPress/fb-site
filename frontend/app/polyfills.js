; `

Support \`forEach\` on NodeList (e.g. results of \`querySelector\`/\`querySelectorAll\`
All browsers supporting ES5.
Source: https://developer.mozilla.org/en-US/docs/Web/API/NodeList/forEach
`

if (window.NodeList && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = function (callback, thisArg) {
    thisArg = thisArg || window
    for (var i = 0; i < this.length; i++) {
      callback.call(thisArg, this[i], i, this)
    }
  }
}
