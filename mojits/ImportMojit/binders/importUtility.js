/**
 * User: bhagyashributada
 * Date: 12/26/17  10:41 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/* global YUI, ko, $, jQuery */
YUI.add( 'ImportMojitBinder', function( Y, NAME ) {
    'use strict';

    var
        //i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel;

    function onError( error ) {
        if( error && typeof error === "string" ) {
            error = {message: error};
        } else if( error.data && Array.isArray( error.data ) && error.data.length ) {
            error = error.data[0];
            if ( !error.message ){
                error = {message: error};
            }
        }

        Y.doccirrus.DCWindow.notice( {
            type: 'error',
            message: error && error.message || 'Undefined error',
            window: {
                width: Y.doccirrus.DCWindow.SIZE_SMALL
            }
        } );
    }

    function onSuccess( res, message ) {

        if( res && typeof res === "string" ) {
            message += res;
        } else if( res.data && typeof res.data === "string" ) {
            message += res.data;
        }
        Y.doccirrus.DCWindow.notice( {
            type: 'success',
            message: message,
            window: {
                width: Y.doccirrus.DCWindow.SIZE_MEDIUM
            }
        } );
    }

    function BinderViewModel( config ) {
        BinderViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( BinderViewModel, KoViewModel.getDisposable(), {
        /**
         * Determines upload button enabled
         * @type {null|ko.observable}
         */
        uploadEnabled: null,
        /**
         * Holds the selected file for upload
         * @type {Array}
         */
        selectedFile: null,

        initializer: function BinderViewModel_initializer( config ) {
            var
                self = this;

            self.viewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;

            self.mainNode = config.node;

            self.uploadEnabled = ko.observable( false );
        },

        clickHandler: function( functionToCall ) {
            var
                self = this;

            Y.doccirrus.utils.showLoadingMask( self.mainNode );

            Y.doccirrus.communication.apiCall( {

                method: functionToCall,
                data: {}

            }, function( err, res ) {
                Y.doccirrus.utils.hideLoadingMask( self.mainNode );
                if( err ) {
                    onError( err );
                } else {
                    let message = 'Operation Successful<br>';
                    onSuccess( res, message );
                }
            } );
        },

        fileChange: function BinderViewModel_fileChange( $data, $event ) {

            var
                self = this,
                selectedFile = $event.target.files;

            if( selectedFile && selectedFile.length ) {
                self.selectedFile = selectedFile[0];
                self.uploadEnabled( true );
            } else {
                self.selectedFile = null;
                self.uploadEnabled( false );
            }
        },

        uploadFiles: function BinderViewModel_upload() {
            var
                self = this,
                formData = new FormData();

            formData.append( 'file', self.selectedFile, self.selectedFile.name );

            Y.doccirrus.utils.showLoadingMask( self.mainNode );

            jQuery.ajax( {
                url: Y.doccirrus.infras.getPrivateURL( '/1/import/:uploadBdtFile' ),
                type: 'POST',
                xhrFields: {withCredentials: true},
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                error: function( jqXHR, textStatus, errorThrown ) {
                    onError( errorThrown );
                },
                success: function( response ) {
                    if( response.meta.errors && response.meta.errors.length ) {
                        let message = [];

                        response.meta.errors.forEach( function(errObj){
                            message.push( errObj.message );
                        } );

                        onError( message.join( ', ' ) );

                    } else {
                        onSuccess( response, 'File '+self.selectedFile.name+' has been uploaded successfully !!' );
                    }
                },
                complete: function (){
                    $("#uploadFile").val('');
                    Y.doccirrus.utils.hideLoadingMask( self.mainNode );
                    self.selectedFile = null;
                    self.uploadEnabled( false );
                }
            } );
        },

        toggleFullScreenHandler() {
            Y.doccirrus.DCBinder.toggleFullScreen();
        }
    } );

    Y.namespace( 'mojito.binders' )[NAME] = {

        //jaderef: 'ImportMojit',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },
        
        bind: function( node ) {
            var
            self = this;
            Y.doccirrus.DCBinder.initToggleFullScreen();

            self.node = node;

            self.binderViewModel = new BinderViewModel( {
                node: node.getDOMNode()
            } );
            ko.applyBindings( self.binderViewModel, node.getDOMNode() );
        }
    };

}, '0.0.1', {
    requires: [
        'oop',
        'router',
        'mojito-client',
        'dcerrortable',
        'JsonRpcReflection-doccirrus',
        'KoUI-all',
        'intl',
        'mojito-intl-addon',
        'KoViewModel',
        'dcpatientandactivityselect',
        'devicelog-schema',
        'activity-api',
        "DCBinder"
    ]
} );