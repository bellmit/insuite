/**
 * User: mahmoud
 * Date: 06/05/15  14:56
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

/**
 * transfer of patient data
 */
YUI.add( 'audit-api', function( Y, NAME ) {
        const
            i18n = Y.doccirrus.i18n,
            {formatPromiseResult} = require( 'dc-core' ).utils,
            YDC = Y.doccirrus,
            ObjectId = require('mongoose').Types.ObjectId,
            {logEnter, logExit} = require( '../server/utils/logWrapping' )( Y, NAME );

        function getBasicEntry( user, action, model, descr ) {
            return {
                user: user.U,
                userId: user.identityId,
                timestamp: Date.now(),
                action: action,
                model: model,
                descr: descr,
                ip: user.ip,
                sessionId: user.sessionId
            };
        }

        /**
         * Simple interface to quickly create any audit log.
         *
         * Does never fail, only logs warnings.
         *
         * @param {module:authSchema.auth} user - preferably the user ojbect that triggered the action
         * @param {Y.doccirrus.schemas.audit.types.Action_E} auditAction - must be from audit-schema.Action_E
         * @param {Y.doccirrus.schemas.audit.types.ModelMeta_E} auditModel - must be from audit-schema.ModelMeta_E
         * @param {String} auditText - additional description text
         * @returns {Promise<void>}
         */
        async function postBasicEntry( user, auditAction, auditModel, auditText ) {
            const timer = logEnter( 'Y.doccirrus.api.audit.postBasicEntry' );
            var err, result;
            let auditRecord = Y.doccirrus.api.audit.getBasicEntry( user, auditAction, auditModel, auditText );
            auditRecord.skipcheck_ = true;
            let auditRequest = {
                'user': user,
                'data': auditRecord
            };

            [err, result] = await formatPromiseResult( Y.doccirrus.api.audit.post( auditRequest ) );

            if( err ) {
                Y.log( `postBasicEntry: Failure to log audit: ${err} ${err.stack}`, 'warn', NAME );
            }
            if( !result ) {
                Y.log( `postBasicEntry: No result in logging audit`, 'info', NAME );
            }
            logExit( timer );
        }

        /**
         *
         * @param {Object} args
         * @param {String} args.action
         * @param {String} args.description
         * @param {String} args.model
         * @param {module:authSchema.auth} args.user
         * @param {String} objId
         * @return {Promise<module:auditSchema.audit>}
         */
        async function postEntryWithValidation( args ) {
            const
                timer = logEnter( 'Y.doccirrus.api.audit.postEntryWithValidation' ),
                {
                    action,
                    description,
                    model,
                    user,
                    objId
                } = args;

            if( !action ) {
                logExit( timer );
                throw new Y.doccirrus.common.DCError( 500, {message: 'insufficient arguments: missing action'} );
            }

            if( !user ) {
                logExit( timer );
                throw new Y.doccirrus.common.DCError( 500, {message: 'insufficient arguments: missing user'} );
            }

            if( !description ) {
                logExit( timer );
                throw new Y.doccirrus.common.DCError( 500, {message: 'insufficient arguments: missing description'} );
            }

            if( !model ) {
                logExit( timer );
                throw new Y.doccirrus.common.DCError( 500, {message: 'insufficient arguments: missing model'} );
            }

            //Basic Validation
            if( !Y.doccirrus.schemas.audit.isValidAction( action ) ) {
                logExit( timer );
                throw new Y.doccirrus.common.DCError( 500, {message: `${action} is not a valid action`} );
            }
            if( !Y.doccirrus.schemas.audit.isValidModel( model ) ) {
                logExit( timer );
                throw new Y.doccirrus.common.DCError( 500, {message: `${model} is not a valid model`} );
            }

            const auditRecord = Y.doccirrus.api.audit.getBasicEntry( user, action, model, description );
            auditRecord.objId = objId;

            const [err, result] = await formatPromiseResult(
                Y.doccirrus.api.audit.post( {
                    user: user,
                    data: Y.doccirrus.filters.cleanDbObject( auditRecord )
                } )
            );

            if( err ) {
                Y.log( `postBasicEntry: Failure to log audit: ${err} ${err.stack}`, 'warn', NAME );
                logExit( timer );
                throw err;
            }
            if( !result ) {
                Y.log( `postBasicEntry: No result in logging audit`, 'info', NAME );
                logExit( timer );
                throw '';
            }

            logExit( timer );
            return result;
        }

        function post( args ) {
            Y.log('Entering Y.doccirrus.api.audit.post', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.audit.post');
            }
            return YDC.mongodb.runDb( {
                user: args.user,
                model: 'audit',
                action: 'post',
                data: args.data,
                callback: args.callback
            } );
        }

        /**
         * create an entry for activity transfer to certain partners
         * @param {module:authSchema.auth} user
         * @param {Object} patientData including transferred activities
         * @param {Array} partners target of transfer
         * @param {Function} callback
         */
        function auditPatientTransfer( user, patientData, partners, callback ) {
            let
                auditEntry, descr,
                moment = require( 'moment' );

            descr = 'Partner: ';
            Y.Array.each( partners, function( p, i ) {
                if( i + 1 === partners.length ) {
                    descr += p.name;
                } else {
                    descr += p.name + ', ';
                }
            } );

            descr += ' URL: ';
            Y.Array.each( partners, function( p, i ) {
                if( i + 1 === partners.length ) {
                    descr += p.host;
                } else {
                    descr += p.host + ', ';
                }
            } );

            descr += ', Patient: ' + patientData.firstname + ' ' + patientData.lastname;

            auditEntry = getBasicEntry( user, 'transfer', 'activity', descr );
            auditEntry.relatedActivities = [];
            Y.Array.each( patientData.activities, function( act ) {
                auditEntry.relatedActivities.push( {
                    id: act._id,
                    text: moment( act.timestamp ).format( 'DD.MM.YYYY' ) + ', ' + Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', act.actType, '-de', 'k.A.' )
                } );
            } );

            auditEntry.skipcheck_ = true;
            YDC.mongodb.runDb( {
                user: user,
                model: 'audit',
                action: 'post',
                data: auditEntry,
                callback: function( err ) {
                    callback( err );
                }
            } );
        }

        /**
         * create an entry when support account is activated
         * @param {module:authSchema.auth} user
         * @param {Object} data
         * @param {Function} callback
         */
        function auditSupportAccount( user, data, callback ) {
            let
                auditEntry, text = '';

            text += 'Support freischalten: ' + data.firstname + ' ' + data.lastname;
            text += ', E-Mail: ' + data.email;
            text += ', Kommentar: ' + data.comment;
            text += ', Aktennummer: ' + data.caseNo;
            text += ', Gültig bis: ' + data.activeUntil;

            auditEntry = getBasicEntry( user, 'post', 'employee', text );
            auditEntry.skipcheck_ = true;
            YDC.mongodb.runDb( {
                user: user,
                model: 'audit',
                action: 'post',
                data: auditEntry,
                callback: function( err ) {
                    callback( err );
                }
            } );
        }

        /**
         * create an entry when connection to dcprc or puc is lost
         * @param {module:authSchema.auth} user
         * @param {Object} data
         * @param {Function} callback
         */
        function auditConnection( user, data, callback ) {
            let
                auditEntry, text = '';

            text += data.status;

            auditEntry = getBasicEntry( user, 'check', data.model, text );
            auditEntry.skipcheck_ = true;
            YDC.mongodb.runDb( {
                user: user,
                model: 'audit',
                action: 'post',
                data: auditEntry,
                callback: function( err ) {
                    callback( err );
                }
            } );
        }

        /**
         * note actions related to backup and devices and other cli-api operations
         * @param {module:authSchema.auth} user
         * @param {Object} params
         * @param {Function} [callback]
         */
        function auditCli( user, params, callback ) {
            let
                auditEntry, text = params.text || '';

            callback = callback || function( err ) {
                    if( err ) {
                        Y.log( 'error in auditBackup: ' + JSON.stringify( err ), 'error', NAME );
                    }
                };

            if( params.deviceId ) {
                text += 'Device ID: ' + params.deviceId + '\n';
            }

            if( params.command ) {
                text += 'Command: ' + params.command + '\n';
            }

            if( params.error ) {
                text += 'Fehler: ' + params.error + '\n';
            }

            auditEntry = getBasicEntry( user, params.action, params.what, text );
            auditEntry.skipcheck_ = true;
            YDC.mongodb.runDb( {
                user: user,
                model: 'audit',
                action: 'post',
                data: auditEntry,
                callback: function( err ) {
                    callback( err );
                }
            } );
        }

        function auditFailedLogin( user, callback ) {
            let
                auditEntry, text;

            callback = callback || function( err ) {
                    if( err ) {
                        Y.log( 'error in auditFailedLogin: ' + JSON.stringify( err ), 'error', NAME );
                    }
                };

            text = 'Login nicht erfolgreich';
            auditEntry = getBasicEntry( user, 'get', 'auth', text );
            auditEntry.skipcheck_ = true;
            YDC.mongodb.runDb( {
                user: user,
                model: 'audit',
                action: 'post',
                data: auditEntry,
                callback: function( err ) {
                    callback( err );
                }
            } );
        }

        function isDiffValueExist( value ) {
            return value !== '' &&
                   typeof value !== 'undefined' &&
                   value !== null &&
                   Object.keys( value ).length !== 0 && !Array.isArray( value ) ||
                   (Array.isArray( value ) && value.length !== 0);
        }

        function processOldNew( diff, path, diffText ) {
            diff.oldValue = -1 < ['true', 'false'].indexOf( diff.oldValue ) ? JSON.parse( diff.oldValue ) : diff.oldValue;
            diff.newValue = -1 < ['true', 'false'].indexOf( diff.newValue ) ? JSON.parse( diff.newValue ) : diff.newValue;

            if( diff.oldValue === null ) {
                diff.oldValue = '';
            }

            if( diff.newValue && diff.oldValue ) {
                diffText.push( { type: 'changed', path: path, diff: diff } );

            } else if( true === diff.newValue && !diff.oldValue ) { // the boolean was set to true
                diffText.push( { type: 'activated', path: path, diff: diff } );

            } else if( true === diff.oldValue && !diff.newValue ) { // the boolean was reset to false
                diffText.push( { type: 'deactivated', path: path, diff: diff } );

            } else if( diff.newValue ) { // an entry was added
                diffText.push( { type: 'added', path: path, diff: diff } );

            } else if( diff.oldValue ) { // an entry was removed
                diffText.push( { type: 'removed', path: path, diff: diff } );
            } // else, a trivial change
        }

        function processSubObject( obj, isNew, path, schema, diffText ) {
            if( obj && schema ) {
                Object.keys( obj ).forEach( key => {
                    if( !schema[key] || ( schema[key] && (!schema[key].i18n || schema[key].i18n === key) ) ) { // if no translation, then a internal schema field (skip array index)
                        return;
                    }
                    let _path = path + '.' + schema[key].i18n,
                        value = obj[key],
                        diff = {
                            oldValue: ((!isNew) ? value : undefined),
                            newValue: ((isNew) ? value : undefined)
                        };
                    processOldNew( diff, _path, diffText );
                } );
            }
        }

        // generate user readable text for diff column
        // recursively traverses the diff tree, and also the schema to get the translations
        function renderDiffToText( diff, path, schema ) {
            let
                diffText = [];

            if( diff.hasOwnProperty( 'newValue' ) || diff.hasOwnProperty( 'oldValue' )

            ) { // if already a diff element

                if( isDiffValueExist( diff.oldValue ) || isDiffValueExist( diff.newValue ) ) {

                    if( typeof diff.oldValue === 'object' && diff.oldValue !== null && Object.keys(diff.oldValue).length ) {
                        processSubObject( diff.oldValue, false, path, schema, diffText );
                    } else if( typeof diff.newValue === 'object' && diff.newValue !== null && Object.keys(diff.newValue).length ) {
                        processSubObject( diff.newValue, true, path, schema, diffText );
                    } else {
                        processOldNew( diff, path, diffText );
                    }

                }

            } else if( 'object' === typeof diff ) { // whether a diff sub-tree or an array of them
                // for each schema field or each array element...
                Y.Object.each( diff, function( value, key ) {
                    let
                        subDiffText,
                        subSchema, subPath;
                    if( schema[key] && (!schema[key].i18n || schema[key].i18n === key) ) { // if no translation, then a internal schema field (skip array index)
                        return;
                    }
                    subSchema = schema[key] || schema; // go to sub-schema, only if the key is a schema field (i.e not array index)
                    key = subSchema && subSchema.i18n || key;
                    subSchema = subSchema[0] || subSchema; // unwrap sub-schema
                    subPath = path ? path + '.' + key : key;
                    subDiffText = renderDiffToText( value, subPath, subSchema );
                    diffText.push.apply( diffText, subDiffText );
                } );
            }

            return diffText;
        }

        function renderDiffToTextClient( args ) {
            Y.log('Entering Y.doccirrus.api.audit.renderDiffToTextClient', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.audit.renderDiffToTextClient');
            }
            const { originalParams: {diff, path, schema}, callback } = args;
            callback( null, renderDiffToText(diff, path, schema));
        }

        function getForAuditBrowser( args ) {
            Y.log('Entering Y.doccirrus.api.audit.getForAuditBrowser', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.audit.getForAuditBrowser');
            }
            const
                callback = args.callback;
            var
                user = args.user;

            function myCb( err, data ) {
                if( err ) {
                    Y.log(`getForAuditBrowser: Error while querying audit collection. Error: ${err.stack || err}`, "error", NAME);
                    return callback( err );
                }

                let
                    result;

                if( !data ) {
                    // Should not happen
                    return callback( new Error( `Failed to get response from DB.`) );
                } else if( Array.isArray(data.result) ) {
                    result = data.result;
                } else if( Array.isArray(data) ) {
                    result = data;
                } else {
                    // We dont expect this.
                    result = [];
                }

                result = result.map( function( entry ) {
                    if( entry.diff ) {
                        entry.diff = renderDiffToText( entry.diff, '', Y.doccirrus.schemas[entry.model] && Y.doccirrus.schemas[entry.model].schema || {} );
                        if( !entry.diff.length && 'put' === entry.action ) {
                            entry.diff = 'intern'; // internal/system changes
                        }
                    }
                    return entry.toObject ? entry.toObject() : entry;
                } );

                if( data.result ) {
                    data.result = result;
                }
                callback( err, data );
            }

            args.callback = myCb;
            if( args.originalParams.connectivityLog ) {
                user = Y.doccirrus.auth.getSUForLocal();
            }

            return Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'audit',
                user: user,
                query: args.query,
                options: args.options
            }, args.callback );
        }

        function getEntry( args ) {
            Y.log('Entering Y.doccirrus.api.audit.getEntry', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.audit.getEntry');
            }

            const
                {query, options, callback} = args;
            var user = args.user;

            if( args && args.query && args.query.serverTest ) {
                user = Y.doccirrus.auth.getSUForLocal();
                delete args.query.serverTest;
            }

            if( query && query.release ) {
                if( query._id ) {
                    let lte = query._id.$lte,
                        gte = query._id.$gte;

                    query._id = {
                        $gte: ObjectId( Math.floor( ( new Date( gte ) ) / 1000 ).toString( 16 ) + "0000000000000000" ),
                        $lte: ObjectId( Math.floor( ( new Date( lte ) ) / 1000 ).toString( 16 ) + "0000000000000000" )
                    };
                }
                delete query.release;
            }

            return Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'audit',
                user: user,
                query,
                options
            }, callback );
        }

        /**
         * Rest end point for sols to record actions in audit log
         * @param {Object} args
         * @param {module:authSchema.auth} args.user - user object that triggered the action( sol name)
         * @param {Object} args.data - must contain 'action' from audit-schema.Action_E, 'model' from audit-schema.ModelMeta_E, 'descr': additional description text
         * @param {Function} args.callback
         * @returns {Promise<void>}
         */
        async function postSolEntry( args ) {

            let
                err,
                result,
                {user = Y.doccirrus.auth.getSUForLocal(), data = {}, callback} = args,
                basicEntry = Y.doccirrus.api.audit.getBasicEntry( user );

            [err, result] = await formatPromiseResult( Y.doccirrus.api.audit.post( { user, data: {...basicEntry, ...data, 'skipcheck_': true} } ) );

            if( err ) {
                Y.log( `postSolEntry: Error while posting operation in audit collection. Error: ${err.stack || err}`, "warn", NAME );
                return;
            }

            Y.log( `Recorded ${user.U} actions in audit log: ${result[0]}`, 'debug', NAME );

            callback();
        }

        async function postKimSignEntry( user, modelName, objId, error ) {
            let err, result, auditText;

            if( error ) {
                const message = error.message || Y.doccirrus.errorTable.getMessage( error ) || '-';
                auditText = i18n( 'audit-api.text.KIM_SIGNING_ERROR', {data: {error: message}} );
            } else {
                auditText = i18n( 'audit-api.text.KIM_SIGNING_SUCCESS' );
            }

            let auditRecord = Y.doccirrus.api.audit.getBasicEntry( user, 'sign', modelName, auditText );
            auditRecord.objId = objId;
            auditRecord.skipcheck_ = true;
            let auditRequest = {
                'user': user,
                'data': auditRecord
            };

            [err, result] = await formatPromiseResult( Y.doccirrus.api.audit.post( auditRequest ) );

            if( err ) {
                Y.log( `postKimSignEntry: Failure to log audit: ${err} ${err.stack}`, 'warn', NAME );
            }
            if( !result ) {
                Y.log( `postKimSignEntry: No result in logging audit`, 'info', NAME );
            }
        }

        /**
         * Makes the audit log for receiving and sending message with KIM.
         * @param user: inSuite user.
         * @param modelName: Model name for logged identity.
         * @param objId: Mongo id of logged identity.
         * @param option: defines if message is sent or received.
         * @param error: KIM error.
         * @returns {Promise<void>}
         */
        async function postKIMMessageUpdate( user, modelName, objId, option, error ) {
            let
                auditText,
                action,
                result,
                err;

            if( option === 'SMTP' ) {
                action = 'sent';
                if( error ) {
                    const message = error.message || Y.doccirrus.errorTable.getMessage( error ) || '-';
                    auditText = i18n( 'audit-api.text.kimSendEmailError', {data: {error: message}} );
                } else {
                    auditText = i18n( 'audit-api.text.kimSendEmailSuccess' );
                }
            } else if( option === 'POP3' ) {
                action = 'received';
                if( error ) {
                    const message = error.message || Y.doccirrus.errorTable.getMessage( error ) || '-';
                    auditText = i18n( 'audit-api.text.kimReceiveEmailError', {data: {error: message}} );
                } else {
                    auditText = i18n( 'audit-api.text.kimReceiveEmailSuccess' );
                }
            }

            let auditRecord = Y.doccirrus.api.audit.getBasicEntry( user, action, modelName, auditText );
            auditRecord.objId = objId;
            auditRecord.skipcheck_ = true;
            let auditRequest = {
                'user': user,
                'data': auditRecord
            };

            [err, result] = await formatPromiseResult( Y.doccirrus.api.audit.post( auditRequest ) );

            if( err ) {
                Y.log( `#postKIMMessageUpdate(): Failure to log audit: ${err} ${err.stack}`, 'warn', NAME );
            }
            if( !result ) {
                Y.log( `#postKIMMessageUpdate(): No result in logging audit`, 'info', NAME );
            }
        }

        /**
         * expose API
         * @type {{get: function(*=): (*|void|Promise), getForAuditBrowser: function(*): (*|void|Promise), post: function(*): (*|void|Promise), auditPatientTransfer: auditPatientTransfer, auditSupportAccount: auditSupportAccount, auditConnection: auditConnection, auditCli: auditCli, auditFailedLogin: auditFailedLogin, postBasicEntry: postBasicEntry, getBasicEntry: function(*, *=, *=, *=): {user: string, userId: string, timestamp: *, action: *, model: *, descr: *, ip: *, sessionId: *}, postSolEntry: postSolEntry, renderDiffToTextClient: renderDiffToTextClient, sendMalwareEmail: *}}
         */

        Y.namespace( 'doccirrus.api' ).audit = {
            get: getEntry,
            getForAuditBrowser: getForAuditBrowser,
            post: post,
            auditPatientTransfer: auditPatientTransfer,
            auditSupportAccount: auditSupportAccount,
            auditConnection: auditConnection,
            auditCli: auditCli,
            auditFailedLogin: auditFailedLogin,
            postBasicEntry,
            getBasicEntry: getBasicEntry,
            postSolEntry,
            renderDiffToTextClient,
            postEntryWithValidation,
            postKimSignEntry,
            postKIMMessageUpdate
        };
    },
    '0.0.1', { requires: [] }
);


