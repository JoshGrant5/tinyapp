const express = require("express");
const app = express();
const PORT = 8080;

const request = require('request');
const bcrypt = require('bcrypt');
const cookieSession = require('cookie-session');
const { generateRandomString, emailExists, urlsForUser } = require('./helpers');

app.set("view engine", "ejs");

// middleware
const bodyParser = require("body-parser");
app.use('/static', express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));

app.use(cookieSession({
  name: 'session',
  keys: ['secretkeyusedtoencrypt', 'weshouldnotactuallyhavetheseembedded'], // typically we would store these in another file and .gitignore
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Object storing all users registered, with keys id, email, and password
const users = {
  aJ48lW: { 
    id: "aJ48lW",
    email: "joshgg@lhl.ca",
    password: "$2b$10$bGD2YZSgr/JBafLJLvCIKeP6Zb7hk5.8PrqdiMOjExNVVYrOT0/8m" //lighthouse
  },
  b6hM54: {
    id: "b6hM54",
    email: "cooldude@ex.com",
    password: "$2b$10$thaiLO0e9XhE0ef2rz45fOPCBoYaa5uNuS4Ewcfot4jvYcQiBA6Ti" //cool99
  }
};

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "b6hM54" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "b6hM54" },
  b2xVn2: { longURL: "http://www.lighthouselabs.ca", userID:"aJ48lW" },
  s9m5xK: { longURL: "https://github.com/JoshGrant5", userID:"aJ48lW" }
};

// is the port open? Once it is, log the message
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.get("/", (req, res) => {
  res.redirect('/urls');
});

// get me a route to page "/urls.json" => if response, send it the json string of urlDatabase
app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// get me a route to page "/hello" => if response, send it the json string of this html code
app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

// Use express to render URLs from urlDatabase to our urls_index.ejs file
// if user not logged in, they will not be able to see urls
app.get("/urls", (req, res) => {
  const userDB = urlsForUser(req.session.user_id, urlDatabase);
  const templateVars = { urls: userDB, users: users[req.session.user_id] };
  res.render("urls_index", templateVars);
});

// render template for page where you can enter a new URL
// redirect to login if user is not logged in
app.get("/urls/new", (req, res) => {
  const templateVars = { users: users[req.session.user_id] };
  res.render("urls_new", templateVars);
});

// based on request, render the short URL and long URL to the browser
// cannot access the route with specified url if not logged in, or if the url does not belong to that user
app.get("/urls/:shortURL", (req, res) => {
  const userDB = urlsForUser(req.session.user_id, urlDatabase);
  if (req.params.shortURL in userDB) {
    const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, users: users[req.session.user_id] };
    res.render("urls_show", templateVars);
  } else {
    res.send('You are not authorized to view!');
  }
});

// Upon href click, redirect to long URL of the request
app.get("/u/:shortURL", (req, res) => {
  if (req.params.shortURL in urlDatabase) {
    const longURL = urlDatabase[req.params.shortURL].longURL;
    res.redirect(longURL);
  } else {
    res.send('Short URL does not exist');
  }
});

app.get('/register', (req, res) => {
  if (!req.session.user_id) {
    const templateVars = { urls: urlDatabase, users: users[req.session.user_id] };
    res.render('register', templateVars);
  } else {
    res.redirect('/urls');
  }
});

app.get('/login', (req, res) => {
  if (!req.session.user_id) {
    const templateVars = { urls: urlDatabase, users: users[req.session.user_id] };
    res.render('login', templateVars);
  } else {
    res.redirect('/urls');
  }
});

// create a new short URL, add to urlDatabase, and render to the browser
app.post("/urls", (req, res) => {
  request(req.body.longURL, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      res.status(404).send(`Error: URL "${req.body.longURL}" not found`);
    } else {
      const short = generateRandomString();
      urlDatabase[short] = {longURL: req.body.longURL, userID: req.session.user_id };
      res.redirect(`/urls/${short}`);
    }
  });
});

// post from submit button to change url in urls_show, redirecting to home page to show change
app.post('/urls/:id', (req, res) => {
  request(req.body.longURL, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      res.status(404).send(`Error: URL "${req.body.longURL}" not found`);
    } else {
      const newDB = urlsForUser(req.session.user_id, urlDatabase);
      if (req.params.id in newDB) {
        urlDatabase[req.params.id].longURL = req.body.longURL;
        res.redirect('/urls');
      } else {
        res.send('Not authorized to edit!');
      }
    }
  });
});

// post from delete button, delete the selected url from our database
app.post('/urls/:shortURL/delete', (req, res) => {
  const newDB = urlsForUser(req.session.user_id, urlDatabase);
  if (req.params.shortURL in newDB) {
    delete urlDatabase[req.params.shortURL];
    res.redirect('/urls');
  } else {
    res.send('Not authorized to delete this url!');
  }
});

app.post('/login', (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.status(400).send('Error: The server could not understand your request. Did you input an email and a password?');
  }
  let match = emailExists(req.body.email, users);
  if (!match) {
    res.status(403).send('Error: That email is not registered with an account.');
  } else {
    if (!bcrypt.compareSync(req.body.password, users[match].password)) {
      res.status(403).send('Error: Password does not match.');
    } else {
      req.session.user_id = match;
      res.redirect('/urls');
    }
  }
});

// On logout, clear cookie
app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/urls');
});

app.post('/register', (req, res) => {
  const userId = generateRandomString();
  if (!req.body.email || !req.body.password) {
    res.status(400).send('Error: The server could not understand your request. Did you input an email and a password?');
  }
  if (emailExists(req.body.email, users)) {
    res.status(400).send('Error: That email is already registered to an account.');
  } else {
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    users[userId] = {
      'id': userId,
      'email':  req.body.email,
      'password': hashedPassword
    };
    req.session.user_id = userId;
    res.redirect('/urls');
  }
});
