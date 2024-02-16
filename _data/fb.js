const fs = require ('fs')

const environment = process.env.FB_ENV
if (!environment) throw new Error ('Missing FB_ENV variable')

const fbData = (env) => JSON.parse (
  fs.readFileSync (`__data/fb-data-${env}.json`).toString (),
)
  // .slice(0, 40)

module.exports = () => ({
  environment,
  'fbdata': fbData (environment),
})
