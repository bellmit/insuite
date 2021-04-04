/**
 * User: pi
 * Date: 21/01/16  14:20
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko  */

'use strict';

YUI.add( 'ReferralModel', function( Y, NAME ) {
        /**
         * @module ReferralModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' ),

            //peek = ko.utils.peekObservable,
            unwrap = ko.unwrap;

        /**
         * @class ReferralModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function ReferralModel( config ) {
            ReferralModel.superclass.constructor.call( this, config );
        }

        ReferralModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            kbvSpecialities: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( ReferralModel, FormBasedActivityModel, {

                _diagnosesCharsRemaining: null,
                _medicationsCharsRemaining: null,
                _findingsCharsRemaining: null,

                initializer: function ReferralModel_initializer( ) {
                    var
                        self = this;

                    self.initReferralModel();
                },
                destructor: function ReferralModel_destructor() {
                },
                initReferralModel: function ReferralModel_initReferralModel() {
                    var
                        self = this,
                        caseFolder = self.get( 'caseFolder' ),
                        asvContext = caseFolder && 'ASV' === caseFolder.additionalType,
                        isSwissCaseFolder = caseFolder && Y.doccirrus.schemas.casefolder.isSwissCaseFolderType( caseFolder.type );
                    
                    // force form to be rendered if eTS fields change because they affact 'auftrag' rendering
                    self.addDisposable( ko.computed( function() {
                        self.eTSArrangementCode();
                        self.eTSAErrorMessage();
                        if( self._isEditable() ) {
                            self.auftrag.valueHasMutated();
                        }
                    } ) );

                    self._asvContext = ko.observable( asvContext );

                    if( self.isNew() ) {
                        if( asvContext ) {
                            self.asvTeamReferral( true );
                        }
                    }

                    //  Update medication, diagnosis and findings text on change of linked activities

                    self._displayDiagnoses = ko.computed( function() {
                        var
                            text = '',
                            icds = unwrap( self._icdsObj || [] ),
                            len = icds.length,
                            diagnosisCert,
                            diagnosisSite;

                        //  change on update to icds
                        self.icds();

                        icds.forEach( function( icd, index ) {
                            diagnosisCert = Y.doccirrus.kbvcommonutils.mapDiagnosisCert( icd.diagnosisCert );
                            diagnosisSite = icd.diagnosisSite ? icd.diagnosisSite[0] : '';
                            text += icd.code + ' ' + (diagnosisCert ? ( diagnosisCert + ' ') : '') + (diagnosisCert ? ( diagnosisSite + ' ') : '') + (icd.content + ((index === len - 1) ? '' : '\n'));
                        } );

                        return text.trim();  //  two lines on form
                    } );

                    self._displyFindings = ko.computed( function() {
                        var
                            findings = '',
                            activities = unwrap( self._activitiesObj || []);

                        //  change on update to linked activities
                        self.activities();

                        activities.forEach( function( activity ) {
                            if( 'FINDING' === activity.actType && activity.userContent ) {
                                findings += activity.userContent + '\n';
                            }
                        } );
                        findings =  (findings.length ? findings : '');
                        return findings.trim();
                    } );

                    self._displyMedications = ko.computed( function() {
                        var
                            medications = '',
                            activities = unwrap( self._activitiesObj || [] );

                        //  change on update to linked activities
                        self.activities();

                        activities.forEach( function( activity ) {
                            if( 'MEDICATION' === activity.actType && activity.phNLabel ) {
                                medications += activity.phNLabel + '\n';
                            }
                        } );
                        medications = (medications.length ? medications : '' + '\n');
                        return medications.trim();
                    } );

                    //  Note - Swiss referral editor does not use a mask to fill in BFB form - MOJ-13433
                    //  The following fields should not be populated on ReferralCH due to validation issues

                    self._updateDiagnosesText = self._displayDiagnoses.subscribe( function() {
                        if ( !self._isEditable() || isSwissCaseFolder ) { return; }
                        self.diagnosesText( self._displayDiagnoses() );
                    } );

                    self._updateMedicationsText = self._displyMedications.subscribe( function() {
                        if ( !self._isEditable() || isSwissCaseFolder ) { return; }
                        self.medicationsText( self._displyMedications() );
                    } );

                    self._updateFindingsText = self._displyFindings.subscribe( function() {
                        if ( !self._isEditable() || isSwissCaseFolder ) { return; }
                        self.findingsText( self._displyFindings() );
                    } );

                    //  set an initial labRequestId (prevent extra save after activity-process sets it) MOJ-7633
                    if ( !ko.unwrap( self.labRequestId ) ) {
                        self.labRequestId( Y.doccirrus.utils.generateLabRequestId() );
                        Y.log( 'Initialized labRequestId: ' + self.labRequestId(), 'debug', NAME );
                    }

                },

                /**
                 *  Receive updates from the form
                 *  @private
                 */

                _writeBack: function( template, element ) {
                    var self = this;

                    switch( element.schemaMember ) {

                        //  text elements

                        case 'auftrag':
                            self.auftrag( element.value );
                            break;

                        case 'BFB6findingsText':
                        case 'findingsText':
                            self.findingsText( element.value );
                            break;

                        case 'BFB6medicationsText':         //  deliberate fallthrough
                        case 'medicationsText':
                            self.medicationsText( element.value );
                            break;

                        case 'BFB6diagnosesText':
                        case 'diagnosesText':
                        case 'referralDiagnosesText':
                            self.diagnosesText( element.value );
                            break;

                        //  checkboxes

                        case 'fk4202':
                            self.fk4202( element.unmap() );
                            break;

                        case 'fk4204':
                            self.fk4204( element.unmap() );
                            break;

                        case 'behandlungGemaess':
                            self.behandlungGemaess( element.unmap() );
                            break;
                    }
                }
            },

            {
                schemaName: 'v_referral',
                NAME: 'ReferralModel'
            }
        );

        KoViewModel.registerConstructor( ReferralModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'v_referral-schema'
        ]
    }
);