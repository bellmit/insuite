/**
 * User: do
 * Date: 30/08/17  20:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'KvcMessageModel', function( Y, NAME ) {

        /**
         * @module KvcMessageModel
         */

        var
            unwrap = ko.unwrap,
            isObservable = ko.isObservable,
            peek = ko.utils.peekObservable,

            // i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel;

        // TODOOO kvc move to some KoViewModel utils file
        function mixinEnumDisplays( self ) {
            Object.keys( self ).forEach( function( propName ) {
                var prop = self[propName];
                if( prop && isObservable( prop ) && Array.isArray( peek( prop.list ) ) ) {
                    self[propName + 'Display'] = ko.computed( function() {
                        var val = unwrap( self[propName] ),
                            result = '';
                        if( val ) {
                            peek( prop.list ).some( function( listEntry ) {
                                if( listEntry.val === val ) {
                                    result = listEntry.i18n;
                                    return true;
                                }
                            } );
                        }
                        return result;
                    } );
                }
            } );
        }

        function KvcMessageModel( config ) {
            KvcMessageModel.superclass.constructor.call( this, config );
        }

        KvcMessageModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( KvcMessageModel, KoViewModel.getBase(), {
                initializer: function KvcMessageModel_initializer() {
                    var
                        self = this;
                    self.initMDN();
                    mixinEnumDisplays( self );

                    self.shownAttachments = ko.observableArray();
                },
                initMDN: function() {
                    var self = this;
                    self.mdnSent = ko.computed( function() {
                        var dispositionNotificationTo = unwrap( self.dispositionNotificationTo ),
                            returnPath = unwrap( self.returnPath );

                        return dispositionNotificationTo && dispositionNotificationTo === returnPath;
                    } );
                },
                displayDate: function( date ) {
                    if( !date ) {
                        return '';
                    }
                    return moment( date ).format( 'DD.MM.YYYY HH:mm:ss' );
                },
                buildDownloadLink: function( contentFileId ) {
                    var url = '#';

                    if( contentFileId ) {
                        url = Y.doccirrus.infras.getPrivateURL( '/download/' + contentFileId );
                    }

                    return url;
                },
                toggleAttachmentContentIsShown: function( idx  ) {
                    var self = this,
                        shownAttachmentIdx = self.shownAttachments.indexOf( idx );

                    if( -1 === shownAttachmentIdx ) {
                        self.shownAttachments.push( idx );
                    } else {
                        self.shownAttachments.remove( idx );
                    }

                    return false;

                },
                destructor: function KvcMessageModel_destructor() {
                    var
                        self = this;

                    Y.log( 'KvcMessageModel_destructor ' + self, 'info', NAME );

                }
            },
            {
                schemaName: 'kvcmessage',
                NAME: 'KvcMessageModel'
            } );

        KoViewModel.registerConstructor( KvcMessageModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'kvcmessage-schema',
            'KvcMessageModel',
            'KvcMessageListModel'
        ]
    }
);