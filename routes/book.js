var express = require('express');
var goodGuy = require('good-guy-http')({
    maxRetries: 3
});
var jp = require('jsonpath');
var router = new express.Router();
var ESI = require('nodesi');
var esi = new ESI({
    onError: (src, error) => `<!-- GET ${src} resulted in ${error} -->`
});

var BOOK_SERVICE_URL = 'https://book-catalog-proxy-1.herokuapp.com/book?isbn=';

function pickRelevantBookData (req, data) {
    const volume = jp.value(data, '$..volumeInfo');

    return {
        url: 'https://book-inventory-naveed.herokuapp.com/stock/' + req.params.isbn,
        bookTitle: volume.title,
        subtitle: volume.subtitle,
        bookCover: jp.value(volume, '$..thumbnail')
    };
}

function renderPage (app, pageData) {
    return new Promise((resolve, reject) => {
        app.render('book', pageData, (err, html) => {
            if (err) { return void reject(err); }
            resolve(html);
        });
    });
}

function partial (fn, args) {
    return fn.bind(null, args);
}

router.get('/:isbn', function (req, res, next) {
    goodGuy(`${BOOK_SERVICE_URL}${req.params.isbn}`)
    .then(response => JSON.parse(response.body))
    .then(partial(pickRelevantBookData, req))
    .then(partial(renderPage, req.app))
    .then(html => esi.process(html, {
        headers: {
            'Accept': 'text/html'
        }
    }))
    .then(html => res.send(html))
    .catch(next);
});

module.exports = router;
