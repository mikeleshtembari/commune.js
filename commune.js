// Generated by CoffeeScript 1.6.3
/*
  * Commune.js
  * Web workers lose their chains
  * 0.2.2
  * Easy, DRY, transparent worker threads for your app
  * Dan Motzenbecker
  * http://oxism.com
  * MIT License
*/


(function() {
  var Commune, communes, makeBlob, mime, threadSupport;

  communes = {};

  makeBlob = null;

  mime = 'application\/javascript';

  Commune = (function() {
    function Commune(fnString) {
      var lastReturnIndex;
      if (fnString.match(/\bthis\b/)) {
        if (typeof console !== "undefined" && console !== null) {
          console.warn('Commune: Referencing `this` within a worker process might not work as expected.\n`this` will refer to the worker itself or an object created within the worker.');
        }
      }
      if ((lastReturnIndex = fnString.lastIndexOf('return')) === -1) {
        throw new Error('Commune: Target function has no return statement.');
      }
      this.blobUrl = makeBlob((fnString.slice(0, lastReturnIndex) + ("  self.postMessage(" + (fnString.substr(lastReturnIndex).replace(/return\s+|;|\}$/g, '')) + ");\n}")).replace(/^function(.+)?\(/, 'function __communeInit(') + 'if (typeof window === \'undefined\') {\n  self.addEventListener(\'message\', function(e) {\n    __communeInit.apply(this, e.data);\n  });\n}');
    }

    Commune.prototype.spawnWorker = function(args, cb) {
      var worker;
      worker = new Worker(this.blobUrl);
      worker.addEventListener('message', function(e) {
        cb(e.data);
        return worker.terminate();
      });
      return worker.postMessage(args);
    };

    return Commune;

  })();

  threadSupport = (function() {
    var Blob, URL, e, testBlob, testString, testUrl, testWorker;
    try {
      testBlob = new this.Blob;
      Blob = this.Blob;
    } catch (_error) {
      e = _error;
      Blob = this.BlobBuilder || this.WebKitBlobBuilder || this.MozBlobBuilder || false;
    }
    URL = this.URL || this.webkitURL || this.mozURL || false;
    if (!(Blob && URL && this.Worker)) {
      return false;
    }
    testString = 'true';
    try {
      if (Blob === this.Blob) {
        testBlob = new Blob([testString], {
          type: mime
        });
        makeBlob = function(string) {
          return URL.createObjectURL(new Blob([string], {
            type: mime
          }));
        };
      } else {
        testBlob = new Blob;
        testBlob.append(testString);
        testBlob = testBlob.getBlob(mime);
        makeBlob = function(string) {
          var blob;
          blob = new Blob;
          blob.append(string);
          return URL.createObjectURL(blob.getBlob(mime));
        };
      }
      testUrl = URL.createObjectURL(testBlob);
      testWorker = new Worker(testUrl);
      testWorker.terminate();
      return true;
    } catch (_error) {
      e = _error;
      if (e.name === 'SECURITY_ERR') {
        if (typeof console !== "undefined" && console !== null) {
          console.warn('Commune: Cannot provision workers when serving' + 'via `file://` protocol. Serve over http(s) to use worker threads.');
        }
      }
      return false;
    }
  })();

  this.commune = function(fn, args, cb) {
    var commune, fnString;
    if (typeof fn !== 'function') {
      throw new Error('Commune: Must pass a function as first argument.');
    }
    if (typeof args === 'function') {
      cb = args;
      args = [];
    }
    if (threadSupport) {
      fnString = fn.toString();
      if (!communes[fnString]) {
        if (typeof cb !== 'function') {
          throw new Error('Commune: Must pass a callback to utilize worker result.');
        }
        commune = communes[fnString] = new Commune(fnString);
      } else {
        commune = communes[fnString];
      }
      return commune.spawnWorker(args, cb);
    } else {
      return setTimeout((function() {
        return cb(fn.apply(this, args));
      }), 0);
    }
  };

  this.communify = function(fn, args) {
    if (args) {
      return function(cb) {
        return commune(fn, args, cb);
      };
    } else {
      return function(args, cb) {
        return commune(fn, args, cb);
      };
    }
  };

  this.commune.isThreaded = function() {
    return threadSupport;
  };

  this.commune.disableThreads = function() {
    return threadSupport = false;
  };

  this.commune.enableThreads = function() {
    return threadSupport = true;
  };

}).call(this);

/*
//@ sourceMappingURL=commune.map
*/
