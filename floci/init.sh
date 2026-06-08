#!/usr/bin/env sh

echo "Waiting for Floci to be ready..."
until aws sqs list-queues > /dev/null 2>&1; do
  sleep 1
done
echo "Floci is ready. Configuring SQS and SNS..."

create_queue() {
  local QUEUE_NAME=$1
  local DLQ_NAME="${QUEUE_NAME}-deadletter"

  aws sqs create-queue --queue-name "${DLQ_NAME}" --region "${AWS_REGION}"

  DLQ_ARN=$(aws sqs get-queue-attributes \
    --queue-url "${AWS_ENDPOINT_URL}/000000000000/${DLQ_NAME}" \
    --attribute-names QueueArn \
    --query 'Attributes.QueueArn' \
    --output text)

  aws sqs create-queue --queue-name "${QUEUE_NAME}" --region "${AWS_REGION}" \
    --attributes '{
      "VisibilityTimeout": "60",
      "RedrivePolicy": "{\"deadLetterTargetArn\":\"'"${DLQ_ARN}"'\",\"maxReceiveCount\":\"3\"}"
    }'
}

create_topic() {
  local TOPIC_NAME=$1
  aws sns create-topic --name "${TOPIC_NAME}" --region "${AWS_REGION}"
}

subscribe_queue_to_topic() {
  local TOPIC=$1
  local QUEUE=$2

  aws sns subscribe \
    --topic-arn "arn:aws:sns:${AWS_REGION}:000000000000:${TOPIC}" \
    --protocol sqs \
    --notification-endpoint "arn:aws:sqs:${AWS_REGION}:000000000000:${QUEUE}" \
    --region "${AWS_REGION}"
}

create_queue "fcp_sfd_comms_request"
create_queue "fcp_fdm_events"
create_queue "fcp_sfd_comms_publisher_event_consumer"

create_topic "fcp_sfd_comm_events"
create_topic "fcp_sfd_comms_publisher_request"
create_topic "fcp_sfd_comm_events_stub"

subscribe_queue_to_topic "fcp_sfd_comm_events" "fcp_fdm_events"
subscribe_queue_to_topic "fcp_sfd_comms_publisher_request" "fcp_sfd_comms_request"
subscribe_queue_to_topic "fcp_sfd_comm_events_stub" "fcp_sfd_comms_publisher_event_consumer"

echo "SQS and SNS configuration complete."
