/**
 * User: do
 * Date: 13/07/16  09:00
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko  */

'use strict';

YUI.add( 'KBVUtility2Model', function( Y/*, NAME */ ) {
        /**
         * @module KBVUtility2Model
         */

        var
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' );

        /**
         * @class KBVUtility2Model
         * @constructor
         * @extends FormBasedActivityModel
         */
        function KBVUtility2Model( config ) {
            KBVUtility2Model.superclass.constructor.call( this, config );
        }

        KBVUtility2Model.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            sdhm: {
                value: false,
                lazyAdd: false
            },
            ignoreModificationsOn: {
                value: [
                    'editor',
                    'u_extra',
                    'attachedMedia',
                    'content',
                    'userContent',
                    'status',
                    'catalogRef',
                    'utIcdRef',
                    'utSecondIcdRef'
                ],
                cloneDefaultValue: true,
                lazyAdd: false
            }
        };

        Y.extend( KBVUtility2Model, FormBasedActivityModel, {

                initializer: function KBVUtility2Model_initializer() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        incaseconfiguration = binder.getInitialData( 'incaseconfiguration' );

                    self.warnings = ko.observableArray();
                    self.hasWarnings = ko.computed( function() {
                        return self.warnings().length;
                    } );

                    self.nestedFieldsSubscription = ko.computed( function() {
                        var result = peek( self.status );
                        if( ['CREATED', 'VALID'].indexOf( unwrap( self.status ) ) === -1 ) {
                            return;
                        }
                        self.ut2ConductionSymptoms().forEach( function( entry ) {
                            result += unwrap( entry.code );
                            result += unwrap( entry.name );
                        } );
                        self.ut2ConductionSymptoms().forEach( function( entry ) {
                            result += unwrap( entry.code );
                            result += unwrap( entry.name );
                        } );
                        self.ut2Remedy1List().concat( self.ut2Remedy2List() ).forEach( function( entry ) {
                            result += unwrap( entry.name );
                            result += unwrap( entry.text );
                            result += unwrap( entry.units );
                        } );
                        return result;
                    } );

                    if( self.isNew() ) {
                        if( incaseconfiguration && incaseconfiguration.kbvutility2DefaultForChapter ) {
                            self.ut2Chapter( incaseconfiguration.kbvutility2DefaultForChapter );
                        }
                        if( incaseconfiguration && incaseconfiguration.kbvutility2DefaultForHomeVisit ) {
                            self.utHomeVisit( incaseconfiguration.kbvutility2DefaultForHomeVisit );
                        }
                        if( incaseconfiguration && incaseconfiguration.kbvutility2DefaultForTherapyReport ) {
                            self.utTherapyReport( incaseconfiguration.kbvutility2DefaultForTherapyReport );
                        }
                    }

                },
                invalidate: function( isValid, key ) {
                    var self = this;
                    self._validStateMap.remove( key );
                    if( !isValid ) {
                        self._validStateMap.push( key );
                    }
                },
                createDiagnoses: function() {
                    var
                        self = this,
                        baseObj = {
                            timestamp: peek( self.timestamp ),
                            patientId: peek( self.patientId ),
                            employeeId: peek( self.employeeId ),
                            locationId: peek( self.locationId ),
                            caseFolderId: peek( self.caseFolderId )
                        },
                        utIcdCode = peek( self.utIcdCode ),
                        utIcdRef = peek( self.utIcdRef ),
                        utSecondIcdCode = peek( self.utSecondIcdCode ),
                        utSecondIcdRef = peek( self.utSecondIcdRef ),
                        diagnosesToCreate = [];

                    if( utIcdCode && !utIcdRef ) {
                        diagnosesToCreate.push( Object.assign( {
                            code: utIcdCode,
                            userContent: peek( self.utIcdText )
                        }, baseObj ) );
                    }

                    if( utSecondIcdCode && !utSecondIcdRef ) {
                        diagnosesToCreate.push( Object.assign( {
                            code: utSecondIcdCode,
                            userContent: peek( self.utSecondIcdText ),
                            isSecond: true
                        }, baseObj ) );
                    }

                    if( 0 === diagnosesToCreate.length ) {
                        return Promise.resolve( {confirmed: true} );
                    }

                    return new Promise( function( resolve ) {
                        Y.doccirrus.modals.kbvutilityDiagnosesCreationModal.showDialog( {data: diagnosesToCreate}, function( result ) {
                            if( result && result.utIcdRef ) {
                                self.utIcdRef( result.utIcdRef );
                            }
                            if( result && result.utSecondIcdRef ) {
                                self.utSecondIcdRef( result.utSecondIcdRef );
                            }
                            resolve( {confirmed: true} );
                        } );
                    } );
                },
                showWarnings: function() {
                    var self = this;
                    var message = self.warnings().join( '\n' );
                    if( message.length ) {
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: peek( self._id ),
                            content: message,
                            level: 'WARNING'
                        } );
                    }
                },
                destructor: function KBVUtility2Model_destructor() {
                }
            },
            {
                schemaName: 'v_kbvutility2',
                NAME: 'KBVUtility2Model'
            }
        );

        KoViewModel.registerConstructor( KBVUtility2Model );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'dcregexp',
            'FormBasedActivityModel',
            'activity-api',
            'kbvutility-diagnoses-creation-modal'
        ]
    }
);