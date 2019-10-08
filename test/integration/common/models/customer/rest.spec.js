'use strict';

const {omit} = require('lodash');
const request = require('supertest');
const expect = require('../../../../helpers/expect-preconfigured');

const {givenEmptyDatabase} = require('../../../../helpers/database.helpers');
const {
  givenCustomerData,
  givenCustomer,
  givenLoggedInCustomer,
} = require('../../../../helpers/customer.helpers');
const {givenFantasyLeagueData} = require('../../../../helpers/fantasy-league.helpers');
const {givenFantasyTeamData} = require('../../../../helpers/fantasy-team.helpers');
const {givenProLeagueData} = require('../../../../helpers/pro-league.helpers');
const {givenProTeamData} = require('../../../../helpers/pro-team.helpers');

const app = require('../../../../../server/server');

const Customer = app.models.Customer;
const ACL = app.models.ACL;

describe('integration: customer (rest)', () => {
  beforeEach(givenEmptyDatabase);

  it('should create a customer', async () => {
    const customerData = givenCustomerData();

    const response = await request(app)
      .post('/api/customers')
      .send(customerData);

    const expectedCustomerData = omit(customerData, 'password');

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id').which.is.a('string');
    expect(response.body).to.deep.include(expectedCustomerData);
  });

  it('should retrieve a customer', async () => {
    const customerData = givenCustomerData();
    const {customer, token} = await givenLoggedInCustomer(customerData);

    const response = await request(app)
      .get('/api/customers/' + customer.id)
      .query({'access_token': token.id});

    const expectedCustomerData = omit(customerData, 'password');

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id').which.is.a('string');
    expect(response.body).to.deep.include(expectedCustomerData);
  });

  it('should update a customer', async () => {
    const customerData = givenCustomerData();
    const {customer, token} = await givenLoggedInCustomer(customerData);

    const modifiedCustomerData = Object.assign({}, customerData, {
      id: customer.id,
      username: 'Modified Username',
    });

    const response = await request(app)
      .put('/api/customers/' + customer.id)
      .send(modifiedCustomerData)
      .query({'access_token': token.id});

    const expectedCustomerData = omit(modifiedCustomerData, 'password');

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.include(expectedCustomerData);
  });

  it('should allow a password to be reset');

  describe('security', () => {
    class CustomerFieldSecuritySpec {
      constructor(name, ownerCanRead, ownerCanWrite, authedCanRead) {
        return {name, ownerCanRead, ownerCanWrite, authedCanRead};
      }
    }

    const allFieldSpecs = [
      new CustomerFieldSecuritySpec('id', true, false, true),
      new CustomerFieldSecuritySpec('username', true, true, true),
      new CustomerFieldSecuritySpec('avatar', true, true, true),
      new CustomerFieldSecuritySpec('firstName', true, true, false),
      new CustomerFieldSecuritySpec('lastName', true, true, false),
      new CustomerFieldSecuritySpec('points', true, false, true),
      new CustomerFieldSecuritySpec('usdWalletBalance', true, false, false),
      new CustomerFieldSecuritySpec('lastLogin', true, false, false),
      new CustomerFieldSecuritySpec('worldCup2018ContestBracketId', true, true, false),
      new CustomerFieldSecuritySpec('realm', true, false, false),
      new CustomerFieldSecuritySpec('email', true, true, false),
      new CustomerFieldSecuritySpec('emailVerified', true, false, false),
      new CustomerFieldSecuritySpec('password', false, true, false),
      new CustomerFieldSecuritySpec('verificationToken', false, false, false),
      new CustomerFieldSecuritySpec('createdAt', true, false, false),
      new CustomerFieldSecuritySpec('updatedAt', true, false, false),
    ];
    const allRelationSpecs = [
      new CustomerFieldSecuritySpec('favoriteProLeagues', true, true, false),
      new CustomerFieldSecuritySpec('favoriteProTeams', true, true, false),
      new CustomerFieldSecuritySpec('joinedFantasyLeagues', true, true, false),
      new CustomerFieldSecuritySpec('ownsFantasyLeagues', true, true, false),
    ];

    // This verifies that the following tests are up to date with the model
    it('test specs should test all model properties', () => {
      const allFields = allFieldSpecs.map(spec => spec.name);

      for (const prop of Object.keys(Customer.prototype)) {
        if (typeof Customer.prototype[prop] !== 'function') {
          expect(allFields).to.include(prop);
        }
      }
    });

    it('test specs should match the ACLs', async () => {
      const owner = await givenCustomer({
        email: 'owner@example.com',
        username: 'Owner',
      });
      const otherCustomer = await givenCustomer({
        email: 'other@example.com',
        username: 'Another User',
      });

      const allSpecs = allFieldSpecs.concat(allRelationSpecs);

      for (const spec of allSpecs) {
        // Check owner read rights
        const ownerReadResult = await ACL.checkAccessForContext({
          principals: [{
            type: ACL.USER,
            id: owner.id,
          }],
          model: Customer,
          modelId: owner.id,
          property: spec.name,
          accessType: ACL.READ,
        });
        const expectedOwnReadPermission = spec.ownerCanRead ? ACL.ALLOW : ACL.DENY;
        expect(formatPermission(spec, ownerReadResult.permission))
          .to.equal(formatPermission(spec, expectedOwnReadPermission));

        // Check owner write rights
        const ownerWriteResult = await ACL.checkAccessForContext({
          principals: [{
            type: ACL.USER,
            id: owner.id,
          }],
          model: Customer,
          modelId: owner.id,
          property: spec.name,
          accessType: ACL.WRITE,
        });
        const expectedOwnWritePermission = spec.ownerCanWrite ? ACL.ALLOW : ACL.DENY;
        expect(formatPermission(spec, ownerWriteResult.permission))
          .to.equal(formatPermission(spec, expectedOwnWritePermission));

        // Check other users' read rights
        const authedReadResult = await ACL.checkAccessForContext({
          principals: [{
            type: ACL.USER,
            id: otherCustomer.id,
          }],
          model: Customer,
          modelId: owner.id,
          property: spec.name,
          accessType: ACL.READ,
        });
        const expectedAuthedReadPermission = spec.authedCanRead ? ACL.ALLOW : ACL.DENY;
        expect(formatPermission(spec, authedReadResult.permission))
          .to.equal(formatPermission(spec, expectedAuthedReadPermission));

        // Check other users' write rights
        const authedWriteResult = await ACL.checkAccessForContext({
          principals: [{
            type: ACL.USER,
            id: otherCustomer.id,
          }],
          model: Customer,
          modelId: owner.id,
          property: spec.name,
          accessType: ACL.WRITE,
        });
        expect(formatPermission(spec, authedWriteResult.permission))
          .to.equal(formatPermission(spec, ACL.DENY));

        // Check everyone's read rights
        const everyoneReadResult = await ACL.checkAccessForContext({
          principals: [{
            type: ACL.USER,
            id: null,
          }],
          model: Customer,
          modelId: owner.id,
          property: spec.name,
          accessType: ACL.READ,
        });
        expect(formatPermission(spec, everyoneReadResult.permission))
          .to.equal(formatPermission(spec, ACL.DENY));

        // Check everyone's write rights
        const everyoneWriteResult = await ACL.checkAccessForContext({
          principals: [{
            type: ACL.USER,
            id: null,
          }],
          model: Customer,
          modelId: owner.id,
          property: spec.name,
          accessType: ACL.WRITE,
        });
        expect(formatPermission(spec, everyoneWriteResult.permission))
          .to.equal(formatPermission(spec, ACL.DENY));
      }

      function formatPermission(spec, permission) {
        return spec.name + ': ' + permission;
      }
    });

    describe('create', () => {
      // Positive test for owner writeable fields is covered in basic CRUD tests

      it('should ignore non-owner-writable fields', async () => {
        const customerData = givenCustomerData({
          id: 'should not be this',
          points: 1000,
          usdWalletBalance: '500.00',
          lastLogin: '2008-09-15T15:53:00+05:00',
          realm: 'should not be this',
          emailVerified: true,
          verificationToken: 'should not be this',
          createdAt: '2008-09-15T15:53:00+05:00',
          updatedAt: '2008-09-15T15:53:00+05:00',
        });

        const response = await request(app)
          .post('/api/customers')
          .send(customerData);

        expect(response.status).to.equal(200);

        allFieldSpecs.filter(spec => !spec.ownerCanWrite).forEach(spec => {
          expect(response.body[spec.name])
            .not.to.equal(customerData[spec.name]);
        });
      });

      it('should return only owner-readable fields', async () => {
        const customerData = givenCustomerData();

        const response = await request(app)
          .post('/api/customers')
          .send(customerData);

        expect(response.status).to.equal(200);

        allFieldSpecs.filter(spec => !spec.ownerCanRead).forEach(spec => {
          expect(response.body[spec.name]).to.be.undefined();
        });
      });
    });

    describe('read', () => {
      it('should prevent owner from viewing restricted fields', async () => {
        const {customer, token} = await givenLoggedInCustomer();

        const response = await request(app)
          .get('/api/customers/' + customer.id)
          .query({'access_token': token.id});

        expect(response.status).to.equal(200);

        allFieldSpecs.filter(spec => !spec.ownerCanRead).forEach(spec => {
          expect(response.body[spec.name]).to.be.undefined();
        });
      });

      it('should permit owner to view allowed fields', async () => {
        const {customer, token} = await givenLoggedInCustomer();

        const response = await request(app)
          .get('/api/customers/' + customer.id)
          .query({'access_token': token.id});

        expect(response.status).to.equal(200);

        allFieldSpecs.filter(spec => spec.ownerCanRead).forEach(spec => {
          expect(response.body[spec.name]).not.to.be.undefined();
        });
      });

      it('should permit owner to view allowed relations', async () => {
        const {customer, token} = await givenLoggedInCustomer();

        const relationData = {
          favoriteProLeagues: givenProLeagueData(),
          favoriteProTeams: givenProTeamData(),
          ownsFantasyLeagues: givenFantasyLeagueData(),
          fantasyTeams: givenFantasyTeamData(),
          joinedFantasyLeagues: givenFantasyLeagueData(),
        };

        const favoriteProLeague = await customer.favoriteProLeagues.create(relationData.favoriteProLeagues);
        const favoriteProTeam = await customer.favoriteProTeams.create(relationData.favoriteProTeams);
        const ownsFantasyLeague = await customer.ownsFantasyLeagues.create(relationData.ownsFantasyLeagues);
        relationData.fantasyTeams.fantasyLeagueId = ownsFantasyLeague.id;
        const fantasyTeams = await customer.fantasyTeams.create(relationData.fantasyTeams);

        const response = await request(app)
          .get('/api/customers/' + customer.id)
          .query({'access_token': token.id})
          .query({filter: {include: allRelationSpecs.map(spec => spec.name)}});

        expect(response.status).to.equal(200);

        allRelationSpecs.filter(spec => spec.ownerCanRead).forEach(spec => {
          expect(response.body[spec.name][0]).to.deep.include(relationData[spec.name]);
        });
      });

      it.skip('should prevent other users from viewing restricted fields', async () => {
        const owner = await givenCustomer({
          email: 'owner@example.com',
          username: 'Owner',
        });
        const {token} = await givenLoggedInCustomer();

        const response = await request(app)
          .get('/api/customers/' + owner.id)
          .query({'access_token': token.id});

        expect(response.status).to.equal(200);

        allFieldSpecs.filter(spec => !spec.authedCanRead).forEach(spec => {
          expect(response.body[spec.name]).to.be.undefined();
        });
      });

      it.skip('should prevent other users from viewing restricted relations', async () => {
        const owner = await givenCustomer({
          email: 'owner@example.com',
          username: 'Owner',
        });
        const {token} = await givenLoggedInCustomer();

        const relationData = {
          favoriteProLeagues: givenProLeagueData(),
          favoriteProTeams: givenProTeamData(),
          joinedFantasyLeagues: givenFantasyLeagueData(),
          ownsFantasyLeagues: givenFantasyLeagueData(),
        };

        const favoriteProLeague = await owner.favoriteProLeagues.create(relationData.favoriteProLeagues);
        const favoriteProTeam = await owner.favoriteProTeams.create(relationData.favoriteProTeams);
        const joinedFantasyLeague = await owner.joinedFantasyLeagues.create(relationData.joinedFantasyLeagues);
        const ownsFantasyLeague = await owner.ownsFantasyLeagues.create(relationData.ownsFantasyLeagues);

        const response = await request(app)
          .get('/api/customers/' + owner.id)
          .query({'access_token': token.id})
          .query({filter: {include: allRelationSpecs.map(spec => spec.name)}});

        expect(response.status).to.equal(200);

        allRelationSpecs.filter(spec => !spec.authedCanRead).forEach(spec => {
          expect(response.body[spec.name]).to.be.undefined();
        });
      });

      it('should prevent guests from access', async () => {
        const customer = await givenCustomer();

        const response = await request(app).get('/api/customers/' + customer.id);

        expect(response.status).to.be.greaterThan(399);

        allRelationSpecs.filter(spec => !spec.authedCanRead).forEach(spec => {
          expect(response.body[spec.name]).to.be.undefined();
        });
      });
    });

    describe('update', () => {
      // Positive test for owner writeable fields is covered in basic CRUD tests

      it('should prevent setting non-owner-writable fields', async () => {
        const customerData = givenCustomerData();
        const {customer, token} = await givenLoggedInCustomer(customerData);

        const modifiedCustomerData = Object.assign({}, customerData, {
          id: 'should not be this',
          points: 1000,
          usdWalletBalance: '500.00',
          lastLogin: '2008-09-15T15:53:00+05:00',
          realm: 'should not be this',
          emailVerified: true,
          verificationToken: 'should not be this',
          createdAt: '2008-09-15T15:53:00+05:00',
          updatedAt: '2008-09-15T15:53:00+05:00',
        });

        const response = await request(app)
          .put('/api/customers/' + customer.id)
          .send(modifiedCustomerData)
          .query({'access_token': token.id});

        expect(response.status).to.equal(200);

        allFieldSpecs.filter(spec => !spec.ownerCanWrite).forEach(spec => {
          expect(response.body[spec.name])
            .not.to.equal(modifiedCustomerData[spec.name]);
        });
      });

      it('should return only owner-readable fields', async () => {
        const customerData = givenCustomerData();
        const {customer, token} = await givenLoggedInCustomer(customerData);

        const modifiedCustomerData = Object.assign({}, customerData, {
          id: customer.id,
          username: 'Modified Username',
        });

        const response = await request(app)
          .put('/api/customers/' + customer.id)
          .send(modifiedCustomerData)
          .query({'access_token': token.id});

        expect(response.status).to.equal(200);

        allFieldSpecs.filter(spec => spec.ownerCanRead).forEach(spec => {
          expect(response.body[spec.name]).not.to.be.undefined();
        });
      });

      it('should prevent other users from setting any fields', async () => {
        const owner = await givenCustomer({
          email: 'owner@example.com',
          username: 'Owner',
        });
        const {token} = await givenLoggedInCustomer();

        const response = await request(app)
          .put('/api/customers/' + owner.id)
          .send({username: 'should not be updated'})
          .query({'access_token': token.id});

        expect(response.status).to.be.greaterThan(399);
      });

      it('should prevent guests from access', async () => {
        const owner = await givenCustomer();

        const response = await request(app)
          .put('/api/customers/' + owner.id)
          .send({username: 'should not be updated'});

        expect(response.status).to.be.greaterThan(399);
      });
    });

    describe('delete', () => {
      it('should prevent all users from access', async () => {
        const {customer, token} = await givenLoggedInCustomer();

        // Test for guest
        await request(app)
          .delete('/api/customers/' + customer.id)
          .expect(401);

        // Test for owner
        await request(app)
          .delete('/api/customers/' + customer.id)
          .query({'access_token': token.id})
          .expect(401);
      });
    });
  });
});
