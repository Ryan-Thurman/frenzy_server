'use strict';

const assert = require('assert');
const braintree = require('braintree');

if (!process.env.BRAINTREE_ENVIRONMENT) {
  console.warn('BRAINTREE_ENVIRONMENT is not set!');
}
if (!process.env.BRAINTREE_MERCHANT_ID) {
  console.warn('BRAINTREE_MERCHANT_ID is not set!');
}
if (!process.env.BRAINTREE_PUBLIC_KEY) {
  console.warn('BRAINTREE_PUBLIC_KEY is not set!');
}
if (!process.env.BRAINTREE_PRIVATE_KEY) {
  console.warn('BRAINTREE_PRIVATE_KEY is not set!');
}

const environmentIsConfigured =
  Boolean(process.env.BRAINTREE_ENVIRONMENT) &&
  Boolean(process.env.BRAINTREE_MERCHANT_ID) &&
  Boolean(process.env.BRAINTREE_PUBLIC_KEY) &&
  Boolean(process.env.BRAINTREE_PRIVATE_KEY);

let gateway;
if (environmentIsConfigured) {
  gateway = braintree.connect({
    environment: braintree.Environment[process.env.BRAINTREE_ENVIRONMENT],
    merchantId: process.env.BRAINTREE_MERCHANT_ID,
    publicKey: process.env.BRAINTREE_PUBLIC_KEY,
    privateKey: process.env.BRAINTREE_PRIVATE_KEY,
  });
} else {
  gateway = null;
}

module.exports = gateway;
