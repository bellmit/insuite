/*global YUI*/
YUI.add( 'patientemails-api', function( Y, NAME ) {
        

        const {formatPromiseResult, handleResult} = require( 'dc-core' ).utils;

        /**
         * Get saved emails by id
         * @param {Object} args
         * @returns {Promise.<void>}
         */
        async function getSavedEmails( args ) {
            Y.log( 'Entering Y.doccirrus.api.patientemails.getSavedEmails', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.patientemails.getSavedEmails' );
            }
            const {user, callback, data: {ids = []}} = args;

            if( !ids || !Array.isArray( ids ) ) {
                return handleResult( new Error( "id is required" ), {}, callback );
            }
            let attachments;
            let [err, emails] = await  formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'patientemail',
                query: {_id: {$in: ids}}
            } ) );

            if( err ) {
                Y.log( `getSavedEmails: failed to get patient email by id ${ids.join( "," )}, err: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            emails = emails.result ? emails.result : emails;
            for( let email of emails ) {
                if( email.attachmentIds.length ) {
                    [err, attachments] = await  formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'media',
                        query: {_id: {$in: email.attachmentIds}}
                    } ) );

                    if( err ) {
                        Y.log( `getSavedEmails: failed to get attachments by id ${email.attachmentIds.join( ',' )}, err: ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, null, callback );
                    }

                    attachments = attachments.result || attachments;
                }
                email.attachments = attachments || [];
            }

            return handleResult( null, emails, callback );

        }

        Y.namespace( 'doccirrus.api' ).patientemails = {
            getSavedEmails
        };
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dccommunication',
            'patientemail-schema'
        ]
    }
);
