import convict from 'convict'
import environments from '../api/common/constants/environments.js'

const isProduction = process.env.NODE_ENV === environments.PRODUCTION
const isDev = process.env.NODE_ENV === environments.DEVELOPMENT

const messageConfig = convict({
  aws: {
    region: {
      doc: 'AWS region',
      format: String,
      default: 'eu-west-2',
      env: 'AWS_REGION'
    },
    accessKeyId: {
      doc: 'AWS access key ID',
      format: String,
      default: 'test',
      env: 'AWS_ACCESS_KEY_ID'
    },
    secretAccessKey: {
      doc: 'AWS secret access key',
      format: String,
      default: 'test',
      env: 'AWS_SECRET_ACCESS_KEY'
    },
    endpoint: {
      doc: 'Custom endpoint for AWS services (for LocalStack)',
      format: String,
      default: isDev ? 'http://localhost:4566' : null,
      nullable: true,
      env: 'AWS_ENDPOINT_URL'
    },
    useIamRole: {
      doc: 'Use IAM role for authentication',
      format: Boolean,
      default: isProduction
    }
  },
  sns: {
    commsTopicArn: {
      doc: 'ARN of the communications SNS topic',
      format: String,
      default: null,
      nullable: true,
      env: 'SNS_TOPIC_ARN'
    },
    dataTopicArn: {
      doc: 'ARN of the data SNS topic',
      format: String,
      default: null,
      nullable: true,
      env: 'DATA_TOPIC_ARN'
    }
  },
  sqs: {
    queueUrl: {
      doc: 'URL of the SQS queue',
      format: String,
      default: null,
      nullable: true,
      env: 'SQS_QUEUE_URL'
    },
    visibilityTimeout: {
      doc: 'Visibility timeout for SQS messages (in seconds)',
      format: Number,
      default: 30,
      env: 'SQS_VISIBILITY_TIMEOUT'
    },
    waitTimeSeconds: {
      doc: 'Long polling wait time (in seconds)',
      format: Number,
      default: 20,
      env: 'SQS_WAIT_TIME'
    },
    maxMessages: {
      doc: 'Maximum number of messages to retrieve per request',
      format: Number,
      default: 10,
      env: 'SQS_MAX_MESSAGES'
    }
  }
})

messageConfig.validate({ allowed: 'strict' })
export default messageConfig
