/**
 * User: strix
 * Date: 23/4/2014  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


//  automatically called by the DB Layer before any
//  mutation (CUD, excl R) is called on a data item.

YUI.add( 'form-process', function( Y, NAME ) {

        /**
         *  The DC Form process definitions
         *
         *  @module DCFormProcess
         */

        /**
         *  Called called by the DB layer, with the current model as 'this',
         *  using Function.call()
         *
         *  TODO: review this, looks odd
         *
         *  @param data
         *  @param callback
         */

        function prepForm( user, data, callback ) {

            function checkForm( form ) {
                Y.log( 'Checking form template: ' + form._id, 'debug', NAME );
            }

            if( Array.isArray( data ) ) {
                data.forEach( function( form ) {
                    checkForm( form );
                } );
            } else {
                checkForm( data );
            }

            if ( callback ) { callback( null, data ); }     //  eslint-disable-line
            return data;
        }

        /**
         *  Most models will create a revision for every change - forms are an exception because
         *  their autosave can create a storm of tiny changes, so new versions are saved when the user
         *  defines a new version of a form (V+ button in the UI.
         *
         *  For this reason the 'copyForm' method is a stub for this model, with the actual version
         *  being saved from the controller.
         *
         *  @param user     {Object}
         *  @param result   {Object}
         *  @param callback {Function}
         */

        function copyForm( user, result, callback ) {
            Y.log( 'Skipping copy of form: ' + user._id, 'debug', NAME );
            callback( null, result );
        }

        /**
         *
         *
         *  @param user
         *  @param result
         *  @param callback
         */

        function makeFormRevision( user, result, callback ) {
            var
                copy,
                Promise = require( "bluebird" ),
                l = (result && result.length) || 0;

            function postCopy( data, callback ) {
                data.canonicalId = data._id;
                delete data._id;
                data.timestamp = Date.now();
                data.skipcheck_ = true;
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'post',
                    model: 'formversion',
                    data: data
                }, callback );
            }

            if( !l && result ) {
                // single object
                if( result.toObject ) {
                    postCopy( result.toObject(), callback );
                }
                else {
                    postCopy( result, callback );
                }
            } else {
                // formversion model has a virtual timestamp field, the _id.
                //
                (function loop( sum, stop ) {
                    if( sum < stop ) {
                        return new Promise( function( resolve, reject ) {
                            //mongooselean.toObject
                            copy = result[sum].toObject ? result[sum].toObject():result[sum];
                            sum++;
                            postCopy( copy, function( err, result ) {
                                if( err ) {
                                    reject();
                                }
                                else {
                                    resolve( result );
                                }
                            } );

                            return loop( sum, stop );
                        } );
                    } else {
                        // done
                        return new Promise( function( resolve ) {
                            resolve();
                        } );
                    }
                })( 0, l ).then( function() {
                        //console.log( 'Done' );

                        // callback
                        callback( null, result );
                    } );
            }
            // write result to the formversion  model

        }

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         *  Class Form Processes
         *
         *  presents an array of pre process functions & an array of post-process functions.
         */

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {
//            'pre': [
//                {run: [prepForm], forAction: 'write'}
//            ],
//            'post': [
//                {run: [copyForm], forAction: 'write'}
//            ],
            'prepForm': prepForm,   // hack until MOJ-805 done.
            'copyPatient': copyForm,   // hack until MOJ-805 done.
            'makeFormRevision': makeFormRevision,
            'name': NAME
        };

    },
    '0.0.1', {requires: ['form-schema']}
);
