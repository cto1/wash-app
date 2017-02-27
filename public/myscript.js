/*global $ */

var houseprice = 20;
var flatprice = 11;
var trialprice = 1;
var disprice = 19;
var currency = "£";


$(function () {
    "use strict";
    $("#header").load("header.html");
    $("#footer").load("footer.html");
    $("#meta").load("meta.html");
});


$(document).on('click', '#resetpass', function () {
    "use strict";
    window.location = 'forgot-pass-email.html';
});
