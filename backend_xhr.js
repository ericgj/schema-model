'use strict';

var Backend = require('backend');

module.exports = function(){
  return Backend().mediaType('application/json', json);
}

function json(link, data, fn){
  var method = link.method || 'GET';
  var accept = (method == 'GET' ? link.mediaType || null : null);
  var req = jsonXHR( method, link.href, fn ); 
  req.setRequestHeader('X-Requested-By', 'XMLHttpRequest');
  if (accept) req.setRequestHeader('Accept', accept);
  req.setRequestHeader('Content-Type', link.mediaType || null);

  if (undefined === data){
    return req.send();
  } else {
    return req.send(JSON.stringify(data));
  }
}

function jsonXHR(meth, url, cb){
  return xhr(meth, url, cb, function(req){
    return JSON.parse(req.responseText);
  });
}

function xhr(meth, url, cb, fn){
  var req = new XMLHttpRequest();
  "onload" in req 
    ? req.onload = req.onerror = _respond
    : req.onreadystatechange = function(){ req.readState > 3 && _respond(); }

  function _respond(){
    var status = req.status, result;
    if (!status && _hasResponse(req) || status >= 200 && status < 300 || status === 304){
      try {
        result = fn(req);
      } catch (e){
        cb(e,req);
      }
      cb(null,result);
    } else {
      var msg = (req.responseText || 'Error fetching ' + url) + ' (' + status + ')';
      cb(new Error(msg), req);
    }
  }

  function _hasResponse(req){
    var type = req.responseType;
    return !!(
      type && type !== 'text'
        ? req.response
        : req.responseText
    );
  }

  req.open(meth,url);
  return req;
}


