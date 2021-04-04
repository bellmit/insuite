/**
 * User: pi
 * Date: 21/01/16  10:45
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*eslint prefer-template:0 strict:0 */
/*global YUI, ko, moment  */

'use strict';

YUI.add( 'AuModel', function( Y/*, NAME */) {
        /**
         * @module AuModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' ),
            i18n = Y.doccirrus.i18n,
            peek = ko.utils.peekObservable;

        /**
         * @class AuModel
         * @constructor
         * @extends FormBasedActivityModel
         * @param   {Object}    config
         */
        function AuModel( config ) {
            AuModel.superclass.constructor.call( this, config );
        }

        AuModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( AuModel, FormBasedActivityModel, {

                initializer: function AuModel_initializer() {
                    var
                        self = this,
                        formId = self.initialConfig && self.initialConfig.data && self.initialConfig.data.formId;
                    self.initAuModel();
                    if( formId && '' !== formId ) {
                        self.formId( formId );
                    }
                },
                destructor: function AuModel_destructor() {
                },
                initAuModel: function AuModel_initAuModel() {
                    var
                        self = this,
                        today = (new Date()).toISOString(),
                        caseFolder = self.get( 'caseFolder' );
                    self.isSwissAndSwissCaseFolder = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() &&
                                                     Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolder.type];

                    //  necessary to fix a race condition between KO code for lookup up form, and KO code for setting
                    //  casefolder, which then changes which form we need, MOJ-8689
                    self._auFormRole = ko.observable( '' );

                    if( self.isNew() ) {
                        // set default dates
                        self.auVon( today );
                        self.auVorraussichtlichBis( today );
                        self.festgestelltAm( today );

                        self.addDisposable( ko.computed( function() {
                            var
                                lastAuType = self.auType();
                            if( !self.isSwissAndSwissCaseFolder ) {
                                // MOJ-14319: [CASEFOLDER]
                                if( caseFolder && Y.doccirrus.schemas.patient.isPublicInsurance( {type: caseFolder.type} ) ) {
                                    self.auType( 'AU' );
                                    if( 'AU' !== lastAuType ) {
                                        self.setAuForm();
                                    }
                                } else {
                                    //  make AU private and re-initialize form
                                    self.auType( 'AUPRIVAT' );
                                    if( 'AUPRIVAT' !== lastAuType ) {
                                        self.setAuForm();
                                    }
                                }
                            } else {
                                // In Swiss Case Folder currently there is only one form and therefore only one default auType "AU"
                                self.auType( 'AU' );
                                self.setAuForm();
                            }
                        } ) );

                        self.getLatestDiagnosesFromPatientRegardingDaySeparationOfTreatments( today );
                    }

                    self.addDisposable( self.auVon.subscribe( function( newValue ) {
                        var timeZoneOffset = (new Date).getTimezoneOffset(),
                            // if we locate in GTM+0100 then selecting 5 December in datepicker will give us newValue "2019-12-04T23:00:00.000Z"
                            // so we need to add hours to newValue to get "2019-12-05T00:00:00.000Z" so it will resolve day counting mistake
                            timestamp = moment( newValue ).add( timeZoneOffset / -60, 'hours' ).toISOString();

                        self.getLatestDiagnosesFromPatientRegardingDaySeparationOfTreatments( timestamp );
                    } ) );

                    /**
                     * validate those dependencies
                     * - Au_T_auVon
                     */
                    self.addDisposable( ko.computed( function() {
                        self.timestamp();
                        self.auVon.validate();
                    } ).extend({ rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT }) );

                    /**
                     * validate those dependencies
                     * - AU_T_auVorraussichtlichBis
                     */
                    self.addDisposable( ko.computed( function() {
                        self.auVon();
                        self.auVorraussichtlichBis.validate();
                    } ).extend({ rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT }) );

                    /**
                     * validate those dependencies
                     * - AU_T_festgestelltAm
                     */
                    self.addDisposable( ko.computed( function() {
                        self.timestamp();
                        self.festgestelltAm.validate();
                    } ).extend({ rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT }) );
                },
                setAuForm: function() {
                    var
                        self = this,
                        auType = ko.unwrap( self.auType ),
                        formId = ko.unwrap( self.formId );

                    if( auType === 'AU' && !self.isSwissAndSwissCaseFolder ) {
                        self._auFormRole( 'casefile-au' );
                    }

                    if( auType === 'AUPRIVAT' && !self.isSwissAndSwissCaseFolder ) {
                        self._auFormRole( 'casefile-au-privat' );
                    }

                    if( auType === 'AU' && self.isSwissAndSwissCaseFolder ) {
                        self._auFormRole( 'casefile-au-privat-ch' );
                    }

                    // if form preselected, no need to reassign
                    if( !formId ) {
                        self._setFormForActType( self.toJSON(), true );
                    }

                },
                getLatestDiagnosesFromPatientRegardingDaySeparationOfTreatments: function( timestamp ) {
                    var
                        self = this,
                        linkedActivities = self.get( 'icdsObj' ),
                        args = {
                            patientId: peek( self.patientId ),
                            caseFolderId: peek( self.caseFolderId ),
                            locationId: peek( self.locationId ),
                            timestamp: timestamp
                        };

                    Y.doccirrus.jsonrpc.api.activity.getLatestDiagnosesFromPatientRegardingDaySeparationOfTreatments( args )
                        .then( function( response ) {
                            var latestDiagnosesForPatient = response && response.data || null;

                            if( linkedActivities && linkedActivities.length > 0 ) {
                                linkedActivities.forEach( function( activity ) {
                                    if( latestDiagnosesForPatient && !latestDiagnosesForPatient.includes( activity ) ) {
                                        self._unlinkActivity( activity._id );
                                    }
                                } );
                            }
                            if( latestDiagnosesForPatient && latestDiagnosesForPatient.length > 0 ) {
                                latestDiagnosesForPatient.forEach( function( activity ) {
                                    self._linkActivity( activity );
                                } );
                            }
                        } );
                },
                /**
                 *  Called when user links an activity to the AU (generally from casefolder table) MOJ-9749
                 *  @param      {Object}    activity    Plain activity object from CasefileViewModel activities table
                 *  @returns    {Boolean}               False if link should be cancelled/blocked
                 */
                onActivityLinked: function( activity ) {
                    var
                        self = this,
                        caseFolder = self.get( 'caseFolder' );

                    //  only special case is linking UUU diagnosis in GKV casefolder, see MOJ-9749
                    if ( 'DIAGNOSIS' !== ko.unwrap( activity.actType ) ) { return true; }
                    if ( 'UUU' !== ko.unwrap( activity.code ) ) { return true; }
                    // MOJ-14319: [OK] [CASEFOLDER]
                    if ( !Y.doccirrus.schemas.patient.isPublicInsurance( {type: ko.unwrap( caseFolder.type )} ) ) { return true; }

                    Y.doccirrus.DCWindow.notice( {
                        type: 'notice',
                        message: i18n( 'InCaseMojit.AUEditorModel.DIAGNOSIS_UUU_NOT_ALLOWED' ),
                        window: {
                            width: Y.doccirrus.DCWindow.SIZE_LARGE
                        }
                    } );
                    return false;
                },
                /**
                 *  When the form is changed, values in the activity may need to be updated
                 *
                 *  @param  {Object}    template    Form template (current activiy's form)
                 *  @param  {Object}    element     Form element which has changed
                 *  @private
                 */
                _writeBack: function( template, element ) {
                    var self = this,
                    date;

                    switch( element.schemaMember ) {

                        //  text values

                        case 'massnahmen':
                            self.massnahmen( element.value );
                            break;

                        case 'diagnosesAdd':
                            self.diagnosesAdd( element.value );
                            break;

                        //  mask checkboxes

                        case 'sonstigerUnf':
                            self.sonstigerUnf( element.unmap() );
                            break;

                        case 'bvg':
                            self.bvg( element.unmap() );
                            break;

                        case 'rehab':
                            self.rehab( element.unmap() );
                            break;

                        case 'reintegration':
                            self.reintegration( element.unmap() );
                            break;

                        case 'arbeitsunfall':
                            self.arbeitsunfall( element.unmap() );
                            break;

                        case 'durchgangsarzt':
                            self.durchgangsarzt( element.unmap() );
                            break;

                        case 'krankengeld':
                            self.krankengeld( element.unmap() );
                            break;

                        case 'endBesch':
                            self.endBesch( element.unmap() );
                            break;

                        case 'auVon': {
                            date = element && element.getValue && element.getValue();
                            if( date && date.length !== 6 ) {
                                self.auVon( moment( date ).toISOString() );
                            }
                            break;
                        }

                        case 'auVorraussichtlichBis':
                            date = element && element.getValue && element.getValue();
                            if( date && date.length !== 6 ) {
                                self.auVorraussichtlichBis( moment( date ).toISOString() );
                            }
                            break;

                        case 'festgestelltAm':
                            date = element && element.getValue && element.getValue();
                            if( date && date.length !== 6 ) {
                                self.festgestelltAm( moment( date ).toISOString() );
                            }
                            break;
                    }
                }
            },
            {
                schemaName: 'v_au',
                NAME: 'AuModel'
            }
        );

        KoViewModel.registerConstructor( AuModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'ko-bindingHandlers',
            'KoViewModel',
            'FormBasedActivityModel',
            'v_au-schema'
        ]
    }
)
;
