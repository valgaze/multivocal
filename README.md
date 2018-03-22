# multivocal
A node.js library to assist with building best practice, configuration driven, Actions for the Google Assistant.

## Why multivocal?

## Hello World

Using multivocal to implement a basic fulfillment webhook for a Dialogflow
based action built on Firebase Cloud Functions is straightforward with just
a little boilerplate.

```javascript
const Multivocal = require('multivocal');

new Multivocal.Config.Simple({
  Local: {
    und: {
      Response: {
        "Action.multivocal.welcome": [
          {
            Template: {
              Text: "Hello world."
            },
            ShouldClose: true
          }
        ]
      }
    }
  }
});

const functions = require('firebase-functions');
exports.webhook = functions.https.onRequest( (req,res) => {
    Multivocal.process( req, res );
});
```

We can roughly break this into three parts:

1.  Load the multivocal library.

2.  Build our configuration.  
   
    We'll use a simple configuration object that takes the JSON for the configuration.
   
    We need to define the _Action.multivocal.welcome_ response, 
    and we'll define it for the _undefined_
    locale. This response says that for any incoming request that is for
    the Action with the name `multivocal.welcome`, format the Template with
    this text to use as our message.
    Furthermore, after we send this message, we should close the conversation.
   
    The `multivocal.welcome` Action is one that is provided by the standard
    Intents, and is called when the conversation begins.
    
    Building the configuration automatically adds it to Multivocal's
    configuration.
   
3.  Register the function to be called when a request comes in from Dialogflow
    and have multivocal process it.  
   
    This uses the Firebase Cloud Functions registration method to declare the
    function, but anything that can pass an express-like `req` and `res` object
    to `Multivocal.process()` will work fine. (These include Google Cloud
    Functions and anything running express.js.)

## Features

### Naming Convention

Although there are some exceptions, multivocal reserves the following naming
conventions as things that will be defined for the library. These names are
found in the configuration object, in properties in objects, and in Dialogflow
configuration. In order to maintain forward compatibility, you shouldn't
use things named this way unless they've been documented:

* Names starting with a Capital Letter 
  (Response, Action, etc)
* Names starting with one or more underscore, followed by a _Capital _Letter
  (_Builder, _Task, etc)
* Names starting with "multivocal", in any case
  (multivocal_session, Multivocal_counter)

### Configuration

#### Simple Object configuration

Since most configuration is represented internally as JavaScript Object
attributes, it makes sense to use a JavaScript Object as one form of
configuration. You can add this configuration by creating a new
`Multivocal.Config.Simple` object and passing in an Object with attributes.

```
var config = {
  Local: {
    und: {
      Response: {
        "Action.multivocal.welcome": [
          {
            Template: {
              Text: "Hello world."
            },
            ShouldClose: true
          }
        ]
      }
    }
  }
};
new Multivocal.Config.Simple( config );
```

#### Firebase realtime database configuration

Firebase represents its entire realtime database as a JSON tree, with
some restrictions on the values of the keys. The `Multivocal.Config.Firebase`
configuration can treat any path in a database as an object to be used
for configuration. You can specify the path in the configuration, or
use the default of `multivocal`. If you're using Firebase Cloud Functions,
you don't need to provide the firebase settings for initialization, otherwise
you will need to provide settings that include, at least, a URL and
credentials.

The upside to using Firebase to store responses is that it is very
easy to update the database (either manually or by uploading JSON)
and the changes will be live immediately.

One catch is that Firebase doesn't allow a period in the key value, so
you need to replace them with underscores in Firebase. The configuration
module will convert them to periods.

For many uses, this should be sufficient:
```
new Multivocal.Config.Firebase();
```

If you need to specify configuration, the name of the firebase app,
and/or the path to use for configuration, you may need something more
like this:
```
var firebase = {
  config: {
    ...
  },
  name: undefined,            // Uses default Firebase app
  path: 'config/multivocal'   // Defaults to 'multivocal'
};
new Multivocal.Config.Firebase( firebase );
```

#### Cloud Firestore configuration

Firebase's Cloud Firestore database provides a way to store documents
that contain attributes and values. Since these values can be object-like,
a document maps very nicely to a JavaScript object. The `Multivocal.Config.Firestore`
configuration treats a document (specified by a collection name and
document name) as an object. It defaults to a collection name of `config`
and a document name of `multivocal`. If you're using Firebase Cloud
Functions, you don't need to provide the firebase settings for initialization,
otherwise you will need to provide settings that include, at least, 
connection information and credentials.

The upside to using Firestore to store responses and configuration is
that it is very easy to update the database (generally manually, or
by using a program to upload JSON) and the changes will be live immediately.

Unlike the Firebase Realtime Database, Firestore allows for attribute
names with periods.

For many uses, this should be sufficient:
```
new Multivocal.Config.Firestore()
```

If you need to specify configuration, the name of the firebase app,
the collection, and/or the document, you may need something more
like this:
```
var firestore = {
  config: {
    ...
  },
  name: undefined,            // Uses default Firebase app
  collection: 'stuff',        // Uses 'config' by default
  document:   'mv'            // Uses 'multivocal' by default
};
new Multivocal.Config.Firestore( firestore );
```

#### Merged configuration

There is also a configuration which takes a list of other configuration
objects and merges them, with latter configurations overriding earlier
ones. This is a deep merge, so it can be used to change specific fields.

This is primarily used internally to get the configuration available
when Multivocal is called.

#### Adding your own configuration source

If none of these suit your needs, you can create a class whose instances
do get the configuration from whatever source you need. The only requirement
is that it have a method `get()` which returns a Promise that resolves
to an object with attributes. This object should be an instance that
is different than one returned by any other call to `get()`. (In the
event it is modified.)

You register the configuration instance by calling `Multivocal.addConfig()`. 
The built-in configuration classes do this for you as part of creating
the instance, and you may wish to adopt this model as well.

#### Default and Standard configurations

Multivocal installs two configuration instances when it starts up.

The default configuration is available in the DefCon environment setting.
It contains "last resort" values and default settings. You **should not**
touch this environment setting - you can override everything in your own
configurations.

The standard configuration is loaded as the first configuration and
contains some basic phrases and tools. You typically don't want to
eliminate it, but it is possible if needed.

(TODO: Point to more complete documentation elsewhere)

### Processing, the Environment, and Paths

#### Platform detection

### Environment builders

Environment settings built:

* Platform

* Locale

* Lang

* Parameter

* Context

* User/State

* Session/State

* Session/Counter

* Session/Consecutive

* Option

* MediaStatus

* Session/Feature

* User/Feature

* Intent

* IntentName

* Action

* ActionName

* Default

#### Adding your own builder

### Intents and Actions

#### Standard Dialogflow Intents/Actions

(TODO: Work in progress to provide Dialogflow zip)

##### Action: welcome and multivocal.welcome

Increments the `User/State/NumVisits` environment value.

##### Action: quit and multivocal.quit

Sets the `Response/ShouldQuit` environment setting to true
after doing response processing.

##### Intent: input.none

##### Intent: input.unknown

##### Action: input.unknown

##### Action: repeat and multivocal.repeat

Sets the `Response/ShouldRepeat` environment setting to true
after doing response processing.

### Handlers

#### Built-in handlers

##### Default handler

#### Adding your own handler and setting an Outent

### Response, Suffix, Localization, and Templates

#### Conditions

#### Base responses

Response settings:

* Base/Ref

* Base/Set

* Base/Condition

### Sending

#### Message

Environment settings:

* Msg/Ssml
* Msg/Text
* Suffix/Ssml
* Suffix/Text

#### Cards

#### Suggestion chips

#### Lists and Options

Environment settings:

* Msg/Option/Type

    Should be either "list" or "carousel".
    
* Msg/Option/Title

* Msg/Option/Items

    There must be at least 2 items. (TODO: Enforce or adapt this.)

    * Msg/Options/Items[]/Title

    * Msg/Options/Items[]/Body

    * Msg/Options/Items[]/ImageUrl

    * Msg/Options/Items[]/ImageText
    
    * Msg/Option/Items[]/Footer
        (for Browsing Carousel only)
    
    * Msg/Options/Items[]/Url
        (for Browsing Carousel only)

#### Link out

(TODO: Link out suggestion - work in progress)

(TODO: Link out/to Android app prompt - work in progress)

#### Media

Environment settings:

* Audio/Url

* Audio/Title

* Audio/Body

* Audio/IconUrl

* Audio/ImageUrl

### Voices

### Contexts

### User and Session Storage

### Requirements and Requests

(TODO: Request surface feature - work in progress)

(TODO: Requesting place by name - work in progress)

(TODO: Authorization - work in progress)

(TODO: Adding own requirements - work in progress)

### Counters

Session/Counter

Session/Consecutive

#### Counters set by the system

The system will increment the following Counters as part of the Default
handler, just before the Response is computed:

* the handler name, prefixed by 'Handler.'
* the Action
* the Intent
* the Outent
* NumVisits

Additionally, the `User/State/NumVisits` environment value is incremented
as part of the `Action.welcome` handler by default

#### Adding your own counter

In your handler, you can add a counter name to the array at the `Counter`
environment path. The appropriate counters will be
incremented as part of the Default handler just before the Response is
computed.

Multivocal generally does something like

    Util.setObjPath( env, 'Counter[+]', counterName );
    
You can't check the `Counter` path to see
if the counter will be incremented since this may take place
after your Builder or Handler runs.
It is safe to add the name more than once - the counter will only be
incremented once per request.

### Analytics

(Future work)

## Questions

### Does multivocal work on Google Cloud Platform?

### Does multivocal work with Express.js?

### Does multivocal work with AWS Lambda?
 
### Does multivocal work with Alexa?

### What version of Dialogflow does multivocal work with?

Right now, multivocal primarily targets Dialogflow version 1.

There is support for version 2 (it reports the version in the 
environment setting `Platform.DialogflowVersion` and there is a
JSON formatter that creates output for it), but this isn't the
primary development target, so it may not have been as fully tested.

### Does multivocal work with the Action SDK?