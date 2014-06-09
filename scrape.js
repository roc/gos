var fs = require('fs');
var q = require('q');
var request = require('request');
var colors = require('colors');

var Scraper = function(){
    // 'use strict';
    const baseurl = 'https://www.gov.uk/api/organisations';
    this.log = function() {

        var args = Array.prototype.slice.call(arguments),
            message = args.join(': '.grey);
        return console.log('[Scraper]'.magenta.bold, message.green);
    },
    this.get = function(slug) {
        var deferred = q.defer();
        var _this = this;

        if(typeof slug === 'undefined'){
            slug = '';
        }

        var requestPath = baseurl+slug.replace(baseurl, '');
        _this.log('Requesting', requestPath);
        request(requestPath, function(error, response, body){
            _this.log('Request returned', response.headers.status + ' with type ' + response.headers['content-type']);
            var responseObj = {
                'response'  : response,
                'error'     : error,
                'body'      : body
            };
            deferred.resolve(responseObj);
        });
        return deferred.promise;
    },
    this.write = function(fileName, fileBody) {
        var filePath = [__dirname, 'files', fileName].join('/');
        var _this = this;
        var deferred = q.defer();
        _this.log('Writing ' +fileName+ ' to', filePath);
        fs.writeFile(filePath, fileBody, function(err) {
            if(err) {
                _this.log(err);
            } else {
                _this.log('File saved to', filePath);
                deferred.resolve();
            }
        });
        return deferred.promise;
    },
    this.next = function(result){
        return result.next_page_url;
    },
    this.getPageTitle = function(result){
        return 'page_' + result.current_page + '.json';
    },
    this.setParsedAt = function(result){
        var parseTime = new Date().toJSON();
        result.parsed_at = parseTime;
        return result;
    };
};

var scraper = new Scraper();

function getResultsPage(url){
    var response = scraper.get(url);

    response.done(function(results){
        var err = results.error;
        if(err === null || err === undefined){
            var body = results.body;
            var parsed = scraper.setParsedAt(JSON.parse(body));
            var pretty = JSON.stringify(parsed, null, 4);
            var writing = scraper.write(scraper.getPageTitle(parsed), pretty);

            writing.done(function(){
                if(scraper.next(parsed)){
                    getResultsPage(scraper.next(parsed));
                }
            });
        } else {
            scraper.log(err);
        }

    });
}

getResultsPage();