'use strict';

const isIp = require('is-ip');
const providersApi = require('@cumulus/integration-tests/api/providers');
const { getTextObject } = require('@cumulus/aws-client/S3');
const { isNonEmptyString } = require('@cumulus/common/string');

const fetchFakeProviderIp = async () => {
  if (!isNonEmptyString(process.env.FAKE_PROVIDER_CONFIG_BUCKET)) {
    throw new Error('The FAKE_PROVIDER_CONFIG_BUCKET environment variable must be set');
  }

  const ip = (await getTextObject(
    process.env.FAKE_PROVIDER_CONFIG_BUCKET, 'fake-provider-ip'
  )).trim();

  if (!isIp(ip)) {
    throw new Error(
      `Invalid fake provider IP "${ip}" fetched from s3://${process.env.FAKE_PROVIDER_CONFIG_BUCKET}/fake-provider-ip`
    );
  }

  return ip;
};

const getProviderHost = () => {
  if (isNonEmptyString(process.env.PROVIDER_HOST)) {
    return process.env.PROVIDER_HOST;
  }

  return fetchFakeProviderIp();
};

const buildFtpProvider = async (postfix = '') => {
  const provider = {
    id: `ftp_provider${postfix}`,
    protocol: 'ftp',
    host: await getProviderHost(),
    username: 'testuser',
    password: 'testpass',
    globalConnectionLimit: 10
  };

  if (isNonEmptyString(process.env.PROVIDER_FTP_PORT)) {
    provider.port = Number(process.env.PROVIDER_FTP_PORT);
  }

  return provider;
};

const buildHttpProvider = async (postfix = '') => {
  const provider = {
    id: `http_provider${postfix}`,
    protocol: 'http',
    host: await getProviderHost(),
    port: 3030,
    globalConnectionLimit: 10
  };

  if (isNonEmptyString(process.env.PROVIDER_HTTP_PORT)) {
    provider.port = Number(process.env.PROVIDER_HTTP_PORT);
  }

  return provider;
};

const createProvider = async (stackName, provider) => {
  await providersApi.deleteProvider(stackName, provider.id);
  await providersApi.createProvider(stackName, provider);
};

module.exports = {
  buildFtpProvider,
  buildHttpProvider,
  createProvider
};
