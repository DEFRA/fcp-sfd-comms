# Discovery Patterns

This reference teaches the agent how to find messaging-related code in **any** project. Use these search patterns during Step 0 (Project Discovery) to build the Service Inventory.

Search broadly first, then narrow down. Not all patterns will match in every project — that's expected. The goal is to find what exists, not to require everything.

---

## 1. Finding AsyncAPI Spec Files

### File name patterns
```
**/asyncapi*.yaml
**/asyncapi*.yml
**/asyncapi*.json
```

### Common locations
- `docs/`
- `api/`
- `spec/`
- `specifications/`
- Project root

### Verification
After finding a candidate file, confirm it contains an `asyncapi` field at the root level whose value starts with `3.` (e.g. `3.0.0`, `3.1.0`).

---

## 2. Finding Messaging Infrastructure Code

Search for import/require statements and instantiation patterns for common messaging libraries.

### Amazon SQS / SNS
```
@aws-sdk/client-sqs
@aws-sdk/client-sns
aws-sdk.*SQS
aws-sdk.*SNS
sqs-consumer
SQSClient
SNSClient
SendMessageCommand
PublishCommand
ReceiveMessageCommand
DeleteMessageCommand
```

### Apache Kafka
```
kafkajs
kafka-node
node-rdkafka
confluent-kafka
KafkaProducer
KafkaConsumer
kafka.producer
kafka.consumer
```

### RabbitMQ / AMQP
```
amqplib
amqp-connection-manager
rhea
channel.assertQueue
channel.assertExchange
channel.publish
channel.consume
channel.sendToQueue
```

### Azure Service Bus
```
@azure/service-bus
ServiceBusClient
ServiceBusSender
ServiceBusReceiver
ServiceBusAdministrationClient
createSender
createReceiver
sendMessages
receiveMessages
subscribe
deadLetterOptions
```

### NATS
```
nats
nats.ws
NatsConnection
nc.publish
nc.subscribe
JetStream
```

### Redis Streams / Pub-Sub
```
ioredis
redis
xadd
xread
xreadgroup
subscribe
publish
```

### General messaging patterns (language-agnostic)
Search for function/method names containing:
```
publish|subscribe|consume|produce|sendMessage|receiveMessage|onMessage|handleMessage|processMessage|dispatch|emit|broadcast
```

---

## 3. Finding Validation Schemas

### Joi (Node.js)
```
Joi.object(
Joi.string()
Joi.number()
Joi.boolean()
Joi.array()
Joi.alternatives()
.validate(
.validateAsync(
schema.validate
```

### Zod (TypeScript/JavaScript)
```
z.object(
z.string()
z.number()
z.boolean()
z.array(
z.enum(
.parse(
.safeParse(
.parseAsync(
```

### Yup (JavaScript)
```
yup.object(
yup.string()
yup.number()
Yup.object(
Yup.string()
.validate(
.isValid(
```

### JSON Schema
```
"$schema"
"type": "object"
"properties"
"required"
ajv
jsonschema
json-schema
```

### class-validator (TypeScript)
```
@IsString()
@IsNumber()
@IsUUID()
@IsEmail()
@IsEnum(
@IsOptional()
@ValidateNested()
class-validator
```

### General validation patterns
Search for files or directories named:
```
**/schema*
**/schemas/**
**/validation/**
**/validators/**
**/dto/**
**/models/**
```

---

## 4. Finding Event Type Constants

### Reverse-DNS event type strings
Many event-driven services use reverse-DNS notation for event types:
```
uk.gov.
com.example.
org.
io.
```

### Constant definition patterns
```
const.*EVENT
const.*event.*=.*'
EVENT_TYPE
eventType
MessageType
NOTIFICATION
notification.request
notification.received
notification.sending
notification.delivered
notification.failure
```

### Enum patterns (TypeScript)
```
enum.*Event
enum.*Message
enum.*Type
```

### Status/event mapping objects
Search for objects that map status values to event types:
```
statusToEvent
eventMap
statusMap
typeMap
```

---

## 5. Finding Message Builders / Factories

### CloudEvents pattern
Services using CloudEvents typically construct objects with these fields:
```
specversion
datacontenttype
correlationId
source.*=
type.*=
data.*=
```

### General builder patterns
Search for functions that construct message payloads:
```
buildMessage
createMessage
buildEvent
createEvent
buildPayload
createPayload
toMessage
toEvent
formatMessage
```

### Look for outbound message construction
Search for directories or files named:
```
**/outbound/**
**/publishers/**
**/producers/**
**/events/**
**/dispatchers/**
```

---

## 6. Finding Messaging Configuration

### Environment variable patterns
Search config files for variables containing:
```
QUEUE_URL
QUEUE_NAME
TOPIC_ARN
TOPIC_NAME
BROKER_URL
BROKER_ADDRESS
KAFKA_BOOTSTRAP
KAFKA_BROKER
AMQP_URL
NATS_URL
REDIS_URL
SQS_ENDPOINT
SNS_ENDPOINT
DEAD_LETTER
DLQ
```

### Configuration file patterns
Search for files named:
```
**/config/messaging*
**/config/queue*
**/config/broker*
**/config/aws*
**/config/kafka*
**/config/amqp*
**/config/nats*
```

### Infrastructure-as-code references
Queue/topic definitions may also exist in:
```
**/compose*.yaml
**/compose*.yml
**/docker-compose*
**/terraform/**
**/cloudformation/**
**/serverless.yml
**/cdk/**
```

---

## 7. Finding Status Constants

### Status value definitions
```
STATUS
status
PENDING
CREATED
SENDING
DELIVERED
FAILURE
FAILED
SUCCESS
COMPLETED
REJECTED
EXPIRED
RETRYING
RETRY
```

### Status category groupings
Look for objects or arrays that categorise statuses:
```
terminalStatuses
finalStatuses
retryableStatuses
transientStatuses
publishedStatuses
finishedStatuses
```

---

## Search Strategy

1. **Start broad**: Search for the most distinctive patterns first (e.g. `asyncapi`, messaging library imports, reverse-DNS strings)
2. **Follow imports**: When you find a messaging file, trace its imports to find related schemas, constants, and config
3. **Check test files**: Test mocks and fixtures often contain realistic message examples that reveal the actual shape of messages
4. **Check package.json/build files**: Dependencies list confirms which messaging libraries are in use
5. **Don't assume directory structure**: Some projects use flat structures, others use deep nesting. Let the search results guide you
