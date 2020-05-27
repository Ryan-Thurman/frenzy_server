'use strict';

const debug = require('debug')('frenzy:models:payment');
const Big = require('big.js');
const gateway = require('../../server/lib/braintree-gateway');
const productListManager = require('../../server/lib/product-list-manager');
const app = require('../../server/server');

module.exports = function(Payment) {
  /**
   * Retrieves a Braintree client token
   * @return {Promise<string>}
   */
  Payment.getClientToken = async () => {
    if (gateway === null)
      throw new Error('Braintree gateway not configured');

    const response = await gateway.clientToken.generate();
    return response.clientToken;
  };

  /**
 * Retrieves a list of available purchases
 * @return {Promise<Array<Product>>}
 */
  Payment.getProducts = async () => {
    return productListManager.getProductList();
  };

  /**
   * Make a purchase
   * @param {string} paymentMethodNonce Nonce generated by Braintree client library
   * @param {object} options Used for obtaining the current user
   *  @see http://loopback.io/doc/en/lb3/Using-current-context.html
   * @return {Promise<Object>}
   */
  Payment.checkout = async (paymentMethodNonce, productId, options) => {
    if (gateway === null)
      throw new Error('Braintree gateway not configured');

    const product = productListManager.getProductById(productId);

    // Validate product
    if (product === null) {
      return Promise.reject({
        success: false,
        message: `Product not found for productId: ${productId}`,
      });
    }

    const transactionResult = await gateway.transaction.sale({
      amount: product.cost,
      paymentMethodNonce: paymentMethodNonce,
      options: {submitForSettlement: true},
    });

    // Handle errors
    if (!transactionResult.success) {
      console.warn('Braintree was not able to complete a transaction.', '\n', transactionResult.message);
      debug(transactionResult);

      return Promise.reject({
        success: false,
        message: transactionResult.message,
      });
    }

    const Customer = app.models.Customer;
    const userId = options.accessToken.userId;
    const customer = await Customer.findById(userId, null, options);

    const newWalletBalance = new Big(customer.usdWalletBalance)
      .plus(product.cost)
      .toFixed(4);

    await customer.updateAttribute(
      'usdWalletBalance',
      newWalletBalance,
      options
    );

    // Success!
    console.log(`Successfully charged customer <${userId}>\n`, product);
    debug(transactionResult);
    return {success: true, message: null};
  };
};