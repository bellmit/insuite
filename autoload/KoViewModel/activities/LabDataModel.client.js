/**
 * User: pi
 * Date: 22/01/16  11:05
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko  */

'use strict';

YUI.add( 'LabDataModel', function( Y/*, NAME */ ) {
        /**
         * @module LabDataModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable;

        /**
         * @class LabDataModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function LabDataModel( config ) {
            LabDataModel.superclass.constructor.call( this, config );
        }

        LabDataModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            defaultLabTestTypes: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( LabDataModel, FormBasedActivityModel, {

                initializer: function LabDataModel_initializer() {
                    var
                        self = this;

                    //  labdata has its own state, overriding default default state listeners, we need to subscribe
                    //  to the following fields to know when the activity should be saved:

                    self._labdataInitialState = {};
                    self._subscribeLabdataProp = {};

                    self._mutableInUI = [
                        'userContent',
                        'apkState',
                        'locationId',
                        'employeeId',
                        'timestamp',
                        'subType'
                    ];

                    self.initLabDataModel();
                },
                destructor: function LabDataModel_destructor() {
                    var self = this;
                    self._mutableInUI.forEach( function( propName ) {
                        self._subscribeLabdataProp[ propName ].dispose();
                    } );
                },
                testsData: null,
                initLabDataModel: function LabDataModel_initLabDataModel() {
                    var
                        self = this;
                    self.isTestsDataValid = ko.observable( true );
                    self.isTestsDataModified = ko.observable( false );

                    self._initComputeStatus();
                },
                isModified: function() {
                    var
                        self = this,
                        //  MOJ-9266 isModified does not always correctly receive updates after save for this act type
                        original = LabDataModel.superclass.isModified.apply( self, arguments ),
                        // original = ( 'CREATED' === ko.unwrap( self.status ) ),
                        testsModified = unwrap( self.isTestsDataModified );

                    return original || testsModified;
                },
                isValid: function() {
                    var
                        self = this,
                        original = LabDataModel.superclass.isValid.apply( self, arguments );
                    return original && unwrap( self.isTestsDataValid );
                },
                getTestsData: function() {
                    var
                        self = this,
                        result;
                    if( self.testsData ) {
                        result = peek( self.testsData ).map( function( item ) {
                            var
                                result = item.toJSON();
                            delete result._id;
                            return result;
                        } );
                    }
                    return result;
                },
                /**
                 * @override
                 */

                _initComputeStatus: function() {
                    var
                        self = this;

                    //  subscribe to changes in lab findings

                    self.addDisposable( ko.computed( function() {
                        var
                            isModified = self.isModified(),
                            status = unwrap( self.status ),
                            isTestsDataModified = unwrap( self.isTestsDataModified );
                        /**
                         * When model is considered modified, status is set to 'CREATED'.
                         * If not modified initial status is reapplied.
                         */

                        if( isModified || isTestsDataModified ) {
                            if( !('CREATED' === status || 'INVALID' === status) ) {
                                self.status( 'CREATED' );
                            }
                        }
                        else {
                            self.status( self.get( 'data.status' ) || 'CREATED' );
                        }

                    } ).extend( { rateLimit: 0 } ) );

                    //  directly subscribe to mutable fields to replace overridden listener for dirty state
                    self._mutableInUI.forEach( function( propName ) { self._watchMutableState( propName ); } );
                },

                _watchMutableState: function( propName ) {
                    var self = this;
                    self._labdataInitialState[ propName ]= ko.unwrap( self[propName] );
                    self._subscribeLabdataProp[ propName ] = self[ propName ].subscribe( function __labdataMutableListener( newVal ) {
                        if ( newVal !== self._labdataInitialState[ propName ] && 'VALID' === unwrap( self.status ) ) {
                            self.status( 'CREATED' );
                        }
                    } );
                },

                toJSON: function() {

                    var
                        self = this,
                        data = LabDataModel.superclass.toJSON.apply( self, arguments ),
                        testsData = self.getTestsData();
                    if( testsData ) {
                        data.l_extra = data.l_extra || {};
                        data.l_extra.testId = testsData || [];
                    }
                    return data;

                },
                setNotModified: function() {
                    var
                        self = this,
                        testsData = peek( self.testsData );
                    LabDataModel.superclass.setNotModified.apply( self, arguments );
                    if( testsData && testsData.length ) {
                        testsData.forEach( function( medTestModel ) {
                            var
                                data = medTestModel.toJSON();
                            data._id = '_id';
                            medTestModel.set( 'data', data );
                            medTestModel.setNotModified();
                        } );
                    }
                    if( self.isTestsDataModified ) {
                        self.isTestsDataModified( false );
                    }

                }
            },
            {
                schemaName: 'v_labdata',
                NAME: 'LabDataModel'
            }
        );

        KoViewModel.registerConstructor( LabDataModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'FormBasedActivityModel',
            'v_labdata-schema'
        ]
    }
);