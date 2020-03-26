'use strict';

const { getJsonS3Object } = require('@cumulus/aws-client/S3');
const { sendSQSMessage } = require('@cumulus/aws-client/SQS');
const { getExecutionArn } = require('@cumulus/aws-client/StepFunctions');

const {
  buildQueueMessageFromTemplate,
  getQueueNameByUrl
} = require('@cumulus/common/message');

const {
  getWorkflowArn,
  templateKey
} = require('@cumulus/common/workflows');


/**
 * Enqueue a PDR to be parsed
 *
 * @param {Object} params
 * @param {Object} params.pdr - the PDR to be enqueued for parsing
 * @param {string} params.queueUrl - the SQS queue to add the message to
 * @param {string} params.parsePdrMessageTemplateUri - the S3 URI of template for
 * a PDR parse message
 * @param {Object} params.provider - the provider config to be attached to the message
 * @param {Object} params.collection - the collection config to be attached to the
 *   message
 * @param {string} params.parentExecutionArn - parent workflow execution arn to add to the message
 * @returns {Promise} - resolves when the message has been enqueued
 */
async function enqueueParsePdrMessage({
  collection,
  parentExecutionArn,
  parsePdrWorkflow,
  pdr,
  provider,
  stack,
  systemBucket,
  queueUrl
}) {
  const messageTemplate = await getJsonS3Object(systemBucket, templateKey(stack));
  const parsePdrArn = await getWorkflowArn(stack, systemBucket, parsePdrWorkflow);
  const queueName = getQueueNameByUrl(messageTemplate, queueUrl);
  const payload = { pdr };
  const workflow = {
    name: parsePdrWorkflow,
    arn: parsePdrArn
  };

  const message = buildQueueMessageFromTemplate({
    collection,
    messageTemplate,
    parentExecutionArn,
    payload,
    provider,
    queueName,
    workflow
  });

  const arn = getExecutionArn(
    message.cumulus_meta.state_machine,
    message.cumulus_meta.execution_name
  );

  await sendSQSMessage(queueUrl, message);

  return arn;
}
module.exports.enqueueParsePdrMessage = enqueueParsePdrMessage;

/**
 * Enqueue a granule to be ingested
 *
 * @param {Object} params
 * @param {Object} params.granule - the granule to be enqueued for ingest
 * @param {string} params.queueUrl - the SQS queue to add the message to
 * @param {string} params.granuleIngestMessageTemplateUri - the S3 URI of template for
 * a granule ingest message
 * @param {Object} params.provider - the provider config to be attached to the message
 * @param {Object} params.collection - the collection config to be attached to the
 *   message
 * @param {Object} params.pdr - an optional PDR to be configured in the message payload
 * @param {string} params.parentExecutionArn - parent workflow execution arn to add to the message
 * @returns {Promise} - resolves when the message has been enqueued
 */
async function enqueueGranuleIngestMessage({
  collection,
  granule,
  granuleIngestWorkflow,
  parentExecutionArn,
  pdr,
  provider,
  stack,
  systemBucket,
  queueUrl
}) {
  const messageTemplate = await getJsonS3Object(systemBucket, templateKey(stack));
  const ingestGranuleArn = await getWorkflowArn(stack, systemBucket, granuleIngestWorkflow);
  const queueName = getQueueNameByUrl(messageTemplate, queueUrl);

  const payload = {
    granules: [
      granule
    ]
  };

  const workflow = {
    name: granuleIngestWorkflow,
    arn: ingestGranuleArn
  };

  const message = buildQueueMessageFromTemplate({
    collection,
    messageTemplate,
    parentExecutionArn,
    payload,
    provider,
    queueName,
    workflow
  });

  if (pdr) message.meta.pdr = pdr;

  const arn = getExecutionArn(
    message.cumulus_meta.state_machine,
    message.cumulus_meta.execution_name
  );

  await sendSQSMessage(queueUrl, message);

  return arn;
}
exports.enqueueGranuleIngestMessage = enqueueGranuleIngestMessage;
