const { assert } = require('chai');

const { emailExists, urlsForUser } = require('../helpers.js');

const testUsers = {
  "userRandomID": {
    id: "userRandomID", 
    email: "user@example.com", 
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: "dishwasher-funk"
  }
};

const testDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "b6hM54" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "b6hM54" },
  b2xVn2: { longURL: "http://www.lighthouselabs.ca", userID:"aJ48lW" },
  s9m5xK: { longURL: "https://github.com/JoshGrant5", userID:"aJ48lW" }
};

const result = { 
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "b6hM54" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "b6hM54" } 
};

describe('emailExists', function() {
  it('should return a user with valid email', function() {
    const user = emailExists("user@example.com", testUsers)
    const expectedOutput = "userRandomID";
    assert.equal(user, expectedOutput);
  });
  it('should return false when no match was found', function() {
    const user = emailExists("user3@example.com", testUsers)
    const expectedOutput = "userRandomID";
    assert.isFalse(user, expectedOutput);
  });
});

describe('urlsForUser', function() {
  it('should return result for user b6hM54', function() {
    const userDB = urlsForUser("b6hM54", testDatabase)
    const expectedOutput = result;
    assert.deepEqual(userDB, expectedOutput);
  });
  it('should not return result for user aJ48lW', function() {
    const userDB = urlsForUser("aJ48lW", testDatabase)
    const expectedOutput = result;
    assert.notEqual(userDB, expectedOutput);
  });
});