import { MongoClient } from 'mongodb'
import { config } from '../config/index.js'
import { createSecureContext } from '../api/common/helpers/secure-context/secure-context.js'
import { createLogger } from '../logging/logger.js'

const logger = createLogger()

const secureContext = createSecureContext(logger)

const client = await MongoClient.connect(config.get('mongo.mongoUri'), {
  connectTimeoutMS: 10000,
  retryWrites: false,
  readPreference: 'secondary',
  ...(secureContext && { secureContext })
})

const dbClient = client.db(config.get('mongo.database'))

logger.info('Connected to MongoDB')

export default dbClient
