/**
 * User: do
 * Date: 20/03/17  18:55
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'OmimChainItemModel', function( Y/*, NAME*/ ) {
        /**
         * @module OmimChainItemModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class OmimChainItemModel
         * @constructor
         * @extends KoViewModel
         */
        function OmimChainItemModel( config ) {
            OmimChainItemModel.superclass.constructor.call( this, config );
        }

        OmimChainItemModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( OmimChainItemModel, KoViewModel.getBase(), {

                initializer: function OmimChainItemModel_initializer() {
                    var self = this,
                        omimG = self.omimG(),
                        genName = self.genName(),
                        omimP = self.omimP(),
                        desc = self.desc();

                    self.omimG2 = ko.observable( omimG ? {omimG: omimG} : null );
                    self.genName2 = ko.observable( genName ? {genName: genName} : null );
                    self.omimP2 = ko.observable( omimP ? {omimP: omimP} : null );
                    self.desc2 = ko.observable( desc ? {desc: desc} : null );

                    self.addDisposable( ko.computed( function() {
                        var data = self.omimG2();
                        if( ko.computedContext.isInitial() ) {
                            return;
                        }
                        if( data ) {
                            self.omimG( data.omimG );
                            self.genName( data.genName );
                            self.omimP( data.omimP );
                            self.desc( data.desc );

                            self.genName2( data );
                            self.omimP2( data );
                            self.desc2( data );
                        }
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var data = self.genName2();
                        if( ko.computedContext.isInitial() ) {
                            return;
                        }
                        if( data ) {
                            self.omimG( data.omimG );
                            self.genName( data.genName );
                            self.omimP( data.omimP );
                            self.desc( data.desc );

                            self.omimG2( data );
                            self.omimP2( data );
                            self.desc2( data );
                        }
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var data = self.omimP2();
                        if( ko.computedContext.isInitial() ) {
                            return;
                        }
                        if( data ) {
                            self.omimG( data.omimG );
                            self.genName( data.genName );
                            self.omimP( data.omimP );
                            self.desc( data.desc );

                            self.omimG2( data );
                            self.genName2( data );
                            self.desc2( data );
                        }
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var data = self.desc2();
                        if( ko.computedContext.isInitial() ) {
                            return;
                        }
                        if( data ) {
                            self.omimG( data.omimG );
                            self.genName( data.genName );
                            self.omimP( data.omimP );
                            self.desc( data.desc );

                            self.omimG2( data );
                            self.genName2( data );
                            self.omimP2( data );
                        }
                    } ) );
                },
                destructor: function Fk4235Model_destructor() {
                }
            },
            {
                schemaName: 'omimchain.chain',
                NAME: 'OmimChainItemModel'
            }
        );
        KoViewModel.registerConstructor( OmimChainItemModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'activity-schema',
            'severity-schema',
            'marker-schema'
        ]
    }
)
;