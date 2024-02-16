const sass = require ('sass')

module.exports = (eleventy) => {
  eleventy.addTemplateFormats ('scss')
  eleventy.addExtension ('scss', {
    outputFileExtension: 'css',
    compile: async (inputContent) => {
      const result = sass.compileString (inputContent)
      return async (_data) => result.css
    },
  })
  eleventy.addPassthroughCopy ('img')
}
