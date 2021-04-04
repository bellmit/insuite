/**
 * User: pi
 * Date: 11/12/15  11:50
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment  */

'use strict';

YUI.add( 'GKVScheinModel', function( Y ) {
        /**
         * @module GKVScheinModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            mixin = Y.doccirrus.api.activity.getFormBasedActivityAPI();

        /**
         * @abstract
         * @class GKVScheinModel
         * @constructor
         * @extends ScheinModel
         */
        function GKVScheinModel( config ) {
            GKVScheinModel.superclass.constructor.call( this, config );
        }

        GKVScheinModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( GKVScheinModel, KoViewModel.getConstructor( 'ScheinModel' ), {

                initializer: function GKVScheinModel_initializer() {
                    var
                        self = this;
                    self.initGKVScheinModel();
                },
                destructor: function GKVScheinModel_destructor() {
                },
                initGKVScheinModel: function GKVScheinModel_initGKVScheinModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        locations = binder.getInitialData( 'location' );

                    // Subscribe to revalidate
                    self.addDisposable( ko.computed( function() {
                        unwrap( self.scheinType );
                        unwrap( self.scheinSubgroup );
                        self.revalidate();

                    } ) );

                    self.currentLocation = ko.computed( function() {
                        var
                            locationId = unwrap( self.locationId ) || '',
                            location = (locations || []).find( function( item ) {
                                return item._id === locationId;
                            } );

                        return location;
                    } );

                    self.addDisposable( ko.computed( function() {
                        var
                            location = self.currentLocation();

                        if( location ) {
                            self.fk5098( location.commercialNo );
                        }
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            employee = unwrap( self.employee );

                        if( employee ) {
                            self.fk5099(employee.officialNo);
                        }
                    } ) );

                    /**
                     * validate those dependencies
                     */
                    self.addDisposable( ko.computed( function() {
                        unwrap( self.fk4219 );
                        unwrap( self.scheinRemittor );
                        unwrap( self.scheinEstablishment );
                        unwrap( self.fk4219.validate );
                        self.scheinRemittor.validate();
                        self.scheinEstablishment.validate();
                    } ).extend( { rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT } ) );
                    /**
                     * validate those dependencies
                     */
                    self.addDisposable( ko.computed( function() {
                        unwrap( self.fk4217 );
                        unwrap( self.fk4241 );
                        self.fk4217.validate();
                        self.fk4241.validate();
                    } ).extend( { rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT } ) );

                    /**
                     * sync scheinQuarter and scheinYear with schein timestamp
                     */
                    self.addDisposable( ko.computed( function() {
                        var timestamp = unwrap( self.timestamp ),
                            date = moment( timestamp );
                        self.scheinQuarter( date.quarter().toString() );
                        self.scheinYear( date.year().toString() );
                    } ) );

                    self.addDisposable( self.timestamp.subscribe( function( newValue ) {
                        var
                            fk4235Set = unwrap( self.fk4235Set ),
                            fk4244Set, fk4256Set;
                        if( fk4235Set && 0 < fk4235Set.length ) {
                            fk4244Set = fk4235Set[ 0 ].fk4244Set();
                            fk4256Set = fk4235Set[ 0 ].fk4256Set();
                            if( fk4244Set && 0 < fk4244Set.length ) {
                                fk4244Set.forEach( function( bl ) {
                                    Y.doccirrus.jsonrpc.api.activity.countBLFrom( {
                                        query: {
                                            timestamp: newValue,
                                            code: bl.fk4244(),
                                            _id: self._id,
                                            patientId: peek( self.patientId ),
                                            actType: 'TREATMENT',
                                            activities: peek( self.activities ),
                                            scheinType: peek( self.actType ),
                                            caseFolderId: peek( self.caseFolderId )
                                        }
                                    } )
                                        .done( function( response ) {
                                            bl.fk4246( (isNaN( +response.data )) ? 0 : response.data );
                                        } )
                                        .fail( function() {
                                            bl.fk4246( 0 );
                                        } );
                                } );
                            }
                            if( fk4256Set && 0 < fk4256Set.length ) {
                                fk4256Set.forEach( function( bl ) {
                                    Y.doccirrus.jsonrpc.api.activity.countBLFrom( {
                                        query: {
                                            timestamp: newValue,
                                            code: bl.fk4244(),
                                            _id: self._id,
                                            patientId: peek( self.patientId ),
                                            actType: 'TREATMENT',
                                            activities: peek( self.activities ),
                                            scheinType: peek( self.actType ),
                                            caseFolderId: peek( self.caseFolderId )
                                        }
                                    } )
                                        .done( function( response ) {
                                            bl.fk4246( (isNaN( +response.data )) ? 0 : response.data );
                                        } )
                                        .fail( function() {
                                            bl.fk4246( 0 );
                                        } );
                                } );
                            }
                        }

                    } ) );

                }
            },
            {
                schemaName: 'v_gkv_schein',
                NAME: 'GKVScheinModel'
            }
        );

        Y.mix( GKVScheinModel, mixin, false, Object.keys( mixin ), 4 );

        KoViewModel.registerConstructor( GKVScheinModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ScheinModel',
            'v_gkv_schein-schema'
        ]
    }
)
;