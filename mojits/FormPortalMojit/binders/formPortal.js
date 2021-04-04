/**
 * User: pi
 * Date: 01/06/16  11:35
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, $, async */
'use strict';

YUI.add( 'FormPortalBinderIndex', function( Y, NAME ) {

    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        unwrap = ko.unwrap,
        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
        FORM_PORTAL_TOKEN = 'FORM_PORTAL_TOKEN',
        FORM_PORTAL_ID = 'FORM_PORTAL_ID',
        FORM_PORTAL = 'FORM_PORTAL',
        FORM_PORTAL_REGISTERED = i18n( 'FormPortalMojit.formPortalBinder.text.FORM_PORTAL_REGISTERED' ),
        SAVE_QUESTION = i18n( 'FormPortalMojit.formPortalBinder.text.SAVE_QUESTION' ),
        FORM_PORTAL_REGISTERING = i18n( 'FormPortalMojit.formPortalBinder.text.FORM_PORTAL_REGISTERING' ),
        FORM_PORTAL_NOT_REGISTERED = i18n( 'FormPortalMojit.formPortalBinder.text.FORM_PORTAL_NOT_REGISTERED' ),
        DISCONNECTED = i18n( 'FormPortalMojit.formPortalBinder.text.DISCONNECTED' ),
        SAVE = i18n( 'FormPortalMojit.formPortalBinder.button.SAVE' );

    function FormPortalModel( config ) {
        FormPortalModel.superclass.constructor.call( this, config );
    }

    /**
     * Every time connection is opened it authenticates socket connection (token authentication). It means, page will try
     *  authenticate itself after page is opened or socket reconnection.
     *
     */
    Y.extend( FormPortalModel, KoViewModel.getDisposable(), {
        initializer: function() {
            var
                self = this;
            self.initFormPortalModel();
        },
        destructor: function() {
            var
                self = this;
            self.removeSocketListeners();
            if( self.onConnectListener ) {
                self.onConnectListener.removeEventListener();
                self.onConnectListener = null;
            }
            if( self.onDisconnectListener ) {
                self.onDisconnectListener.removeEventListener();
                self.onDisconnectListener = null;
            }
        },
        removeSocketListeners: function FormPortalModel_removeSocketListeners() {
            var
                self = this;
            if( self.loginListener ) {
                self.loginListener.removeEventListener();
                self.loginListener = null;
            }
            if( self.newFormListener ) {
                self.newFormListener.removeEventListener();
                self.newFormListener = null;
            }
            if( self.closeFormPortal ) {
                self.closeFormPortal.removeEventListener();
                self.closeFormPortal = null;
            }
            if( self.iframeUrlListener ) {
                self.iframeUrlListener.removeEventListener();
                self.iframeUrlListener = null;
            }
        },
        initFormPortalModel: function FormPortalModel_initFormPortalModel() {
            var
                self = this,
                token = self.get( 'token' ),
                formPortalId = self.get( 'formPortalId' );
            if( token && formPortalId ) {
                Y.doccirrus.utils.localValueSet( FORM_PORTAL_TOKEN, token, FORM_PORTAL );
                Y.doccirrus.utils.localValueSet( FORM_PORTAL_ID, formPortalId, FORM_PORTAL );
            } else {
                token = Y.doccirrus.utils.localValueGet( FORM_PORTAL_TOKEN, FORM_PORTAL );
                formPortalId = Y.doccirrus.utils.localValueGet( FORM_PORTAL_ID, FORM_PORTAL );
            }

            self.hasForm = ko.observable( false );
            self.hasIframeUrl = ko.observable( false );
            self.iframeUrl = ko.observable( false );
            self.hasContentToShow = ko.computed( function() {
                return unwrap( self.hasForm ) || unwrap( self.hasIframeUrl );
            });
            self.template = null;
            self.formPortalId = formPortalId;
            self.status = ko.observable( FORM_PORTAL_REGISTERING );
            self.disconnected = DISCONNECTED;
            self.showDisconnected = ko.observable( false );

            self.saveBtnDisabled = ko.observable( false );
            self.saveBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'saveBtn',
                    text: SAVE,
                    option: 'PRIMARY',
                    disabled: ko.computed( function() {
                        return unwrap( self.saveBtnDisabled );
                    } ),
                    click: function() {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            message: SAVE_QUESTION,
                            window: {
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                            action: function() {
                                                this.close();
                                            }
                                        } ),
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            isDefault: true,
                                            action: function() {
                                                self.saveBtnDisabled( true );
                                                self.saveForm();
                                                this.close();

                                            }
                                        } )
                                    ]
                                }
                            }
                        } );
                    }
                }
            } );

            self.initSocketOnConnect( token );
            self.initSocketOnDisconnect();

            $( window ).off('resize.forms_portal').on('resize.forms_portal', function(){
                self.onWindowResize();
            });
        },
        onWindowResize: function FormPortalModel_onWindowResize() {
            var
                self = this,
                pxWidth = parseInt( $( '#divFormRender' ).width(), 10 );

            if ( !self.template ) {
                Y.log( 'Form not yet loaded, cannot resize.', 'warn', NAME );
                return;
            }

            self.template.resize( pxWidth, Y.dcforms.nullCallback );
        },
        initSocketOnConnect: function FormPortalModel_initSocketOnConnect( token ) {
            var
                self = this;
            self.onConnectListener = Y.doccirrus.communication.onConnect( {
                callback: function() {
                    self.removeSocketListeners();
                    self.initSocketConnection( token );
                }
            } );
        },
        initSocketOnDisconnect: function FormPortalModel_initSocketOnDisconnect() {
            var
                self = this;
            self.onDisconnectListener = Y.doccirrus.communication.onDisconnect( {
                callback: function() {
                    self.status( FORM_PORTAL_NOT_REGISTERED );
                }
            } );
        },
        showForm: function FormPortalModel_showForm( data ) {
            var
                self = this,
                packageData = JSON.parse( data.packageData ),
                document = data.document,
                canonicalId = packageData.formId,
                versionId = packageData.formVersionId;

            self.saveBtnDisabled( false );

            Y.dcforms.package = packageData;
            Y.dcforms.usePackage = true;
            self.documentId = document._id;

            async.series( [ createForm, resizeForm, loadFormState ], onAllDone );

            function createForm( itcb ) {
                Y.dcforms.template.create(
                    '',
                    canonicalId,
                    versionId,
                    'divFormRender',
                    {},
                    true,
                    onFormCreated
                );

                function onFormCreated( err, template ) {
                    if ( err ) { return itcb( null ); }

                    template.highlightEditable = true;
                    self.template = template;

                    itcb( null );
                }
            }

            //  initialize form to width of current portal
            function resizeForm( itcb ) {
                var pxWidth = $( '#divFormRender' ).width();
                self.template.resize( parseInt( pxWidth, 10), itcb );
            }

            function loadFormState( itcb ) {
                self.template.fromDict( document.formState, onFormLoaded );
                function onFormLoaded( err ) {
                    if( err ) {
                        Y.log( 'Problem loading form state: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( null );
                        //  continue anyway, best effort and debugging
                        //return itcb( err );
                    }
                    self.template.render( itcb );
                }
            }

            function onAllDone( err ) {
                if( err ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: err
                    } );
                    return;
                }

                self.template.render( Y.dcforms.nullCallback );
            }

        },
        saveForm: function FormPortalModel_saveForm() {
            var
                self = this,
                formState = self.template.toDict();
            Y.doccirrus.communication.emit( 'formportal.saveForm', {
                formState: formState,
                documentId: self.documentId
            } );
        },
        disconnectPortal: function FormPortalModel_disconnectPortal() {
            var
                self = this;
            Y.doccirrus.communication.socket.disconnect();
            self.hasForm( false );
            self.hasIframeUrl( false );
            self.documentId = null;
            self.showDisconnected( true );

        },
        initSocketListeners: function FormPortalModel_initSocketListeners() {
            var
                self = this;
            self.newFormListener = Y.doccirrus.communication.on( {
                event: 'system.NEW_FORM_FOR_FORM_PORTAL',
                handlerId: 'FormPortalBinderIndex',
                done: function( response ) {
                    var
                        data = response.data,
                        dataBol = Boolean( data );

                    self.hasForm( dataBol );

                    self.documentId = null;

                    if( data ) {
                        self.hasIframeUrl( !dataBol );
                        self.iframeUrl( false );
                        self.showForm( data );
                    }

                },
                fail: function( error ) {
                    if( 30004 === error.code ){
                        self.disconnectPortal();
                    } else {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    }
                }
            } );
            self.closeFormPortal = Y.doccirrus.communication.on( {
                event: 'system.CLOSE_FORM_PORTAL',
                handlerId: 'FormPortalBinderIndex',
                done: function() {
                    self.disconnectPortal();
                }
            } );

            /**
             * Listen to the socket event that will send the URl to render in the iframe
             * @type {*|{event, handlerId, done callback, fail callback}}
             */
            self.iframeUrlListener = Y.doccirrus.communication.on( {
                event: 'system.NEW_IFRAME_URL_FOR_FORM_PORTAL',
                handlerId: 'FormPortalBinderIndex',
                done: function( response ) {
                    var
                        data = response.data,
                        dataBol = Boolean( data );

                    if ( dataBol ) {
                        self.iframeUrl( data.activeUrl );
                        self.hasIframeUrl( dataBol );
                        self.hasForm( !dataBol );
                        self.documentId = null;
                    }
                },
                fail: function( error ) {
                    if( 30004 === error.code ){
                        self.disconnectPortal();
                    } else {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    }
                }
            } );
            Y.doccirrus.communication.emit( 'formportal.checkActiveItem' );

        },

        /**
         * @public
         * @method notifyIframeBind
         * @param {Object} element - DOM Element
         */
        notifyIframeBind: function FormPortalModel_notifyIframeBind( element ) {
            var
                $window = $(window),
                $iframe = $(element),
                windowHeight = $window.height();

            $iframe.height( windowHeight );

            $window.resize(function (event) {

                $iframe.height( $(event.currentTarget).height() );
            });
        },
        initSocketConnection: function FormPortalModel_initSocketConnection( token ) {
            var
                self = this;
            self.loginListener = Y.doccirrus.communication.once( {
                event: 'login',
                done: function() {
                    self.status( FORM_PORTAL_REGISTERED );
                    self.initSocketListeners();
                },
                fail: function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    self.status( FORM_PORTAL_NOT_REGISTERED );
                }
            } );
            Y.doccirrus.communication.emit( 'login', {
                token: token
            } );
        }

    }, {
        ATTRS: {
            formPortalId: {
                value: '',
                lazyAdd: false
            },
            token: {
                value: '',
                lazyAdd: false
            }
        }
    } );

    /**
     * @class FormPortalBinder
     * @extends Y.doccirrus.DCBinder
     * @constructor
     */
    function FormPortalBinder() {
        FormPortalBinder.superclass.constructor.apply( this, arguments );
    }

    Y.extend( FormPortalBinder, Y.doccirrus.DCBinder, {
        /**
         * @property intro
         * @type {ko.observable}
         */
        intro: null,
        /**
         * @property mid
         * @type {ko.observable}
         */
        mid: null,
        /**
         * @property ending
         * @type {ko.observable}
         */
        ending: null,
        /** @private */
        initializer: function() {
            var
                self = this;
            self.initObservables();
        },
        initObservables: function FormPortalBinder_initObservables() {
            var
                self = this;
            self.formPortalModel = ko.observable( null );
        },
        /** @private */
        destructor: function() {
        },
        applyBindings: function FormPortalBinder_applyBindings() {
            var
                self = this;
            FormPortalBinder.superclass.applyBindings.apply( self, arguments );
            self.updateData();

        },
        updateData: function FormPortalBinder_updateData() {
            var
                self = this,
                formPortalId = self.get( 'mojitProxy' ).pageData.get( 'formPortalId' ),
                token = self.get( 'mojitProxy' ).pageData.get( 'token' ),
                formPortalModel = new FormPortalModel( { token: token, formPortalId: formPortalId } );

            self.formPortalModel( formPortalModel );
        }
    } );

    Y.namespace( 'mojito.binders' )[ NAME ] = new FormPortalBinder( {
        binderName: NAME,
        initialData: {}
    } );

}, '0.0.1', {
    requires: [
        'oop',
        'mojito-client',
        'KoViewModel',
        'doccirrus',
        'DCBinder',
        'DCLicenseEmailModal',
        'dcutils',
        'dccommunication-client',
        'DCWindow',

        'dcforms-template',
        'dcforms-packageutils'
    ]
} );