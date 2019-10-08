'use strict';

const app = require('../../server/server');

module.exports = function(Customer) {
  Customer.afterRemote('**', async (ctx, modelInstance) => {
    if (!ctx.result) return;

    let updatedResult;
    if (Array.isArray(modelInstance)) {
      updatedResult = await Promise.all(ctx.result.map(customer => omitUnpermittedFields(customer, ctx)));
    } else {
      updatedResult = await omitUnpermittedFields(ctx.result, ctx);
    }

    ctx.result = updatedResult;
  });

  /**
   * Checks permissions and removed any fields that user is not allowed to access;
   * @param {Customer} customer Record to parse
   * @param {l.RemotingContext} ctx Remoting context object
   */
  async function omitUnpermittedFields(customer, ctx) {
    const ACL = app.models.ACL;
    const userId = ctx.req.accessToken ? ctx.req.accessToken.userId : null;

    await Object.keys(Customer.prototype)
      .filter(prop => typeof Customer.prototype[prop] !== 'function')
      .map(async prop => {
        const accessResult = await ACL.checkAccessForContext({
          principals: [{
            type: ACL.USER,
            id: userId,
          }],
          model: Customer,
          modelId: customer.id,
          property: prop,
          accessType: ACL.READ,
        });

        if (!accessResult.isAllowed()) {
          delete customer[prop];
        }
      });

    return customer;
  }
};
