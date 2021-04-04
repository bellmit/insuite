/**
 * User: pi
 * Date: 22/05/15  16:18
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'AppTokenModel', function( Y/*, NAME */ ) {
        /**
         * @module AppTokenModel
         */
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
            comctlLib = Y.doccirrus.comctlLib;

        function AppTokenModel( config ) {
            AppTokenModel.superclass.constructor.call( this, config );
        }

        Y.extend( AppTokenModel, KoViewModel.getBase(), {

                initializer: function AppTokenModel_initializer() {
                    var
                        self = this;
                    self.initAppTokenModel();
                },
                destructor: function AppTokenModel_destructor() {
                },
                initAppTokenModel: function AppTokenModel_initAppTokenModel() {
                    const
                        self = this;
                    self.select2Type = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                const
                                    type = ko.unwrap( self.type );
                                if( !type ) {
                                    return type;
                                }
                                return {
                                    id: type,
                                    text: Y.doccirrus.schemaloader.translateEnumValue( 'i18n', type, Y.doccirrus.schemas.apptoken.types.AppTokenType_E.list, '' )
                                };
                            },
                            write: function( $event ) {
                                self.type( $event.value );
                            }
                        } ) ),
                        select2: {
                            data: function() {
                                return {
                                    results: Y.doccirrus.schemas.apptoken.types.AppTokenType_E.list.map( function(item){return {
                                        id: item.val,
                                        text: item.i18n
                                    };} )
                                };
                            }
                        }
                    };

                    self.refreshBtn = KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'refreshBtn',
                            icon: 'REFRESH',
                            title: 'refreshBtn',
                            click: function() {
                                self.token( AppTokenModel.generateToken() );
                            }
                        }
                    } );
                },
                save: function() {
                    const
                        data = this.toJSON();
                    return AppTokenModel.save( data );
                }
            },
            {
                save: function( data ) {
                    if( data._id ) {
                        return Promise.resolve( Y.doccirrus.jsonrpc.api.apptoken.update( {
                            data: Object.assign( {}, data, { _id: undefined } ),
                            query: {
                                _id: data._id
                            }
                        } ) );
                    } else {
                        return Promise.resolve( Y.doccirrus.jsonrpc.api.apptoken.create( {
                            data: data
                        } ) );
                    }
                },
                deleteEntry: function( params ) {
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.apptoken.delete( {
                        query: params.query
                    } ) );
                },
                generateToken: function() {
                    return comctlLib.getRandomString( 64, '#aA' );
                },
                schemaName: 'apptoken',
                NAME: 'AppTokenModel',
                ATTRS: {
                    validatable: {
                        value: true,
                        lazyAdd: false
                    }
                }
            }
        );

        KoViewModel.registerConstructor( AppTokenModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'apptoken-schema',
            'KoComponentManager',
            'KoButton',
            'comctlLib'
        ]
    }
);