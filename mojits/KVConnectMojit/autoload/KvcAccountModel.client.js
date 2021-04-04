/**
 * User: do
 * Date: 16.08.19  12:49
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'KvcAccountModel', function( Y, NAME ) {

        /**
         * @module KvcAccountModel
         */

        var
            peek = ko.utils.peekObservable,
            KoViewModel = Y.doccirrus.KoViewModel;

        function handleError( err ) {
            var code = err.code || err.statusCode;
            if( code ) {
                Y.doccirrus.DCWindow.notice( {
                    message: Y.doccirrus.errorTable.getMessage( {code: code} )
                } );
            }
            Y.log( 'error: ' + err.message, 'warn', NAME );
        }

        function KvcAccountModel( config ) {
            KvcAccountModel.superclass.constructor.call( this, config );
        }

        KvcAccountModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( KvcAccountModel, KoViewModel.getBase(), {
                initializer: function KvcAccountModel_initializer() {
                    var
                        self = this;

                    self.status.readOnly( true );
                    self.certificateStatus.readOnly( true );
                    self.lastKvcLogin.readOnly( true );
                    self.passwordChangeNeeded.readOnly( true );
                    self.passwordLastChange.readOnly( true );
                    self.locations = ko.observableArray( self.initialConfig.data.initlocations );

                    // show error only if account has been saved
                    self.locations.hasError = ko.computed( function() {
                        var locationIdHasError = self.locationIds.hasError(),
                            kvcAccountHasBeenSaved = Boolean( self._id() );

                        if( !kvcAccountHasBeenSaved ) {
                            return false;
                        }
                        return locationIdHasError;
                    } );
                    self.locations.validationMessages = self.locationIds.validationMessages;

                    // set read-only as long as account has not been saved
                    self.locations.readOnly = ko.computed( function() {
                        var kvcAccountId = self._id();
                        return !Boolean( kvcAccountId );
                    } );

                    self.addDisposable( ko.computed( function() {
                        var username = self.username(),
                            password = self.password(),
                            isModified = self.isModified();

                        if( username && password && isModified ) {
                            return self.login();
                        }

                    } ).extend( {rateLimit: {timeout: 2000, method: "notifyWhenChangesStop"}} ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            isNew = self.isNew();
                        self.username.readOnly( !isNew );
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var locations = self.locations();
                        if( ko.computedContext.isInitial() ) {
                            return;
                        }
                        self.changeLocations( locations );
                    } ).extend( {rateLimit: {timeout: 1000, method: "notifyWhenChangesStop"}} ) );
                },
                login: function() {
                    var
                        self = this;

                    return Promise.resolve( Y.doccirrus.jsonrpc.api.kvcaccount.login( {
                        kvcAccountId: peek( self._id ),
                        username: peek( self.username ),
                        password: peek( self.password )
                    } ) ).then( function( response ) {
                        var account = response.data;
                        self.set( 'data', account );
                    } ).catch( function( response ) {
                        self.handleError( response );
                    } );
                },
                remove: function() {
                    var self = this,
                        id = peek( self._id );
                    if( !id ) {
                        return Promise.resolve();
                    }
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.kvcaccount.delete( {
                        query: {
                            _id: id
                        }
                    } ) );
                },
                changePassword: function( data ) {
                    var self = this;
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.kvcaccount.changePassword( {
                        kvcAccountId: peek( self._id ),
                        oldPwd: data.oldPwd,
                        newPwd: data.newPwd
                    } ) ).then( function( result ) {
                        self.password( data.newPwd );
                        self.login();
                        return result;
                    } );
                },
                changeLocations: function( locations ) {
                    var self = this;
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.kvcaccount.changeLocations( {
                        kvcAccountId: peek( self._id ),
                        locationIds: locations.map( function( loc ) {
                            return loc ? loc.id : '';
                        } )
                    } ) ).then( function( response ) {
                        var data = response.data;
                        self.locationIds( data && data.locationIds || [] );
                    } ).catch( function( err ) {
                        Y.log( 'could not save locations ' + err, 'warn', NAME );
                        handleError( err );
                    } );
                },
                createCertificate: function( data ) {
                    var self = this;
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.kvcaccount.createCertificate( {
                        kvcAccountId: peek( self._id ),
                        pin: data.newPin
                    } ) ).then( function( response ) {
                        var account = response.data;
                        if( account ) {
                            self.set( 'data', account );
                        }
                    } );
                },
                refreshCsrStatus: function() {
                    var self = this;
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.kvcaccount.refreshCsrStatus( {
                        kvcAccountId: peek( self._id )
                    } ) ).then( function( response ) {
                        var account = response.data;
                        if( account ) {
                            self.set( 'data', account );
                        }
                    } );
                },
                deleteCertificate: function() {
                    var self = this;
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.kvcaccount.deleteCertificate( {
                        kvcAccountId: peek( self._id )
                    } ) ).then( function( response ) {
                        var account = response.data;
                        if( account ) {
                            self.set( 'data', account );
                        }
                    } );
                },
                handleError: function( response ) {
                    var self = this,
                        message;

                    if( response.code || response.message ) {
                        message = response.code ? Y.doccirrus.errorTable.getMessage( {code: response.code} ) : response.message;
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: message
                        } );
                        self.set( 'data', self.get( 'initialData' ) );
                        Y.log( 'an error occurred: ' + message, 'warn', NAME );
                    } else {
                        Y.log( 'an error occurred: ' + response, 'warn', NAME );
                    }
                },
                destructor: function KvcAccountModel_destructor() {
                    var
                        self = this;
                    Y.log( 'KvcAccountModel_destructor ' + self, 'info', NAME );
                }
            },
            {
                schemaName: 'kvcaccount',
                NAME: 'KvcAccountModel'
            } );

        KoViewModel.registerConstructor( KvcAccountModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'kvcaccount-schema'
        ]
    }
);