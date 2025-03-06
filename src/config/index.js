import convict from 'convict'
import { serverConfig } from './server.js'
import { awsConfig } from './aws.js'
import { messagingConfig } from './messaging.js'
import { mongoConfig } from './mongo.js'

const config = convict({
  ...serverConfig,
  ...awsConfig,
  ...messagingConfig,
  ...mongoConfig
})

config.validate({ allowed: 'strict' })

export { config }
