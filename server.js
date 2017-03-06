const express = require('express');
const hbs = require('hbs');
const fs = require('fs');
const braintree = require("braintree");

const gateway = braintree.connect({
  environment: braintree.Environment.Sandbox,
  merchantId: "xpwyrfws6pc5pfp6",
  publicKey: "t6htsgqtp3w5tjgy",
  privateKey: "b50a79443471ba287b90e2895ff49ba5"
});

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

app.get('/', (req, res) => {
  res.render('home.hbs', {
    pageTitle: 'Home Page',
    welcomeMessage: 'Welcome to my website'
  });
});

app.use(express.static(__dirname + '/public'));

hbs.registerHelper('getCurrentYear', () => {
  return new Date().getFullYear();
});

hbs.registerHelper('screamIt', (text) => {
  return text.toUpperCase();
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

app.get("/client_token", function (req, res) {
  gateway.clientToken.generate({}, function (err, response) {
    res.send(response.clientToken);
  });
});

app.get('/pay', (req, res) => {
  gateway.clientToken.generate({}, function (err, response) {
    res.render('pay.hbs', {
      pageTitle: 'Checkout Page',
      welcomeMessage: 'Please enter you payment details',
      clientToken: response.clientToken
    });
  });
});

app.post("/checkout", function (req, res) {
  var nonceFromTheClient = req.body.payment_method_nonce;
  // Use payment method nonce here
  console.log(req.body);


  gateway.transaction.sale({
  amount: "10.00",
  paymentMethodNonce: nonceFromTheClient,
  options: {
    submitForSettlement: true
    }
  }, function (err, result) {
    console.log(result);
  });
});



app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
