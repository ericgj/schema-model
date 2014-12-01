'use strict';

var Observ = require('observ')
  , ObservStruct = require('observ-struct')
  , BackendXHR = require('./backend_xhr')

var BLACKLIST = ['valid','validate','errors','value','dirty','_delegate'];

module.exports = function Model(schema){

  var backend;
  var validate;

  model.validator = function(_){
    if (arguments.length == 0) return validate;
    validate = _; return this;
  }

  model.backend = function(_){
    if (arguments.length == 0) return backend;
    backend = _; return this;
  }

  model.xhr = function(){
    this.backend( BackendXHR ); return this;
  }

  function model(obj){
    var struct = {
      valid:    function(){ return this.validate().valid(); },
      errors:   function(){ return this.validate().errors(); },
      validate: function(){ return validate(schema, this.value()); },
      value: ObservStruct( parsed(obj) ),
      dirty: function(){ return dirty; },
      _delegate: {}
    };

    var dirty = false;
    var _refresh = refresh(struct,backend);

    struct.value( function(){ dirty = true; } );  //  on value mutation, set dirty 
    struct.value( _refresh );    // on value mutation, rebind delegate
    
    _refresh(obj);
    
    return struct;
  }

  return model;

}

// TODO ideally this would return readonly values as non-observed values
function parsed(obj){
  var ret = {};
  for (var k in obj) ret[k] = Observ(obj[k]);
  return ret;
}

function refresh(m,factory){
  return function(value){
    var backend = factory();
    compile(m.validate().links(),backend);
    bindDelegate(m, '_delegate', backend(value) );
  }
}

function compile(links,backend){
  for (var i=0; i<links.length; ++i){
    var link = links[i];
    if ( BLACKLIST.indexOf(link.rel) >= 0 ) 
      throw new Error('Unable to build link: ' + link.rel);
    backend.link(links[i]);
  }
}

function unbindDelegate(target, meth){
  if (undefined === target[meth]) return;
  for (var k in target[meth]){
    delete target[k];
  }
  return target;
}

function bindDelegate(target, meth, source){
  unbindDelegate(target, meth);
  target[meth] = source;
  for (var k in source){
    if (!(undefined === target[k])) continue;
    target[k] = function(){
      return target[meth][k].apply(target, arguments);
    }
  }
  return target;
}
      

