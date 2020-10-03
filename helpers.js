//* TinyApp Helper Functions

// https://dev.to/oyetoket/fastest-way-to-generate-random-strings-in-javascript-2k5a - credit to Oyetoke Toby
const generateRandomString = (num) => Math.random().toString(20).substr(2, num);

// If email already exists in db, return their id
const emailExists = (email, users) => {
  for (let user in users) {
    if (users[user].email === email) {
      return user;
    }
  }
  return false;
};

// Return an object containing the short URLs that belong to the specified user
const urlsForUser = (id, urlDatabase) => {
  let newDB = {};
  for (let shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      newDB[shortURL] = {longURL: urlDatabase[shortURL].longURL, userID: id};
    }
  }
  return newDB;
};

// Function adding the timestamp and adding a count to visit/uniqueVisit for specified short URL
const visitorCount = (longURL, user, siteDB, userDB) => {
  let timestamp = new Date();
  const date = timestamp.toUTCString();
  if (longURL in siteDB) {  // longURL key exists in our database
    let visID;
    userDB[user] ? visID = userDB[user].visitorID : visID = user;
    if (siteDB[longURL].uniqueViews.includes(user)) { // This user is not a unique viewer
      siteDB[longURL].date = date;
      siteDB[longURL].views++;
      siteDB[longURL].allVisits.unshift({ date: date, id: visID });
    } else { // This user is a unique viewer
      siteDB[longURL].date = date;
      siteDB[longURL].views++;
      siteDB[longURL].allVisits.unshift({ date: date, id: visID });
      siteDB[longURL].uniqueViews.push(user);
    } 
  } else { // longURL key does not yet exist in our database, so we must initialize the number/array inside
    userDB[user] ? visID = userDB[user].visitorID : visID = user;
    siteDB[longURL] = { 'date': date, 'views': 1, 'uniqueViews': [], 'allVisits': [{ date: date, id: visID }] };
  }
};

module.exports = { generateRandomString, emailExists, urlsForUser, visitorCount };