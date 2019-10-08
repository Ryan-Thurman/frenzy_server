/** @see https://developers.braintreepayments.com/reference/general/testing/node */

'use strict';

const request = require('supertest');
const expect = require('../../../helpers/expect-preconfigured');
const Big = require('big.js');

const app = require('../../../../server/server');

const Braintree = require('braintree').Test;

const {givenLoggedInCustomer} = require('../../../helpers/customer.helpers');
const {givenEmptyDatabase} = require('../../../helpers/database.helpers');

const productListManager = require('../../../../server/lib/product-list-manager');
const {Product} = productListManager;

const Customer = app.models.Customer;

describe('integration: Payment (rest)', () => {
  beforeEach(givenEmptyDatabase);

  let token, customer;
  beforeEach('given logged in customer and fantasy league', async () => {
    ({token, customer} = await givenLoggedInCustomer());
  });

  describe('getClientToken', () => {
    it('should generate a client token', async () => {
      const response = await request(app)
        .get('/api/payments/client-token')
        .query({'access_token': token.id});

      expect(response.status).to.equal(200);
      expect(response.body).to.be.a('string');
    }).timeout(5000);
  });

  describe('getProducts', () => {
    it('should return the product list', async () => {
      const response = await request(app)
        .get('/api/payments/products')
        .query({'access_token': token.id});

      expect(response.body).to.deep.equal(productListManager.getProductList());
    });
  });

  describe('checkout', () => {
    describe('successful transaction', () => {
      const validNonces = [
        Braintree.Nonces.Transactable,
        Braintree.Nonces.TransactableVisa,
        Braintree.Nonces.TransactableAmEx,
        Braintree.Nonces.TransactableMasterCard,
        Braintree.Nonces.TransactableDiscover,
        Braintree.Nonces.TransactablePrepaid,
        Braintree.Nonces.TransactableDebit,
        'fake-valid-no-billing-address-nonce',
        Braintree.Nonces.PayPalOneTimePayment,
        // @todo Configure Apple Pay on Sandbox
        // Braintree.Nonces.ApplePayVisa,
        // Braintree.Nonces.ApplePayMasterCard,
        // Braintree.Nonces.ApplePayAmEx,
        Braintree.Nonces.AndroidPay,
        Braintree.Nonces.AndroidPayDiscover,
        Braintree.Nonces.AndroidPayVisa,
        Braintree.Nonces.AndroidPayMasterCard,
        Braintree.Nonces.AndroidPayAmEx,
      ];

      for (const nonce of validNonces) {
        it(`should create a transaction for nonce: ${nonce}`, async () => {
          const product = productListManager.getProductList()[0];

          const response = await request(app)
            .post('/api/payments/checkout')
            .send({
              paymentMethodNonce: nonce,
              productId: product.id,
            })
            .query({'access_token': token.id});

          // Check call was successfull
          expect(response.status).to.equal(200);

          // Check balance was updated
          customer = await customer.reload();
          const actualBalance = new Big(customer.usdWalletBalance).toFixed(2);
          const expectedBalance = new Big(product.cost).toFixed(2);
          expect(actualBalance).to.equal(expectedBalance);
        }).timeout(5000);
      }
    });

    describe('unsuccessful transaction', () => {
      after('cleanup test products', () => productListManager.resetToDefault());

      describe('gateway rejected', () => {
        before('add test product', () => {
          productListManager.useProductList([
            new Product(2, 'gateway failure', '5001.00', 0),
          ]);
        });

        const gatewayRejectedNonces = [
          Braintree.Nonces.Consumed,
          Braintree.Nonces.LuhnInvalid,
          Braintree.Nonces.GatewayRejectedFraud,
        ];

        for (const nonce of gatewayRejectedNonces) {
          it(`should display gateway error for nonce: ${nonce}`, async () => {
            const response = await request(app)
              .post('/api/payments/checkout')
              .send({paymentMethodNonce: nonce, productId: 2})
              .query({'access_token': token.id});

            expect(response.status).to.equal(500);
          }).timeout(5000);
        }
      });

      describe('processor rejected', () => {
        before('add test product', () => {
          productListManager.useProductList([
            new Product(3, 'processor failure', '2000.00', 0),
          ]);
        });

        const processorRejectedNonces = [
          Braintree.Nonces.ProcessorDeclinedVisa,
          Braintree.Nonces.ProcessorDeclinedMasterCard,
          Braintree.Nonces.ProcessorDeclinedAmEx,
          Braintree.Nonces.ProcessorDeclinedDiscover,
        ];

        for (const nonce of processorRejectedNonces) {
          it(`should display processor error for nonce: ${nonce}`, async () => {
            const response = await request(app)
              .post('/api/payments/checkout')
              .send({paymentMethodNonce: nonce, productId: 3})
              .query({'access_token': token.id});

            expect(response.status).to.equal(500);
          }).timeout(5000);
        }
      });
    });
  });
});
