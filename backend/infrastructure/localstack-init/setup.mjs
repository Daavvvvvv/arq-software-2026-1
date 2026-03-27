#!/usr/bin/env node
import { SQSClient, CreateQueueCommand, GetQueueAttributesCommand, SetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { SNSClient, CreateTopicCommand, SubscribeCommand } from '@aws-sdk/client-sns';

const ENDPOINT = 'http://localhost:4566';
const REGION = 'us-east-1';
const ACCOUNT = '000000000000';

const sqsClient = new SQSClient({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

const snsClient = new SNSClient({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

async function waitForLocalStack(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${ENDPOINT}/_localstack/health`);
      const data = await res.json();
      if (data.services?.sqs === 'available' || data.services?.sqs === 'running') {
        console.log('✅ LocalStack ready');
        return;
      }
    } catch {}
    console.log('⏳ Waiting for LocalStack...');
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('LocalStack not ready after retries');
}

async function createQueue(name, attributes = {}) {
  await sqsClient.send(new CreateQueueCommand({ QueueName: name, Attributes: attributes }));
  const res = await sqsClient.send(new GetQueueAttributesCommand({
    QueueUrl: `${ENDPOINT}/${ACCOUNT}/${name}`,
    AttributeNames: ['QueueArn'],
  }));
  const arn = res.Attributes?.QueueArn;
  console.log(`  ✔ Queue: ${name} → ${arn}`);
  return arn;
}

async function createTopic(name) {
  const res = await snsClient.send(new CreateTopicCommand({ Name: name }));
  console.log(`  ✔ Topic: ${name} → ${res.TopicArn}`);
  return res.TopicArn;
}

async function subscribe(topicArn, queueArn) {
  await snsClient.send(new SubscribeCommand({
    TopicArn: topicArn,
    Protocol: 'sqs',
    Endpoint: queueArn,
  }));
}

async function setQueuePolicy(queueName) {
  await sqsClient.send(new SetQueueAttributesCommand({
    QueueUrl: `${ENDPOINT}/${ACCOUNT}/${queueName}`,
    Attributes: {
      Policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: { Service: 'sns.amazonaws.com' },
          Action: 'sqs:SendMessage',
          Resource: '*',
        }],
      }),
    },
  }));
}

async function main() {
  await waitForLocalStack();

  console.log('\nCreating DLQs...');
  const paymentDlqArn      = await createQueue('payment-dlq');
  const kitchenDlqArn      = await createQueue('kitchen-dlq');
  const deliveryDlqArn     = await createQueue('delivery-dlq');
  const notificationDlqArn = await createQueue('notification-dlq');
  await createQueue('dlq-monitor-queue');

  console.log('\nCreating main queues with redrive policy...');
  const redriveFor = (dlqArn) => JSON.stringify({ deadLetterTargetArn: dlqArn, maxReceiveCount: '3' });

  const paymentQueueArn      = await createQueue('payment-queue',      { RedrivePolicy: redriveFor(paymentDlqArn) });
  const kitchenQueueArn      = await createQueue('kitchen-queue',       { RedrivePolicy: redriveFor(kitchenDlqArn) });
  const deliveryQueueArn     = await createQueue('delivery-queue',      { RedrivePolicy: redriveFor(deliveryDlqArn) });
  const notificationQueueArn = await createQueue('notification-queue',  { RedrivePolicy: redriveFor(notificationDlqArn) });

  console.log('\nCreating SNS topics...');
  const orderEventsArn      = await createTopic('order-events');
  const paymentEventsArn    = await createTopic('payment-events');
  const kitchenEventsArn    = await createTopic('kitchen-events');
  const deliveryEventsArn   = await createTopic('delivery-events');
  await createTopic('notification-topic');

  console.log('\nSubscribing queues to topics...');
  await subscribe(orderEventsArn,   paymentQueueArn);      // payment listens to order-events
  await subscribe(paymentEventsArn, kitchenQueueArn);      // kitchen listens to payment-events
  await subscribe(kitchenEventsArn, deliveryQueueArn);     // delivery listens to kitchen-events

  // notification-queue: fan-out from all topics
  for (const topicArn of [orderEventsArn, paymentEventsArn, kitchenEventsArn, deliveryEventsArn]) {
    await subscribe(topicArn, notificationQueueArn);
  }

  console.log('\nSetting SQS policies...');
  for (const q of ['payment-queue', 'kitchen-queue', 'delivery-queue', 'notification-queue']) {
    await setQueuePolicy(q);
  }

  console.log('\n✅ All queues and topics created successfully');
}

main().catch(err => { console.error(err); process.exit(1); });
