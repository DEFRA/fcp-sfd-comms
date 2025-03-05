#!/bin/bash
set -e  # Exit immediately if a command fails

# AWS credentials for LocalStack
export AWS_REGION=eu-west-2
export AWS_DEFAULT_REGION=eu-west-2
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

# LocalStack endpoint
ENDPOINT="http://localhost:4566"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up LocalStack environment for Azure to AWS migration...${NC}"

# Function to check if LocalStack is running
check_localstack() {
  echo "Checking if LocalStack is running..."
  if ! curl -s $ENDPOINT/health > /dev/null; then
    echo -e "${YELLOW}LocalStack doesn't appear to be running at $ENDPOINT${NC}"
    echo "Please make sure LocalStack is started with: docker run --name localstack -p 4566:4566 -e SERVICES=sns,sqs,s3 localstack/localstack"
    exit 1
  fi
  echo -e "${GREEN}LocalStack is running.${NC}"
}

# Function to create SNS topics, SQS queues, and connect them
setup_messaging() {
  echo -e "\n${YELLOW}Creating SNS topics to replace Azure Service Bus topics...${NC}"
  # Creating primary communication topic (equivalent to your main Service Bus topic)
  aws --endpoint-url=$ENDPOINT sns create-topic --name fcp-sfd-comms-topic
  # Creating data layer topic (equivalent to your data topic)
  aws --endpoint-url=$ENDPOINT sns create-topic --name fcp-sfd-data-topic
  
  echo -e "\n${YELLOW}Creating SQS queues to replace Azure Service Bus subscriptions...${NC}"
  # Creating main queue for processing (equivalent to your Service Bus subscription)
  aws --endpoint-url=$ENDPOINT sqs create-queue --queue-name fcp-sfd-comms-queue
  # Creating a dead-letter queue for failed message processing
  aws --endpoint-url=$ENDPOINT sqs create-queue --queue-name fcp-sfd-comms-dlq
  
  # Get ARNs and URLs for the created resources
  COMMS_TOPIC_ARN=$(aws --endpoint-url=$ENDPOINT sns list-topics --query 'Topics[?contains(TopicArn, `fcp-sfd-comms-topic`)].TopicArn' --output text)
  DATA_TOPIC_ARN=$(aws --endpoint-url=$ENDPOINT sns list-topics --query 'Topics[?contains(TopicArn, `fcp-sfd-data-topic`)].TopicArn' --output text)
  QUEUE_URL=$(aws --endpoint-url=$ENDPOINT sqs list-queues --queue-name-prefix fcp-sfd-comms-queue --query 'QueueUrls[0]' --output text)
  DLQ_URL=$(aws --endpoint-url=$ENDPOINT sqs list-queues --queue-name-prefix fcp-sfd-comms-dlq --query 'QueueUrls[0]' --output text)
  QUEUE_ARN=$(aws --endpoint-url=$ENDPOINT sqs get-queue-attributes --queue-url $QUEUE_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
  DLQ_ARN=$(aws --endpoint-url=$ENDPOINT sqs get-queue-attributes --queue-url $DLQ_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
  
  # Set DLQ for main queue (handles failed message processing)
  echo -e "\n${YELLOW}Configuring dead-letter queue...${NC}"
  aws --endpoint-url=$ENDPOINT sqs set-queue-attributes \
      --queue-url $QUEUE_URL \
      --attributes "{\"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"5\\\"}\"}"
  
  echo -e "\n${YELLOW}Subscribing queue to topics...${NC}"
  # Subscribe the queue to the comms topic
  aws --endpoint-url=$ENDPOINT sns subscribe \
      --topic-arn $COMMS_TOPIC_ARN \
      --protocol sqs \
      --notification-endpoint $QUEUE_ARN
  
  echo -e "\n${YELLOW}Setting up queue policies...${NC}"
  # Allow SNS to send messages to the queue
  aws --endpoint-url=$ENDPOINT sqs set-queue-attributes \
      --queue-url $QUEUE_URL \
      --attributes "{\"Policy\": \"{\\\"Version\\\": \\\"2012-10-17\\\", \\\"Statement\\\": [{\\\"Effect\\\": \\\"Allow\\\", \\\"Principal\\\": \\\"*\\\", \\\"Action\\\": \\\"sqs:SendMessage\\\", \\\"Resource\\\": \\\"$QUEUE_ARN\\\", \\\"Condition\\\": {\\\"ArnEquals\\\": {\\\"aws:SourceArn\\\": [\\\"$COMMS_TOPIC_ARN\\\", \\\"$DATA_TOPIC_ARN\\\"]}}}]}\"}"
}

# Function to test messaging
test_messaging() {
  echo -e "\n${YELLOW}Testing SNS/SQS messaging...${NC}"
  # Get the topic ARN
  TOPIC_ARN=$(aws --endpoint-url=$ENDPOINT sns list-topics --query 'Topics[?contains(TopicArn, `fcp-sfd-comms-topic`)].TopicArn' --output text)
  QUEUE_URL=$(aws --endpoint-url=$ENDPOINT sqs list-queues --queue-name-prefix fcp-sfd-comms-queue --query 'QueueUrls[0]' --output text)
  
  # Send a test message
  echo "Sending test message to SNS topic..."
  MESSAGE_ID=$(aws --endpoint-url=$ENDPOINT sns publish --topic-arn $TOPIC_ARN --message '{"test":"This is a test message"}' --query 'MessageId' --output text)
  echo "Message sent with ID: $MESSAGE_ID"
  
  # Wait a moment for message delivery
  echo "Waiting for message to be delivered to SQS..."
  sleep 3
  
  # Receive the message from SQS
  echo "Receiving message from SQS..."
  MESSAGES=$(aws --endpoint-url=$ENDPOINT sqs receive-message --queue-url $QUEUE_URL --attribute-names All --message-attribute-names All --max-number-of-messages 10)
  
  if [[ $MESSAGES == *"Body"* ]]; then
    echo -e "${GREEN}Test message received successfully!${NC}"
    echo "Message content:"
    echo "$MESSAGES" | grep -o '"Body"[^}]*' | sed 's/"Body": "//' | sed 's/"//'
  else
    echo -e "${YELLOW}No message received. Something might be wrong with the setup.${NC}"
  fi
}

# Function to print configuration for application
print_config() {
  echo -e "\n${YELLOW}Configuration for your application:${NC}"
  COMMS_TOPIC_ARN=$(aws --endpoint-url=$ENDPOINT sns list-topics --query 'Topics[?contains(TopicArn, `fcp-sfd-comms-topic`)].TopicArn' --output text)
  DATA_TOPIC_ARN=$(aws --endpoint-url=$ENDPOINT sns list-topics --query 'Topics[?contains(TopicArn, `fcp-sfd-data-topic`)].TopicArn' --output text)
  QUEUE_URL=$(aws --endpoint-url=$ENDPOINT sqs list-queues --queue-name-prefix fcp-sfd-comms-queue --query 'QueueUrls[0]' --output text)
  
  echo -e "${GREEN}# Environment variables to use in your application${NC}"
  echo "SNS_TOPIC_ARN=$COMMS_TOPIC_ARN"
  echo "DATA_TOPIC_ARN=$DATA_TOPIC_ARN"
  echo "SQS_QUEUE_URL=$QUEUE_URL"
  echo "AWS_ENDPOINT_URL=$ENDPOINT"
  
  echo -e "\n${GREEN}# Add these to your .env file:${NC}"
  echo "SNS_TOPIC_ARN=$COMMS_TOPIC_ARN"
  echo "DATA_TOPIC_ARN=$DATA_TOPIC_ARN"
  echo "SQS_QUEUE_URL=$QUEUE_URL"
  echo "AWS_ENDPOINT_URL=$ENDPOINT"
  echo "AWS_REGION=$AWS_REGION"
  echo "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID"
  echo "AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY"
}

# Main execution
check_localstack
setup_messaging
test_messaging
print_config

echo -e "\n${GREEN}LocalStack setup completed successfully.${NC}"
echo "Your local AWS environment is now configured with resources equivalent to your Azure services."
echo "Use the configuration above in your application."