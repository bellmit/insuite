/**
 * User: mahmoud
 * Date: 17/10/14  13:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI*/
/*jshint esnext:true, latedef:false */
//TRANSLATION INCOMPLETE!! MOJ-3201


YUI.add( 'employee-api', function( Y, NAME ) {
        const
            { formatPromiseResult, handleResult } = require( 'dc-core' ).utils,
            { logEnter, logExit } = require( '../../../server/utils/logWrapping.js' )(Y, NAME),
            i18n = Y.doccirrus.i18n;

        var
            controllerName = 'UserMgmtMojit',
            SUPPORT_DURATION = 4, // active hours for support account
            YDC = Y.doccirrus;

        // hack to get the right protocol
        function getProtocol() {
            return Y.doccirrus.auth.getVPRCUrl().split( '://' )[0] + '://';
        }

        function GET( args ) {
            Y.log('Entering Y.doccirrus.api.employee.GET', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.GET');
            }
            let
                user = args.user,
                options = args.options || {},
                query = args.query || {},
                params = args.originalParams || {},
                includeIdentity = params.includeIdentity,
                includeAll = params.includeAll || false,
                callback = args.callback,
                async = require( 'async' );

            if (!includeAll) {
                query.status = 'ACTIVE';
            }

            options.lean = true;

            function afterGetIdentity( employee, identity ) {
                if( identity ) {
                    employee.identityData = identity;
                }
            }

            function loadIdentity( employee, next ) {
                Y.log( 'loading identity for employee, id: ' + employee._id, 'debug', NAME );
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'identity',
                    action: 'get',
                    query: { specifiedBy: employee._id },
                    options: {
                        lean: true,
                        limit: 1,
                        fields: Y.doccirrus.filters.noAuthenticaionProps(user)
                    }
                }, function( err, result ) {
                    if( err ) {
                        return next( err );
                    }
                    afterGetIdentity( employee, result && result[ 0 ] );
                    next();
                } );

            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'employee',
                action: 'get',
                query: query,
                options: options,
                callback: function( err, result ) {
                    let
                        _result;
                    if( err || !result ) {
                        Y.log( 'no employee or error: ' + JSON.stringify( err ), err ? 'error' : 'debug', NAME );
                        callback( err || null, null );
                        return;
                    }
                    _result = (result.result ? result.result : result);

                    if( includeIdentity && _result.length ) {
                        async.eachSeries( _result, loadIdentity, function( err ) {
                            callback( err, result );
                        } );
                    } else {
                        return callback( null, result );
                    }
                }
            } );
        }

        /**
         * Creates new employee.
         *  1. Creates an identity
         *  2. Creates an employee
         *  3. if can not create the employee => removes the identity
         *      else => udpates the identity('specifiedBy')
         * @method post
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.employee
         * @param {Object} args.data.identity
         * @param {Object} args.callback
         */
        function POST( args ){
            Y.log('Entering Y.doccirrus.api.employee.POST', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.POST');
            }
            var
                data = args.data,
                employee_data = Y.clone( data.employee || data ),
                identity_data = Y.clone( data.identity ) || {},
                callback = args.callback,
                user = args.user,
                identityId;

            if( !employee_data ) {
                callback( YDC.errors.rest( 400, 'no data' ) );
                return;
            }

            function createIdentity( callback ) {
                identity_data.firstname = employee_data.firstname;
                identity_data.lastname = employee_data.lastname;

                identity_data.locations = employee_data.locations;
                // generate token
                identity_data.pwResetToken = Y.doccirrus.auth.getToken();
                identity_data.status = 'ACTIVE';
                identity_data.roles = employee_data.roles || [];

                Y.log( 'Creating Identity: ' + JSON.stringify( identity_data ) );

                checkGroup( employee_data, identity_data );
                identity_data = Y.doccirrus.filters.cleanDbObject( identity_data );
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'identity',
                    action: 'post',
                    data: identity_data
                }, callback );
            }

            function createIdentityCallback( err, results ) {
                if( err ) {
                    return callback( err );
                }
                if( !results || !results[ 0 ] ) {
                    return callback( Y.doccirrus.errors.http( 500, 'Server error creating employee' ) );
                }
                identityId = results[ 0 ];

                Y.doccirrus.api.kotableconfiguration.resetTableConfigurationAndApplyPresetForUser( {
                    user: user,
                    originalParams: {
                        userId: identity_data.username
                    },
                    callback: function( error, result ) {
                        if( error ) {
                            return callback( error, result );
                        }

                        createEmployee( createEmployeeCallback );
                    }
                } );

            }

            function createEmployee( callback ) {
                if( !employee_data.dob ) {
                    // dob is not strictly reuired for employees,
                    // see MOJ-1137
                    employee_data.dob = new Date().toJSON();
                }
                employee_data = Y.doccirrus.filters.cleanDbObject( employee_data );

                Y.log( 'Creating employee: ' + JSON.stringify( employee_data ), 'debug', NAME );

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'employee',
                    action: 'post',
                    data: employee_data
                }, callback );

            }

            function createEmployeeCallback( err, results ) {
                if( err ) {
                    Y.log( 'UserMgmtMojit REST returning ' + JSON.stringify( err ), 'error', NAME );
                    removeIdentity( err, callback );
                    return;
                }
                data = results;
                updateIdentity( results[ 0 ], updateIdentityCallback );

            }

            function updateIdentity( employeeId, callback ) {
                identity_data.specifiedBy = employeeId;
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'identity',
                    action: 'put',
                    query: {
                        _id: identityId
                    },
                    fields: [ 'specifiedBy' ],
                    data: Y.doccirrus.filters.cleanDbObject( {
                        specifiedBy: employeeId
                    } )
                }, callback );
            }

            function removeIdentity( error, callback ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'identity',
                    action: 'delete',
                    query: {
                        _id: identityId
                    }
                }, function( err ) {
                    callback( err || error );
                } );

            }

            function updateIdentityCallback( err ) {
                if( err ) {
                    return callback( err );
                }
                sendPwdMessage();
                callback( null, data );
            }

            function sendPwdMessage() {
                var
                    messageData = {};
                messageData.employeeId = identity_data.specifiedBy;
                messageData.username = identity_data.username;
                messageData.token = identity_data.pwResetToken;
                messageData.communications = employee_data.communications;
                messageData.talk = employee_data.talk;
                messageData.url = getProtocol() + Y.doccirrus.auth.getURLforPRCorVPRC( args.httpRequest );
                sendPwdResetMail( args.lang, args.user, args.httpRequest, messageData );
            }

            //license check
            Y.doccirrus.licmgr.employeeLicensingCheck(args.user, employee_data.type, null, err => {
                if (err) {
                    return args.callback(err);
                }
                createIdentity( createIdentityCallback );
            });
        }
        /**
         * Requires an ID --> then updates the record with new data.
         * Idempotent -- i.e. if called several times, will have same effect on the record.
         * Of course, if another process changes the record in between calls, the idempotency
         * still holds, but the results may be not what one expected!
         *
         * Note:
         * * args.data can be either employee data or the pair of identity and employee.
         * * This keeps it compatible for employee browser while supporitng /2/employee.
         *
         * @param {Object} args
         * @param {module:authSchema.auth} args.user
         * @param {Object} args.data
         * @param {Object} args.query
         * @param {Array<String>} [args.fields]
         * @param {Function} [args.callback]
         */
        async function PUT( args ) {
            const
                timer = logEnter( 'Y.doccirrus.api.employee.PUT' ),
                {
                    data,
                    query,
                    user,
                    callback
                } = args;
            let
                employee_data = JSON.parse( JSON.stringify( data.employee || data ) ),
                identity_data = JSON.parse( JSON.stringify( data.identity || data ) ),
                response,
                err,
                employee,
                identity,
                updatedIdentity;

            Y.log( `user: ${JSON.stringify( args.user )}`, 'debug', NAME );
            Y.log( `query: ${JSON.stringify( args.query )}`, 'debug', NAME );
            Y.log( `data: ${JSON.stringify( data )}`, 'debug', NAME );

            /**
             *
             * @param {module:authSchema.auth} user
             * @param {String} newEmpType
             * @param {String} oldEmpType
             * @return {undefined|Object}
             */
            function employeeLicensingCheck( user, newEmpType, oldEmpType ) {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.licmgr.employeeLicensingCheck( user, newEmpType, oldEmpType, err => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve();
                        }
                    } );
                } );
            }

            [err, employee] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'get',
                    query: {_id: query._id}
                } )
            );
            if( err ) {
                logExit( timer );
                return handleResult( err, undefined, callback );
            }
            if( employee && Array.isArray( employee ) && employee.length ) {
                employee = employee[0];
            }

            [err] = await formatPromiseResult(
                employeeLicensingCheck( user, employee_data.type, employee.type )
            );
            if( err ) {
                logExit( timer );
                return handleResult( err, undefined, callback );
            }

            Y.log( 'saving employee data: ' + JSON.stringify( employee_data ) + ' for id: ' + query, 'info', NAME );
            employee_data.to = identity_data.validTo;
            employee_data.from = identity_data.validFrom;

            //now we need to save data to this employee!
            //  Clean of XSS and other threats before adding to database
            employee_data = Y.doccirrus.filters.cleanDbObject( employee_data );

            [err, response] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'put',
                    query: query,
                    fields: Object.getOwnPropertyNames( employee_data ),
                    data: employee_data
                } )
            );
            if( err ) {
                logExit( timer );
                return handleResult( err, undefined, callback );
            }
            Y.log( 'Employee data saved', 'info', NAME );

            if( (employee_data.firstname && employee_data.firstname.length > 0) ||
                (employee_data.lastname && employee_data.lastname.length > 0) ) {
                identity_data.firstname = employee_data.firstname;
                identity_data.lastname = employee_data.lastname;
                identity_data.locations = employee_data.locations;
                identity_data.roles = employee_data.roles;

                //we need to first retrieve the identity object
                Y.log( 'looking for identity that has specifiedBy: ' + JSON.stringify( query ) );
                [err, identity] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'identity',
                        action: 'get',
                        query: {specifiedBy: query._id}
                    } )
                );
                if( err ) {
                    logExit( timer );
                    return handleResult( err, undefined, callback );
                }

                if( identity && identity.length === 1 ) {
                    Y.log( 'saving identity data: ' + JSON.stringify( identity_data ) + ' for id: ' + identity[0]._id );
                    checkGroup( employee_data, identity_data );
                    identity_data = Y.doccirrus.filters.cleanDbObject( identity_data );
                    [err, updatedIdentity] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'identity',
                            action: 'put',
                            query: {_id: identity[0]._id},
                            fields: Object.getOwnPropertyNames( identity_data ),
                            data: identity_data
                        } )
                    );
                    if( err ) {
                        logExit( timer );
                        return handleResult( err, undefined, callback );
                    }
                }
            }
            if( updatedIdentity ) {
                Y.log( 'Identity data saved', 'info', NAME );
                Y.log( 'Resulting identity: ' + JSON.stringify( updatedIdentity ), 'info', NAME );
            }
            Y.log( 'UserMgmtMojit REST returning ' + JSON.stringify( response ), 'info', NAME );
            logExit( timer );
            return handleResult( undefined, response, callback );
        }

        /**
         * Delete a record or records.
         *  @param {Object}          args
         */
        function DELETE( args ) {
            Y.log('Entering Y.doccirrus.api.employee.DELETE', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.DELETE');
            }
            var
                callback = args.callback,
                data = args.originalParams,
                key = args.query,
                cachedIdentitys;

            /**
             * Callback from employee delete).
             *
             * @param   {Object}            err         error object
             * @param   {Object}            result      result object
             * @return {Function}
             * @private
             */
            function _employeeDeleteCallBack( err, result ) {

                function runDb( config ) {
                    return new Promise( ( resolve, reject ) => {
                        Y.doccirrus.mongodb.runDb( config, ( err, data ) => {
                            if ( err ) {
                                reject( err );
                            } else {
                                resolve( data );
                            }
                        });
                    } );
                }

                if( !err ) {
                    data = result;

                    if( !cachedIdentitys ) {
                        return callback();
                    }

                    let identityIds = cachedIdentitys.map(i => i.username);

                    let activitysettingsRemovePromise = runDb( {
                        user: args.user,
                        model: 'activitysettingsuser',
                        action: 'delete',
                        query: {userId: {$in: identityIds}},
                        options: {}
                    } );

                    let kotableconfigurationsRemovePromise = runDb( {
                        user: args.user,
                        model: 'kotableconfiguration',
                        action: 'delete',
                        query: {userId: {$in: identityIds}},
                        options: {
                            override: true
                        }
                    } );

                    let formprintersRemovePromise = runDb( {
                        user: args.user,
                        model: 'formprinter',
                        action: 'delete',
                        query: {identityId: {$in: cachedIdentitys.map(i => i._id)}},
                        options: {}
                    } );

                    Promise.all( [
                        formprintersRemovePromise,
                        kotableconfigurationsRemovePromise,
                        activitysettingsRemovePromise
                    ] )
                        .then( () => {
                            Y.log( 'UserMgmtMojit REST returning ' + data, 'info', NAME );
                            callback( null, data );
                        } )
                        .catch( err => {
                            console.error( err ); //eslint-disable-line no-console
                            callback( err );
                        } );


                } else {
                    return callback( err );
                }
            }

            /**
             * Callback from identity delete.
             *
             * is also called with a result, which is ignored.
             *
             * @param   {Object}            err         error object
             * @param   {Object}            result      result object
             * @return  {Function}
             * @private
             */
            function _identityDeleteCallBack( err, result ) {
                if( !err ) {

                    cachedIdentitys = result;

                    //now we can delete the employee!
                    Y.log( 'deleting employee: ' + JSON.stringify(key), 'debug', NAME );
                    result = result || {};
                    require( 'async' )
                        .concat( result, function( identity, posted ) {
                            if(identity) {
                                Y.doccirrus.api.kotableconfiguration.clearAllTableConfigurationForUser({
                                    user: args.user,
                                    originalParams: {
                                        userId: identity.username
                                    },
                                    callback: posted
                                });
                            } else {
                                posted();
                            }

                        }, function( error, result ) {
                            if( error ) {
                                return callback( error, result );
                            }

                            //now we need to delete this identity!
                            Y.doccirrus.mongodb.runDb( {
                                user: args.user,
                                model: 'employee',
                                action: 'delete',
                                query: key,
                                callback: _employeeDeleteCallBack
                            } );

                        } );

                } else {
                    Y.log( 'error in deleting the identity: ' + JSON.stringify( err ), 'error', NAME );
                    return callback( err );
                }
            }

            /**
             * Callback from identity get.
             *
             * @param   {Object}            err         error object
             * @param   {Object}            result      result object
             * @return  {Function}
             * @private
             */
            function _identityGetCallBack( err, result ) {
                var
                    data = JSON.stringify( result ),
                    identityIds = [];

                if( !err ) {

                    Y.log( 'Identity found: ' + data );

                    if(result && 0 < result.length ) {
                        result.forEach(function(val) {
                            identityIds.push(val._id);
                        });
                        Y.log( 'deleting identities: ' + JSON.stringify(identityIds) );

                        //now we need to delete this identity!
                        Y.doccirrus.mongodb.runDb( {
                            user: args.user,
                            model: 'identity',
                            action: 'delete',
                            query: {_id: {$in: identityIds}},
                            callback: _identityDeleteCallBack
                        } );

                    } else {
                        _identityDeleteCallBack( null );
                    }
                } else {
                    Y.log( 'error getting identity for employee: ' + JSON.stringify( err ), 'error', NAME );
                    return callback( err );
                }
            }

            function _checkEmployeeActivitiesCallBack( err, result ) {

                if ( err ) {
                    return callback(err);
                }

                if ( result > 0 ) {
                    return callback(Y.doccirrus.errors.rest( '7307', ''));
                }

                // get identity to ascertain its id
                Y.log( 'looking for identity that has specifiedBy: ' + JSON.stringify(key) );
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'identity',
                    action: 'get',
                    query: {specifiedBy: key._id},
                    options: {},
                    callback: _identityGetCallBack
                } );



            }
            // get activities to checking
            Y.log( 'Checking employee activities: ' + JSON.stringify(key) );
            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'activity',
                action: 'count',
                query: {employeeId: key._id},
                options: {},
                callback: _checkEmployeeActivitiesCallBack
            } );
        }

        function sendPwdResetMail( langStr, user, req, messageData, reset ) {
            var
                email,
                path = '/login/first?id=' + messageData.employeeId + '&token=' + encodeURIComponent( messageData.token ),
                externalUrl,
                host = Y.doccirrus.auth.getMyHost( user.tenantId, true ),
                protocol = ( host && host.split( '://' )[0] + '://' ) || 'http://';

            if( Y.doccirrus.auth.isPUC() ) {
                externalUrl = user.prc || Y.doccirrus.auth.getPRCUrl( '', user.tenantId );
            } else {
                externalUrl = Y.doccirrus.auth.getMyHost( user.tenantId, true );
            }
            externalUrl += path;

            Y.Intl.setLang( controllerName, 'en' );

            function send( sender ) {
                var
                    jadeParams = {
                        text: ''
                    },
                    emailOptions = {},
                    myEmail;

                if( reset ) {
                    jadeParams.text = Y.doccirrus.i18n('UserMgmtMojit.resetNonPRC.TEXT');
                    emailOptions.subject = Y.doccirrus.i18n('UserMgmtMojit.reset.SUBJECT');
                    if( Y.doccirrus.auth.isPRC() ) {
                        jadeParams.text = Y.doccirrus.i18n('UserMgmtMojit.reset.TEXT');
                    }
                } else {
                    jadeParams.text = Y.doccirrus.i18n('UserMgmtMojit.notreset.TEXT');
                    emailOptions.subject = Y.doccirrus.i18n('UserMgmtMojit.notreset.SUBJECT');
                }

                jadeParams.text = jadeParams.text
                    .replace( /\$loginUrl\$/g, messageData.loginUrl )
                    .replace( /\$urlExternal\$/gi, externalUrl )
                    .replace( '$username$', messageData.username );

                emailOptions = Y.mix( emailOptions, {
                    serviceName: 'registrationService',
                    jadeParams: jadeParams,
                    jadePath: './mojits/UserMgmtMojit/views/passwordresetemail.jade.html',
                    to: messageData.email
                } );
                myEmail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
                if (sender) {
                    myEmail.from = sender+" <"+myEmail.from.split("<")[1];
                }
                Y.doccirrus.email.sendEmail( { ...myEmail, user }, ( err )=>{
                    if( err ) {
                        Y.log( `sendPwdResetMail. could not send email. ErrorL ${JSON.stringify( err )}`, 'error', NAME );
                    }
                } );
            } // send

            if( !user || !messageData || !Array.isArray( messageData.communications ) ) {
                return;
            }

            email = Y.Array.find( messageData.communications, function( communication ) {
                return 'EMAILJOB' === communication.type || 'EMAILPRIV' === communication.type;
            } );

            if( !email ) {
                return;
            }

            messageData.email = email.value;

            if( Y.doccirrus.auth.isDCPRCRealm( req ) ) {
                messageData.loginUrl = Y.doccirrus.auth.getDCPRCUrl( path );

            } else if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isISD() ) {
                messageData.loginUrl = messageData.url + path;

            } else { // VPRC
                messageData.loginUrl = Y.doccirrus.auth.getPRCUrl( path, user.tenantId );
            }

            if( Y.doccirrus.auth.isPRC() && reset && Y.doccirrus.auth.getPRCIP() ) {
                messageData.loginUrl = protocol + Y.doccirrus.auth.getPRCIP() + path;
            }
            // we need the email of this user (it's optional though, MOJ-4293)
            if( user.specifiedBy ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'practice',
                    action: 'get',
                    query: {},
                    callback: function( err, result ) {
                        var
                            entry;
                        if( err ) {
                            Y.log( 'error in send password reset email: ' + JSON.stringify( err ), 'error', NAME );
                        }
                        entry = result && result[0] && result[0].coname;
                        send( entry );
                    }
                } );
            } else {
                send();
            }
        }

        /**
         * get the identity for an username
         * @method getIdentityForUsername
         * @param {object} parameters
         * @param {object} parameters.user
         * @param {object} parameters.originalParams
         * @param {string} parameters.originalParams.username
         * @param {function} parameters.callback
         * @async
         */
        function getIdentityForUsername( parameters ) {
            Y.log('Entering Y.doccirrus.api.employee.getIdentityForUsername', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.employee.getIdentityForUsername');
            }
            var
                user = parameters.user,
                callback = parameters.callback,
                params = parameters.originalParams || parameters,
                username = params.username;

            function runDbCallback( error, result ) {
                if( error ) {
                    callback( error );
                    return;
                } else if( !result.length ) {
                    callback( null, null );
                    return;
                } else {
                    callback( null, result[0] );
                    return;
                }
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'get',
                query: { username: username },
                options: {fields: Y.doccirrus.filters.noAuthenticaionProps(user)},
                callback: runDbCallback
            } );
        }

        /**
         * get the employee record linked to a username
         * @method getEmployeeForUsername
         * @param {object} parameters
         * @param {object} parameters.user
         * @param {object} parameters.originalParams
         * @param {string} parameters.originalParams.username
         * @param {function} parameters.callback
         * @async
         */

        function getEmployeeForUsername( parameters ) {
            Y.log('Entering Y.doccirrus.api.employee.getEmployeeForUsername', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.employee.getEmployeeForUsername');
            }
            var
                user = parameters.user,
                callback = parameters.callback,
                params = parameters.originalParams || parameters,
                username = params.username;

            //if (!username) {
            //
            //    username = user.username;
            //}

            function onLoadEmployee( error, result ) {
                if( error ) {
                    callback( error );
                    return;
                } else if( !result.length ) {
                    callback( null, null );
                    return;
                }

                callback( null, result[0] );
            }

            function onLoadIdentity( error, result ) {
                if( error ) {
                    callback( error );
                    return;
                } else if( !result.length ) {
                    callback( null, null );
                    return;
                }

                var withIdentity = result[0];

                if( !withIdentity.specifiedBy || '' === withIdentity.specifiedBy ) {
                    callback( new Error( 'User does not have a linked employee record.' ) );
                    return;
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'get',
                    query: {
                        '_id': withIdentity.specifiedBy,
                        'status': { $ne: "INACTIVE" }
                    },
                    callback: onLoadEmployee
                } );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'get',
                query: { username: username },
                options: {fields: Y.doccirrus.filters.noAuthenticaionProps(user)},
                callback: onLoadIdentity
            } );
        }

        function checkGroup( employee, identity ) {
            var physician = Y.doccirrus.schemas.identity.userGroups.PHYSICIAN;

            if( physician === employee.type ) {
                /**
                 * remove all PHYSICIAN groups to prevent duplication
                 */
                if( identity.memberOf ) {
                    identity.memberOf = identity.memberOf.filter( function( memberOf ) {
                        return physician !== memberOf.group;
                    } );
                } else {
                    identity.memberOf = [];
                }
                identity.memberOf.push( {
                    group: physician
                } );
            }

            if( !identity.memberOf || !identity.memberOf.length ) {
                identity.memberOf = identity.memberOf || [];
                identity.memberOf.push( {group: Y.doccirrus.schemas.identity.userGroups.USER} );
            }
        }

        /**
         * Returns data for the admin overview
         * @param {Object} parameters
         * @param {String} parameters._id
         * @callback
         */
        function readEmployeesForAdminOverview( parameters ) {
            Y.log('Entering Y.doccirrus.api.employee.readEmployeesForAdminOverview', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.employee.readEmployeesForAdminOverview');
            }
            Y.mix( parameters.originalParams, {
                includeIdentity: true,
                includeAll: true
            }, true );

            Y.doccirrus.api.employee.get( parameters );
        }

        /**
         * Returns data for the admin detail
         * @param {Object} parameters
         * @param {String} parameters._id
         *
         * @return {Function} callbak
         * @callback
         */
        function readEmployeeForAdminDetail( parameters ) {
            Y.log('Entering Y.doccirrus.api.employee.readEmployeeForAdminDetail', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.employee.readEmployeeForAdminDetail');
            }
            var
                params = parameters.originalParams || {},
                _id = params._id || null,
                callback = parameters.callback,
                user = parameters.user,
                async = require( 'async' );

            if( null === _id ) {
                return callback( new Error( 'readEmployeeForAdminDetail: _id is undefined' ), null );
            }

            async.parallel( {
                employee: function( employeeCallback ) {

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'employee',
                        action: 'get',
                        query: {_id: _id},
                        callback: function runDb_employee( err, result ) {
                            if( Array.isArray( result ) && result.length ) {
                                result = result[0];
                            }
                            employeeCallback( err, result );
                        }
                    } );

                },
                identity: function( identityCallback ) {

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'identity',
                        action: 'get',
                        query: {specifiedBy: _id},
                        options: {fields: Y.doccirrus.filters.noAuthenticaionProps(user)},
                        callback: function runDb_identity( err, result ) {
                            if( Array.isArray( result ) && result.length ) {
                                result = result[0];
                            }
                            identityCallback( err, result );
                        }
                    } );

                }
            }, callback );

        }

        function getRlvPhysicians( args ) {
            Y.log('Entering Y.doccirrus.api.employee.getRlvPhysicians', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.getRlvPhysicians');
            }
            var user = args.user,
                params = args.originalParams,
                callback = args.callback;
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'employee',
                action: 'get',
                query: {
                    type: 'PHYSICIAN',
                    physicianInQualification: {$ne: true},
                    _id: {$ne: params.employeeId},
                    $or: [
                        {firstname: {$regex: params.term, $options: 'i'}},
                        {lastname: {$regex: params.term, $options: 'i'}}
                    ]
                },
                callback: callback
            } );

        }

        function getLoggedInEmployee( args ) {
            Y.log('Entering Y.doccirrus.api.employee.getLoggedInEmployee', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.getLoggedInEmployee');
            }
            var user = args.user,
                callback = args.callback;

            function employeeCb( err, employees ) {
                if(err){
                    return callback(err);
                }

                callback(null, employees[0]);
            }

            Y.doccirrus.mongodb.runDb({
                user: user,
                model: 'employee',
                query: {
                    _id: user.specifiedBy
                },
                options: {
                    lean: true
                },
                callback: employeeCb
            });
        }

        /**
         * @method getEmployeeByName
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.term firstname and(or) lastname
         * @param {Function} args.callback
         */
        function getEmployeeByName( args ){
            Y.log('Entering Y.doccirrus.api.employee.getEmployeeByName', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.getEmployeeByName');
            }
            var
                callback = args.callback,
                queryParams = args.query || {},
                term = queryParams.term || '',
                user = args.user,
                keys;            keys = term.split(' ');
            keys[1] = keys[1] || '';

            Y.doccirrus.mongodb.runDb({
                user: user,
                model: 'employee',
                action: 'get',
                query: {
                    $or: [
                        {
                            firstname: {
                                $regex: '^' + keys[0],
                                $options: 'i'
                            },
                            lastname: {
                                $regex: '^' + keys[1],
                                $options: 'i'
                            }
                        },
                        {
                            firstname: {
                                $regex: '^' + keys[1],
                                $options: 'i'
                            },
                            lastname: {
                                $regex: '^' + keys[0],
                                $options: 'i'
                            }
                        }
                    ]
                },
                options: {
                    lean: true,
                    select: {
                        lastname: 1,
                        middlename: 1,
                        nameaffix: 1,
                        firstname: 1,
                        title: 1,
                        status: 1
                    }
                }
            }, callback);
        }

        /**
         * Gets employee for user
         * @method getMyEmployee
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.user.identityId
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function getMyEmployee( args ) {
            Y.log('Entering Y.doccirrus.api.employee.getMyEmployee', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.getMyEmployee');
            }
            var
                user = args.user || {},
                specifiedBy = user.specifiedBy,
                callback = args.callback;
            if( !specifiedBy ) {
                Y.log( 'getMyEmployee. specifiedBy is not set, specifiedBy: ' + specifiedBy, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'specifiedBy is not set' ) );
            }
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'employee',
                action: 'get',
                query: {
                    _id: specifiedBy
                },
                options: {
                    limit: 1,
                    lean: true
                }
            }, callback );
        }

        // return contact details of the current user
        function getPrimaryContact( user, callback ) {
            YDC.mongodb.runDb( {
                user: user,
                model: 'employee',
                action: 'get',
                query: { _id: user.specifiedBy, status: { $ne: "INACTIVE" } },
                callback: function( err, result ) {
                    var
                        theEmployee = result && result[0],
                        email, mobilePhone, phone;
                    if( err || !theEmployee || !theEmployee.communications ) {
                        return callback( err || Y.doccirrus.errors.rest( 400, 'employee contact not found' ) );
                    }

                    email = Y.doccirrus.schemas.simpleperson.getEmail( theEmployee.communications );
                    phone = Y.doccirrus.schemas.simpleperson.getPhone( theEmployee.communications );
                    mobilePhone = Y.doccirrus.schemas.simpleperson.getMobile( theEmployee.communications );
                    callback( null, {
                        email: email && email.value,
                        phone: phone && phone.value,
                        mobile: mobilePhone && mobilePhone.value
                    } );
                }
            } );
        }

        /**
         * Updates employee and if user changed his username, will set flag newUsername for output.
         * @param {Object} args
         */
        function updateEmployee( args ) {
            Y.log('Entering Y.doccirrus.api.employee.updateEmployee', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.updateEmployee');
            }
            var
                data = args.data || {},
                callback = args.callback,
                user = args.user,
                query = args.query,
                options = args.options,
                shouldLogout = false;
            if( data.identity && data.identity._id === user.identityId && user.id !== data.identity.username ) {
                shouldLogout = true;
            }
            Y.doccirrus.api.employee.put( {
                user: user,
                query: query,
                data: data,
                options: options,
                callback: function( err, results ) {
                    var
                        data = results;
                    if(err){
                        return callback(err);
                    }
                    if(results.toObject){
                        data = results.toObject();
                    }

                    if( !err && shouldLogout && data ) {
                        Y.doccirrus.auth.doUserLogout( user, true );
                        data.newUsername = true;
                    }
                    callback( err, data );
                }
            } );
        }

        /**
         * find the _id of the newest employee in physician group
         * @param   {Object}          args
         * @param   {Object}          args.user
         * @param   {Function}        callback
         */
        function getLastPhysicianId( args, callback ) {
            Y.log('Entering Y.doccirrus.api.employee.DELETE', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.DELETE');
            }
            var
                user = args.user || args;
            callback = callback || args.callback;

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'get',
                query: {'memberOf.group': Y.doccirrus.schemas.identity.userGroups.PHYSICIAN},
                options: {
                    sort: {_id: -1},
                    fields: Y.doccirrus.filters.noAuthenticaionProps(user)
                },
                callback: function( err, result ) {
                    if( err ) {
                        return callback( err );
                    }

                    if( result && result[0] ) {
                        return callback( null, result[0].specifiedBy );
                    }

                    Y.log( 'getLastPhysicianId: no employee exists in PHYSICIAN group', 'debug', NAME );
                    callback();
                }
            } );
        }

        /**
         * Activates identity by setting its status to ACTIVE
         * -- for PHYSICIAN also checks employee count in license
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams - whole employee object with populated identityData
         * @param {Function} args.callback
         *
         * @returns {Promise<*>}
         */
        async function activateIdentity( args ) {
            Y.log( 'Entering Y.doccirrus.api.employee.activateIdentity', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.employee.activateIdentity' );
            }
            const {user, originalParams, callback} = args;
            let err, res,
                identity = originalParams.identityData || {},
                putData = {fields_: 'status', status: 'ACTIVE'};

            if( 'PHYSICIAN' === originalParams.type ) {
                [err] = await formatPromiseResult(
                    new Promise( ( resolve, reject ) => {
                        Y.doccirrus.licmgr.employeeLicensingCheck( user, originalParams.type, '', err => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve();
                            }
                        } );
                    } )
                );
                if( err ) {
                    Y.log( `activateIdentity. Failed checking of employee license: ${err.stack || err}`, 'warn', NAME );
                    return callback( err );
                }
            }

            //  Note: No threat of XSS, but will be filtered anyway to add taint value
            putData = Y.doccirrus.filters.cleanDbObject( putData );

            if( !identity._id ) {
                callback( YDC.errors.rest( 409, 'missing parameter' ) );
                return;
            }
            [err, res] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'identity',
                    action: 'put',
                    query: {_id: identity._id},
                    data: putData
                } )
            );
            if( err ) {
                Y.log( `activateIdentity. Failed saving identity data set: ${err.stack || err}`, 'info', NAME );
                return callback( err );
            }
            return callback( null, res );
        }

        function inactivateIdentity( args ) {
            Y.log('Entering Y.doccirrus.api.employee.inactivateIdentity', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.inactivateIdentity');
            }
            var
                callback = args.callback, user = args.user,
                params = args.originalParams || args.data;
            if( !params._id ) {
                callback( YDC.errors.rest( 409, 'missing parameter' ) );
                return;
            }

            //  Note: No threat of XSS, but will be filtered anyway to add taint value
            var putData = { fields_: 'status', status: 'INACTIVE' };
            putData = Y.doccirrus.filters.cleanDbObject( putData );

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'put',
                query: { _id: params._id },
                data: putData,
                callback: function( err, result ) {                                 //  callback
                    if( err ) {
                        Y.log( 'Failed saving identity data set: ' + err, 'info', NAME );
                        return callback( err );
                    }

                    callback( null, result );
                }
            } );

        }
        /**
         * doResetUserPw
         *
         * sends a password reset email to the logged-in users email account
         *
         * @param {}
         */
        async function doResetUserPw( args ) {
            Y.log( 'Entering Y.doccirrus.api.employee.doResetOwnPw', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.employee.doResetOwnPw' );
            }
            var
                callback = args.callback,
                params = args.originalParams || args.data,
                user = args.user,
                query, data, messageData = {},
                req = args.httpRequest,
                host = params.host || Y.doccirrus.auth.getURLforPRCorVPRC( req );

            if( !user ) {
                user = params.tenantId && Y.doccirrus.auth.isHexTenantId( params.tenantId ) ? Y.doccirrus.auth.getSUForTenant( params.tenantId ) : Y.doccirrus.auth.getSUForLocal();
            }

            Y.log( 'Entering doResetUserPw... user: ' + JSON.stringify( user ) );
            if( user.specifiedBy ) {
                query = {
                    specifiedBy: user.specifiedBy
                };
            } else {
                query = {
                    username: user.id
                };
            }

            // generate token

            data = {
                pwResetToken: Y.doccirrus.auth.getToken()
            };
            let [err, identity] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'put',
                    model: 'identity',
                    user: user,
                    fields: ['pwResetToken'],
                    data: Y.doccirrus.filters.cleanDbObject( data ),
                    query: query
                } ) );

            if( err || !(identity && identity.username && identity.specifiedBy) ) {
                Y.log( `doResetUserPw: Error at DB calling identity model for querry: ${JSON.stringify(query)} ${err && err.stack || err}`, 'error', NAME );
                callback( err || new Error( 'Identity Not Found' ) );
                return;
            }

            messageData.username = identity.username;
            messageData.token = identity.pwResetToken;
            callback( null );                           //  eslint-disable-line callback-return

            let [err1, employee] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    model: 'employee',
                    user: user,
                    query: {
                        _id: identity.specifiedBy
                    }
                } ) );

            if( err1 || !employee.length ) {
                Y.log( `doResetUserPw: Error at DB calling identity model for querry _id: ${identity.specifiedBy} ${err1 && err1.stack || err1}`, 'error', NAME );
                return;
            }
            employee = employee[0];
            messageData.communications = employee.communications;
            messageData.talk = employee.talk;
            messageData.employeeId = employee._id;
            if( 0 === host.indexOf( 'http' ) ) {
                messageData.url = host; // newer api gives us host with protocol
            } else {
                messageData.url = getProtocol() + host;
            }
            sendPwdResetMail( args.lang, user, args.httpRequest, messageData, true );
        }
        /**
         * doResetEmployeePw
         *
         * Takes an employee account name or account id and sends a password reset email to the employee's email account
         * By default, an empty object leads to sending a password reset email to the users email account
         *
         * @param {} || username || user_id
         */
        async function doResetEmployeePw( args ) {
            Y.log('Entering Y.doccirrus.api.employee.doResetEmployeePw', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.doResetEmployeePw');
            }
            var
                callback = args.callback,
                params = args.originalParams || args.data,
                user = args.user,
                query, data, messageData = {},
                req = args.httpRequest,
                dcUtil = require( process.cwd() + '/middleware/dc-util.js' ),
                dcServerMiddleware = dcUtil.getServerMiddleware(),
                doAutoLogout = dcServerMiddleware.timeoutHandler.doAutoLogout,
                host = Y.doccirrus.auth.isMocha() ? 'mocha.dc' : ( params.host || req && Y.doccirrus.auth.getURLforPRCorVPRC( req ) ),
                cleanPwImmediately = false, fields;

            if( !params.id && !params.username ) {
                callback( new Error( 'Missing Paramter' + params.id ? 'employeeId' : 'username' ) );
                return;
            }

            if( !user ) {
                user = params.tenantId && Y.doccirrus.auth.isHexTenantId( params.tenantId ) ? Y.doccirrus.auth.getSUForTenant( params.tenantId ) : Y.doccirrus.auth.getSUForLocal();
            }

            Y.log( 'Entering doResetEmployeePw... user: ' + JSON.stringify( user ) );

            // generate token
            data = {
                pwResetToken: Y.doccirrus.auth.getToken()
            };
            fields = ['pwResetToken'];

            if( params.id ) {
                // here we suppose that id in query will come from employee table and employee details pages only
                // so we should "clean" the current password of employee immediately in that case
                cleanPwImmediately = true;
                fields.push( 'pw' );
                data.pw = Y.doccirrus.comctl.getRandId() + Y.doccirrus.auth.getToken(); // some random meaningless string
                query = {
                    specifiedBy: params.id
                };
            } else {
                query = {
                    username: params.username
                };
            }

            let [err, identity] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'put',
                    model: 'identity',
                    user,
                    fields,
                    data: Y.doccirrus.filters.cleanDbObject( data ),
                    query
            } ));

            if( err || !(identity && identity.username && identity.specifiedBy ) ) {
                Y.log( `doResetEmployeePw: Error at DB calling identity model for querry: ${JSON.stringify(query)} ${err && err.stack || err}`, 'error', NAME );
                callback( err || new Error( 'Identity Not Found' ) );
                return;
            }
            messageData.username = identity.username;
            messageData.token = identity.pwResetToken;
            callback( null );                           //  eslint-disable-line callback-return

            let [err1, employee] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    model: 'employee',
                    user: user,
                    query: {
                        _id: identity.specifiedBy
                    }
                })
            );

            if( err1 || !employee.length ) {
                Y.log( `doResetEmployeePw: Error at DB calling employee model for _id: ${identity.specifiedBy} ${err1 && err1.stack || err1}`, 'error', NAME );
                return;
            }
            employee = employee[0];
            messageData.communications = employee.communications;
            messageData.talk = employee.talk;
            messageData.employeeId = employee._id;

            if( 0 === host.indexOf( 'http' ) ) {
                messageData.url = host; // newer api gives us host with protocol
            } else {
                messageData.url = getProtocol() + host;
            }
            sendPwdResetMail( args.lang, user, args.httpRequest, messageData, true );

            if( cleanPwImmediately ) {
                // do autoLogout for all sessions of reset employee
                let [errLogout, authToLogout] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'auth',
                        query: {
                            identityId: identity._id
                        }
                    } )
                );
                if( errLogout ) {
                    Y.log( `doResetEmployeePw: Error while getting session data from auth for ${identity._id} identity: ${errLogout.stack || errLogout}`, 'warn', NAME );
                }

                for( let authItem of authToLogout ) { //eslint-disable-line no-unused-vars
                    Y.log( `doResetEmployeePw: Make autoLogout for ${identity._id} identity from session ${authItem.sessionId}.`, 'debug', NAME );
                    doAutoLogout( {
                        identityId: identity._id,
                        sessionId: authItem.sessionId,
                        tenantId: authItem.tenantId
                    } );
                }

                // clean all sessions data for identity
                let [errDeleteAuth, deleteResult] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'auth',
                        action: 'delete',
                        query: {
                            identityId: identity._id
                        },
                        options: {
                            override: true
                        }
                    } )
                );

                if( errDeleteAuth ) {
                    Y.log( `doResetEmployeePw: Error while delete session data from auth for ${identity._id} identity: ${errDeleteAuth.stack || errDeleteAuth}`, 'warn', NAME );
                    return;
                }
                Y.log( `doResetEmployeePw: Deleted ${deleteResult && deleteResult.length} session records for ${identity._id} identity.`, 'info', NAME );
                return;
            }
        }

        /**
         * create/extend a support account
         * send email to support team or any other Dc email user entered
         *
         * @param {Object} args
         */
        function activateSupportAccount( args ) {
            Y.log('Entering Y.doccirrus.api.employee.activateSupportAccount', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.activateSupportAccount');
            }
            var
                user = Y.doccirrus.auth.getSUForLocal( [Y.doccirrus.schemas.identity.userGroups.SUPPORT, Y.doccirrus.schemas.identity.userGroups.ADMIN] ),
                callback = args.callback,
                data = args.data,
                i18n = Y.doccirrus.i18n,
                comment = data.comment,
                supportDuration = data.supportDuration,
                moment = require( 'moment' ),
                expireDate = moment(),
                isPartner = false,
                employee = YDC.schemas.employee.getSupportEmployeeObj(),
                identity = YDC.schemas.identity.getSupportIdentityObj(),
                loginToken = Y.doccirrus.utils.generateSupportLoginToken(), //token for support login
                caseNo, myPractice, supportContactCommunication = [], supportContactEmails = [],
                async = require( 'async' ),
                supportConf = Y.doccirrus.email.getServiceConf( 'dcInfoService_support' ),
                email;

            if( args.user.id === identity.username ) { // support user cannot extend himself
                callback( YDC.errors.rest( 403 ) );
                return;
            }

            if( !supportConf || !supportConf.to ) { // make sure support email is always configured
                callback( YDC.errors.rest( 7304, 'support not configured' ) );
                return;
            } else {
                email = supportConf.to || '';
                email = email.replace( /^[\w\s]*</, '' ).replace( />[\w\s]*$/, '' );
            }


            SUPPORT_DURATION = supportDuration;
            employee.from = identity.validFrom = new Date();
            expireDate = expireDate.add( 'hour', supportDuration ).toDate();
            identity.expireDate = identity.validTo = employee.to = expireDate;

            employee.communications = [
                { type: 'EMAILJOB', preferred: true, value: email}
            ];

            // post data, or update existing data
            async.series( [
                function caseNumber( cb ) {
                //get current practice to find support contact email and define isPartner flag
                    YDC.api.practice.getMyPractice( {
                        user: user,
                        callback: function( err, myPrac ) {
                            if( err || !myPrac ) {
                                myPractice = {};
                                cb( err );
                            } else {
                                myPractice = myPrac;
                                if( myPrac && myPrac.supportContact && myPrac.supportContact.companyName ) {
                                    isPartner = !/^Doc Cirrus/.exec( myPrac.supportContact.companyName );
                                }

                                supportContactCommunication = myPrac && myPrac.supportContact && myPrac.supportContact.communications || [];
                                if( supportContactCommunication.length ) {
                                    supportContactEmails = supportContactCommunication.filter( item => {
                                        return 'EMAILPRIV' === item.type || 'EMAILJOB' === item.type;
                                    } );

                                    if( supportContactEmails.length ) {
                                        let preferedEmail = supportContactEmails.find( item => { return item.preferred; } );
                                        email = ( preferedEmail && preferedEmail.value ) || supportContactEmails[0].value;
                                    }
                                    employee.communications = [
                                        { type: 'EMAILJOB', preferred: true, value: email}
                                    ];
                                }
                                caseNo = myPrac.dcCustomerNo + '-' + moment().format( 'YYMMDDHH' );
                                employee.countryMode = myPrac.countryMode || ['D'];
                                cb();
                            }
                        }
                    } );
                },
                function checkIdentity( cb ) {
                    YDC.mongodb.runDb( {
                        user: user,
                        model: 'identity',
                        action: 'get',
                        query: {username: identity.username},
                        callback: function( err, result ) {
                            var
                                currIdentity = result && result[0];
                            if( err || !currIdentity ) {
                                cb( err );

                            } else {
                                currIdentity = Y.mix( currIdentity, identity, true ); // reset with default values
                                identity = currIdentity;

                                //mongooselean.save_fix
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'identity',
                                    action: 'put',
                                    query: {
                                        _id: currIdentity._id
                                    },
                                    fields: Object.keys(currIdentity),
                                    data: Y.doccirrus.filters.cleanDbObject(currIdentity)
                                }, cb);
                            }
                        }
                    } );
                },
                function checkEmployee( cb ) {
                    var qry = identity.specifiedBy ? {
                        $or: [
                            {_id: identity.specifiedBy},
                            {isSupport: true}
                        ]
                    } :
                    {isSupport: true};
                    YDC.mongodb.runDb( {
                        user: user,
                        model: 'employee',
                        action: 'get',
                        query: qry,
                        callback: function( err, result ) {
                            var
                                currEmployee = result && result[0];
                            if( err || !currEmployee ) {
                                cb( err );

                            } else {
                                employee = currEmployee;
                                // reset some core value: username and isSupport are crucial.
                                YDC.schemas.employee.resetSupportEmployee( currEmployee );
                                //Y.log('checkEmployee callback' + JSON.stringify( employee )+ JSON.stringify( currEmployee ),'debug',NAME);
                                if( !currEmployee.countryMode ) {
                                    currEmployee.countryMode = myPractice.countryMode || ['D'];
                                }

                                //mongooselean.save_fix
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'employee',
                                    action: 'put',
                                    query: {
                                        _id: currEmployee._id
                                    },
                                    fields: Object.keys(currEmployee),
                                    data: Y.doccirrus.filters.cleanDbObject(currEmployee)
                                }, cb);
                            }
                        }
                    } );
                },
                function postEmployee( cb ) {
                    if( employee._id ) {
                        return cb();
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'employee',
                        action: 'post',
                        noAudit: true,
                        data: employee,
                        callback: function( err, result ) {
                            if( err || !result ) {
                                cb( err );
                            } else {
                                employee._id = result[0];
                                cb( null, result );
                            }
                        }
                    } );
                },
                function postIdentity( cb ) {
                    identity.specifiedBy = employee._id;
                    identity.loginToken = loginToken;
                    if( identity._id ) {
                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'identity',
                            action: 'put',
                            query: {
                                _id: identity._id
                            },
                            fields: Object.keys(identity),
                            data: Y.doccirrus.filters.cleanDbObject(identity)
                        }, cb);

                        return;
                    }
                    YDC.mongodb.runDb( {
                        user: user,
                        model: 'identity',
                        action: 'post',
                        noAudit: true,
                        data: identity,
                        callback: function( err, result ) {
                            identity._id = result[0];
                            cb( err );
                        }
                    } );
                },
                function writeAudit( cb ) {
                    YDC.api.audit.auditSupportAccount( user, {
                        comment: comment,
                        firstname: employee.firstname,
                        lastname: employee.lastname,
                        email: email,
                        caseNo: caseNo,
                        activeUntil: moment( identity.expireDate ).format( 'DD.MM.YYYY HH:mm' )
                    }, function( err ) {
                        cb( err );
                    } );
                },
                function setupCheck( cb ) {
                    YDC.api.employee.checkSupportAccount( user, cb );
                },
                function sendSupportRequestToDCPRC( cb ) {
                    let
                        url = Y.doccirrus.auth.getDCPRCUrl( '/1/supportrequest/:saveRequest' ),
                        params = {
                            timestamp: new Date(),
                            coname: args.user.coname,
                            sendingEmployeeName: args.user.U,
                            supportDuration: supportDuration,
                            status: Y.doccirrus.schemas.supportrequest.statuses.ACTIVE,
                            isPartnerRequest: isPartner ? true : false,
                            loginToken: loginToken,
                            loginLink: Y.doccirrus.auth.getMyHost( user.tenantId, true ) + '/login/token?id=' + identity._id
                        };

                    Y.log( `activateSupportAccount.sendSupportRequestToDCPRC. Sending request to DCPRC to save support request. params: ${JSON.stringify( params )}`, 'debug', NAME );
                    Y.doccirrus.https.externalPost( url, params, Object.assign( { errDataCallback: true }, Y.doccirrus.auth.setInternalAccessOptions() ), function( error ) {
                        if( error ) {
                            Y.log( `activateSupportAccount.sendSupportRequestToDCPRC. Error from DCPRC: ${error && error.stack || error}`, 'error', NAME );
                            return cb( YDC.errors.rest( 7309 ) );
                        }
                        cb();
                    } );
                },
                function sendEmail( cb ) {
                    var
                        message = {text: ''},
                        dcprcUrl = Y.doccirrus.auth.getDCPRCUrl( '/supportrequest' );

                    message.from = supportConf.from;
                    message.to = email || supportConf.to;
                    message.noBcc = true;
                    message.subject = i18n( 'employee-api.supportAccessActivated.TITLE' );
                    message.text = Y.Lang.sub( i18n( 'employee-api.supportAccessActivated.MAIL_TEXT' ), {
                        coname: myPractice.coname,
                        duration: Y.doccirrus.schemaloader.getEnumListTranslation( 'supportrequest', 'SupportDuration_E', parseInt( supportDuration, 10 ), 'i18n', '' ),
                        dcprcUrl: dcprcUrl,
                        comment: comment
                    } );

                    message = Y.doccirrus.email.createHtmlEmailMessage( message );

                    Y.doccirrus.email.sendEmail( { ...message, user }, ( err ) => {
                        if( err ) {
                            Y.log( `activateSupportAccount. could not send email. ${err && err.stack || err}`, 'error', NAME );
                            cb( YDC.errors.rest( 7308 ) );
                        }
                        cb();
                    } );
                }
            ], function done( err ) {
                if( err ) {
                    Y.log( `error in creating support account: ${err && err.stack || err}`, 'error', NAME );
                    if( !err.code || ![ 7308, 7309 ].includes( err.code ) ) {
                        return callback( YDC.errors.rest( 7310 ) );
                    }
                    return callback( err );
                }
                callback( null, { identity: identity, employee: employee } );
            } );
        }

        /**
         * if support account is expired deletes it, otherwise will set a timer that
         * will repeat the process once expired.
         * this is called also on startup to make the timer persistent.
         * @param {Object}          user
         * @param {Function}        callback
         *
         * @return {Function}       callback
         */
        function checkSupportAccount( user, callback ) {
            var
                UNAME = 'Support',
                moment = require( 'moment' ),
                async = require( 'async' );

            if( !callback ) {
                callback = function( err ) {
                    if( err ) {
                        Y.log( 'error in check-Support-Account: ' + JSON.stringify( err ), 'error', NAME );
                    } else {
                        Y.log( 'checked support account on ' + user.tenantId, 'debug', NAME );
                    }
                };
            }

            // don't do anything for the non-PRC servers
            if( !Y.doccirrus.auth.isPRC() && !Y.doccirrus.auth.isISD() ) {
                return callback();
            }


            function setupTimer( identity, cb ) {
                var
                    now = new Date(), timeLeft;
                if( identity.expireDate && identity.expireDate > now ) {
                    timeLeft = identity.expireDate - now;
                    setTimeout( function() {
                        YDC.api.employee.checkSupportAccount( user );
                    }, timeLeft );
                    YDC.schemas.identity.setForDeletion( user, SUPPORT_DURATION * 3601, cb ); // resort for when the server is down
                } else {
                    Y.log( 'checkSupportAccount: Could not setup timer, process will fail.','warn',NAME);
                    cb();
                }
            }

            async.waterfall( [

                function checkIdentity( cb ) {
                    YDC.mongodb.runDb( {
                        user: user,
                        model: 'identity',
                        action: 'get',
                        query: {username: UNAME},
                        callback: function( err, result ) {
                            var
                                identity = result && result[0];
                            if( result && 1 < result.length ) {
                                Y.log( 'checkSupportAccount: too many support accounts: ' + result.length, 'warn', NAME );
                            }
                            if( err || !identity ) {
                                Y.log( 'checkSupportAccount: no Support account. Done.', 'info', NAME );
                                cb( err, null );
                            } else if( !identity.expireDate ) {
                                Y.log( 'checkSupportAccount: identity does not contain correct fields. Done.', 'info', NAME );
                                cb( err, null );
                            } else if( moment( identity.expireDate ).subtract( 5, 'second' ).isBefore( moment()) ) {
                                // subtract 5 seconds to avoid problems in setupTimer
                                Y.log( 'checkSupportAccount: expire date in the past, deleting immediately.', 'info', NAME );
                                cb( null, identity );
                            } else {
                                Y.log( 'checkSupportAccount: Support account will expire at: ' + identity.expireDate, 'info', NAME );
                                setupTimer( identity, function( err1 ) {
                                    cb( err1, identity.expireDate );
                                } );
                            }
                        }
                    } );
                },
                function deleteAccount( identity, cb ) {
                    if( !identity || !identity._id ) {
                        return cb( null, identity );
                    }
                    Y.log( 'checkSupportAccount: deleting support account, already expired at: ' + identity.expireDate, 'info', NAME );
                    YDC.mongodb.runDb( {
                        user: user,
                        model: 'identity',
                        action: 'delete',
                        query: {_id: identity._id},
                        callback: function( err ) {
                            if( err ) {
                                return cb( err );
                            }
                            YDC.mongodb.runDb( {
                                user: user,
                                model: 'employee',
                                action: 'delete',
                                query: {_id: identity.specifiedBy},
                                callback: function( err1 ) {
                                    cb( err1 );
                                }
                            } );
                        }
                    } );
                }
            ], function done( err, result ) {
                if( err ) {
                    Y.log( 'checkSupportAccount: failed: ' + err, 'warn' );
                    return callback( err );
                }
                callback( null, result );
            } );

        }

        /**
         * Updates employee entry
         * @param {Object} args
         * @param {Object} args.query
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.options
         * @param {Function} args.callback
         */
        function updateOnlyEmployee( args ) {
            let
                user = args.user,
                query = args.query,
                data = args.data,
                options = args.options,
                callback = args.callback;
            // This Hack is a result of the interdependence of employee and identity.
            // The correct fix is a profile update available in the virtual user collection.
            // rw. 13.9.2016  MOJ-6702
            setTimeout( function delayedUpdateEmployee() {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'put',
                    query: query,
                    fields: Object.keys( data ),
                    data: Y.doccirrus.filters.cleanDbObject( data ),
                    options: options
                }, function( err, result ) {
                    callback( err, result );
                } );
            }, 150 );
        }

        /**
         * Gets all asv numbers which employees have(distinct)
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Function} args.callback
         */
        function getASVTeamNumbers( args ) {
            let
                user = args.user,
                callback = args.callback,
                query = args.query || {},
                _query = {},
                isPartner = user.groups && user.groups.some( item => Y.doccirrus.schemas.employee.userGroups.PARTNER === item.group ),
                pipeline = [
                    { $unwind: '$asvTeamNumbers' },
                    { $match: _query },
                    {
                        $group: {
                            _id: null,
                            asvTeamNumbers: { $addToSet: '$asvTeamNumbers' }
                        }
                    }
                ];
            if( query.term ) {
                _query.asvTeamNumbers = { $regex: query.term, $options: 'i' };

            }
            if( isPartner ) {
                let
                    mongoose = require( 'mongoose' );
                _query._id = new mongoose.Types.ObjectId( user.specifiedBy );
            }
            Y.doccirrus.mongodb.runDb({
                action: 'aggregate',
                pipeline: pipeline,
                model: 'employee',
                options: args.options,
                user: user
            }, function(err, results){
                if(err){
                    return callback(err);
                }
                callback( err, (results.result && results.result[ 0 ] && results.result[ 0 ].asvTeamNumbers) || [] );
            });
        }

        /**
         *  Record an update to sort order for labdata types in a user's profile (do not allow any other updates)
         *
         *  Uses update rather than put, to avoid complications with employee post-processes for syncAux, messages,
         *  sync with dispatcher, etc - these are not needed when just for the column sorter.
         *
         *  @param  args                        {Object}    REST v1
         *  @param  args.user                   {Object}    REST user or equivalent
         *  @param  args.query                  {Object}    Should refer to current user's employee _id
         *  @param  args.data                   {Object}
         *  @param  args.data.labdataSortOrder  {String}    Comma separated list of labdata header types
         *  @param  args.callback               {Function}
         */

        function updateLabdataSortOrder( args ) {
            Y.log('Entering Y.doccirrus.api.employee.updateLabdataSortOrder', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.updateLabdataSortOrder');
            }
            const
                su = Y.doccirrus.auth.getSUForTenant( args.user.tenantId );

            let
                labdataSortOrder = args.data && args.data.labdataSortOrder ? args.data.labdataSortOrder : '',
                putData = {
                    'labdataSortOrder': labdataSortOrder,
                    'fields_': ['labdataSortOrder']
                };

            Y.doccirrus.mongodb.runDb( {
                'user': su,
                'action': 'update',
                'model': 'employee',
                'query': args.query,
                'data': Y.doccirrus.filters.cleanDbObject( putData ),
                'callback': onUpdateSortOrder
            } );

            function onUpdateSortOrder( err, data ) {
                if ( err ) {
                    Y.log( `Problem updating labdata sort order: ${JSON.stringify( err )}`, 'warn', NAME );
                    return args.callback( err );
                }
                args.callback( null, data );
            }
        }

        /**
         *  Get sort order of labdata type activities
         *
         *  @param  args                {Object}    REST v1
         *  @param  args.user           {Object}    REST user or equivalent
         *  @param  args.employeeId     {String}    Database _id of an employee object
         *  @param  args.callback       {Function}  Of the form fn( err, sortOrderString )
         */

        function getLabDataSortOrder( args ) {
            Y.log('Entering Y.doccirrus.api.employee.getLabDataSortOrder', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.getLabDataSortOrder');
            }
            Y.doccirrus.mongodb.runDb( {
                'user': args.user,
                'action': 'get',
                'model': 'employee',
                'query': { _id: args.employeeId },
                'callback': onLoadSortOrder
            } );

            function onLoadSortOrder( err, data ) {
                if ( err ) {
                    Y.log( 'Problem loading labdata sort order: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                if ( !data || !data[0] || !data[0].labdataSortOrder ) {
                    //  not an error, some employees may not have / never set this field
                    Y.log( 'Could not load labdata sort order for employee ' + args.employeeId, 'denug', NAME );
                    return args.callback( null, '' );
                }

                args.callback( null, data[0].labdataSortOrder );
            }
        }

        /**
         *  Return an employee's labdata sorting preferences given their username
         *
         *  @param  args            {Object}    REST v1
         *  @param  args.user       {Object}    REST user or equivalent
         *  @param  args.username   {String}    Employee's username
         *  @param  args.callback   {Function}  Of the form fn( err, sortOrderString )
         */

        function getLabDataSortOrderForUsername( args ) {
            Y.log('Entering Y.doccirrus.api.employee.getLabDataSortOrderForUsername', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.getLabDataSortOrderForUsername');
            }
            var
                async = require( 'async' ),
                username = args.username || args.originalParams.userName || args.user.id || null,
                foundUser,
                sortOrder;

            async.series( [ lookUpIdentity, lookupEmployeeProfile ], onAllDone );

            function lookUpIdentity( itcb ) {
                getIdentityForUsername( {
                    'user': args.user,
                    'username': username,
                    'callback': onIdentityLoaded
                } );

                function onIdentityLoaded( err, result ) {

                    if ( !err && !result ) {
                        err = Y.doccirrus.errors.rest( 404, 'Username not recognized', true );
                    }
                    if ( !err && ( !result.specifiedBy ) ) {
                        err = Y.doccirrus.errors.rest( 404, 'User does not have an employee profile', true );
                    }
                    if ( err ) {
                        return itcb( err );
                    }
                    foundUser = result;
                    return itcb( null );
                }
            }

            function lookupEmployeeProfile( itcb ) {
                getLabDataSortOrder( {
                    'user': args.user,
                    'employeeId': foundUser.specifiedBy,
                    'callback': onSortOrderLoaded
                } );
                function onSortOrderLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    sortOrder = result;
                    itcb( null );
               }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not get labdata sort order for user ' + username + ': ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                Y.log( 'Returning lbadata sort order: ', sortOrder );

                args.callback( null, sortOrder );
            }
        }

        /**
         *  Update the current location on the employee profile and identity
         *
         *  Note: users may not be permitted to change the identity and employee collections in general, so this update
         *  must be done through mongoose.
         *
         *  @param  args                            {Object}
         *  @param  args.user                       {Object}
         *  @param  args.originalParams             {Object}
         *  @param  args.originalParams.profileId   {String}
         *  @param  args.originalParams.locationId  {String}
         *  @param  args.callback                   {Function}
         */

        function setCurrentLocation( args ) {
            Y.log('Entering Y.doccirrus.api.employee.setCurrentLocation', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.setCurrentLocation');
            }
            var
                async = require( 'async' ),
                params = args.originalParams,
                profileId = params.profileId || null,
                locationId = params.locationId || null,
                putData = { 'currentLocation': locationId },
                employeeModel,
                identityModel;

            if ( !profileId || !locationId ) {
                return args.callback( Y.doccirrus.errors.rest( 500, 'Missing locationId or profileId' ) );
            }

            async.series( [ createEmployeeModel, updateEmployeeProfile, createIdentityModel, updateIdentity ], onAllDone );

            function createEmployeeModel( itcb ) {
                Y.doccirrus.mongodb.getModel( args.user, 'employee', onEmployeeModelCreated );
                function onEmployeeModelCreated( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    employeeModel = newModel;
                    itcb( null );
                }
            }

            function updateEmployeeProfile( itcb ) {
                employeeModel.mongoose.update( { _id: profileId }, putData, itcb );
            }

            function createIdentityModel( itcb ) {
                Y.doccirrus.mongodb.getModel( args.user, 'identity', onIdentityModelCreated );
                function onIdentityModelCreated( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    identityModel = newModel;
                    itcb( null );
                }
            }

            function updateIdentity( itcb ) {
                identityModel.mongoose.update( { _id: args.user.identityId }, putData, itcb );
            }

            function onAllDone( err ) {
                if ( err ) {
                    return args.callback( err );
                }
                return args.callback( null, { 'status': 'currentLocation changed to ' + locationId } );
            }

        }

        /**
         * @method JSONRPC
         *
         * This method checks whether the initials i.e. args.data.initials are already taken by any other
         * employee
         *
         * @param {Object} args
         *    @param {Object} args.user
         *    @param {function} [args.callback] - If present then response will be sent via callback
         *    @param {Object} args.data
         *        @param {string} args.data.initials - Initials to check whether taken
         *        @param {String} [args.data.employeeId] - If present then this is a update operation
         *                                                 and this method checks if the initial is already taken
         *                                                 by other users else it checks if this initial is taken by
         *                                                 any user
         * @returns {Promise<{available: boolean}>} - If available then returns {available: true} else {available: false}
         */
        async function checkIfInitialsAreAvailable( args ) {
            Y.log('Entering Y.doccirrus.api.employee.checkIfInitialsAreAvailable', 'info', NAME);

            const
                {user, data = {}, callback} = args,
                {initials, employeeId} = data;

            let
                err,
                employeesArr,
                queryObj;

            // -------------------------------- 1. Validations ---------------------------------------------------------
            if( !initials || typeof initials !== "string" ) {
                return handleResult( Y.doccirrus.errors.createError(`Missing/invalid 'initials' from the input`), undefined, callback );
            }

            if( employeeId && typeof employeeId !== "string" ) {
                return handleResult( Y.doccirrus.errors.createError(`Invalid 'employeeId' in the input. Expected string Id`), undefined, callback );
            }
            // ---------------------------------- 1. END ---------------------------------------------------------------


            // ------------------ 2. Check if initials are already taken or not ------------------------------------------
            queryObj = {initials};

            if( employeeId ) {
                queryObj._id = {$ne: employeeId};
            }

            [err, employeesArr] = await formatPromiseResult(
                                            Y.doccirrus.mongodb.runDb( {
                                                user: user,
                                                model: 'employee',
                                                action: 'get',
                                                query: queryObj
                                            } )
                                        );

            if( err ) {
                Y.log(`checkIfInitialsAreAvailable: Error while checking if initials: ${initials} are available. Error: ${err.stack || err}`, "error", NAME);
                return handleResult( Y.doccirrus.errors.rest('userMgmtMojit_05', {$initials: initials, $error: err.message || "no message"}, true), undefined, callback );
            }
            // ------------------------------------ 2. END ----------------------------------------------------------------

            Y.log('Exiting Y.doccirrus.api.employee.checkIfInitialsAreAvailable', 'info', NAME);

            if( Array.isArray(employeesArr) && employeesArr.length ) {
                return handleResult( null, {available: false}, callback );
            }

            return handleResult( null, {available: true}, callback );
        }

        /**
         *  Send an email to administrators to warn of malware detected by ClamAV
         *
         *  @param  {String} malwareWarning
         *  @return {Promise<void>}
         */

        async function sendMalwareEmail( user, malwareWarning, fileName ) {
            let
                employee, member, comm, emailAddress,
                adminEmails = [],
                emailSubject, emailText,
                malwareName, malwareBrowserLink,
                err, result;

            malwareName = malwareWarning.split( '\n' )[0];
            malwareName = malwareName.replace( ':', '' ).replace( 'FOUND', '' ).trim();

            const timer = logEnter( `Sending email about detected malware: ${malwareName}` );

            //  make a list of administrator emails

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    query: {},
                    options: {
                        fields: {
                            communications: 1,
                            memberOf: 1
                        }
                    }
                } )
            );

            if ( err ) {
                Y.log( `Could not send malware warning email to admins: ${err.stack||err}`, 'error', NAME );
                return;
            }

            for ( employee of result ) {
                for ( member of employee.memberOf ) {
                    if ( 'ADMIN' === member.group ) {
                        employee.isAdmin = true;
                    }
                }
                for ( comm of employee.communications ) {
                    if ( 'EMAILJOB' === comm.type && employee.isAdmin && -1 === adminEmails.indexOf( comm.value ) ) {
                        adminEmails.push( comm.value );
                    }
                }
            }

            //  compose the email

            emailSubject = i18n( 'InSuiteAdminMojit.malware_settings.EMAIL_SUBJECT' ) + malwareName;
            emailText = i18n( 'InSuiteAdminMojit.malware_settings.EMAIL_BODY' );

            malwareBrowserLink = Y.doccirrus.auth.getMyHost( user.tenantId, true ) + '/admin/insuite#/malware_browser';
            malwareBrowserLink = `<a href="${malwareBrowserLink}">${malwareBrowserLink}</a>`;

            emailText = emailText.replace( '%%malwarePage%%', malwareBrowserLink );
            emailText = emailText.replace( '%%fileName%%', fileName );
            emailText = emailText.replace( '%%userName%%', user.U );

            //  send to all admins

            Y.log( `Sending malware warning email to admins ${JSON.stringify(adminEmails)}`, 'info', NAME );

            for ( emailAddress of adminEmails ) {

                let
                    jadeParams = {
                        text: emailText
                    },
                    emailOptions = {
                        subject: emailSubject
                    },
                    myEmail;

                emailOptions = Y.mix( emailOptions, {
                    serviceName: 'prcService',
                    jadeParams: jadeParams,
                    jadePath: './mojits/UserMgmtMojit/views/passwordresetemail.jade.html',
                    to: emailAddress
                } );

                myEmail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );

                //  promisify seems to break this?
                Y.doccirrus.email.sendEmail( {...myEmail, user}, function( err ) {
                    Y.log( `Could not send malware warning email: ${err.stack||err}`, 'error', NAME );
                } );

            }

            logExit( timer );
        }

        /**
         *
         * @class employeeApi
         */
        Y.namespace( 'doccirrus.api' ).employee = {
            get: GET,
            post: POST,
            put: PUT,
            delete: DELETE,
            getLastPhysicianId: getLastPhysicianId,
            activateIdentity: activateIdentity,
            inactivateIdentity: inactivateIdentity,
            doResetUserPw: doResetUserPw,
            doResetEmployeePw: doResetEmployeePw,
            getEmployeeForUsername: getEmployeeForUsername,
            getIdentityForUsername: getIdentityForUsername,
            activateSupportAccount: activateSupportAccount,
            checkSupportAccount: checkSupportAccount,
            readEmployeesForAdminOverview: readEmployeesForAdminOverview,
            readEmployeeForAdminDetail: readEmployeeForAdminDetail,
            getRlvPhysicians: getRlvPhysicians,
            getLoggedInEmployee: getLoggedInEmployee,
            getEmployeeByName: getEmployeeByName,
            getMyEmployee: getMyEmployee,
            getPrimaryContact: getPrimaryContact,
            updateEmployee: updateEmployee,
            updateOnlyEmployee: function(args){
                Y.log('Entering Y.doccirrus.api.employee.updateOnlyEmployee', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.updateOnlyEmployee');
                }
                updateOnlyEmployee(args);
            },
            getASVTeamNumbers: function( args ) {
                Y.log('Entering Y.doccirrus.api.employee.getASVTeamNumbers', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.employee.getASVTeamNumbers');
                }
                getASVTeamNumbers( args );
            },
            updateLabdataSortOrder: updateLabdataSortOrder,
            getLabDataSortOrder: getLabDataSortOrder,
            getLabDataSortOrderForUsername: getLabDataSortOrderForUsername,
            setCurrentLocation: setCurrentLocation,
            checkIfInitialsAreAvailable,
            sendMalwareEmail
        };
    },
    '0.0.1', {requires: [
        'oop',
        'intl',
        'dcauth',
        'identity-schema',
        'supportrequest-schema',
        'kotableconfiguration-api',
        'settings-api']}
);
