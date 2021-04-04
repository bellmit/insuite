/**
 * User: pi
 * Date: 25/03/15  16:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, async, moment, _ */

'use strict';

YUI.add( 'DCMailActivitiesModalPreview', function( Y ) {//
        var i18n = Y.doccirrus.i18n,
            TITLE = i18n( 'InCaseMojit.mailActivities.TITLE_SENT' ),
            SENDER_EMAIL = i18n( 'InCaseMojit.mailActivities.SENDER_EMAIL' ),
            OK = i18n( 'DCWindow.BUTTONS.OK' ),
            KoViewModel = Y.doccirrus.KoViewModel,
            DATE_TIME_FORMTAT = 'DD.MM.YYYY HH:mm';

        var TabModel = function( mailData, title, selected ) {
            var self = this;
            self.mailData = mailData;
            self.isSelected = ko.pureComputed( function() {
                return self === selected();
            }, self );
            self.title = title;
            self.SENDER_EMAIL = SENDER_EMAIL;
        };

        function EmailPreviewModel( emailRecords ) {
            var self = this;
            self.tabs = ko.observableArray( [] );
            self.selectedTab = ko.observable();
            // var emailRecord = emailRecords[0];
            emailRecords.forEach( function( emailRecord ) {
                emailRecord.attachments = emailRecord.attachments.map( function( mediaObj ) {
                    return {
                        mediaId: mediaObj._id,
                        caption: mediaObj.name,
                        contentType: mediaObj.mime,
                        thumbUrl: Y.doccirrus.media.getMediaThumbUrl( mediaObj, 68, false ),
                        fullUrl: Y.doccirrus.infras.getPrivateURL( Y.doccirrus.media.getMediaUrl( mediaObj, 'original' ) )
                    };
                } );

                self.tabs.push(
                    new TabModel( new SavedEmailsViewModel( {
                            data: Object.assign( {toName: 'toName', fromName: 'fromName'}, emailRecord )
                        } ),
                        moment( emailRecord.sentDate ).format( DATE_TIME_FORMTAT ),
                        self.selectedTab
                    ) );
            } );

            self.selectedTab( self.tabs()[0] );
        }

        /**
         * SavedEmailsViewModel
         * @param config
         * @constructor
         */
        function SavedEmailsViewModel( config ) {
            SavedEmailsViewModel.superclass.constructor.call( this, config );
        }

        SavedEmailsViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( SavedEmailsViewModel, KoViewModel.getBase(), {
                initializer: function() {

                },
                setDefaultValues: function( data ) {
                    this.set( 'data', data );
                },
                destructor: function() {
                }
            },
            {
                schemaName: 'patientemail',
                NAME: 'SavedEmailsViewModel'
            }
        );
        KoViewModel.registerConstructor( SavedEmailsViewModel );
        function MailActivitiesModal() {
        }

        MailActivitiesModal.prototype.showDialog = function( emailRecordIds ) {
            let emailRecords;

            function load() {
                var modal,
                    node = Y.Node.create( '<div></div>' ),
                    mailActivitiesModel = new EmailPreviewModel( emailRecords );
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'mailactivitiespreview_modal',
                    'InCaseMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: TITLE,
                            icon: Y.doccirrus.DCWindow.ICON_ENVELOPE,
                            width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            height: Y.doccirrus.DCWindow.SIZE_LARGE + 150,
                            minHeight: Y.doccirrus.DCWindow.SIZE_LARGE,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        label: OK,
                                        isDefault: true,
                                        action: function() {
                                            modal.close();
                                        }
                                    } )
                                ]
                            }
                        } );
                        ko.applyBindings( mailActivitiesModel, node.getDOMNode().querySelector( '#mailActivities' ) );
                    }
                );
            }

            function show() {
                async.series( [
                    function( next ) {
                        Y.doccirrus.jsonrpc.api.patientemails.getSavedEmails( {
                            data: {
                                ids: emailRecordIds
                            }
                        } ).done( function( res ) {
                            emailRecords = res.data;
                            next();
                        } ).fail( next );
                    }
                ], function( err ) {
                    if( err ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    } else {
                        return load();
                    }
                } );
            }

            show();
        };

        Y.namespace( 'doccirrus.modals' ).mailActivitiesPreviewModal = new MailActivitiesModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dcvalidations',
            'dccommonutils',
            'patientemail-schema'
        ]
    }
);
