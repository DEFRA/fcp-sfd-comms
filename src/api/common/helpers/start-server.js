import { serverConfig } from '../../../config/index.js'
import { createServer } from '../../index.js'
import { createLogger } from './logging/logger.js'

const startServer = async () => {
  let server

  try {
    server = await createServer()
    await server.start()

    server.logger.info('Server started successfully')
    server.logger.info(
      `Access your backend on http://localhost:${serverConfig.get('port')}`
    )
  } catch (error) {
    const logger = createLogger()
    logger.info('Server failed to start :(')
    logger.error(error)
  }

  return server
}

export { startServer }
