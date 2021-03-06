const express = require("express");
const app = express();
const PORT = 8080;

const methodOverride = require('method-override')
const request = require('request');
const bcrypt = require('bcrypt');
const cookieSession = require('cookie-session');
const bodyParser = require("body-parser");
const { generateRandomString, emailExists, urlsForUser, visitorCount } = require('./helpers');

// middleware
app.set("view engine", "ejs");
app.use(methodOverride('_method'))
app.use(bodyParser.urlencoded({extended: true}));
app.use('/static', express.static('public'));
app.use(cookieSession({
  name: 'session',
  keys: ['secretkeyusedtoencrypt', 'weshouldnotactuallyhavetheseembedded'], // typically we would store these in another file and .gitignore
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Object storing all users registered (example users hardcoded)
const users = {
  aJ48lW: {
    id: "aJ48lW",
    visitorID: 'ah834kdJhnS',
    email: "joshgg@lhl.ca",
    password: "$2b$10$bGD2YZSgr/JBafLJLvCIKeP6Zb7hk5.8PrqdiMOjExNVVYrOT0/8m", // Password = lighthouse
  },
  b6hM54: {
    id: "b6hM54",
    visitorID: 'ljm98yH9EF',
    email: "cooldude@ex.com",
    password: "$2b$10$thaiLO0e9XhE0ef2rz45fOPCBoYaa5uNuS4Ewcfot4jvYcQiBA6Ti", // Password = cool99
  }
};

// Object storing all short URLs (example URLs hardcoded)
const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "b6hM54" }, 
  i3BoGr: { longURL: "https://www.google.ca", userID: "b6hM54" },
  b2xVn2: { longURL: "http://www.lighthouselabs.ca", userID:"aJ48lW" },
  s9m5xK: { longURL: "https://github.com/JoshGrant5", userID:"aJ48lW" }
};

// Object storing the last date viewed and number of views for each short URL. Example commented below
const visitsPerSite = {
  // sitename: {date: '', views: 0, uniqueViews: [], allVisits: []},
};

app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});

// Homepage - redirects to index if logged in, or welcome message if not
app.get("/", (req, res) => {
  res.redirect('/urls');
});

// If logged in, renders index with list of user's short URLs. If not, renders welcome message
app.get("/urls", (req, res) => {
  const userDB = urlsForUser(req.session.user_id, urlDatabase);
  const templateVars = { urls: userDB, users: users[req.session.user_id] };
  res.render("urls_index", templateVars);
});

// If logged in, renders page for entering a new URL. If not, redirects to welcome message
app.get("/urls/new", (req, res) => {
  if (!req.session.user_id) {
    res.redirect('/');
  } else {
    const templateVars = { users: users[req.session.user_id] };
    res.render("urls_new", templateVars);
  }
});

// Renders a page to view the new short/long URL
// Cannot access the route with specified URL if not logged in, or if the URL does not belong to that user
app.get("/urls/:shortURL", (req, res) => {
  const userDB = urlsForUser(req.session.user_id, urlDatabase);
  const templateVars = {};
  if (req.params.shortURL in userDB) { 
    templateVars.shortURL = req.params.shortURL;
    templateVars.longURL = urlDatabase[req.params.shortURL].longURL;
    templateVars.users = users[req.session.user_id]; 
    templateVars.visits = visitsPerSite[urlDatabase[req.params.shortURL].longURL];
    res.render("urls_show", templateVars);
  } else {
    templateVars.error = 401;
    templateVars.message = 'You Are Not Allowed To View This Page! Please Login Or Add This Short URL To Your Account';
    templateVars.users = users[req.session.user_id];
    res.render('error', templateVars);
  }
});

// Upon href click of the short URL, Redirect to the webpage for that long URL
app.get("/u/:shortURL", (req, res) => { 
  if (req.params.shortURL in urlDatabase) {
    const longURL = urlDatabase[req.params.shortURL].longURL;
    if (req.session.user_id) { // User is logged in
      visitorCount(longURL, req.session.user_id, visitsPerSite, users);
      res.redirect(longURL);
    } else {
      if (req.session.public) { // Public cookie has already been set for this viewer
        visitorCount(longURL, req.session.public, visitsPerSite, users);
        res.redirect(longURL);
      } else { // No public cookie yet, so we set one as this is a unique viewer
        req.session.public = generateRandomString(10);
        visitorCount(longURL, req.session.public, visitsPerSite, users);
        res.redirect(longURL);
      }
    }
  } else {
    const templateVars = { error: 404, message: `Short URL "${req.params.shortURL}" Does Not Exist`, users: users[req.session.user_id]};
    res.render('error', templateVars);
  }
});

// Renders registration form
app.get('/register', (req, res) => {
  if (!req.session.user_id) {
    const templateVars = { urls: urlDatabase, users: users[req.session.user_id] };
    res.render('register', templateVars);
  } else {
    res.redirect('/urls');
  }
});

// Renders login form
app.get('/login', (req, res) => {
  if (!req.session.user_id) {
    const templateVars = { urls: urlDatabase, users: users[req.session.user_id] };
    res.render('login', templateVars);
  } else {
    res.redirect('/urls');
  }
});

// Post request to create a new short URL, add to urlDatabase, and redirect to page showing the new URLs
app.post("/urls", (req, res) => {
  request(req.body.longURL, (error, response) => {
    if (error || response.statusCode !== 200) {
      const templateVars = { error: 404, message: `URL "${req.body.longURL}" Not Found`, users: users[req.session.user_id]};
      res.render('error', templateVars);
    } else {
      const short = generateRandomString(6);
      urlDatabase[short] = {longURL: req.body.longURL, userID: req.session.user_id };
      res.redirect(`/urls/${short}`);
    }
  });
});

// Post from submit button to edit the URL being viewed, redirecting to the index to show change
app.put('/urls/:id', (req, res) => {
  request(req.body.longURL, (error, response) => {
    if (error || response.statusCode !== 200) {
      const templateVars = { error: 404, message: `URL "${req.body.longURL}" Not Found`, users: users[req.session.user_id]};
      res.render('error', templateVars);
    } else {
      const newDB = urlsForUser(req.session.user_id, urlDatabase);
      if (req.params.id in newDB) {
        urlDatabase[req.params.id].longURL = req.body.longURL;
        res.redirect('/urls');
      } else {
        const templateVars = { error: 401, message: 'Not Authorized To Edit', users: users[req.session.user_id]};
        res.render('error', templateVars);
      }
    }
  });
});

// Post to delete the selected URL from user's database
app.delete('/urls/:shortURL/delete', (req, res) => {
  const newDB = urlsForUser(req.session.user_id, urlDatabase);
  if (req.params.shortURL in newDB) {
    delete urlDatabase[req.params.shortURL];
    res.redirect('/urls');
  } else {
    const templateVars = { error: 401, message: 'Not Authorized To Delete This URL', users: users[req.session.user_id]};
    res.render('error', templateVars);
  }
});

// Validate that the user input correct login info, then redirect to index
app.post('/login', (req, res) => {
  if (!req.body.email || !req.body.password) {
    const templateVars = { error: 400, message: 'Could Not Login. Did You Input An Email And Password?', users: users[req.session.user_id]};
    res.render('error', templateVars);
  }
  let match = emailExists(req.body.email, users);
  if (!match) {
    const templateVars = { error: 400, message: 'That Email Is Not Registered With An Account', users: users[req.session.user_id]};
    res.render('error', templateVars);
  } else {
    if (!bcrypt.compareSync(req.body.password, users[match].password)) {
      const templateVars = { error: 400, message: 'Invalid Password', users: users[req.session.user_id]};
      res.render('error', templateVars);
    } else {
      req.session.user_id = match;
      res.redirect('/urls');
    }
  }
});

// Validate that the user input correct registration requirments, then redirect to index
app.post('/register', (req, res) => {
  const userId = generateRandomString(6);
  const visID = generateRandomString(10);
  if (!req.body.email || !req.body.password) {
    const templateVars = { error: 400, message: 'Could Not Register. Did You Input An Email And Password?', users: users[req.session.user_id]};
    res.render('error', templateVars);
  }
  if (emailExists(req.body.email, users)) {
    const templateVars = { error: 400, message: 'That Email Is Already Registered To An Account', users: users[req.session.user_id]};
    res.render('error', templateVars);
  } else {
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    users[userId] = { 'id': userId, 'visitorID': visID, 'email':  req.body.email, 'password': hashedPassword };
    req.session.user_id = userId;
    res.redirect('/urls');
  }
});

// On logout, clear cookie session
app.post('/logout', (req, res) => {
  req.session.user_id = null;
  res.redirect('/urls');
});