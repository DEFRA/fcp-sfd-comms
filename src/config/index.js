import convict from 'convict'

import { serverConfig } from './server.js'
import { notifyConfig } from './notify.js'
import { awsConfig } from './aws.js'
import { messagingConfig } from './messaging.js'
import { mongoConfig } from './mongo.js'
import { jobsConfig } from './jobs.js'

const config = convict({
  ...serverConfig,
  ...notifyConfig,
  ...awsConfig,
  ...messagingConfig,
  ...mongoConfig,
  ...jobsConfig
})

config.validate({ allowed: 'strict' })

export { config }
