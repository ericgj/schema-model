'use strict';

var Model = require('schema-model');
var Backend = require('ericgj-backend');
var Validator = require('jesquema');
var assert = require('assert');

function validate(schema,instance){
  return Validator('4').schema(schema)(instance);
}

describe('Model core : ', function(){

  var schema = {
    required: ['title','author','status'],
    properties: {
      'id': { type: 'number' },
      'status': { enum: ['new','draft','review','final'] }
    },
    links: [
      { rel: 'list', href: '/articles', method: 'GET', type: 'application/json' }
    ],
    anyOf: [
      {
        "properties": {
          "status": { enum: ['new'] }
        },
        "links":  [
          { rel: 'create', href: '/articles', method: 'POST', type: 'application/json' }
        ]
      },
      {
        "properties": {
          "status": { enum: ['draft','review'] }
        },
        "links": [
          { rel: 'update', href: '/articles/{id}', method: 'PUT', type: 'application/json' },
          { rel: 'delete', href: '/articles/{id}', method: 'DELETE' }
        ] 
      },
      { }
    ]
  }
  var subject = Model(schema).validator(validate);

  it('valid instances should be valid, not dirty, and have expected links and methods', function(){
    var backend = MockBackend()
                   .link({ rel: 'list'})
                   .link({ rel: 'update'})
                   .link({ rel: 'delete'})
                  ;
    subject.backend(backend);

    var inst = {id: 123, title: 'Beyond a Boundary', author: 'James', status: 'draft'}
    var actual = subject(inst);
    assert.equal( actual.valid(), true );
    assert.equal( actual.dirty(), false );

    console.debug( this.test.fullTitle() + " : links :: %o", backend.inspectLinks() );
    backend.assertHasExpectedLinks();
    
    actual.list();
    actual.update();
    actual.delete();
    console.debug( this.test.fullTitle() + " : calls :: %o", backend.inspectCalls() );
    assert.equal( backend.inspectCalls().length, 3);
  })

  it('after state change, instances should be dirty and have updated links and methods', function(){
    var backend = MockBackend()
                   .link({ rel: 'list'})
                   .link({ rel: 'update'})
                   .link({ rel: 'delete'})
                  ;
    subject.backend(backend);

    var inst = {id: 456, title: 'Arusha Declaration', author: 'Nyerere', status: 'new'}
    var actual = subject(inst);
    console.debug( this.test.fullTitle() + " : links before :: %o", backend.inspectLinks() );
    actual.list();
    actual.create();

    actual.set('status','draft');

    assert.equal( actual.dirty(), true );
    console.debug( this.test.fullTitle() + " : value after :: %o", actual.value() );
    console.debug( this.test.fullTitle() + " : links after :: %o", backend.inspectLinks() );
    backend.assertHasExpectedLinks();
    actual.list();
    actual.update();
    actual.delete();
     
  })

})


function MockBackend(){

  var explinks = []
    , actlinks = []
    , calls = [];

  mock.link = function(link){
    explinks.push(link); return this;
  }

  mock.inspectLinks = function(){
    return actlinks.slice(0);
  }

  mock.inspectCalls = function(){
    return calls.slice(0);
  }

  mock.assertHasExpectedLinks = function(){
    var missing = [];
    assert( 
           explinks.every( function(explink){
             var hit = actlinks.filter( function(actlink){
               return (!explink.rel    || actlink.rel == explink.rel) &&
                      (!explink.method || actlink.method == explink.method) &&
                      (!explink.type   || actlink.type == explink.type) ;
             }).length;
             if (hit == 0) missing.push(explink);
             return hit == 1;
           }) &&  (
             explinks.length == actlinks.length
           ),
           [
             (!(explinks.length == actlinks.length)
               ? "Expected " + explinks.length + " links, were " + actlinks.length 
               : null
             ),
             (missing.length > 0
               ? "Missing expected links: " + JSON.stringify(missing)
               : null
             )
           ].filter( function(line){ return !!line;} ).join('\n')
         );
  }


  function mock(){
    
    actlinks = [];  calls = [];  // a bit shitty, but necessary given state needed in parent scope
    
    compiled.link = function(l){
      actlinks.push(l); return this;
    }

    function compiled(){
      var obj = {};
      for (var i=0; i<actlinks.length; ++i){
        var link = actlinks[i];
        obj[link.rel] = function(){
          calls.push([ link, [].slice.call(arguments,0) ]);
        }
      }
      return obj;
    }

    return compiled;
  }

  return mock;
}

