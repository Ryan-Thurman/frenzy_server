'use strict';

const app = require('../../server/server');

module.exports = {
  givenCustomerData,
  givenCustomer,
  givenNCustomers,
  givenLoggedInCustomer,
};

function givenCustomerData(data) {
  return Object.assign({
    email: 'test-customer@example.com',
    password: 'test',
    avatar: 'default',
    username: 'LWallace the Test User',
    firstName: 'Laremi',
    lastName: 'Wallace',
    points: 0,
    worldCup2018ContestBracketId: null,
  }, data);
}

async function givenCustomer(data) {
  return app.models.Customer.create(givenCustomerData(data));
}

async function givenNCustomers(n) {
  const customers = [];
  for (let i = 0; i < n; i++) {
    const customer = await givenCustomer({
      email: `test-customer-${i}@example.com`,
      username: `test-user-${i}`,
    });
    customers.push(customer);
  }
  return customers;
}

async function givenLoggedInCustomer(data) {
  const customer = await givenCustomer(data);
  const token = await customer.createAccessToken();
  return {customer, token};
}
