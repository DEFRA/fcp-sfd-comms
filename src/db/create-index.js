import { createLogger } from '../logging/logger.js'

const logger = createLogger()

export const createIndex = async (collection, params, indexName) => {
  try {
    await collection.createIndex(
      params,
      {
        unique: true,
        name: indexName
      }
    )

    logger.info(`Index has been created: ${indexName}`)
  } catch (error) {
    logger.error(`Unable to create index ${indexName}: ${error}`)
  }
}
