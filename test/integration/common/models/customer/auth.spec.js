'use strict';

const request = require('supertest');
const expect = require('../../../../helpers/expect-preconfigured');

const {givenEmptyDatabase} = require('../../../../helpers/database.helpers');
const {
  givenCustomer,
  givenLoggedInCustomer,
} = require('../../../../helpers/customer.helpers');

const app = require('../../../../../server/server');

describe('integration: customer (auth)', () => {
  beforeEach(givenEmptyDatabase);

  it('should login with valid credentials', async () => {
    const password = 'password';
    const customer = await givenCustomer({password});

    const response = await request(app)
      .post('/api/customers/login')
      .send({
        email: customer.email,
        password: password,
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.keys(['id', 'ttl', 'created', 'userId']);
  });

  it('should fail to login with invalid credentials', async () => {
    const customer = await givenCustomer();

    const response = await request(app)
      .post('/api/customers/login')
      .send({
        email: customer.email,
        password: 'wrong',
      });

    expect(response.status).to.equal(401);
    expect(response.body).to.have.nested.property('error.code', 'LOGIN_FAILED');
  });

  it('should allow a customer to log out', async () => {
    const {token} = await givenLoggedInCustomer();

    await request(app)
      .post('/api/customers/logout')
      .query({'access_token': token.id})
      .expect(204);
  });

  it('should not allow a customer to log in from a blacklisted geolocation');

  it('should reset a password');
});
