/**
 * User: do
 * Date: 24/02/15  13:22
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, moment */
'use strict';

YUI.add( 'dcinvoicelogutils', function( Y, NAME ) {

        var i18n = Y.doccirrus.i18n,
            SUCCESSFULLY_PREVALIDATED = i18n( 'InvoiceMojit.general.SUCCESSFULLY_PREVALIDATED' ),
            SUCCESSFULLY_VALIDATED = i18n( 'InvoiceMojit.general.SUCCESSFULLY_VALIDATED' ),
            SUCCESSFULLY_APPROVED = i18n( 'InvoiceMojit.general.SUCCESSFULLY_APPROVED' ),
            SUCCESSFULLY_MERGED = i18n( 'InvoiceMojit.general.SUCCESSFULLY_MERGED' );

        function getFinishedText( action, logInfo ) {
            const countryCode = logInfo.countryCode;
            var message;
            switch( action ) {
                case 'validate':
                    if( logInfo.isPreValidation ) {
                        message = countryCode === 'CH' ? 'FINISHED_PREVALIDATION_CH' : 'FINISHED_PREVALIDATION';
                        return i18n( 'InvoiceMojit.general.' + message, {data: logInfo} );
                    } else {
                        message = countryCode === 'CH' ? 'FINISHED_VALIDATION_CH' : 'FINISHED_VALIDATION';
                        return i18n( 'InvoiceMojit.general.' + message, {data: logInfo} );
                    }
                case 'approve':
                    message = countryCode === 'CH' ? 'FINISHED_APPROVE_CH' : 'FINISHED_APPROVE';
                    return i18n( 'InvoiceMojit.general.' + message, {data: logInfo} );
                case 'send':
                    message = countryCode === 'CH' ? 'FINISHED_1CLICK_CH' : 'FINISHED_1CLICK';
                    return i18n( 'InvoiceMojit.general.' + message, {data: logInfo} );
                case 'replace':
                    message = countryCode === 'CH' ? 'FINISHED_REPLACE_CH' : 'FINISHED_REPLACE';
                    return i18n( 'InvoiceMojit.general.' + message, {data: logInfo} );
            }
            return '';
        }

        function getSuccessText( action, logInfo ) {
            switch( action ) {
                case 'validate':
                    if( logInfo.isPreValidation ) {
                        return SUCCESSFULLY_PREVALIDATED;
                    } else {
                        return SUCCESSFULLY_VALIDATED;
                    }
                case 'approve':
                    return SUCCESSFULLY_APPROVED;
                case 'merge':
                    return SUCCESSFULLY_MERGED;
            }
            return '';
        }

        function generateSysMessageId( socketMessageId, action, state, invoicelogId ) {
            return 'socket-invoicelog-' + invoicelogId + '-' + action + '-' + state + '-message-' + socketMessageId;
        }

        function ActionButtonsViewModel( buttons ) {

            var name, button,
                self = this;

            self.state = ko.observable();

            if( 'object' !== typeof buttons ) {
                return self;
            }

            for( name in buttons ) {
                if( buttons.hasOwnProperty( name ) ) {
                    button = buttons[name];
                    self[name] = {
                        action: button.action,
                        enabled: ko.observable( true === button.enabled ? button.enabled : false ),
                        visible: ko.observable( true === button.visible ? button.enabled : false )
                    };
                }
            }

            self.state.subscribe( function( vm ) {
                var names = Object.keys( buttons );

                names.forEach( function( name ) {

                    var button = buttons[name],
                        attr = self[name];

                    if( !button ) {
                        return;
                    }

                    if( 'function' === typeof button.enabled ) {
                        attr.enabled( button.enabled.call( self, vm ) );
                    }

                    if( 'function' === typeof button.visible ) {
                        attr.visible( button.visible.call( self, vm ) );
                    }
                } );
            } );

        }

        function renderDateAndTime( meta ) {
            var m = moment( meta.value );
            if( !meta.value || !m.isValid() ) {
                return '';
            }
            return m.format( 'DD.MM.YYYY HH:mm' );
        }


        Y.namespace( 'doccirrus' ).invoicelogutils = {

            name: NAME,

            renderDateAndTime: renderDateAndTime,

            showSystemMessage: function( message ) {
                var data = message.data[0],
                    logInfo = data.logInfo,
                    action = data.action,
                    state = data.action,
                    messageId = generateSysMessageId( (message.meta && message.meta.messageId), action, state, logInfo.id ),
                    level = 'SUCCESS',
                    breaks = '<br><br>',
                    content = getFinishedText( action, logInfo );
                if( data.errors.length ) {
                    level = 'ERROR';
                } else if( data.warnings.length ) {
                    level = 'WARNING';
                }

                if (content.length > 0) {
                    content += breaks;
                }

                if( data.errors.length || data.warnings.length ) {
                    content += Y.doccirrus.errorTable.getMessages( data.errors.concat( data.warnings ) ).join( '<hr>' );
                } else if( 'send' !== action ) {
                    content += getSuccessText( action, logInfo );
                }

                if( 'send' === action ) {
                    content += data.text;
                }

                Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                Y.doccirrus.DCSystemMessages.addMessage( {
                    messageId: messageId,
                    content: content,
                    level: level
                } );
            },
            createActionButtonsViewModel: function( buttons ) {
                return new ActionButtonsViewModel( buttons );
            }

        };
    },
    '0.0.1', {requires: ['DCSystemMessages']}
);

