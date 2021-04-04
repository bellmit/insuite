/**
 * User: do
 * Date: 25/02/15  17:54
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI*/

YUI.add( 'dcinvoicelogapprovemodal', function( Y ) {
        var i18n = Y.doccirrus.i18n;

        function showDialog( log, onOK, onCANCEL, options ) {

            var
                notApproved = log.notApproved,
                logType = options && options.logType,
                text,
                generateText = options && options.generateText || Y.doccirrus.i18n('InvoiceMojit.gkv_browser.button.APPROVE'),
                SCHEINS_i18n = i18n( 'invoicelog-schema.InvoiceLog_T.totalItems.i18n' );

            switch( logType ){
                case 'cashlog':
                    text = [
                        'Bislang noch nicht freigegeben:',
                        '<ul><li>'+SCHEINS_i18n+': '+notApproved[0]+'</li>',
                        '<li>Leistungen: ' + notApproved[1] + '</li>',
                        '<li>Diagnosen: ' + notApproved[2] + '</li></ul>',
                        '<p>Nach der Freigabe sind die Einträge nicht mehr änderbar.</p>'
                    ];
                    break;
                default:
                    text = [
                        '<p>Die Freigabe ist die Voraussetzung für die Abrechnung. Nach Freigabe sind die Einträge nicht mehr änderbar.</p>',
                        'Bislang noch nicht freigegeben:',
                        '<ul><li>'+SCHEINS_i18n+': '+notApproved[0]+'</li>',
                        '<li>Leistungen: ' + notApproved[1] + '</li>',
                        '<li>Diagnosen: ' + notApproved[2] + '</li></ul>',
                        '<p>Sie können jetzt "'+generateText+'" und eine Abrechnung erstellen oder hier “Abbrechen" und nach “Prüfen" für die bereits freigegebenen Einträge eine Abrechnung erstellen.</p>'
                    ];
            }


            var
                dcWindow = Y.doccirrus.DCWindow.notice( {
                    title: i18n( 'DCWindow.notice.title.info' ),
                    type: 'warn',
                    window: {
                        width: 'medium',
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    action: function( e ) {
                                        dcWindow.close( e );
                                        if( 'function' === typeof onCANCEL ) {
                                            onCANCEL();
                                        }
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    label: generateText,
                                    action: function( e ) {
                                        dcWindow.close( e );
                                        if( 'function' === typeof onOK ) {
                                            onOK();
                                        }
                                    }
                                } )
                            ]
                        }
                    },
                    message: text.join( '' )
                } );
        }

        Y.namespace( 'doccirrus.modals' ).invoiceLogApproveModal = {
            show: showDialog
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow'
        ]
    }
);
