/*jshint esnext:true */
/*global YUI */


YUI.add( 'supportrequest-api', function( Y, NAME ) {
        const
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            i18n = Y.doccirrus.i18n;
        /**
         * @module supportrequest-api
         */

        /**
         * default post method
         * @method post
         * @param {Object} args
         * @return {Function} callback
         */
        function post( args ) {
            let
                {user, data = {}, callback, options = {}} = args;

            data = Y.doccirrus.filters.cleanDbObject( data );

            if( 'MOCHA-TEST' === data.coname ) {
                //skip request creation, we just test DCPRC accessibility
                return callback( null, 'MOCHA-TEST' );
            }
            Y.doccirrus.mongodb.runDb( {
                action: 'post',
                model: 'supportrequest',
                user,
                data,
                options
            }, callback );
        }

        /**
         * default get method
         * @method get
         * @param {Object} args
         */
        function get( args ) {
            let
                {user, query = {}, callback, options = {}, migrate = false} = args;
            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'supportrequest',
                user,
                options,
                migrate,
                query
            }, callback );
        }

        async function acceptRequest( args ) {
            Y.log( 'Entering Y.doccirrus.api.supportrequest.acceptRequest', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.supportrequest.acceptRequest' );
            }
            let
                {user, query = {}, callback, options = {}, migrate = false} = args,
                data = {
                    receivingEmployeeName: user.U,
                    receivingEmployeeId: user.specifiedBy,
                    timeReceived: new Date(),
                    status: Y.doccirrus.schemas.supportrequest.statuses.ACCEPTED
                };

            if( !query || !query._id ) {
                return handleResult( Y.doccirrus.errors.rest( 400 ), undefined, callback );
            }

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'put',
                    model: 'supportrequest',
                    user,
                    data: Y.doccirrus.filters.cleanDbObject( data ),
                    fields: ['receivingEmployeeName', 'timeReceived', 'status', 'receivingEmployeeId'],
                    options,
                    migrate,
                    query
                } )
            );
            return handleResult( err, result, callback );
        }

        /**
         * This method triggered when user click on Accept button in supportrequests table on DCPRC
         * 1. finds supportrequest by old loginToken and replace it with new one
         * 2. sends email with new login link to the specific employee who accepted the supportrequest
         * @method createNew
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.data.oldLoginToken
         * @param {String} args.data.newLoginToken
         * @param {Function} args.callback
         */
        async function createNew( args ) {
            Y.log( 'Entering Y.doccirrus.api.supportrequest.createNew', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.supportrequest.createNew' );
            }
            let
                {user, data = {}, callback} = args,
                err, result, model, updatedRequest, receivedEmployee, employeeEmails = [], emailToSend,
                message = {text: ''},
                supportConf = Y.doccirrus.email.getServiceConf( 'dcInfoService_support' );

            if( !data || !data.oldLoginToken || !data.newLoginToken ) {
                return handleResult( Y.doccirrus.errors.rest( 400 ), undefined, callback );
            }

            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'supportrequest', false, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `createNewSupportLoginLink: Error getting 'supportrequest' collection model. Error: ${err.stack || err}`, "error", NAME );
                return handleResult( err, undefined, callback );
            }

            if( !result ) {
                Y.log( `createNewSupportLoginLink: Failed to fetch 'supportrequest' collection model`, "error", NAME );
                return handleResult( `Failed to fetch 'supportrequest' collection model`, undefined, callback );
            }

            model = result;

            [err, result] = await formatPromiseResult(
                model.mongoose.findOneAndUpdate( {loginToken: data.oldLoginToken}, {$set: {loginToken: data.newLoginToken}}, {new: true} )
            );

            if( err ) {
                Y.log( `createNewSupportLoginLink: Error while saving new loginToken in supportrequest collection. Error: ${err.stack || err}`, "error", NAME );
                return handleResult( err, undefined, callback );
            }

            if( !result ) {
                Y.log( `createNewSupportLoginLink: Failed to update support request in supportrequest collection.`, "error", NAME );
                return handleResult( `Failed to update support request in supportrequest collection.`, undefined, callback );
            }

            updatedRequest = result;

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'employee',
                    action: 'get',
                    query: {
                        _id: updatedRequest.receivingEmployeeId
                    }
                } )
            );

            if( err ) {
                Y.log( `createNewSupportLoginLink: Error while getting employee email. Error: ${err.stack || err}`, "error", NAME );
                return handleResult( err, undefined, callback );
            }

            if( !result || !result[0] ) {
                Y.log( `createNewSupportLoginLink: Failed to get employee email.`, "error", NAME );
                return handleResult( `createNewSupportLoginLink: Failed to get employee email.`, undefined, callback );
            }

            receivedEmployee = result[0];

            if( receivedEmployee.communications && receivedEmployee.communications.length ) {
                employeeEmails = receivedEmployee.communications.filter( item => {
                    return 'EMAILPRIV' === item.type || 'EMAILJOB' === item.type;
                } );

                if( employeeEmails.length ) {
                    let preferedEmail = employeeEmails.find( item => {
                        return item.preferred;
                    } );
                    emailToSend = ( preferedEmail && preferedEmail.value ) || employeeEmails[0].value;
                }
            }

            message.from = supportConf.from;
            message.to = emailToSend || supportConf.to;
            message.noBcc = true;
            message.subject = i18n( 'SupportMojit.supportrequest-api.newLoginTokenEmail.TITLE' );
            message.text = Y.Lang.sub( i18n( 'SupportMojit.supportrequest-api.newLoginTokenEmail.MAIL_TEXT' ), {
                coname: updatedRequest.coname,
                receivingEmployeeName: updatedRequest.receivingEmployeeName,
                loginLink: `${updatedRequest.loginLink}&loginToken=${encodeURIComponent( updatedRequest.loginToken )}`
            } );

            message = Y.doccirrus.email.createHtmlEmailMessage( message );

            [err] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.email.sendEmail( {...message, user}, ( err ) => {
                        if( err ) {
                            Y.log( `activateSupportAccount. could not send email. ${err.stack || err}`, 'error', NAME );
                            return reject( err );
                        }
                        resolve();
                    } );
                } )
            );

            return handleResult( err, undefined, callback );
        }

        /**
         * @class supportrequest
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).supportrequest = {
            /**
             * @property name
             * @type {String}
             * @default supportrequest-api
             * @protected
             */
            name: NAME,
            getRequestsForTable: get,
            get( args ){
                Y.log('Entering Y.doccirrus.api.supportrequest.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.supportrequest.get');
                }
                args.callback( Y.doccirrus.errors.rest( 405 ) );
            },
            delete( args ){
                Y.log('Entering Y.doccirrus.api.supportrequest.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.supportrequest.delete');
                }
                args.callback( Y.doccirrus.errors.rest( 405 ) );
            },
            put( args ){
                Y.log('Entering Y.doccirrus.api.supportrequest.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.supportrequest.put');
                }
                args.callback( Y.doccirrus.errors.rest( 405 ) );
            },
            saveRequest: post,
            acceptRequest,
            createNew: createNew
        };

    },
    '0.0.1', {
        requires: [
            'dccommunication',
            'supportrequest-schema',
            'dcauth'
        ]
    }
);
