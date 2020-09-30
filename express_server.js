const express = require("express");
const app = express();
const PORT = 8080;
const request = require('request');

app.set("view engine", "ejs");

// middleware
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));
let cookieParser = require('cookie-parser');
app.use(cookieParser());

// https://dev.to/oyetoket/fastest-way-to-generate-random-strings-in-javascript-2k5a - credit to Oyetoke Toby
const generateRandomString = () => {
  return Math.random().toString(20).substr(2, 6);
};

const emailExists = email => {
  for (let user in users) {
    if (users[user].email === email) {
      return user;
    }
  }
  return false;
}

// Object storing all users registered, with keys id, email, and password
const users = {
  aJ48lW: {
    id: "aJ48lW", 
    email: "joshgg@lhl.ca", 
    password: "lighthouse"
  }, 
  b6hM54: {
    id: "b6hM54", 
    email: "cooldude@ex.com", 
    password: "cool99"
  }
};

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "b6hM54" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "b6hM54" },
  b2xVn2: { longURL: "http://www.lighthouselabs.ca", userID:"aJ48lW" },
  s9m5xK: { longURL: "https://github.com/JoshGrant5", userID:"aJ48lW" }
};


// get me a route to page "/" => if we get a response, send the page "Hello!"
app.get("/", (req, res) => {
  res.send("Hello!");
});

// is the port open? Once it is, log the message
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
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
app.get("/urls", (req, res) => {
  const templateVars = { urls: urlDatabase, users: users[req.cookies.user_id] };
  res.render("urls_index", templateVars);
});

// render template for page where you can enter a new URL
// redirect to login if user is not logged in
app.get("/urls/new", (req, res) => {
  const templateVars = { users: users[req.cookies.user_id] };
  res.render("urls_new", templateVars);
});

// based on request, render the short URL and long URL to the browser
app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, users: users[req.cookies.user_id] };
  res.render("urls_show", templateVars);
});

// Upon href click, redirect to long URL of the request
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

app.get('/register', (req, res) => {
  const templateVars = { urls: urlDatabase, users: users[req.cookies.user_id] };
  res.render('register', templateVars);
});

app.get('/login', (req, res) => {
  const templateVars = { urls: urlDatabase, users: users[req.cookies.user_id] };
  res.render('login', templateVars);
});

// create a new short URL, add to urlDatabase, and render to the browser
app.post("/urls", (req, res) => {
  request(req.body.longURL, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      res.status(404).send(`Error: URL "${req.body.longURL}" not found`);
    } else {
      const short = generateRandomString();
      urlDatabase[short] = {longURL: req.body.longURL, userID: req.cookies.user_id };
      console.log(urlDatabase)
      console.log(users)
      const templateVars = { shortURL: short, longURL: req.body.longURL, users: users[req.cookies.user_id] };
      res.render("urls_show", templateVars);
    }
  });
});

// post from delete button, delete the selected url from our database
app.post('/urls/:shortURL/delete', (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls');
});

// post from submit button to change url in urls_show, redirecting to home page to show change
app.post('/urls/:id', (req, res) => {
  request(req.body.longURL, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      res.status(404).send(`Error: URL "${req.body.longURL}" not found`);
    } else {
      urlDatabase[req.params.id].longURL = req.body.longURL;
      res.redirect('/urls');
    }
  });
});

app.post('/login', (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.status(400).send('Error: The server could not understand your request. Did you input an email and a password?');
  } 
  let match = emailExists(req.body.email);
  if (!match) {
    res.status(403).send('Error: That email is not registered with an account.');
  } else {
    if (users[match].password !== req.body.password) {
      res.status(403).send('Error: Password does not match.');
    } else {
      res.cookie('user_id', match);
      res.redirect('/urls');
    }
  }
});

// On logout, clear cookie
app.post('/logout', (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/urls');
});

app.post('/register', (req, res) => {
  const userId = generateRandomString();
  if (!req.body.email || !req.body.password) {
    res.status(400).send('Error: The server could not understand your request. Did you input an email and a password?');
  } 
  if (emailExists(req.body.email)) {s
    res.status(400).send('Error: That email is already registered to an account.');
  } else {
    users[userId] = {
      'id': userId,
      'email':  req.body.email,
      'password': req.body.password
    };
    res.cookie('user_id', userId);
    res.redirect('/urls');
  }
});
