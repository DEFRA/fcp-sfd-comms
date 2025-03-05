import convict from 'convict'
import environments from '../api/common/constants/environments.js'

const isProduction = process.env.NODE_ENV === environments.PRODUCTION

const databaseConfig = convict({
  mongoUri: {
    doc: 'URI for mongodb',
    format: String,
    default: 'mongodb://127.0.0.1:27017/',
    env: 'MONGO_URI'
  },
  mongoDatabase: {
    doc: 'database for mongodb',
    format: String,
    default: 'fcp-sfd-comms',
    env: 'MONGO_DATABASE'
  },
  mongoOptions: {
    useNewUrlParser: {
      doc: 'Use new URL parser',
      format: Boolean,
      default: true
    },
    useUnifiedTopology: {
      doc: 'Use unified topology',
      format: Boolean,
      default: true
    },
    retryWrites: {
      doc: 'Retry writes',
      format: Boolean,
      default: true
    },
    ssl: {
      doc: 'Use SSL for connection',
      format: Boolean,
      default: isProduction
    }
  }
})

databaseConfig.validate({ allowed: 'strict' })
export default databaseConfig
