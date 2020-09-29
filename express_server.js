const express = require("express");
const app = express();
const PORT = 8080;

const request = require('request');
var cookieParser = require('cookie-parser');

app.set("view engine", "ejs");

// middleware 
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

// https://dev.to/oyetoket/fastest-way-to-generate-random-strings-in-javascript-2k5a - credit to Oyetoke Toby
const generateRandomString = () => {
  return Math.random().toString(20).substr(2, 6);
}

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
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
}); // curl -i http://localhost:8080/hello will give us back this string, while redirecting to "/hello" will show us Hello World => converted from json to html

// Use express to render URLs from urlDatabase to our urls_index.ejs file
app.get("/urls", (req, res) => {
  const templateVars = { urls: urlDatabase, username: req.cookies["username"] };
  res.render("urls_index", templateVars);
});

// render template for page where you can enter a new URL
app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

// based on request, render the short URL and long URL to the browser
app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL], username: req.cookies["username"] };
  res.render("urls_show", templateVars);
});

// Upon href click, redirect to long URL of the request
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

// create a new short URL, add to urlDatabase, and render to the browser
app.post("/urls", (req, res) => {
  request(req.body.longURL, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      res.status(404).send(`Error: URL "${req.body.longURL}" not found`);
    } else {
      const short = generateRandomString();
      urlDatabase[short] = req.body.longURL;
      const templateVars = { shortURL: short, longURL: req.body.longURL, username: req.cookies["username"] };
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
      urlDatabase[req.params.id] = req.body.longURL;
      res.redirect('/urls');
    }
  });
});

// Set cookie for username and redirect to home page
app.post('/login', (req, res) => {
  res.cookie('username', req.body.username);
  res.redirect('/urls');
});