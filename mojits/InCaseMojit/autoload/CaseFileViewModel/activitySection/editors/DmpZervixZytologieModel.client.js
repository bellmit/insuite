/**
 * User: florian
 * Date: 21.10.20  16:21
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko*/
YUI.add( 'DmpZervixZytologieModel', function( Y/*, NAME */ ) {
        'use strict';
        /**
         * @module DmpZervixZytologieModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            DmpBaseModel = KoViewModel.getConstructor( 'DmpBaseModel' ),
            unwrap = ko.unwrap;

        /**
         * @abstract
         * @class DmpZervixZytologieModel
         * @constructor
         * @extends DmpBaseModel
         */
        function DmpZervixZytologieModel( config ) {
            DmpZervixZytologieModel.superclass.constructor.call( this, config );
        }

        Y.extend( DmpZervixZytologieModel, DmpBaseModel, {
            initializer: function() {
                var
                    self = this;

                self.initDmpZervixZytologieModel();
            },
            destructor: function() {
            },
            initDmpZervixZytologieModel: function() {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    locations = binder.getInitialData( 'location' );

                self.currentLocation = ko.computed( function() { // current location is a observable any time some the params change the location will change
                    var
                        locationId = unwrap( self.locationId );

                    if( !locationId ) {
                        return null;
                    } else {
                        self.location = locations.filter( function( item ) {
                            return item._id === locationId;
                        } );
                        return self.location[0];
                    }
                } );

                self.dmpPhysicianCommercialNumber = ko.computed( function() {
                    var
                        location = self.currentLocation();

                    if( location ) {
                        return location.commercialNo;
                    }
                } );

                self.dmpPhysicianName = ko.computed( function() {
                    var
                        employee = unwrap( self.employee );

                    if( employee ) {
                        return employee.firstname + ' ' + employee.lastname;
                    }
                } );

                self.addDisposable( ko.computed( function() {
                    var
                        date = unwrap( self.timestamp );

                    if( date ) {
                        self.dmpExaminationDate(date);
                    }
                } ) );

                self.addDisposable( ko.computed( function() {
                    self.dmpZytologicalFinding();
                    self.dmpZytologicalFindingSelection.validate();
                } ) );

                self.addDisposable( ko.computed( function() {
                    self.dmpHistologicalClarification();
                    self.dmpHistologicalClarificationSelection.validate();
                } ) );
            }
        }, {
            schemaName: 'v_dmpzervixzytologie',
            NAME: 'DmpZervixZytologieModel'
        } );
        KoViewModel.registerConstructor( DmpZervixZytologieModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'DmpBaseModel',
            'v_dmpzervixzytologie-schema',
            'activity-schema'
        ]
    }
);