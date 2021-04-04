/**
 * User: dcdev
 * Date: 10/29/20  12:33 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko */

'use strict';

YUI.add( 'PatientGadgetAmts', function( Y ) {

    /**
     * @module PatientGadgetAmts
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadget = KoViewModel.getConstructor( 'PatientGadget' ),
        i18n = Y.doccirrus.i18n;

    /**
     * @constructor
     * @class PatientGadgetAmts
     * @extends PatientGadget
     */
    function PatientGadgetAmts() {
        PatientGadgetAmts.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetAmts, PatientGadget, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.initPatientGadgetAmts();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self._destroyCommunication();
        },

        contract: null,
        amtsBubbleCollectionImage: null,
        GDPRFormApprovedVersion: null,
        amtsApprovalForReleaseFromConfidentiality: null,
        amtsParticipationInSelectiveContract: null,
        amtsApprovalForDataEvaluation: null,

        checkResultI18n: null,
        GDPRFormApprovedVersionLabelI18n: null,
        GDPRFormApprovedVersionTooltipI18n: null,
        amtsApprovalForReleaseFromConfidentialityLabelI18n: null,
        amtsApprovalForReleaseFromConfidentialityTooltipI18n: null,
        amtsParticipationInSelectiveContractLabelI18n: null,
        amtsParticipationInSelectiveContractTooltipI18n: null,
        amtsApprovalForDataEvaluationLabelI18n: null,
        noResultsAvailableI18n: null,
        amtsApprovalForDataEvaluationTooltipI18n: null,

        initPatientGadgetAmts: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient );

            self._initCommunication();

            self.GDPRFormApprovedVersion = ko.observable( false );
            self.amtsApprovalForReleaseFromConfidentiality = ko.observable( false );
            self.amtsParticipationInSelectiveContract = ko.observable( false );
            self.amtsApprovalForDataEvaluation = ko.observable( false );
            self.contract = ko.observable( null );

            self.GDPRFormApprovedVersionLabelI18n = i18n( 'PatientGadget.PatientGadgetAmts.GDPRFormApprovedVersion.Label' );
            self.GDPRFormApprovedVersionTooltipI18n = i18n( 'PatientGadget.PatientGadgetAmts.GDPRFormApprovedVersion.Tooltip' );
            self.amtsApprovalForReleaseFromConfidentialityLabelI18n = i18n( 'PatientGadget.PatientGadgetAmts.amtsApprovalForReleaseFromConfidentiality.Label' );
            self.amtsApprovalForReleaseFromConfidentialityTooltipI18n = i18n( 'PatientGadget.PatientGadgetAmts.amtsApprovalForReleaseFromConfidentiality.Tooltip' );
            self.amtsParticipationInSelectiveContractLabelI18n = i18n( 'PatientGadget.PatientGadgetAmts.amtsParticipationInSelectiveContract.Label' );
            self.amtsParticipationInSelectiveContractTooltipI18n = i18n( 'PatientGadget.PatientGadgetAmts.amtsParticipationInSelectiveContract.Tooltip' );
            self.amtsApprovalForDataEvaluationLabelI18n = i18n( 'PatientGadget.PatientGadgetAmts.amtsApprovalForDataEvaluation.Label' );
            self.noResultsAvailableI18n = i18n( 'PatientGadget.PatientGadgetAmts.noResultsAvailable' );
            self.amtsApprovalForDataEvaluationTooltipI18n = i18n( 'PatientGadget.PatientGadgetAmts.amtsApprovalForDataEvaluation.Tooltip' );
            self.checkResultI18n = i18n( 'PatientGadget.PatientGadgetAmts.i18n' );

            self.amtsBubbleCollectionImage = self.addDisposable( ko.computed( function() {
                var
                    contract = unwrap( self.contract );

                return contract && contract.amtsBubbleCollectionImage;
            } ) );

            self.GDPRFormApprovedVersion( unwrap( currentPatient.GDPRFormApprovedVersion ) );
            self.amtsApprovalForReleaseFromConfidentiality( unwrap( currentPatient.amtsApprovalForReleaseFromConfidentiality ) );
            self.amtsParticipationInSelectiveContract( unwrap( currentPatient.amtsParticipationInSelectiveContract ) );
            self.amtsApprovalForDataEvaluation( unwrap( currentPatient.amtsApprovalForDataEvaluation ) );

            self.loadData();
        },
        _communicationActivitySubscription: null,
        _initCommunication: function() {
            var
                self = this;

            self._communicationActivitySubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'activity',
                callback: function( data/*, meta */ ) {
                    var
                        binder = self.get( 'binder' ),
                        currentPatient = binder && peek( binder.currentPatient ),
                        patientId = currentPatient && peek( currentPatient._id );

                    if( data.some( function( item ) {
                        return item.actType === 'AMTSSCHEIN' && item.patientId === patientId;
                    } ) ) {
                        self.loadData();
                    }
                }
            } );
        },
        _destroyCommunication: function() {
            var
                self = this;

            if( self._communicationActivitySubscription ) {
                self._communicationActivitySubscription.removeEventListener();
                self._communicationActivitySubscription = null;
            }
        },
        loadData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient );

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }

            Y.doccirrus.jsonrpc.api.activity.read( {
                method: 'activity',
                query: {
                    actType: 'AMTSSCHEIN',
                    patientId: peek( currentPatient._id )
                },
                options: {
                    limit: 1
                }
            } ).then( function( response ) {
                if( response && response.data ) {
                    self.contract( response.data[0] );
                }
            } );
        },
        onBubbleImageClick: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                contract = unwrap( self.contract );

            if( binder && binder.navigateToActivity && contract ) {
                binder.navigateToActivity( { activityId: contract._id } );
            }
        }
    }, {
        NAME: 'PatientGadgetAmts',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( PatientGadgetAmts );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientGadget'
    ]
} );
