/**
 * User: pi
 * Date: 21/05/15  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */


/*global YUI*/


YUI.add( 'contact-api', function( Y, NAME ) {

        /**
         * module contact-api
         */

        /**
         * Returns all non patient type contacts
         * @method getNonPatient
         * @param {Object} args
         */
        function getNonPatient( args ) {
            var user = args.user,
                query = args.query || {},
                myQuery = Object.assign( {}, query ),
                options = args.options || {},
                callback = args.callback,
                async = require( 'async' );

            query.$or = [
                {
                    patient: {$exists: false}
                },
                {
                    patient: false
                }
            ];

            delete query.coname;
            delete query.customerNo;

            function populateCompanyInfo( err, results ) {
                var contacts = results && results.result;
                if( err ) {
                    Y.log( 'Cannot get contacts info: ' + JSON.stringify( err ), 'error', NAME );
                    return callback( err );
                }
                if( contacts && contacts[0] ) {
                    async.eachSeries( contacts, ( contact, innerDone ) => {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'company',
                            action: 'get',
                            query: {
                                centralContact: contact._id
                            },
                            options: {
                                select: {
                                    coname: 1,
                                    customerNo: 1
                                }
                            }
                        }, ( err, res ) => {
                            if( err ) {
                                Y.log( 'Cannot get company info: ' + JSON.stringify( err ), 'error', NAME );
                                return innerDone();
                            }
                            if( res && res[0] ) {
                                contact.customerNo = res.map( ( item ) => {
                                    return item.customerNo;
                                } );
                                contact.coname = res.map( ( item ) => {
                                    return item.coname;
                                } );
                                return innerDone();
                            } else {
                                return innerDone();
                            }
                        } );
                    }, ( error ) => {
                        if( error ) {
                            Y.log( 'populateCoInfo. Error occurs: ' + JSON.stringify( err ), 'error', NAME );
                        }
                        if( myQuery.coname ) {
                            contacts = contacts.filter( ( contact ) => {
                                return contact.coname && contact.coname.some( ( item ) => {
                                        return item.match( myQuery.coname.$regex );
                                    } );
                            } );
                        }
                        if( myQuery.customerNo ) {
                            contacts = contacts.filter( ( contact ) => {
                                return contact.customerNo && contact.customerNo.some( ( item ) => {
                                        return item.match( myQuery.customerNo.$regex );
                                    } );
                            } );
                        }
                        return callback( null, contacts );
                    } );
                } else {
                    return callback( null, [] );
                }
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'contact',
                action: 'get',
                query: query,
                options: options
            }, populateCompanyInfo );
        }

        /**
         * Search for autocomplete
         * @method searchContact
         * @param {Object} args
         */
        function searchContact( args ) {
            var user = args.user,
                queryParam = args.query || {},
                term = queryParam.term || '',
                options = args.options || {},
                callback = args.callback,
                query = {};
            term = term.split( ' ' );
            query.$and = [
                {
                    $or: [
                        {
                            patient: {$exists: false}
                        },
                        {
                            patient: false
                        }
                    ]
                },
                {
                    $or: [
                        {
                            firstname: {
                                $regex: term[0] || '',
                                $options: 'i'
                            },
                            lastname: {
                                $regex: term[1] || '',
                                $options: 'i'
                            }
                        },
                        {
                            firstname: {
                                $regex: term[1] || '',
                                $options: 'i'
                            },
                            lastname: {
                                $regex: term[0] || '',
                                $options: 'i'
                            }
                        }
                    ]
                }
            ];
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'contact',
                action: 'get',
                query: query,
                options: options
            }, callback );
        }

        /**
         * Returns all patient type contacts
         * @method getPatient
         * @param {Object} args
         */
        function getPatient( args ) {
            var user = args.user,
                data = args.data || {},
                query = data.query || args.query || {},
                options = args.options || {},
                callback = args.callback;

            query.patient = true;
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'contact',
                action: 'get',
                query: query,
                options: options
            }, callback );
        }

        /**
         * Delete patient from DCPRC and PUC
         * @method deletePatient
         * @param {Object} args
         * @return {void}
         */
        function deletePatient( args ) {
            var user = args.user,
                data = args.data || {},
                query = data.query || args.query || {},
                callback = args.callback,
                async = require( 'async' );

            if( !query._id ) {
                Y.log( `deletePatient error. Not enough params`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'No patient id provided.' } ) );
            }

            async.series( [
                ( next )=>{
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'delete',
                        model: 'contact',
                        query: {
                            '_id': query._id
                        }
                    }, next );
                },
                ( next )=> {
                    let
                        pucData = {
                            patientId: query._id,
                            secret: Y.doccirrus.auth.getPUCSecret()
                        };
                    Y.log( 'Sending request to PUC for deleting patientreg...', 'debug', NAME );
                    return Y.doccirrus.https.externalPost( Y.doccirrus.auth.getPUCUrl( '/1/patientreg/:deletePatientreg' ),
                        pucData, Y.doccirrus.auth.setInternalAccessOptions(),
                        ( err ) => {
                            if( err ) {
                                Y.log( `deletePatient: Error from PUC. Will not delete patient: ${JSON.stringify( err )}`, 'error', NAME );
                                return next( err );
                            }
                            return next();
                        }
                    );
                }
            ], callback );
        }

        /**
         * on PP,
         * confirm patient and the email to DCPRC.
         *
         * @param {Object} params
         * @param {Function} callback
         * @return {void}
         */
        function doOptinToDCPRC( params, callback ) {
            var
                email = params.email,
                optIn = params.optIn,
                url = '/1/contact/optIn/' + encodeURIComponent( optIn ),
                data;

            if( !optIn || !email ) {
                return callback( 'missing params' );
            }
            Y.log( 'DCPRC: complete the optin for patient', 'debug', NAME );

            function myCb( err, resp, body ) {
                if( err ) {
                    Y.log( 'patient optin failed on DCPRC: ' + JSON.stringify( err ), 'error', NAME );
                    return callback( err );
                }
                Y.log( 'patient optin done on DCPRC: ' + JSON.stringify( body && body.data ), 'debug', NAME );
                callback( null, body && body.data );
            }

            data = {
                confirmed: true,
                optIn: null,
                communicationEntry: { // replace the email with new flags
                    type: 'EMAILPRIV',
                    value: email,
                    confirmed: true,
                    preferred: true
                }
            };
            data.fields_ = Object.keys( data );
            Y.doccirrus.https.externalPut( Y.doccirrus.auth.getDCPRCUrl( url ), data,
                Y.doccirrus.auth.setInternalAccessOptions(), myCb );
        }

        /**
         * Default get method
         * @method get
         * @param {Object} args
         */
        function getContact( args ) {
            let
                { user, query, options, callback } = args;
            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'contact',
                user,
                query,
                options
            }, callback );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class contact
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).contact = {
            /**
             * @property name
             * @type {String}
             * @default contact-api
             * @protected
             */
            name: NAME,

            get( args ){
                Y.log('Entering Y.doccirrus.api.contact.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.contact.get');
                }
                getContact( args );
            },

            post: function( args ) {
                Y.log('Entering Y.doccirrus.api.contact.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.contact.post');
                }
                var
                    data = args.data;

                if( !data.dob ) {
                    data.dob = Date.now();
                }

                data = Y.doccirrus.filters.cleanDbObject( data );
                Y.doccirrus.mongodb.runDb( {
                    model: 'contact',
                    action: 'post',
                    user: args.user,
                    data: data,
                    options: args.options,
                    callback: function( err, result ) {
                        args.callback( err, result );
                    }
                } );
            },
            put: function( args ) {
                Y.log('Entering Y.doccirrus.api.contact.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.contact.put');
                }
                var
                    data = args.data,
                    communicationEntry;

                if( data.communicationEntry ) {
                    communicationEntry = data.communicationEntry;
                    data.communicationEntry = undefined;
                    delete data.communications; // don't want to replace the value
                }

                data = Y.doccirrus.filters.cleanDbObject( data );
                Y.doccirrus.mongodb.runDb( {
                    model: 'contact',
                    action: 'put',
                    user: args.user,
                    query: args.query,
                    fields: args.fields,
                    data: data,
                    options: args.options,
                    callback: function( err, contact ) {
                        if( err || !contact ) {
                            return args.callback( err, contact );
                        }
                        if( communicationEntry && !Array.isArray( contact ) ) { // only single update is expected
                            contact.communications = contact.communications || [];
                            contact.communications = contact.communications.filter( function( item ) { // remove the entry (if exists)
                                return item.value && (item.value.toLowerCase() !== communicationEntry.value.toLowerCase());
                            } );
                            contact.communications.unshift( communicationEntry ); // add to the beginning

                            //mongooselean.save_fix
                            Y.doccirrus.mongodb.runDb( {
                                user: args.user,
                                model: 'contact',
                                action: 'put',
                                query: {
                                    _id: contact._id
                                },
                                fields: Object.keys(contact),
                                data: Y.doccirrus.filters.cleanDbObject(contact)
                            }, args.callback);

                        } else {
                            return args.callback( null, contact );
                        }
                    }
                } );
            },

            getNonPatient: function( args ) {
                Y.log('Entering Y.doccirrus.api.contact.getNonPatient', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.contact.getNonPatient');
                }
                getNonPatient( args );
            },
            getPatient: function( args ) {
                Y.log('Entering Y.doccirrus.api.contact.getPatient', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.contact.getPatient');
                }
                getPatient( args );
            },
            deletePatient: function( args ) {
                Y.log('Entering Y.doccirrus.api.contact.deletePatient', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.contact.deletePatient');
                }

                deletePatient( args );
            },
            searchContact: function( args ) {
                Y.log('Entering Y.doccirrus.api.contact.searchContact', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.contact.searchContact');
                }
                searchContact( args );
            },
            doOptinToDCPRC: doOptinToDCPRC
        };
    },
    '0.0.1', {requires: []}
)
;
