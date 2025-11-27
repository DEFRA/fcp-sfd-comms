#!/usr/bin/env sh

echo "configuring sqs and sns"
echo "==================="
LOCALSTACK_HOST=localhost
AWS_REGION=eu-west-2
PORT=4567

create_queue() {
  local QUEUE_NAME_TO_CREATE=$1
  local DLQ_NAME="${QUEUE_NAME_TO_CREATE}-deadletter"

  awslocal --endpoint-url=http://${LOCALSTACK_HOST}:${PORT} sqs create-queue --queue-name ${DLQ_NAME} --region ${AWS_REGION} --attributes VisibilityTimeout=60
  local DLQ_ARN=$(awslocal --endpoint-url=http://${LOCALSTACK_HOST}:${PORT} sqs get-queue-attributes --queue-url http://sqs.${AWS_REGION}.${LOCALSTACK_HOST}.localstack.cloud:${PORT}/000000000000/${DLQ_NAME} --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
  awslocal --endpoint-url=http://${LOCALSTACK_HOST}:${PORT} sqs create-queue --queue-name ${QUEUE_NAME_TO_CREATE} --region ${AWS_REGION} --attributes '{
    "VisibilityTimeout": "60",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"'${DLQ_ARN}'\",\"maxReceiveCount\":\"3\"}"
  }'
}

create_topic() {
  local TOPIC_NAME_TO_CREATE=$1
  awslocal --endpoint-url=http://${LOCALSTACK_HOST}:${PORT} sns create-topic --name ${TOPIC_NAME_TO_CREATE} --region ${AWS_REGION}
}

subscribe_queue_to_topic() {
  local TOPIC=$1
  local QUEUE=$2
  local QUEUE_ARN=$(awslocal --endpoint-url=http://${LOCALSTACK_HOST}:${PORT} sqs get-queue-attributes --queue-url http://sqs.${AWS_REGION}.${LOCALSTACK_HOST}.localstack.cloud:${PORT}/000000000000/${QUEUE} --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
  awslocal --endpoint-url=http://${LOCALSTACK_HOST}:${PORT} sns subscribe --topic-arn arn:aws:sns:${AWS_REGION}:000000000000:${TOPIC} --protocol sqs --notification-endpoint ${QUEUE_ARN} --region ${AWS_REGION}
}

create_queue "fcp_sfd_comms_request"
create_queue "fcp_fdm_events"
create_topic "fcp_sfd_comm_events"
create_topic "fcp_sfd_comms_publisher_request"
create_topic "fcp_sfd_comm_events_stub"
create_queue "fcp_sfd_comms_publisher_event_consumer"
create_queue "fcp_fdm_events-deadletter"
create_queue "fcp_sfd_comms_request-deadletter"

subscribe_queue_to_topic "fcp_sfd_comm_events" "fcp_fdm_events"
subscribe_queue_to_topic "fcp_sfd_comms_publisher_request" "fcp_sfd_comms_request"
subscribe_queue_to_topic "fcp_sfd_comm_events_stub" "fcp_sfd_comms_publisher_event_consumer"
