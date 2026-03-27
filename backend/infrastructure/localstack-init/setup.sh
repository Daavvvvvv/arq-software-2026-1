#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="http://localhost:4566"
REGION="us-east-1"
ACCOUNT="000000000000"

echo "⏳ Waiting for LocalStack..."
until curl -s "${ENDPOINT}/_localstack/health" | grep -q '"sqs": "available"'; do
  sleep 2
done
echo "✅ LocalStack ready"

awslocal() {
  aws --endpoint-url="${ENDPOINT}" --region="${REGION}" \
      --no-cli-pager "$@"
}

# ── Create DLQs first ─────────────────────────────────────────────────────────
echo "Creating DLQs..."
awslocal sqs create-queue --queue-name payment-dlq
awslocal sqs create-queue --queue-name kitchen-dlq
awslocal sqs create-queue --queue-name delivery-dlq
awslocal sqs create-queue --queue-name notification-dlq
awslocal sqs create-queue --queue-name dlq-monitor-queue

# Get DLQ ARNs
PAYMENT_DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "${ENDPOINT}/${ACCOUNT}/payment-dlq" \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

KITCHEN_DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "${ENDPOINT}/${ACCOUNT}/kitchen-dlq" \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

DELIVERY_DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "${ENDPOINT}/${ACCOUNT}/delivery-dlq" \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

NOTIFICATION_DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "${ENDPOINT}/${ACCOUNT}/notification-dlq" \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

# ── Create main queues with redrive policy ────────────────────────────────────
echo "Creating main queues..."
awslocal sqs create-queue --queue-name payment-queue \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${PAYMENT_DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}"

awslocal sqs create-queue --queue-name kitchen-queue \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${KITCHEN_DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}"

awslocal sqs create-queue --queue-name delivery-queue \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${DELIVERY_DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}"

awslocal sqs create-queue --queue-name notification-queue \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${NOTIFICATION_DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}"

# ── Create SNS Topics ─────────────────────────────────────────────────────────
echo "Creating SNS topics..."
awslocal sns create-topic --name order-events
awslocal sns create-topic --name payment-events
awslocal sns create-topic --name kitchen-events
awslocal sns create-topic --name delivery-events
awslocal sns create-topic --name notification-topic

# ── Subscribe queues to topics ────────────────────────────────────────────────
echo "Subscribing queues to topics..."

# payment-queue ← order-events
PAYMENT_QUEUE_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "${ENDPOINT}/${ACCOUNT}/payment-queue" \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
awslocal sns subscribe \
  --topic-arn "arn:aws:sns:${REGION}:${ACCOUNT}:order-events" \
  --protocol sqs --notification-endpoint "${PAYMENT_QUEUE_ARN}"

# kitchen-queue ← payment-events
KITCHEN_QUEUE_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "${ENDPOINT}/${ACCOUNT}/kitchen-queue" \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
awslocal sns subscribe \
  --topic-arn "arn:aws:sns:${REGION}:${ACCOUNT}:payment-events" \
  --protocol sqs --notification-endpoint "${KITCHEN_QUEUE_ARN}"

# delivery-queue ← kitchen-events
DELIVERY_QUEUE_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "${ENDPOINT}/${ACCOUNT}/delivery-queue" \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
awslocal sns subscribe \
  --topic-arn "arn:aws:sns:${REGION}:${ACCOUNT}:kitchen-events" \
  --protocol sqs --notification-endpoint "${DELIVERY_QUEUE_ARN}"

# notification-queue ← ALL topics (fan-out)
NOTIFICATION_QUEUE_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "${ENDPOINT}/${ACCOUNT}/notification-queue" \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

for TOPIC in order-events payment-events kitchen-events delivery-events; do
  awslocal sns subscribe \
    --topic-arn "arn:aws:sns:${REGION}:${ACCOUNT}:${TOPIC}" \
    --protocol sqs --notification-endpoint "${NOTIFICATION_QUEUE_ARN}"
done

# Set SQS policies to allow SNS to send messages
for QUEUE_URL in \
  "${ENDPOINT}/${ACCOUNT}/payment-queue" \
  "${ENDPOINT}/${ACCOUNT}/kitchen-queue" \
  "${ENDPOINT}/${ACCOUNT}/delivery-queue" \
  "${ENDPOINT}/${ACCOUNT}/notification-queue"; do
  awslocal sqs set-queue-attributes \
    --queue-url "${QUEUE_URL}" \
    --attributes '{"Policy":"{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"sns.amazonaws.com\"},\"Action\":\"sqs:SendMessage\",\"Resource\":\"*\"}]}"}'
done

echo "✅ All queues and topics created"
echo ""
echo "Topics:"
awslocal sns list-topics --query 'Topics[*].TopicArn' --output table
echo "Queues:"
awslocal sqs list-queues --output table
