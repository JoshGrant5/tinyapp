//* Helper Functions:

// https://dev.to/oyetoket/fastest-way-to-generate-random-strings-in-javascript-2k5a - credit to Oyetoke Toby
const generateRandomString = () => {
  return Math.random().toString(20).substr(2, 6);
};

const emailExists = (email, users) => {
  for (let user in users) {
    if (users[user].email === email) {
      return user;
    }
  }
  return false;
};

const urlsForUser = (id, urlDatabase) => {
  let newDB = {};
  for (let shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      newDB[shortURL] = {longURL: urlDatabase[shortURL].longURL, userID: id};
    }
  }
  return newDB;
};

module.exports = { generateRandomString, emailExists, urlsForUser };