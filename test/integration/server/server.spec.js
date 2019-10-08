'use strict';

const request = require('supertest');
const expect = require('../../helpers/expect-preconfigured');

const app = require('../../../server/server');

describe('integration: server', () => {
  it('should respond to requests', () => {
    return request(app)
      .get('/')
      .expect(200)
      .expect(res => {
        expect(res.body).to.have.keys(['uptime', 'started']);
      });
  });
});
