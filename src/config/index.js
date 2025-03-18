import convict from 'convict'
import { serverConfig } from './server.js'
import { notifyConfig } from './notify.js'

const config = convict({
  ...serverConfig,
  ...notifyConfig
})

config.validate({ allowed: 'strict' })

export { config }
