import { tracing } from '@defra/hapi-tracing'
import { serverConfig } from '../../../config/index.js'

export const requestTracing = {
  plugin: tracing.plugin,
  options: {
    tracingHeader: serverConfig.get('tracing.header')
  }
}
