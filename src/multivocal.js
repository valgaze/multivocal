
const App = require('actions-on-google').DialogflowApp;
const Template = require('./template');
const Response = require('./response');

/**===================================================================*/

var Config;
var setConfig = function( conf ){
  Config = conf;
};
exports.setConfig = setConfig;

/**===================================================================*/

var builders = [];
exports.builders = builders;

var addBuilder = function( func ){
  builders.push( func );
};
exports.addBuilder = addBuilder;

var buildEnvParameters = function( env ){
  env.Parameter = env.Body.result.parameters || {};
  return Promise.resolve( env );
};

var buildEnvContexts = function( env ){
  env.Context = {};

  // Load any contexts into a more useful environment attribute
  var contexts = env.App.getContexts();
  for( var co=0; co<contexts.length; co++ ){
    var context = contexts[co];
    var contextName = context.name;
    env.Context[contextName] = context;
  }

  return Promise.resolve( env );
};

var buildEnvIntents = function( env ){

  env.Intent = 'Intent.'+env.Body.result.metadata.intentName;
  env.Action = 'Action.'+env.Body.result.action;

  return Promise.resolve( env );
};

var buildEnvLocalRecursive = function( env, index ){
  if( index >= builders.length ){
    return Promise.resolve( env );
  }

  var builder = builders[index];
  return builder( env )
    .then( env => {
      return buildEnvLocalRecursive( env, index+1 );
    });
};

var buildEnv = function( request, response ){
  // Base information for our environment
  var env = {
    App: new App({request, response}),
    Body: request.body,
    Request: request,
    Response: response
  };

  return loadConfig( env )
    .then( env => buildEnvParameters( env ) )
    .then( env => buildEnvContexts( env ) )
    .then( env => buildEnvIntents( env ) )
    .then( env => buildEnvLocalRecursive( env, 0 ) )
    .then( env => Promise.resolve( env ) );
};

/**===================================================================*/

var loadConfig = function( env ){
  return Config.get()
    .then( config => {
      env.Config = config;
      return Promise.resolve( env );
    });
};

/**===================================================================*/

var loadVoice = function( env ){
  var sessionData = env.App.data;
  var voices;
  var size;
  if( env.RequestedVoiceName ){
    voices= env.Config.Voice;
    size = voices.length;
    for( var co=0; co<size; co++ ){
      var voice = voices[co];
      if( voice.Name === env.requestedVoiceName ){
        env.Voice = voice;
      }
    }

  } else if( sessionData.Voice ){
    env.Voice = sessionData.Voice;

  } else {
    voices = env.Config.Voice;
    size = voices.length;
    var index = Math.floor( Math.random() * size );
    env.Voice = voices[index];
  }
  env.App.data.Voice = env.Voice;
  return Promise.resolve( env );
};

/**===================================================================*/

var handlers = {};
exports.handlers = handlers;

var addHandler = function( intentActionName, func ){
  handlers[intentActionName] = func;
};
exports.addHandler = addHandler;

var addIntentHandler = function( intentName, func ){
  handlers[`Intent.${intentName}`] = func;
};
exports.addIntentHandler = addIntentHandler;

var addActionHandler = function( actionName, func ){
  handlers[`Action.${actionName}`] = func;
};
exports.addActionHandler = addActionHandler;

var handleDefault = function( env ){
  var responseNames = [`Response/${env.Intent}`, `Response/${env.Action}`, 'Response/Default'];
  return Response.get( env, responseNames );
};
handlers['DEFAULT'] = handleDefault;
exports.handleDefault = handleDefault;

var handleActionWelcome = function( env ){
  env.App.userStorage.NumVisits = env.App.userStorage.NumVisits ? env.App.userStorage.NumVisits+1 : 1;
  return handleDefault( env );
};
handlers['Action.welcome'] = handleActionWelcome;

var handleActionQuit = function( env ){
  return handleDefault( env )
    .then( env => {
      env.Response.ShouldClose = true;
      return Promise.resolve( env );
    })
};
handlers['Action.quit'] = handleActionQuit;

var handleIntentInputNone = function( env ){
  env.RepromptCount = env.App.getRepromptCount();
  env.RepromptFinal = env.App.isFinalReprompt();
  return handleDefault( env );
};
handlers['Intent.input.none'] = handleIntentInputNone;

var handle = function( env ){
  var handler;
  var handlerName;
  var handlerNames = [env.Intent, env.Action, 'DEFAULT'];
  for( var co=0; co<handlerNames.length && !handler; co++ ){
    handlerName = handlerNames[co];
    handler = handlers[handlerName];
  }
  console.log( 'Multivocal handle', handlerName );

  return handler( env )
    .catch( err => {
      console.error( 'Multivocal Problem with handler', err );
      return Promise.reject( err );
    });
};

/**===================================================================*/

var addSuffix = function( env ){
  var endsWithQmark = env.Msg && env.Msg.endsWith( '?' );
  var shouldClose = env.Response.ShouldClose;
  var noSuffixNeeded = endsWithQmark || shouldClose;
  if( noSuffixNeeded ){
    return Promise.resolve( env );
  }

  var responseNames = ['Suffix/Default'];
  var responseField = 'responseSuffix';
  var responseDefault = {
    TemplateEnvMap: {
      "Template": "Suffix"
    }
  };
  return Response.get( env, responseNames, responseField, responseDefault );

};

/**===================================================================*/

// TODO - Refactor and move to separate module
var ssmlHandlebar = function( voice, options ){

  var openTag = function( tag, params ){
    var ret = '';
    if( params ){
      ret = '<'+tag;
      var keys = Object.keys(params);
      for( var co=0; co<keys.length; co++ ){
        var key = keys[co];
        var val = params[key];
        ret += ` ${key}="${val}"`;
      }
      ret += '>';
    }
    return ret;
  };

  var closeTag = function( tag, params ){
    var ret = '';
    if( params ){
      ret = `</${tag}>`;
    }
    return ret;
  };

  var out = '<speak>';
  out += openTag( 'voice', voice.Voice );
  out += openTag( 'prosody', voice.Prosody );
  out += options.fn( options.data.root );
  out += closeTag( 'prosody', voice.Prosody );
  out += closeTag( 'voice', voice.Voice );
  out += '</speak>';

  var ret = new Template.Handlebars.SafeString( out );
  return ret;
};
Template.Handlebars.registerHelper( 'ssml', ssmlHandlebar );

var buildMessageTemplate = function( env, envTemplateName, template ){
  env[envTemplateName] = template;
  return Promise.resolve( env );
};

var buildMessageContent = function( env, envName, template ){
  if( env[envName] ){
    return Promise.resolve( env );
  }

  var envTemplateName = envName+'Template';
  return buildMessageTemplate( env, envTemplateName, template )
    .then( env => {
      var message = Template.execute( env[envTemplateName], env );
      env[envName] = message;
      return Promise.resolve( env );
    });
};

var buildMessage = function( env ){
  return buildMessageContent( env, 'ssml', '{{#ssml Voice}}{{{Msg}}} {{{Suffix}}}{{/ssml}}' )
    .then( env => buildMessageContent( env, 'txt', '{{{Msg}}} {{{Suffix}}}') );
};

/**===================================================================*/

var sendContext = function( app, context ){
  if( typeof context === 'string' ){
    context = {
      name: context,
      lifetime: 5
    }
  }
  if( !context.parameters ){
    context.parameters = {};
  }
  app.setContext( context.name, context.lifetime, context.parameters );
  return Promise.resolve( context );
};

var sendContextList = function( app, contextSource ){
  if( !contextSource || !contextSource.Context ){
    return Promise.resolve( null );
  }

  var contextList = contextSource.Context;
  if( !Array.isArray( contextList ) ){
    return sendContext( app, contextList );
  }

  var promises = contextList.map( context => sendContext( app, context ) );
  return Promise.all( promises )
    .catch( err => {
      console.error( 'Multivocal sendContextList err', err );
      return Promise.reject( err );
    });
};

var sendContexts = function( env ){
  var contextSourceList = [
    env.Response,
    env.ResponseSuffix
  ];
  var promises = contextSourceList.map( contextSource => sendContextList( env.App, contextSource ) );
  return Promise.all( promises )
    .then( result => Promise.resolve( env ) )
    .catch( err => {
      console.error( 'Multivocal sendContexts err', err );
      return Promise.reject( err );
    });
};

var sendMessage = function( env ){
  var simpleResponse = {
    speech:      env.Ssml,
    displayText: env.Txt
  };
  if( env.Response.ShouldClose ){
    env.App.tell( simpleResponse );
  } else {
    env.App.ask( simpleResponse );
  }
  env.Sent = true;
  return Promise.resolve( env );
};

var send = function( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  return buildMessage( env )
    .then( env => sendContexts( env ) )
    .then( env => sendMessage( env ) )
    .catch( err => {
      console.error( 'Multivocal send err', err );
      return Promise.reject( err );
    });
};

/**===================================================================*/

exports.process = function( request, response ){

  // Build the initial environment
  buildEnv( request, response )

    // Set the "voice" field for the environment
    .then( env => loadVoice( env ) )

    // Determine what handler we should call and call it
    .then( env => handle( env ) )

    // If there needs to be anything else on the reply (like asking
    // a question) figure that out here.
    .then( env => addSuffix( env ) )

    // Send a response if one hasn't already been sent
    .then( env => send( env ) )

    .catch( err => {
      console.error( 'Problem during processing', err );
      return Promise.reject( err );
    });
};