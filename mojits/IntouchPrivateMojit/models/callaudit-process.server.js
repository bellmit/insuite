/**
 * User: ma
 * Date: 13/03/2015  21:52
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'callaudit-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function updateDuration( user, callaudit, callback ) {
            var
                currentData = callaudit.originalData_ || {}, // the data in DB
                newDuration;
            if( Y.doccirrus.auth.isPUC() ) {
                if( callaudit.leftAt && callaudit.joinedAt ) {
                    newDuration = (callaudit.leftAt - callaudit.joinedAt);
                    callaudit.duration = newDuration;
                }
                callback( null, callaudit );
                return;
            }

            callaudit.joinedAt = currentData.joinedAt || callaudit.lastJoin || callaudit.joinedAt; // do not overwrite if already has a value
            if( callaudit.isModified( 'duration' ) ) { // allow manual update for duration
                callback( null, callaudit );
                return;
            }

            if( !callaudit.isModified( 'leftAt' ) || callaudit.isNew ) {
                if( callaudit.isModified( 'lastJoin' ) && currentData.leftAt ) { // if he is rejoining then erase the previous leave time
                    Y.log( 'erasing previous leave time: ' + currentData.leftAt, 'debug', NAME );
                    callaudit.leftAt = undefined;
                }
                callback( null, callaudit );
                return;
            }

            if( callaudit.leftAt && currentData.lastJoin ) {
                newDuration = (callaudit.leftAt - currentData.lastJoin);
                Y.log( 'adding ' + newDuration + ' to the current duration: ' + currentData.duration, 'info', NAME );
                callaudit.duration = (currentData.duration || 0) + newDuration; // add to the current duration
            }
            callback( null, callaudit );
        }

        /**
         * depending of the changes to callaudit detect the event and create the relevant audit
         * @param {Object}      user
         * @param {Object}      callaudit
         * @param {Function}    callback
         */
        function updateAuditLog( user, callaudit, callback ) {
            let
                context = this,
                originalData = callaudit.originalData_ || {},
                entry = Y.doccirrus.api.audit.getBasicEntry( user, 'post', 'callaudit', '' ),
                from = callaudit.caller[0].firstname + ' ' + callaudit.caller[0].lastname,
                to,
                i18n = Y.doccirrus.i18n,
                calleeNames = callaudit.callee.reduce( function( str, item ) {
                    if( !item.firstname && !item.lastname ) {
                        return str;
                    }
                    return (str ? str + ', ' : str) + (item.firstname || '') + ' ' + (item.lastname || '');
                }, '' ),
                theCallee = Y.Array.find( callaudit.callee, function( item ) {
                    return item.identityId === callaudit.identityId && item.host === Y.doccirrus.auth.getMyHost( user.tenantId );
                } ),
                isCaller = callaudit.caller[0].identityId === callaudit.identityId;

            if( theCallee ) { // the audit belongs to callee
                to = theCallee.firstname + ' ' + theCallee.lastname;
                if( user.id === 'su' ) {
                    entry.user = to; // rename to the actual user full name
                }
                if( callaudit.picked !== originalData.picked ) { // callee picked the call
                    entry.action = 'start';
                    entry.descr = i18n( 'InSuiteAdminMojit.showAuditDiffDialog.text.JOINED_THE_CALL_WITH' ) + from;

                } else if( callaudit.leftAt !== originalData.leftAt ) { // callee hanged up
                    entry.action = 'finish';
                    entry.descr = i18n( 'InSuiteAdminMojit.showAuditDiffDialog.text.LEFT_THE_CALL_WITH' ) + from;

                } else if( callaudit.cancelled !== originalData.cancelled ) { // caller cancelled the call
                    entry.action = 'finish';
                    entry.descr = i18n( 'InSuiteAdminMojit.showAuditDiffDialog.text.CALL_CANCELLED_BY' ) + from;

                } else if( theCallee.rejected ) { // callee rejected
                    entry.action = 'finish';
                    entry.descr = i18n( 'InSuiteAdminMojit.showAuditDiffDialog.text.REJECTED_THE_CALL_FROM' ) + from;

                } else { // callee just received a call
                    entry.action = 'post';
                    entry.descr = i18n( 'InSuiteAdminMojit.showAuditDiffDialog.text.RECEIVED_THE_CALL_FROM' ) + from + ' (' + callaudit.caller[0].host + ')';
                }

            } else if( isCaller ) { // the audit belongs to caller
                if( user.id === 'su' ) {
                    entry.user = from; // rename to the actual user full name
                }
                if( callaudit.picked !== originalData.picked ) { // caller picked the call
                    entry.action = 'start';
                    entry.descr = i18n( 'InSuiteAdminMojit.showAuditDiffDialog.text.JOINED_THE_CALL_WITH' ) + calleeNames;

                } else if( callaudit.callee.some( function( item ) { // all callee rejected
                        return item.picked;
                    } ) ) {
                    entry.action = 'start';
                    entry.descr = i18n( 'InSuiteAdminMojit.showAuditDiffDialog.text.JOINED_THE_CALL_WITH' ) + calleeNames;

                } else if( callaudit.leftAt !== originalData.leftAt ) { // caller hanged up the call
                    entry.action = 'finish';
                    entry.descr = i18n( 'InSuiteAdminMojit.showAuditDiffDialog.text.LEFT_THE_CALL_WITH' ) + calleeNames;

                } else if( callaudit.cancelled !== originalData.cancelled ) { // caller cancelled the call
                    entry.action = 'finish';
                    entry.descr = i18n( 'InSuiteAdminMojit.showAuditDiffDialog.text.CANCELLED_THE_CALL_TO' ) + calleeNames;

                } else if( callaudit.callee.every( function( item ) { // all callee rejected
                    return item.rejected;
                } ) ) {
                    entry.action = 'finish';
                    entry.descr += i18n( 'InSuiteAdminMojit.showAuditDiffDialog.text.CALL_REJECTED_BY' ) + calleeNames;

                } else if( user.identityId === callaudit.identityId ) { // caller just made a call
                    entry.action = 'post';
                    entry.descr += i18n( 'InSuiteAdminMojit.showAuditDiffDialog.text.CALLING' ) + calleeNames;

                } else if( context && callaudit.callee.length !== context.dbData.callee.length ) {
                    entry.action = 'post';
                    entry.descr += i18n( 'InSuiteAdminMojit.showAuditDiffDialog.text.CALLEE_LIST_CHANGED', { data: { list: context.rawData.callee.filter( item => item.firstname && item.lastname ).map( item => `${item.firstname} ${item.lastname}` ).join( ', ' ) } } );
                } else {
                    callback( 'wrong callaudit fields' );
                    return;
                }

            } else { // PUC audit entry
                callback( null, callaudit );
                return;
            }

            if( !entry.descr ) {
                callback( null, callaudit );
                return;
            }

            entry.skipcheck_ = true;
            Y.doccirrus.api.audit.post( {
                user: user,
                data: entry,
                callback: callback
            } );
        }

        /**
         * @class activitysettingsProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            name: NAME,
            pre: [
                {run: [
                    updateDuration
                ], forAction: 'write'}
            ],
            post: [
                {run: [
                    updateAuditLog
                ], forAction: 'write'}
            ]
        };

    },
    '0.0.1', {requires: ['dcauth', 'person-schema']}
);
