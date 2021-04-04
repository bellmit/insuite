/**
 * User: pi
 * Date: 23/02/2015  14:50
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'identity-api', function( Y, NAME ) {
        /**
         * @module identity-api
         */
        var i18n = Y.doccirrus.i18n;

        const ONEYEARINSECONDS = 31536000000;

        /**
         * Saves new online status and emits 2 event:
         *  1. notify PUC that user have changed status
         *  2. notify owner(by user identity id) that status have been changed
         * @method updateOnlineStatus
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Boolean} args.query.onlineEmp true if user is visible for employees
         * @param {Boolean} args.query.onlinePat true if user is visible for patients
         * @param {Boolean} args.query.onlinePartner true if user is visible for partners
         * @param {Function} args.callback
         * @for doccirrus.api.identity
         */
        function updateOnlineStatus( args ) {
            var queryParams = args.query || {};

            // reflect the change on presence list
            function notifyPL( err, results ) {
                if( err ) {
                    return args.callback( err );
                }
                Y.doccirrus.communication.emitEventForUser( {
                    event: 'system.refreshOnlineStatus',
                    targetId: args.user.identityId
                } );
                args.callback( err, results ); //eslint-disable-line callback-return

                // update presence list
                Y.doccirrus.api.partnerreg.publishPresenceList( {
                        users: [args.user],
                        online: true
                    },
                    function( err ) {
                        if( err ) {
                            return args.callback( err );
                        }
                        args.callback();
                    } );
            }

            Y.doccirrus.filters.cleanDbObject( queryParams );
            Y.doccirrus.mongodb.runDb( {
                action: 'put',
                user: args.user,
                model: 'identity',
                query: {
                    _id: args.user.identityId
                },
                fields: ['onlineEmp', 'onlinePat', 'onlinePartner', 'signaling'],
                data: queryParams
            }, notifyPL );

        }

        /**
         * Returns status for FrontEnd
         *  Checks user online status and PUC status
         * @method getOnlineStatus
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         * @for doccirrus.api.identity
         */
        function getOnlineStatus( args ) {
            var async = require( 'async' );
            async.parallel( [
                function( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'identity',
                        method: 'get',
                        query: {
                            _id: args.user.identityId
                        },
                        options: {
                            limit: 1,
                            select: {
                                onlineEmp: 1,
                                onlinePat: 1,
                                onlinePartner: 1,
                                signaling: 1
                            },
                            fields: Y.doccirrus.filters.noAuthenticaionProps(args.user)
                        }
                    }, done );
                },
                function( done ) {
                    Y.doccirrus.communication.isPucOnline( function( status ) {
                        done( null, status );
                    } );
                }
            ], function( err, results ) {
                var pucStatus,
                    onlineStatuses,
                    data = {};
                if( results && results[0] ) {
                    pucStatus = results[1];
                    onlineStatuses = results[0][0] || {};
                    data.onlineEmp = onlineStatuses.onlineEmp && i18n( 'general.onlineStatus.ONLINE_EMP' );
                    data.onlinePat = onlineStatuses.onlinePat && i18n( 'general.onlineStatus.ONLINE_PAT' );
                    data.onlinePartner = onlineStatuses.onlinePartner && i18n( 'general.onlineStatus.ONLINE_PARTNER' );
                    data.signaling = onlineStatuses.signaling;
                    data.pucStatus = pucStatus;
                }
                args.callback( err, [data] );
            } );
        }

        /**
         * Returns last activated profile
         * @method getLastActivatedProfile
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         * @for doccirrus.api.identity
         */
        function getLastActivatedProfile( args ) {
            Y.log('Entering Y.doccirrus.api.identity.getLastActivatedProfile', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.identity.getLastActivatedProfile');
            }
            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'identity',
                method: 'get',
                query: {
                    _id: args.user.identityId
                },
                options: {
                    limit: 1,
                    select: {
                        profileLastActivated: 1
                    },
                    fields: Y.doccirrus.filters.noAuthenticaionProps(args.user)
                }
            }, args.callback );
        }

        /**
         * Creates an identity / contact from the Patient Registration information
         *
         * @param {Object}      patientreg
         * @param {Boolean}     poweruser
         * @param {Boolean}     skipCheck
         * @return {*}
         */
        function createNewIdentityForPatientreg( patientreg, poweruser, skipCheck = true ) {
            var
                myData = {};
            myData.communications = [];
            if( patientreg.email ) {
                myData.communications.push( {
                    type: 'EMAILJOB',
                    value: patientreg.email
                } );
            }
            if( patientreg.phone ) {
                myData.communications.push( {
                    type: 'PHONEJOB',
                    value: patientreg.phone
                } );
            }
            if( !patientreg.firstname || !patientreg.lastname ) {
                Y.log( 'Invalid patientreg object, missing firstname, lastname  or id', 'error', NAME );
                return null;
            }
            myData.firstname = patientreg.firstname;
            myData.lastname = patientreg.lastname;
            myData.talk = patientreg.talk;
            myData.status = 'ACTIVE';
            myData.pw = patientreg.pw;
            myData.dob = patientreg.dob;
            myData.username = patientreg.email;
            myData.validFrom = Date.now();
            myData.validTo = Date.now() + ONEYEARINSECONDS;
            myData.roles = [];
            // patientreg is generated and checked data
            // so this is safe.
            if( skipCheck ) {
                Y.doccirrus.filters.setSkipCheck( myData, true ); //todo
            }

            if( poweruser ) {
                myData.memberOf = [
                    {
                        group: 'ADMIN'
                    }
                ];
            } else {
                myData.memberOf = [
                    {
                        group: 'USER'
                    }
                ];
            }
            return myData;
        }

        /**
         * Add the installation country and countryCode to resultObj (eg. Deutschland / D).
         *
         * @param {Object}      dbuser
         * @param {Object}      resultObj           the result object into which the properties will be written
         *                                          existing properties will be overwritten.
         * @param {Function}    callback            err, result:  resultObj with supplemented info
         */
        function addCountry( dbuser, resultObj, callback ) {
            var country = '', countryCode = '', coname = '';

            function evalPracInfo( err, data ) {
                if( err ) {
                    Y.log( 'Error getting practice info in (v)prc.', 'debug', NAME );
                    callback( err );
                    return;
                }
                if( data && data[0] && data[0].addresses && data[0].addresses[0] ) {
                    country = data[0].addresses[0].country;
                    countryCode = data[0].addresses[0].countryCode;
                    coname = data[0].coname;
                }
                resultObj.country = country;
                resultObj.countryCode = countryCode;
                resultObj.coname = coname;
                callback( null, resultObj );
            }

            Y.doccirrus.mongodb.runDb(
                {
                    user: dbuser, model: 'practice', query: {}
                }, evalPracInfo );
        }

        function addLanguage( dbuser, resultObj, callback ) {

            Y.doccirrus.mongodb.runDb( {
                user: dbuser,
                model: 'employee',
                query: {
                    username: resultObj.id
                }
            }, ( err, data ) => {//eslint-disable-line
                resultObj.preferredLanguage = '';
                if( data && data.length > 0 ) {
                    resultObj.preferredLanguage = data[0].preferredLanguage;
                }
                callback( null, resultObj );
            } );
        }

        /**
         * Converts the practice's prodServices array into
         * handy .intime, .casefile, etc. properties
         *
         * @param {Object}      dbuser
         * @param {Object}      resultObj           the result object into which the properties will be written
         *                                          existing properties will be overwritten.
         * @param {Function}    callback            err, result:  resultObj with supplemented info
         */
        function addLocalSubs( dbuser, resultObj, callback ) {
            function pracCb( err, data ) {
                var item, i;

                if( err ) {
                    callback( err, null );
                    return;
                }
                if( Array.isArray( data ) ) {
                    // with domains we can do checks like...
                    // assert 2 > data.length
                    data = data[0];
                }
                if( !data ) {
                    Y.log( 'NO practice Data in this DB' + JSON.stringify( data ), 'warn', NAME );
                    return callback( null, resultObj );
                }
                if( Y.config.debug ) {
                    Y.log( 'FOUND practice, subs ' + JSON.stringify( data.prodServices ), 'debug', NAME );
                }

                if( Array.isArray( data.prodServices ) && 0 < data.prodServices.length ) {
                    // FIXME deprecated stuff due to MOJ-896
                    for( i = 0; i < data.prodServices.length; i++ ) {
                        item = data.prodServices[i].ps;
                        if( 0 === item.indexOf( 'INTIME' ) ) {
                            resultObj.intime = item;
                        }
                        if( 0 === item.indexOf( 'NEWSLETTER' ) ) {
                            resultObj.newsletter = item;
                        }
                        if( 0 === item.indexOf( 'COMMUNITY' ) ) {
                            resultObj.community = item;
                        }
                    }
                    resultObj.prodServices = data.prodServices.map( function( o ) {
                        return o.ps;
                    } );
                }
                callback( null, resultObj );
            }

            Y.doccirrus.mongodb.runDb({
                user: dbuser,
                model: 'practice',
                action: 'get',
                query: {},
                options: {
                    lean: true,
                    limit: 1
                }
            }, pracCb );
        }

        /**
         * Goes to the DCPRC to find out what subs this user has.
         * Generally used in the Patient portal.
         *
         * @param {Object}      dbuser
         * @param {Object}      resultObj
         *
         * @param {Function}    callback
         */
        function addCentralSubs( dbuser, resultObj, callback ) {
            Y.log( 'Simulating adding customer subscriptions from DCPRC for ' + dbuser.U, 'warn', NAME );
            // fill in some stub info
            resultObj.newsletter = true;
            resultObj.patient = true;
            callback( null, resultObj );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class identity
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).identity = {
            /**
             * @property name
             * @type {String}
             * @default identity-api
             * @protected
             */
            name: NAME,

            updateOnlineStatus: function( args ) {
                Y.log('Entering Y.doccirrus.api.identity.updateOnlineStatus', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.identity.updateOnlineStatus');
                }
                updateOnlineStatus( args );
            },
            getOnlineStatus: function( args ) {
                Y.log('Entering Y.doccirrus.api.identity.getOnlineStatus', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.identity.getOnlineStatus');
                }
                getOnlineStatus( args );
            },
            createNewIdentityForPatientreg: function( args ) {
                Y.log('Entering Y.doccirrus.api.identity.createNewIdentityForPatientreg', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.identity.createNewIdentityForPatientreg');
                }
                return createNewIdentityForPatientreg( args );
            },
            addCountry: function( dbuser, resultObj, callback ) {
                addCountry( dbuser, resultObj, callback );
            },
            addLocalSubs: function( dbuser, resultObj, callback ) {
                addLocalSubs( dbuser, resultObj, callback );
            },
            addCentralSubs: function( dbuser, resultObj, callback ) {
                addCentralSubs( dbuser, resultObj, callback );
            },

            addLanguage: addLanguage,
            getLastActivatedProfile: getLastActivatedProfile
        };

    },
    '0.0.1', {requires: ['dccommunication', 'doccirrus']}
);
