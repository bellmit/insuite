/**
 * User: do
 * Date: 24/11/15  11:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'dcrulelogutils', function( Y, NAME ) {

        window.showRuleLog = function( patientId, caseFolderId, messageId ) {
            Y.doccirrus.DCSystemMessages.removeMessage( messageId );
            Y.doccirrus.modals.invoiceErrorLogCaseFolderModal.show( patientId, caseFolderId );
        };

        window.createActivities = function( actMessageId , entryStr ){
            if( !entryStr ) {
                return;
            }
            var entry = entryStr.replace( /\\/g, '\\\\' ).replace( /\|\|/g, '\"' ).replace( /(?:\r\n|\r|\n)/g, '|n|' );
            try {
                entry = JSON.parse( entry );
                entry.createAllActivities = true;
            } catch( ex ) {
                return;
            }
            Y.doccirrus.jsonrpc.api.rule.createRuleActivities( entry ).done( function() {
                return Y.doccirrus.DCSystemMessages.removeMessage( actMessageId );
            } );
        };

        window.removeEntry = function( actMessageId , entryStr ) {
            if( !entryStr ) {
                return;
            }
            var entry = entryStr.replace( /\|\|/g, '\"' ).replace( /(?:\r\n|\r|\n)/g, '|n|' );
            try {
                entry = JSON.parse( entry );
            } catch( ex ) {
                return;
            }
            Y.doccirrus.jsonrpc.api.rulelog.removeEntriesAndUpdateCaseFolderStats( entry ).done( function() {
                Y.doccirrus.DCSystemMessages.removeMessage( actMessageId );
            } );
        };

        function wrapLink( msg, pId, cId, mId ) {
            var link = '<a href="incase#/patient/' + pId + '/tab/casefile_browser", onclick="showRuleLog(\'' + pId + '\', \'' + cId + '\', \'' + mId + '\')">' + msg + '</a>';
            return link;
        }

        Y.namespace( 'doccirrus' ).rulelogutils = {

            name: NAME,

            showSystemMessage: function( data ) {
                var ruleId = data.ruleId ? data.ruleId : data.entries && data.entries[0] && data.entries[0].ruleId,
                    messageId = 'rulelogupdate-' + data.patientId + '-' + data.caseFolderId + '-' + ruleId,
                    errMessageId = messageId + 'error',
                    warnMessageId = messageId + 'warning',
                    actMessageId = messageId + 'activity',
                    errorMsgs = [],
                    warningMsgs = [],
                    activityMsgs = [],
                    breaks = '<br>';

                if (data.removeOnly) {
                    Y.doccirrus.DCSystemMessages.removeMessage( errMessageId );
                    Y.doccirrus.DCSystemMessages.removeMessage( warnMessageId );
                    Y.doccirrus.DCSystemMessages.removeMessage( actMessageId );
                    return;
                }

                data.entries.forEach( function( entry ) {
                    var entryStr, msg;
                    if( 'ERROR' === entry.ruleLogType ) {
                        msg = wrapLink( entry.message, entry.patientId, entry.caseFolderId, errMessageId );
                        if( !errorMsgs.includes(msg) ){
                            errorMsgs.push( msg );
                        }
                    } else if( 'WARNING' === entry.ruleLogType ) {
                        msg = wrapLink( entry.message, entry.patientId, entry.caseFolderId, warnMessageId );
                        if( !warningMsgs.includes(msg) ) {
                            warningMsgs.push( msg );
                        }
                    } else if( 'ACTIVITY' === entry.ruleLogType ) {
                        if( entry.activitiesToCreate && entry.activitiesToCreate.length ){
                            entryStr = JSON.stringify(entry);
                            activityMsgs.push( entry.message );
                            entryStr = entryStr.replace(/\"/g, '\|\|');
                            msg = '<div class="text-right"><button class="btn btn-primary glyphicon glyphicon-ok" onclick="createActivities(\'' + actMessageId + '\', \'' + entryStr + '\')"></button>&nbsp;' +
                                  '<button class="btn btn-default glyphicon glyphicon-remove" onclick="removeEntry(\'' + actMessageId + '\', \'' + entryStr + '\')"></button></div>';
                            if( !activityMsgs.includes(msg) ) {
                                activityMsgs.push( msg );
                            }
                        }
                    }
                } );


                if( errorMsgs.length ) {
                    Y.doccirrus.DCSystemMessages.removeMessage( errMessageId );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: errMessageId,
                        content: errorMsgs.join( breaks ),
                        level: 'ERROR'
                    } );
                }

                if( warningMsgs.length ) {
                    Y.doccirrus.DCSystemMessages.removeMessage( warnMessageId );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: warnMessageId,
                        content: warningMsgs.join( breaks ),
                        level: 'WARNING'
                    } );
                }

                if( activityMsgs.length ) {
                    Y.doccirrus.DCSystemMessages.removeMessage( actMessageId );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: actMessageId,
                        content: activityMsgs.join( breaks ),
                        level: 'INFO',
                        _removeTimeout: 0
                    } );
                }
            }

        };
    },
    '0.0.1', {requires: ['DCSystemMessages']}
);

