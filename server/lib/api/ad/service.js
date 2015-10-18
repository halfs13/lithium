'use strict';

var Promise = require('bluebird');
var request = require('superagent');
var parser = require('htmlparser2');

var config = require('config');

var DB_TYPE = 'ad';

var adService = {};

adService.fetchSection = function(city, section) {
    //TODO read subsequent pages
    return new Promise(function(resolve, reject) {
        fetchPage('https://' + city + '.craigslist.org/search/' + section)
        .then(resolve)
        .catch(reject);
    });
};

var fetchPage = function(url) {
    return new Promise(function(resolve, reject) {
        request.get(url)
        .end(function(err, res) {
            processPage(err, res)
            .then(resolve)
            .catch(reject);
        });
    });
};

var processPage = function(err, res) {
    return new Promise(function(resolve, reject) {
        var links = [];
        var attr = {};

        var parse = new parser.Parser({
            onopentag: function(name, attributes) {
                attr = {
                    href: attributes.href,
                    class: attributes.class,
                    text: ''
                };
            },
            ontext: function(text) {
                if(text !== '\n') {
                    attr.text += text;
                }
            },
            onclosetag: function() {
                if(attr.href) {
                    attr.text = attr.text.trim();
                    links.push(attr);
                }
            },
            onend: function() {
                resolve(links);
            }
        },{
            decodeEntities: true
        });

        parse.write(res.text);
        parse.end();
    });
};

adService.indexAds = function(ads) {
    return ads.each(function(ad) {
        return adService.indexAd(ad);
    });
};

adService.indexAd = function(ad) {
    return config.db.client.index({
        index: config.db.index,
        type: DB_TYPE,
        id: ad.id,
        body: ad
    });
};

module.exports = adService;