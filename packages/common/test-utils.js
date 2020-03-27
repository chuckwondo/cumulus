/* eslint no-console: "off" */

'use strict';

const Ajv = require('ajv');
const crypto = require('crypto');
const path = require('path');
const RandExp = require('randexp');
const fs = require('fs-extra');

const { deprecate, isNil } = require('./util');

// From https://github.com/localstack/localstack/blob/master/README.md
const localStackPorts = {
  stepfunctions: 4585,
  apigateway: 4567,
  cloudformation: 4581,
  cloudwatch: 4582,
  cloudwatchevents: 4582,
  cloudwatchlogs: 4586,
  dynamodb: 4564,
  es: 4571,
  firehose: 4573,
  iam: 4593,
  kinesis: 4568,
  lambda: 4574,
  redshift: 4577,
  route53: 4580,
  s3: 4572,
  secretsmanager: 4584,
  ses: 4579,
  sns: 4575,
  sqs: 4576,
  ssm: 4583,
  sts: 4592
};

exports.inTestMode = () => process.env.NODE_ENV === 'test';

exports.getLocalstackEndpoint = (identifier) => {
  deprecate('@cumulus/common/test-utils/getLocalstackEndpoint', '1.17.0', '@cumulus/aws-client/test-utils/getLocalstackEndpoint');
  const key = `LOCAL_${identifier.toUpperCase()}_HOST`;
  if (process.env[key]) {
    return `http://${process.env[key]}:${localStackPorts[identifier]}`;
  }

  return `http://${process.env.LOCALSTACK_HOST}:${localStackPorts[identifier]}`;
};

/**
 * Create an AWS service object that talks to LocalStack.
 *
 * This function expects that the LOCALSTACK_HOST environment variable will be set.
 *
 * @param {Function} Service - an AWS service object constructor function
 * @param {Object} options - options to pass to the service object constructor function
 * @returns {Object} - an AWS service object
 */
function localStackAwsClient(Service, options) {
  if (!process.env.LOCALSTACK_HOST) {
    throw new Error('The LOCALSTACK_HOST environment variable is not set.');
  }

  const serviceIdentifier = Service.serviceIdentifier;

  const localStackOptions = {
    ...options,
    accessKeyId: 'my-access-key-id',
    secretAccessKey: 'my-secret-access-key',
    region: 'us-east-1',
    endpoint: exports.getLocalstackEndpoint(serviceIdentifier)
  };

  if (serviceIdentifier === 's3') localStackOptions.s3ForcePathStyle = true;

  return new Service(localStackOptions);
}

/**
 * Create a function which will allow methods of an AWS service interface object
 * to be wrapped.
 *
 * When invoked, this returned function will take two arguments:
 * - methodName - the name of the service interface object method to wrap
 * - dataHandler - a handler function which will be used to process the result
 *     of invoking `methodName`
 *
 * @param {Object} client - AWS Service interface object
 * @returns {Function} function taking a client method name and a dataHandler
 *   function to be called upon completion of the client method with return
 *   value of the client method and the original parameters passed into the
 *   client method
 *
 * @example
 * const s3 = new AWS.S3();
 *
 * // Initialize wrapper for AWS S3 service interface object
 * const s3Wrapper = awsServiceInterfaceMethodWrapper(s3);
 *
 * // Add a "RequestParams" property to the result, which shows what params were
 * // used in the `listObjects` request.  This is, obviously, a very contrived
 * // example.
 * s3Wrapper(
 *   'listObjects',
 *   (data, params) => ({ ...data, RequestParams: params })
 * );
 *
 * const result = await s3().listObjects({ Bucket: 'my-bucket' }).promise();
 *
 * assert(result.RequestParams.Bucket === 'my-bucket');
 */
const awsServiceInterfaceMethodWrapper = (client) => {
  const originalFunctions = {};

  return (methodName, dataHandler) => {
    originalFunctions[methodName] = client[methodName];

    // eslint-disable-next-line no-param-reassign
    client[methodName] = (params = {}, callback) => {
      if (callback) {
        return originalFunctions[methodName].call(
          client,
          params,
          (err, data) => {
            if (err) callback(err);
            callback(null, dataHandler(data, params));
          }
        );
      }

      return {
        promise: () => originalFunctions[methodName].call(client, params).promise()
          .then((data) => dataHandler(data, params))
      };
    };
  };
};

/**
 * Test if a given AWS service is supported by LocalStack.
 *
 * @param {Function} Service - an AWS service object constructor function
 * @returns {boolean} true or false depending on whether the service is
 *   supported by LocalStack
 */
function localstackSupportedService(Service) {
  const serviceIdentifier = Service.serviceIdentifier;
  return Object.keys(localStackPorts).includes(serviceIdentifier);
}

exports.testAwsClient = (Service, options) => {
  deprecate('@cumulus/common/test-utils/testAwsClient', '1.17.0', '@cumulus/aws-client/test-utils/testAwsClient');
  if (Service.serviceIdentifier === 'lambda') {
    // This is all a workaround for a Localstack bug where the Lambda event source mapping state
    // is not respected and is always 'Enabled'. To work around this, we keep the state of each
    // event source mapping internally and override the event source mapping functions to set
    // and use the internal states. This can be removed when the Localstack issue is fixed.
    const lambdaClient = localStackAwsClient(Service, options);

    const eventSourceMappingStates = {};

    const deleteState = (UUID) => {
      delete eventSourceMappingStates[UUID];
    };

    const getState = (UUID) => eventSourceMappingStates[UUID];

    const setState = (state, UUID) => {
      eventSourceMappingStates[UUID] = state;
    };

    const lambdaWrapper = awsServiceInterfaceMethodWrapper(lambdaClient);

    lambdaWrapper(
      'createEventSourceMapping',
      (data, params) => {
        setState((isNil(params.Enabled) || params.Enabled) ? 'Enabled' : 'Disabled', data.UUID);
        return { ...data, State: getState(data.UUID) };
      }
    );

    lambdaWrapper(
      'deleteEventSourceMapping',
      (data, params) => {
        deleteState(params.UUID);
        return { ...data, State: '' };
      }
    );

    lambdaWrapper(
      'getEventSourceMapping',
      (data) => ({ ...data, State: getState(data.UUID) })
    );

    lambdaWrapper(
      'listEventSourceMappings',
      (data) => ({
        ...data,
        EventSourceMappings: data.EventSourceMappings
          .filter((esm) => Object.keys(eventSourceMappingStates).includes(esm.UUID))
          .map((esm) => ({ ...esm, State: getState(esm.UUID) }))
      })
    );

    lambdaWrapper(
      'updateEventSourceMapping',
      (data, params) => {
        if (!isNil(params.Enabled)) {
          const enabled = isNil(params.Enabled) || params.Enabled;
          setState(enabled ? 'Enabled' : 'Disabled', data.UUID);
        }
        return { ...data, State: getState(data.UUID) };
      }
    );

    return lambdaClient;
  }

  if (localstackSupportedService(Service)) {
    return localStackAwsClient(Service, options);
  }

  return {};
};

/**
 * Helper function to throw error for unit test exports
 * @throws {Error}
 */
function throwTestError() {
  throw (new Error('This function is only exportable when NODE_ENV === test for unit test purposes'));
}
exports.throwTestError = throwTestError;

/**
 * Generate a [40 character] random string
 *
 * @param {number} numBytes - number of bytes to use in creating a random string
 *                 defaults to 20 to produce a 40 character string
 * @returns {string} - a random string
 */
exports.randomString = (numBytes = 20) => crypto.randomBytes(numBytes).toString('hex');


/**
 * Postpend a [10-character] random string to input identifier.
 *
 * @param {string} id - identifer to return
 * @param {number} numBytes - number of bytes to use to compute random
 *                 extension. Default 5 to produce 10 characters..
 * @returns {string} - a random string
 */
exports.randomId = (id, numBytes = 5) => `${id}${exports.randomString(numBytes)}`;

/**
 * Generate a random for the given scale.
 *
 * Defaults to a number between 1 and 10.
 *
 * @param {number} scale - scale for the random number. Defaults to 10.
 * @returns {number} - a random number
 */
exports.randomNumber = (scale = 10) => Math.ceil(Math.random() * scale);

/**
 * Create a random granule id from the regular expression
 *
 * @param {string} regex - regular expression string
 * @returns {string} - random granule id
 */
exports.randomStringFromRegex = (regex) => new RandExp(regex).gen();

/**
 * Validate an object using json-schema
 *
 * Issues a test failure if there were validation errors
 *
 * @param {Object} t - an ava test
 * @param {string} schemaFilename - the filename of the schema
 * @param {Object} data - the object to be validated
 * @returns {Promise<boolean>} - whether the object is valid or not
 */
async function validateJSON(t, schemaFilename, data) {
  const schemaName = path.basename(schemaFilename).split('.')[0];
  const schema = await fs.readFile(schemaFilename, 'utf8').then(JSON.parse);
  const ajv = new Ajv();
  const valid = ajv.validate(schema, data);
  if (!valid) {
    const message = `${schemaName} validation failed: ${ajv.errorsText()}`;
    console.log(message);
    console.log(JSON.stringify(data, null, 2));
    t.fail(message);
    throw new Error(message);
  }
  return valid;
}

/**
 * Validate a task input object using json-schema
 *
 * Issues a test failure if there were validation errors
 *
 * @param {Object} t - an ava test
 * @param {Object} data - the object to be validated
 * @returns {boolean} - whether the object is valid or not
 */
async function validateInput(t, data) {
  return validateJSON(t, './schemas/input.json', data);
}
exports.validateInput = validateInput;

/**
 * Validate a task config object using json-schema
 *
 * Issues a test failure if there were validation errors
 *
 * @param {Object} t - an ava test
 * @param {Object} data - the object to be validated
 * @returns {Promise<boolean>} - whether the object is valid or not
 */
async function validateConfig(t, data) {
  return validateJSON(t, './schemas/config.json', data);
}
exports.validateConfig = validateConfig;

/**
 * Validate a task output object using json-schema
 *
 * Issues a test failure if there were validation errors
 *
 * @param {Object} t - an ava test
 * @param {Object} data - the object to be validated
 * @returns {Promise<boolean>} - whether the object is valid or not
 */
async function validateOutput(t, data) {
  return validateJSON(t, './schemas/output.json', data);
}
exports.validateOutput = validateOutput;

/**
 * Determine the path of the current git repo
 *
 * @param {string} dirname - the directory that you're trying to find the git
 *   root for
 * @returns {Promise.<string>} - the filesystem path of the current git repo
 */
async function findGitRepoRootDirectory(dirname) {
  if (await fs.pathExists(path.join(dirname, '.git'))) return dirname;

  // This indicates that we've reached the root of the filesystem
  if (path.dirname(dirname) === dirname) {
    throw new Error('Unable to determine git repo root directory');
  }

  return findGitRepoRootDirectory(path.dirname(dirname));
}
exports.findGitRepoRootDirectory = findGitRepoRootDirectory;

/**
 * Determine the path of the packages/test-data directory
 *
 * @returns {Promise.<string>} - the filesystem path of the packages/test-data directory
 */
function findTestDataDirectory() {
  return exports.findGitRepoRootDirectory(process.cwd())
    .then((gitRepoRoot) => path.join(gitRepoRoot, 'packages', 'test-data'));
}
exports.findTestDataDirectory = findTestDataDirectory;


function readJsonFixture(fixturePath) {
  return fs.readFile(fixturePath).then((obj) => JSON.parse(obj));
}

exports.readJsonFixture = readJsonFixture;

/**
 * Prettify and display something to the console.
 *
 * This is only intended to be used during debugging.
 *
 * @param {Object|Array} object - an object or array to be stringifyed
 * @returns {undefined} - no return value
 */
function jlog(object) {
  console.log(JSON.stringify(object, null, 2));
}
exports.jlog = jlog;

const throwThrottlingException = () => {
  const throttlingException = new Error('ThrottlingException');
  throttlingException.code = 'ThrottlingException';

  throw throttlingException;
};

/**
 * Return a function that throws a ThrottlingException the first time it is called, then returns as
 * normal any other times.
 *
 * @param {Function} fn
 * @returns {Function}
 */
exports.throttleOnce = (fn) => {
  deprecate('@cumulus/common/test-utils/throttleOnce', '1.20.0');
  let throttleNextCall = true;

  return (...args) => {
    if (throttleNextCall) {
      throttleNextCall = false;
      throwThrottlingException();
    }

    return fn(...args);
  };
};
