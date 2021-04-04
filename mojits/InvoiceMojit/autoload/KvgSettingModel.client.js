/**
 * User: oliversieweke
 * Date: 29.01.19  10:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko */

YUI.add( 'KvgSettingModel', function( Y/*, NAME*/ ) {
        /**
         * @module KvgSettingModel
         */

        var
            cid = 0,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel;

        function KvgSettingModel( config ) {
            KvgSettingModel.superclass.constructor.call( this, config );
        }

        KvgSettingModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( KvgSettingModel, KoViewModel.getBase(), {
                initializer: function KvgSettingModel_initializer() {
                    var self = this;

                    self.cid = ++cid;

                    self.buttonDeleteTextI18n = i18n('general.button.DELETE');
                    self.physiciansI18n = i18n( 'invoiceconfiguration-schema.PadxSetting_T.physicians' );
                    self.locationsI18n = i18n( 'invoiceconfiguration-schema.PadxSetting_T.locations' );
                    self.billerI18n = i18n( 'invoiceconfiguration-schema.KvgSetting_T.biller' );
                    self.billerEqualToProviderI18n = i18n( 'invoiceconfiguration-schema.KvgSetting_T.billerEqualToProvider' );

                    var locationI18n = i18n( 'invoiceconfiguration-schema.KvgSetting_T.location' );
                    var physicianI18n = i18n( 'invoiceconfiguration-schema.KvgSetting_T.physician' );
                    var BILLER_EMPTY = i18n( 'validations.message.BILLER_EMPTY' );


                    var cachedBiller = self.biller(); // The biller is saved in a variable so that the user does not have to select him again when changing his mind
                    self.billerEqualToProvider.subscribe( function( billerEqualToProvider ) {
                        if( billerEqualToProvider ) {
                            cachedBiller = self.biller();
                            self.biller( undefined );
                        } else {
                            self.biller( cachedBiller );
                        }
                    } );

                    // Error handling has to be set up manually for sub documents.
                    self.biller.hasError = ko.computed( function() {
                        var biller = ko.unwrap( self.biller );
                        var billerEqualToProvider = ko.unwrap( self.billerEqualToProvider );
                        return !biller && !billerEqualToProvider;
                    } );
                    self.biller.validationMessages = ko.computed( function() {
                        if( ko.unwrap( self.biller.hasError ) ) {
                            return [BILLER_EMPTY];
                        } else {
                            return [];
                        }
                    } );
                    self.biller.subscribe( function() {
                        self.billerEqualToProvider.validate();
                    } );

                    self.select2Physicians = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                return self.employees().map( function( physician ) {
                                    return {
                                        id: peek( physician._id ),
                                        text: peek( physician.lastname ) + ', ' + peek( physician.firstname )
                                    };
                                } );
                            },
                            write: function( $event ) {
                                if( $event.added ) {
                                    self.employees.push( Object.assign( {}, $event.added, {
                                        _id: $event.added.id,
                                        billingRole: ['MEDICAL', 'TECHNICAL']
                                    } ) );
                                }
                                if( $event.removed ) {
                                    self.employees.remove( function( item ) {
                                        return item._id() === $event.removed.id;
                                    } );
                                }
                            }
                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            multiple: true,
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.employee.read( {query: {type: 'PHYSICIAN', countryMode: "CH"}} )
                                    .done( function( response ) {
                                        var results;
                                        if( response && Array.isArray( response.data ) ) {
                                            results = response.data.map( function( item ) {
                                                return {
                                                    id: item._id,
                                                    text: item.lastname + ', ' + item.firstname,
                                                    firstname: item.firstname,
                                                    lastname: item.lastname
                                                };
                                            } );

                                            query.callback( {results: results} );
                                        } else {
                                            throw new Error();
                                        }
                                    } )
                                    .fail( function( err ) {
                                        return Y.doccirrus.DCWindow.notice( {
                                            message: Y.doccirrus.errorTable.getMessage( err )
                                        } );
                                    } );
                            }
                        }
                    };

                    self.select2Locations = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                return self.locations().map( function( location ) {
                                    return {
                                        id: peek( location._id ),
                                        text: peek( location.locname )
                                    };
                                } );
                            },
                            write: function( $event ) {
                                if( $event.added ) {
                                    self.locations.push( Object.assign( {}, $event.added, {
                                        _id: $event.added.id
                                    } ) );
                                }
                                if( $event.removed ) {
                                    self.locations.remove( function( item ) {
                                        return item._id() === $event.removed.id;
                                    } );
                                }
                            }
                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            allowEmpty: true,
                            multiple: true,
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.location.read( {query: {countryMode: "CH"}} ).done( function( response ) {
                                        var results;
                                        if( response && Array.isArray( response.data ) ) {
                                            results = response.data.map( function( item ) {
                                                return {
                                                    id: item._id,
                                                    text: item.locname,
                                                    locname: item.locname,
                                                    commercialNo: item.commercialNo
                                                };
                                            } );

                                            query.callback( {results: results} );
                                        } else {
                                            throw new Error();
                                        }
                                    }
                                ).fail( function( err ) {
                                    return Y.doccirrus.DCWindow.notice( {
                                        message: Y.doccirrus.errorTable.getMessage( err )
                                    } );
                                } );
                            }
                        }
                    };

                    self.select2Biller = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var biller = self.biller();

                                if( biller ) {
                                    return {
                                        _id: peek( biller._id ),
                                        text: peek( biller.name )
                                    };
                                } else {
                                    return '';
                                }
                            },
                            write: function( $event ) {
                                if( !$event.val ) {
                                    self.biller( undefined );
                                }

                                if( $event.added ) {

                                    self.biller( {
                                        _id: $event.added.id,
                                        name: $event.added.text,
                                        glnNumber: $event.added.glnNumber
                                    } );
                                }
                            }

                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.biller.read( {query: {countryMode: "CH"}} )
                                    .done( function( response ) {
                                        var results;
                                        if( response && Array.isArray( response.data ) ) {
                                            results = response.data.map( function( item ) {
                                                var text;
                                                if( item.locname ) {
                                                    text = item.locname + ' (' + locationI18n + ')';
                                                } else {
                                                    text = item.lastname + ', ' + item.firstname + ' (' + physicianI18n + ')';
                                                }
                                                return {
                                                    id: item._id,
                                                    text: text,
                                                    glnNumber: item.glnNumber
                                                };
                                            } );

                                            query.callback( {results: results} );
                                        } else {
                                            throw new Error();
                                        }
                                    } )
                                    .fail( function( err ) {
                                        return Y.doccirrus.DCWindow.notice( {
                                            message: Y.doccirrus.errorTable.getMessage( err )
                                        } );
                                    } );
                            }
                        }
                    };
                },
                deleteKvgSetting: function( data, item ) {
                    data.kvgSettings.remove( function( kvgSetting ) {
                        return kvgSetting.clientId === item.clientId;
                    } );
                }
            },
            {
                schemaName: 'invoiceconfiguration.kvgSettings',
                NAME: 'KvgSettingModel'
            } );

        KoViewModel.registerConstructor( KvgSettingModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'invoiceconfiguration-schema'
        ]
    }
);