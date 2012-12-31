###
  * Commune.js
  * Web workers lose their chains
  * 0.2.0
  * Easy, DRY, transparent worker threads for your app
  * Dan Motzenbecker
  * http://oxism.com
  * MIT License
###

root = @
communes = {}
makeBlob = null


class Commune

  constructor: (fn) ->
    fnString = fn.toString()

    if fnString.match /this/
      console?.warn """
      Commune: Referencing `this` within a worker process will not work.
      `this` will refer to the worker itself.
      The passed function appears to use it, but the worker will still be created.
      """

    if (lastReturnIndex = fnString.lastIndexOf 'return') is -1
      throw new Error 'Commune: Target function has no return statement.'

    returnStatement = fnString.substr(lastReturnIndex)
      .replace('return', '').replace(/\}$/, '').replace ';', ''

    fnString = fnString.slice(0, lastReturnIndex) +
      "\nself.postMessage(#{ returnStatement });\n}"

    fnString = fnString.replace /^function(.+)?\(/, 'function communeInit('

    fnString += 'if(typeof window === \'undefined\'){\n'  +
      'self.addEventListener(\'message\', function(e){\n' +
      '\ncommuneInit.apply(this, e.data);\n});\n}'

    @blobUrl = makeBlob fnString


  spawnWorker: (args, cb) ->
    worker = new Worker @blobUrl
    worker.addEventListener 'message', (e) ->
      cb e.data
      worker.terminate()
    worker.postMessage args



threadSupport = do ->
  # For deprecated BlobBuilder API support:
  blobConstructor = root.BlobBuilder or root.WebKitBlobBuilder or
    root.MozBlobBuilder or false

  try
    testBlob = new Blob
    BlobBuilder = root.Blob
  catch e
    BlobBuilder = blobConstructor

  URL = root.URL or root.webkitURL or root.mozURL or false

  return false unless BlobBuilder and URL and root.Worker

  testString = 'true'
  try
    if BlobBuilder is root.Blob
      testBlob = new BlobBuilder [testString]
      sliceMethod = BlobBuilder::slice or BlobBuilder::webkitSlice or
        BlobBuilder::mozSlice
      rawBlob = sliceMethod.call testBlob
      makeBlob = (string) ->
        blob = new BlobBuilder [string], type: 'application\/javascript'
        URL.createObjectURL sliceMethod.call blob
    else
      testBlob = new BlobBuilder
      testBlob.append testString
      rawBlob = testBlob.getBlob()
      makeBlob = (string) ->
        blob = new BlobBuilder
        blob.append string
        URL.createObjectURL blob.getBlob()

    testUrl = URL.createObjectURL rawBlob
    testWorker = new Worker testUrl
    testWorker.terminate()
    true
  catch e
    if e.name is 'SECURITY_ERR'
      console?.warn 'Commune: Cannot provision workers when serving' +
        'via `file://` protocol. Serve over http to use worker threads.'
    false


createCommune = (fn, args, cb) ->
  fnString = fn.toString()
  unless communes[fnString]
    commune = communes[fnString] = new Commune fn
  else
    commune = communes[fnString]

  commune.spawnWorker args, cb


root.commune = (fn, args, cb) ->
  if typeof fn isnt 'function'
    throw new Error 'Commune: Must pass a function as first argument.'

  if threadSupport

    if Array.isArray args
      argList = args
      if typeof cb is 'function'
        callback = cb
      else
        throw new Error 'Commune: Must pass a callback to utilize worker result.'

    else if typeof args is 'function'
      callback = args
      argList = []
    else unless args?
      throw new Error 'Commune: Must pass a callback to utilize worker result.'

    createCommune fn, argList, callback

  else

    return fn() unless args and cb

    if typeof args is 'function' or not args
      cb = args
      args = []

    cb? fn args


root.commune.isSupported = threadSupport
