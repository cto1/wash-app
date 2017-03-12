const express = require('express');
var path = require('path');
const hbs = require('hbs');
const fs = require('fs');
const braintree = require("braintree");
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var flash = require('connect-flash');

const gateway = braintree.connect({
  environment: braintree.Environment.Sandbox,
  merchantId: "xpwyrfws6pc5pfp6",
  publicKey: "t6htsgqtp3w5tjgy",
  privateKey: "b50a79443471ba287b90e2895ff49ba5"
});

const port = process.env.PORT || 3000;
var app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  // this string is not an appropriate value for a production environment
  // read the express-session documentation for details
  secret: '---',
  saveUninitialized: true,
  resave: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());

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
    welcomeMessage: 'Welcome to my website='
  });
});

//app.use(express.static(__dirname + '/public'));

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

app.get('/pay', (req, res) => {
  gateway.clientToken.generate({}, function (err, response) {
    console.log(response.clientToken);
    let token = response.clientToken;
    console.log('---------------------------------------');
    console.log(token);
    console.log(err);
    res.render('pay.hbs', {
      pageTitle: 'Checkout Page',
      welcomeMessage: 'Please enter you payment details',
      clientToken: token
    });
  });
});

app.get('/pay/:id', function (req, res) {
  var result;
  var transactionId = req.params.id;
  console.log(transactionId);

  gateway.transaction.find(transactionId, function (err, transaction) {
    console.log(transaction.status);
    //result = createResultObject(transaction);
    res.render('pay_id', {transaction: transaction.status, result: err, pageTitle: 'Result'});
  });
});



app.post("/checkout", function (req, res) {
  var transactionErrors;
  var amount = req.body.amount; // In production you should not take amounts directly from clients
  var nonce = req.body.payment_method_nonce;
  // Use payment method nonce here
  console.log(req.body);
  console.log(`amount ${amount}`);
  console.log(`nonce ${nonce}`);


  gateway.transaction.sale({
  amount: amount,
  orderId: "order id",
  paymentMethodNonce: nonce,
  customer: {
    firstName: "Drew",
    lastName: "Smith",
    company: "Braintree",
    phone: "312-555-1234",
    fax: "312-555-12346",
    website: "http://www.example.com",
    email: "drew@example.com"
  },
  billing: {
    firstName: "Paul",
    lastName: "Smith",
    company: "Braintree",
    streetAddress: "1 E Main St",
    extendedAddress: "Suite 403",
    locality: "Chicago",
    region: "IL",
    postalCode: "60622",
    countryCodeAlpha2: "US"
  },
  shipping: {
    firstName: "Jen",
    lastName: "Smith",
    company: "Braintree",
    streetAddress: "1 E 1st St",
    extendedAddress: "5th Floor",
    locality: "Bartlett",
    region: "IL",
    postalCode: "60103",
    countryCodeAlpha2: "US"
  },
  options: {
    submitForSettlement: true,
    storeInVaultOnSuccess: true
    }
  }, function (err, result) {
    if (result.success || result.transaction) {
          res.redirect('pay/' + result.transaction.id);
    } else {
      transactionErrors = result.errors.deepErrors();
      //req.flash('error', {msg: formatErrors(transactionErrors)});
      req.flash('error', {msg: transactionErrors});
      res.redirect('/pay');
    }
  });
});



app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
