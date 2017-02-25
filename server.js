const express = require('express');
const hbs = require('hbs');
const fs = require('fs');
const keyPublishable = process.env.PUBLISHABLE_KEY || "pk_test_PvPL3W94KCJmEXmKLpkOzxJE";
const keySecret = process.env.SECRET_KEY  || "sk_test_Wxt8a3lgXbCdSvRJpAXsBVRq";

const port = process.env.PORT || 3000;
var app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

hbs.registerPartials(__dirname + '/views/partials')
app.set('view engine', 'hbs');

app.use((req, res, next) => {
  var now = new Date().toString();
  var log = `${now}: ${req.method} ${req.url}`;

  console.log(log);
  fs.appendFile('server.log', log + '\n');
  next();
});

// app.use((req, res, next) => {
//   res.render('maintenance.hbs');
// });

app.use(express.static(__dirname + '/public'));

hbs.registerHelper('getCurrentYear', () => {
  return new Date().getFullYear();
});

hbs.registerHelper('screamIt', (text) => {
  return text.toUpperCase();
});

app.get('/', (req, res) => {
  res.render('home.hbs', {
    pageTitle: 'Home Page',
    welcomeMessage: 'Welcome to my website'
  });
});

// /bad - send back json with errorMessage
app.get('/bad', (req, res) => {
  res.send({
    errorMessage: 'Unable to handle request'
  });
});

app.get('/service', (req, res) => {
  var postcode = req.query.postcode;
  if (!postcode) {
    res.send(`We need your postcode.`);
    next();
  }

  if (postcode.trim() == "W6") {
  res.send(`Great. Service is available in ${req.query.postcode}`);
} else {
  res.send(`Sorry. Service is not available in ${req.query.postcode}`);
}
});

app.get('/pay', (req, res) => {
  res.render('pay.hbs', {
    pageTitle: 'Checkout Page',
    welcomeMessage: 'Welcome to my website'
  });
});



app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
