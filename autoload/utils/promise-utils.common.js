/**
 * User: do
 * Date: 02/09/16  11:47
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 *
 * pure functions that enhance your promise experience
 */

// TODOOO use this instead in edmp-filebuilder, ruleengine.server, ruleutils

YUI.add( 'promise-utils', function( Y, NAME ) {

        'use strict';

        function delay( ms ) {
            return new Promise( function( resolve ) {
                setTimeout( function() {
                    resolve();
                }, ms || 0 );
            } );
        }

        function each( arr, fn, context ) {

            return new Promise( function( resolve, reject ) {
                var i = 0;

                function next() {
                    if( i >= arr.length ) {
                        resolve( arr );
                    } else {
                        Promise.resolve( fn.call( context, arr[i] ) ).then( function() {
                            i++;
                            next();
                        } ).catch( reject );
                    }
                }

                if( !Array.isArray( arr ) || 0 === arr.length ) {
                    return resolve( arr );
                }

                next();
            } );

        }

        function every( arr, fn, context ) {
            return new Promise( function( resolve, reject ) {
                var i = 0, valid = true;

                function next() {
                    if( i >= arr.length ) {
                        resolve( valid );
                    } else {
                        Promise.resolve( fn.call( context, arr[i] ) ).then( function( result ) {
                            i++;
                            if( !result ) {
                                return resolve( false );
                            }
                            next();
                        } ).catch( reject );
                    }
                }

                if( !Array.isArray( arr ) || 0 === arr.length ) {
                    return resolve( valid );
                }

                next();
            } );
        }

        function some( arr, fn, context ) {
            return new Promise( function( resolve, reject ) {
                var i = 0, valid = false;

                function next() {
                    if( i >= arr.length ) {
                        resolve( valid );
                    } else {
                        Promise.resolve( fn.call( context, arr[i] ) ).then( function( result ) {
                            i++;
                            if( result ) {
                                return resolve( true );
                            }
                            next();
                        } ).catch( reject );
                    }
                }

                if( !Array.isArray( arr ) || 0 === arr.length ) {
                    return resolve( valid );
                }

                next();
            } );
        }

        function guid() {
            function s4() {
                return Math.floor( (1 + Math.random()) * 0x10000 )
                    .toString( 16 )
                    .substring( 1 );
            }

            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                   s4() + '-' + s4() + s4() + s4();
        }

        function createQueue( options ) {
            options = options || {};

            var
                running = [],
                queue = [];

            var name = options.name || 'unnamed',
                logPrefix = 'Queue ' + name + ': ',
                concurrency = options.concurrency || null,
                priorityMode = Boolean( options.priority ) || false,
                instance = Object.create( {
                    push: function( task ) {
                        var idx;

                        if( 'function' !== typeof task.run ) {
                            Y.log( 'could not push task to queue: run method not specified', 'error', NAME );
                            return;
                        }

                        task.uuid = guid();

                        if( priorityMode ) {
                            task.priority = task.priority || 0;
                            queue.some( function( t, index ) {
                                if( t.priority > task.priority ) {
                                    idx = index;
                                    return true;
                                }
                            } );
                        }
                        idx = idx || (idx === 0 ? idx : queue.length - 1);
                        queue.splice( idx, 0, task );
                        this.invalidate();
                    },
                    invalidate: function() {
                        Y.log( logPrefix + 'invalidate queue: running ' + running.length + ' concurrency ' + concurrency, 'debug', NAME );
                        if( (!concurrency || running.length < concurrency) && queue.length ) {
                            this.start( queue.shift() );
                        }
                    },
                    start: function( task ) {
                        Y.log( logPrefix + 'starting next task ' + task.uuid, 'debug', NAME );
                        var self = this;
                        running.push( task );
                        Promise.resolve( task.run() )
                            .then( function() {
                                return self.finished( task );
                            } )
                            .catch( function() {
                                this.finished( task );
                            } );
                    },
                    finished: function( task ) {
                        Y.log( logPrefix + 'task finished ' + task.uuid, 'debug', NAME );
                        var idx = running.indexOf( task );
                        if( idx > -1 ) {
                            running.splice( idx, 1 );
                        }
                        this.invalidate();
                    }
                }, {
                    concurrency: {
                        get: function() {
                            return concurrency;
                        },
                        set: function( val ) {
                            concurrency = val;
                            this.invalidate();
                        }
                    },
                    running: {
                        get: function() {
                            return running;
                        }
                    },
                    idle: {
                        get: function() {
                            return Boolean( running.length );
                        }
                    }
                } );

            return instance;
        }

        Y.namespace( 'doccirrus' ).promiseUtils = {

            each: each,
            every: every,
            some: some,
            delay: delay,
            createQueue: createQueue

        };
    },
    '0.0.1', {requires: []}
);
