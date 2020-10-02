const express = require("express");
const app = express();
const PORT = 8080;

const cookieParser = require('cookie-parser');
const request = require('request');
const bcrypt = require('bcrypt');
const cookieSession = require('cookie-session');
const { generateRandomString, emailExists, urlsForUser } = require('./helpers');

// middleware
app.use(cookieParser())
app.set("view engine", "ejs");
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));
app.use('/static', express.static('public'));
app.use(cookieSession({
  name: 'session',
  keys: ['secretkeyusedtoencrypt', 'weshouldnotactuallyhavetheseembedded'], // typically we would store these in another file and .gitignore
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Function adding the timestamp and adding a count to visit/uniqueVisit for specified short URL
const visitorCount = (shortURL, visits, db) => {
  let timestamp = new Date();
  const date = timestamp.toUTCString();
  if (!visits || !visits.includes(shortURL)) {
    let views = 1;
    let uniqueViews = 1;
    db[shortURL] = { date , views , uniqueViews };
  } else {
    db[shortURL].date = date;
    db[shortURL].views++;
  } // Function will not be able to edit req.session data
};

// Object storing all users registered (example users hardcoded)
const users = {
  aJ48lW: {
    id: "aJ48lW",
    email: "joshgg@lhl.ca",
    password: "$2b$10$bGD2YZSgr/JBafLJLvCIKeP6Zb7hk5.8PrqdiMOjExNVVYrOT0/8m", // Password = lighthouse
    visits: []
  },
  b6hM54: {
    id: "b6hM54",
    email: "cooldude@ex.com",
    password: "$2b$10$thaiLO0e9XhE0ef2rz45fOPCBoYaa5uNuS4Ewcfot4jvYcQiBA6Ti", // Password = cool99
    visits: []
  }
};

// Object storing all short URLs (example URLs hardcoded)
const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "b6hM54" }, 
  i3BoGr: { longURL: "https://www.google.ca", userID: "b6hM54" },
  b2xVn2: { longURL: "http://www.lighthouselabs.ca", userID:"aJ48lW" },
  s9m5xK: { longURL: "https://github.com/JoshGrant5", userID:"aJ48lW" }
};

// Object storing the last date viewed and number of views for each short URL
// Since we have hardcoded example short URLs in urlDatabase, we will hardcode example starting data for each of those URLs
const totalVisits = {
  // b6UTxQ: {date: '', views: 0, uniqueViews: 0},
  // i3BoGr: {date: '', views: 0, uniqueViews: 0},
  // b2xVn2: {date: '', views: 0, uniqueViews: 0},
  // s9m5xK: {date: '', views: 0, uniqueViews: 0},
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
  if (req.params.shortURL in userDB) {
    const templateVars = { 
      shortURL: req.params.shortURL, 
      longURL: urlDatabase[req.params.shortURL].longURL, 
      users: users[req.session.user_id], 
      visits: totalVisits[req.params.shortURL]
    };
    console.log('TOTAL VISITS: ', totalVisits)
    res.render("urls_show", templateVars);
  } else {
    const templateVars = {
      error: 401,
      message: 'You Are Not Allowed To View This Page! Please Login Or Add This Short URL To Your Account',
      users: users[req.session.user_id]
    };
    res.render('error', templateVars);
  }
});

// Upon href click of the short URL, Redirect to the webpage for that long URL
app.get("/u/:shortURL", (req, res) => { 
  if (req.params.shortURL in urlDatabase) {
    visitorCount(req.params.shortURL, req.session.visits, totalVisits);
    req.session.visits.push(req.params.shortURL);
    const longURL = urlDatabase[req.params.shortURL].longURL;
    res.redirect(longURL);
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
      const short = generateRandomString();
      urlDatabase[short] = {longURL: req.body.longURL, userID: req.session.user_id };
      res.redirect(`/urls/${short}`);
    }
  });
});

// Post from submit button to edit the URL being viewed, redirecting to the index to show change
app.post('/urls/:id', (req, res) => {
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
app.post('/urls/:shortURL/delete', (req, res) => {
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
      req.session.visits = users[req.session.user_id].visits;
      res.redirect('/urls');
    }
  }
});

// Validate that the user input correct registration requirments, then redirect to index
app.post('/register', (req, res) => {
  const userId = generateRandomString();
  if (!req.body.email || !req.body.password) {
    const templateVars = { error: 400, message: 'Could Not Register. Did You Input An Email And Password?', users: users[req.session.user_id]};
    res.render('error', templateVars);
  }
  if (emailExists(req.body.email, users)) {
    const templateVars = { error: 400, message: 'That Email Is Already Registered To An Account', users: users[req.session.user_id]};
    res.render('error', templateVars);
  } else {
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    users[userId] = { 'id': userId, 'email':  req.body.email, 'password': hashedPassword };
    req.session.user_id = userId;
    req.session.visits = [];
    res.redirect('/urls');
  }
});

// On logout, clear cookie session
app.post('/logout', (req, res) => {
  users[req.session.user_id].visits = users[req.session.user_id].visits.concat(req.session.visits);
  req.session = null;
  res.redirect('/urls');
});