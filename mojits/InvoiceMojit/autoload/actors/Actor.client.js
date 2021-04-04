/**
 * User: do
 * Date: 06/09/16  10:37
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'Actor', function( Y, NAME ) {

        var getObject = Y.doccirrus.commonutils.getObject;
        /**
         * TODO
         * - namespaces for actor instances
         * - divide split behavior and actual data of actor instance
         * - message queue
         */

        var
            delay = Y.doccirrus.promiseUtils.delay,

            actorDefinitions = {},
            actorInstances = {},
            NOOP = function() {
            },
            defaultBehavior = {
                // add inital state to your actor
                create: NOOP,
                // clean up
                kill: NOOP
            },
            defaultBehaviorMessageNames = Object.keys( defaultBehavior ),
            nextActorId = 0,
            actorOptions = {
                delay: 0,
                silent: true
            };

        function getActorId( name ) {
            name = name || 'anonymousActor';
            return name + '@' + nextActorId++;
        }

        function getDefinitionByName( name ) {
            var definition = actorDefinitions[name];
            if( !definition ) {
                throw Error( 'could not find actor definition for name ' + name );
            }
            return definition;
        }

        function getInstancesByName( name ) {
            var result = [];
            Object.keys( actorInstances ).forEach( function( address ) {
                var actor = actorInstances[address];
                if( name === actor.name ) {
                    result.push( actor );
                }
            } );
            return result;
        }

        function define( name, behavior, options ) {
            // store options and handle singleton: true!
            actorDefinitions[name] = {
                name: name,
                behavior: Object.assign( {}, defaultBehavior, behavior || {} ),
                options: options || {}
            };
            // TODOOO keep this factory generation? could be returned by module so?
            return function( parent, options ) {
                return create( parent, actorDefinitions[name], options );
            };
        }

        function create( parent, name, options ) {
            var
                definition = getDefinitionByName( name ),
                behavior = definition.behavior,
                defOptions = definition.options,
                isSingleton = true === defOptions.singleton,
                actor;

            if( isSingleton ) {
                actor = getInstancesByName( name )[0];
                if( actor ) {
                    parent.children.push( actor.address );
                    return Promise.resolve( actor.address );
                }
            }
            actor = Object.create( behavior );
            actor.name = name;
            actor.options = options || {};
            actor.address = getActorId( name );

            if( 'string' === typeof actor.options.alias && parent ) {
                if( parent[actor.options.alias] ) {
                    throw Error( 'can not set alias of actor address on parent: attr name is already taken (' + actor.options.alias + ')' );
                } else {
                    parent[actor.options.alias] = actor.address;
                }
            }
            if( !isSingleton ) {
                actor.parent = parent && parent.address || null;
                actor.parentAddress = actor.parent;
            }
            actor.children = [];

            if( parent && parent.children && Array.isArray( parent.children ) ) {
                parent.children.push( actor.address );
            }
            actorInstances[actor.address] = actor;
            return Promise.resolve( actor.create( actor ) ).then( function() {
                return actor.address;
            } );
        }

        function send( message, options ) {
            options = options || [];
            var _delay = options.delay || actorOptions.delay,
                silent = options.silent || actorOptions.silent;
            return delay( _delay ).then( function() {

                // never expose the actor object
                message.from = message.from.address || message.from;
                message.to = message.to.address || message.to;
                Y.log( 'actor sent message: ' + message, 'info', NAME );

                var
                    messageName = message.name,
                    to = message.to,
                    receiver = actorInstances[to];

                if( -1 !== defaultBehaviorMessageNames.indexOf( messageName ) ) {
                    throw Error( 'it is not allowed to send internal lifecycle messages like ' + defaultBehaviorMessageNames );
                }

                if( 'function' !== typeof receiver[messageName] ) {
                    if( true === receiver.options.passUnknownMessagesToParent && receiver.parent ) {
                        message.to = receiver.parent;
                        return send( message, options );
                    } else if( true === silent ) {
                        return Promise.resolve();
                    }
                    throw Error( 'Message with name ' + messageName + ' is not implemented!' );
                }
                return delay( _delay ).then( function() {
                    return Promise.resolve( receiver[messageName]( receiver, message ) );
                } );
            } );
        }

        function forwardTo( forwardTo ) {
            return function( self, message ) {
                if( 'object' === typeof forwardTo && forwardTo.path ) {
                    message.to = getObject( forwardTo.path, self );
                } else {
                    message.to = forwardTo;
                }
                return send( message );
            };
        }

        function kill( actor ) {
            return Promise.resolve( actor.address ? actorInstances[actor.address] : actor ).then( function( _actor ) {
                var parentAddress;
                if( !_actor ) {
                    throw Error( 'can not kill actor: actor not found ' + actor );
                }
                parentAddress = _actor.parent;
                return kill( _actor ).then( function() {
                    if( parentAddress ) {
                        return send( _actor );
                    }
                } );
            } );
        }

        function respond(/* self, message, data */) {

            // shortcut for send({from,to,data}
            // -> send could also be send(self, to, data)?

        }

        Y.namespace( 'doccirrus.actors' ).Actor = {
            name: NAME,
            define: define,
            create: create,
            send: send,
            respond: respond,
            forwardTo: forwardTo,
            kill: kill,
            actorOptions: actorOptions

        };
    },
    '0.0.1', {requires: ['promise-utils', 'dccommonutils']}
);

