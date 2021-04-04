/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'DCSupportFormModal', function( Y ) {

        var i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            MODAL_TITLE = i18n( 'DocCirrus.supportform_modal.title' ),
            KoViewModel = Y.doccirrus.KoViewModel,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            Disposable = KoViewModel.getDisposable(),
            peek = ko.utils.peekObservable;

        function SupportFormModel() {
            SupportFormModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( SupportFormModel, Disposable, {
            initializer: function() {
                var
                    self = this;

                self.infoText = Y.Lang.sub( i18n( 'DocCirrus.supportform_modal.info' ) );
                self.location = window.location.href;
                self.userAgent = Y.UA.userAgent;
                self.os = Y.UA.os;
                self.user = Y.doccirrus.auth.getUser();
                self.env = Y.doccirrus.auth.getENV();
                self.privateURL = Y.doccirrus.infras.getPrivateURL( '/' );

                self.shortDescriptionI18n = i18n( 'DocCirrus.supportform_modal.label.SHORT_DESCRIPTION' );
                self.labelDescriptionI18n = i18n( 'DocCirrus.supportform_modal.label.DESCRIPTION' );
                self.descrPlaceholderI18n = i18n( 'DocCirrus.supportform_modal.label.DESCR_PLACEHOLDER' );
                self.senderNameI18n = i18n( 'DocCirrus.supportform_modal.label.SENDER_NAME' );
                self.senderEmailI18n = i18n( 'DocCirrus.supportform_modal.label.SENDER_EMAIL' );
                self.ccEmailI18n = i18n( 'DocCirrus.supportform_modal.label.CC_EMAIL' );
                self.attachmentsI18n = i18n( 'DocCirrus.supportform_modal.button.ATTACHMENTS' );

                self.initObservables();

                self._isValid = ko.computed( function() {
                    return !self.cc_email.hasError() && !self.email.hasError() &&
                           !self.name.hasError() && !self.shortDescr.hasError();
                } );

                self.attachmentsUploader = KoComponentManager.createComponent( {
                    componentType: 'KoFileUploader',
                    componentConfig: {
                        fileTypes: Y.doccirrus.media.types.getAllExt(),
                        acceptFiles: '',
                        callbacks: {
                            onComplete: function( meta ) {
                                var
                                    response = meta.response;
                                self.addMediaObjToAttachments( response.mediaObj );
                            },
                            onError: function( meta ) {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'error',
                                    message: meta.reason,
                                    window: {
                                        width: Y.doccirrus.DCWindow.SIZE_LARGE
                                    }
                                } );
                            }
                        }
                    }
                } );
            },
            destructor: function() {
            },

            initObservables: function() {
                var self = this,
                    mandatoryValidation = Y.doccirrus.validations.common.mandatory[0],
                    emailValidation = Y.doccirrus.validations.common.email[0],
                    cc_emailValidation = Y.doccirrus.validations.common.emailOrEmpty[0];

                self.shortDescr = ko.observable();
                self.shortDescr.hasError = ko.computed( function() {
                    return !self.shortDescr();
                } );
                self.shortDescr.validationMessages = ko.observableArray( [mandatoryValidation.msg] );

                self.description = ko.observable();

                self.name = ko.observable( self.user && self.user.name );
                self.name.hasError = ko.computed( function() {
                    return !self.name();
                } );
                self.name.validationMessages = ko.observableArray( [mandatoryValidation.msg] );

                self.email = ko.observable();
                self.email.hasError = ko.computed( function() {
                    var
                        isValid = emailValidation.validator( self.email() );
                    return !isValid;
                } );
                self.email.validationMessages = ko.observableArray( [emailValidation.msg] );

                self.cc_email = ko.observable();
                self.cc_email.hasError = ko.computed( function() {
                    var
                        isValid = cc_emailValidation.validator( self.cc_email() );
                    return !isValid;
                } );
                self.cc_email.validationMessages = ko.observableArray( [cc_emailValidation.msg] );

                self.attachments = ko.observableArray();

            },
            addMediaObjToAttachments: function( mediaObj ) {
                var self = this;
                self.attachments.push( self.getAttachmentFromMediaObj( mediaObj ) );

            },
            removeAttachment: function( e ) {
                var self = this;
                self.attachments.remove( e );
            },
            getAttachmentFromMediaObj: function( mediaObj ) {
                return {
                    mediaId: mediaObj._id,
                    caption: mediaObj.name,
                    contentType: mediaObj.mimeType,
                    thumbUrl: Y.doccirrus.media.getMediaThumbUrl( mediaObj, 68, false ),
                    fullUrl: Y.doccirrus.infras.getPrivateURL( Y.doccirrus.media.getMediaUrl( mediaObj, 'original' ) )
                };
            },
            sendEmail: function() {
                var
                    self = this,
                    getTimeDifference = function (startTime, endTime) {
                        startTime = new moment(startTime);
                        endTime = new moment(endTime);

                        return moment.duration(endTime.diff(startTime)).asSeconds() + 's';
                    };

                return Promise.resolve( Y.doccirrus.jsonrpc.api.communication.sendSupportEmail( {
                    data: {
                        title: peek( self.shortDescr ),
                        description: peek( self.description ),
                        info: {
                            userName: self.name(),
                            userEmail: peek( self.email ),
                            privateURL: self.privateURL,
                            url: self.location,
                            's/n': null,
                            userAgent: self.userAgent,
                            os: self.os,
                            loggedInUser: self.env.loggedInUser,
                            systemType: self.env.systemType,
                            serverType: self.env.serverType,
                            roles: self.user.roles && self.user.roles.join( ', ' ),
                            groups: self.user.groups && self.user.groups.map( function( i ){ return i.group; } ).join( ', ' ),
                            licenses: self.env.licenses,
                            cpu: navigator.hardwareConcurrency || 'Nicht verfügbar',
                            dnsLookupTime: getTimeDifference( window.performance.domainLookupStart, window.performance.domainLookupEnd ),
                            loadTime: getTimeDifference( window.performance.timing.requestStart, window.performance.timing.responseEnd ),
                            domReady: getTimeDifference( window.performance.timing.navigationStart , window.performance.timing.loadEventEnd  )
                        },
                        email: peek( self.email ),
                        cc_email: peek( self.cc_email ),
                        attachments: peek( self.attachments )
                    }
                } ) );
            }
        } );

        function SupportFormModal() {
        }

        SupportFormModal.prototype.show = function() {
            Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'DocCirrus/views/supportform-modal'} )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    var
                        bodyContent = Y.Node.create( template ),
                        supportFormModel = new SupportFormModel(),
                        loggedInEmployeeEmail,
                        modal;

                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-Support',
                        bodyContent: bodyContent,
                        title: MODAL_TITLE,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        fitOnViewPortResize: !Y.UA.touchEnabled, // for non touch devices to handle complete visibility of dialog for small screens, eg: mac-book
                        minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                        minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                {
                                    label: i18n( 'general.button.SEND' ),
                                    name: 'SEND',
                                    value: 'SEND',
                                    isDefault: true,
                                    action: function() {
                                        supportFormModel.sendEmail()
                                            .then( function() {
                                                Y.doccirrus.DCWindow.notice( {
                                                    type: 'success',
                                                    message: i18n( "LicenseMojit.license_email_modal_clientJS.text.EMAIL_SENT" )
                                                } );
                                            } )
                                            .catch( function( error ) {
                                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                            } );
                                        modal.close();
                                    }
                                }
                            ]
                        },
                        after: {
                            visibleChange: function( event ) {
                                if( !event.newVal ) {
                                    ko.cleanNode( bodyContent.getDOMNode() );
                                    supportFormModel.destroy();
                                }
                            }
                        }

                    } );
                    ko.computed( function() {
                        var
                            buttonSend = modal.getButton( 'SEND' ).button,
                            _isValid = supportFormModel._isValid(),
                            enable = false;

                        if( _isValid ) {
                            enable = true;
                        }

                        if( enable ) {
                            buttonSend.enable();
                        } else {
                            buttonSend.disable();
                        }
                    } );

                    Y.doccirrus.jsonrpc.api.employee.getLoggedInEmployee().done( function( response ) {
                        if( response.data ) {
                            if( response.data.communications[0] ) {
                                loggedInEmployeeEmail = response.data.communications.find( function( item ) {
                                    return 'EMAILJOB' === item.type;
                                } );
                                supportFormModel.email( loggedInEmployeeEmail && loggedInEmployeeEmail.value );
                            }
                        }
                        ko.applyBindings( supportFormModel, bodyContent.getDOMNode() );
                    } ).fail( function() {
                        ko.applyBindings( supportFormModel, bodyContent.getDOMNode() );
                    } );
                } )
                .catch( catchUnhandled );
        };

        Y.namespace( 'doccirrus.modals' ).supportFormModal = new SupportFormModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'KoViewModel',
            'KoFileUploader',
            'KoIcon',
            'dcauth',
            'promise',
            'dcmedia'
        ]
    }
);