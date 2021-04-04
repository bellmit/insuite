/**
 * User: pi
 * Date: 11/12/15  10:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'FindingEditorModel', function( Y, NAME ) {
        /**
         * @module FindingEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' ),
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap;

        /**
         * @class FindingEditorModel
         * @constructor
         * @extends SimpleActivityEditorModel
         * @param {Object} config object
         */
        function FindingEditorModel( config ) {
            FindingEditorModel.superclass.constructor.call( this, config );
        }

        FindingEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( ['g_extra', 'studyId'] ),
                lazyAdd: false
            },
            subModelsDesc: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( FindingEditorModel, SimpleActivityEditorModel, {

                hasInPacsModule: Y.doccirrus.auth.hasAdditionalService( 'inPacs' ),

                initializer: function FindingEditorModel_initializer() {
                    var
                        self = this;

                    self.initFindingEditorModel();

                },
                destructor: function FindingEditorModel_destructor() {

                },
                initFindingEditorModel: function FindingEditorModel_initFindingEditorModel() {
                    var
                        self = this,
                        currentActivity = unwrap( self.get( 'currentActivity' ) );

                    self.titlePreviewI18n = i18n( 'PatPortalMojit.devicesJS.title.PREVIEW' );
                    self.selectActivityFlowButtonI18n = i18n( 'InCaseMojit.casefile_detail.button.SELECTACTIVITYFLOWBUTTON.text' );

                    self.selectActivityFlowButtonVisible = ko.computed( function() {
                        return Boolean( unwrap( self.g_extra ) );
                    } );
                    self.selectActivityFlowButtonClick = Y.doccirrus.utils.selectFlow.bind( null, 'activity', currentActivity.get( 'data' ) );
                    self._enabledModalitiesList = ko.observableArray();
                    self.availableLaunchers = ko.observableArray();

                    if( self.hasInPacsModule ) {
                        self.initInpacsConfiguration();
                    }

                    self.isPreviewEnabled = ko.pureComputed( function() {
                        var currentActivity = unwrap( self.get( 'currentActivity' ) ),
                            g_extra = unwrap( currentActivity.g_extra );
                        return Boolean( g_extra && ( g_extra.orthancStudyUId || g_extra.SeriesId ) ); // Using SeriesId just for backwards compatibility
                    } );
                },

                initInpacsConfiguration: function ObservationEditorModel_initInpacsConfiguration() {

                    var
                        self = this;

                    Y.doccirrus.jsonrpc.api.inpacsconfiguration
                        .read()
                        .done( function( response ) {
                            self._enabledModalitiesList( response.data[0].modalities.filter( function( modality ) {
                                return modality.isActive;
                            } ) );
                        } );
                    Y.doccirrus.jsonrpc.api.flow.getLaunchers().done( function( response ) {
                        self.availableLaunchers( response.data );
                    } );
                },

                onModalitySelected: function ObservationEditorModel_onModalitySelected( val, modality ) {

                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        binder = self.get( 'binder' ),
                        caseFileVM = ko.unwrap( binder.currentView ),
                        activityDetailsVM = ko.unwrap( caseFileVM.activityDetailsViewModel );

                    self.modalityDialog = Y.doccirrus.modals.modalityMappingModal.showDialog( currentPatient, currentActivity, modality, activityDetailsVM )
                        .catch( function( err ) {
                            if( err === "RELOAD_ACTIVITY" ) {
                                Y.doccirrus.DCWindow.notice( {
                                    message: i18n("InCaseMojit.casefile_detail.notification.RELOAD_ACTIVITY"),
                                    window: {
                                        width: 'medium'
                                    }
                                } );
                            } else {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'error',
                                    message: 'Error'
                                } );
                            }
                        } );
                },

                onPreviewDCM: function() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        g_extra = ko.unwrap( currentActivity.g_extra );

                    if( !g_extra || (!g_extra.orthancStudyUId && !g_extra.SeriesId) ) {
                        Y.log( 'No orthancStudyUId/SeriesId Id provided', 'error', NAME );
                        return;
                    }

                    if( g_extra.orthancStudyUId ) {
                        window.open( Y.doccirrus.infras.getPrivateURL( '/inpacs/osimis-viewer/app/index.html?study=' + encodeURIComponent( g_extra.orthancStudyUId ) ), '_blank' );
                    } else {
                        window.open( Y.doccirrus.infras.getPrivateURL( '/inpacs/osimis-viewer/app/index.html?series=' + encodeURIComponent( g_extra.SeriesId ) ), '_blank' );
                    }

                },
                triggerLauncher: function triggerLauncher( _id ) {
                    var currentActivity = peek( this.get( 'currentActivity' ) );
                    Y.doccirrus.jsonrpc.api.flow.execute( {
                        query: { _id: _id },
                        data: {
                            sourceQuery: {
                                _id: currentActivity._id()
                            },
                            overwrite: {
                                activityId: currentActivity._id()
                            }
                        }
                    } ).fail( function( err ) {
                        err = new Y.doccirrus.commonerrors.DCError( err.code );
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: err.toString()
                        } );
                    } );
                }
            }, {
                NAME: 'FindingEditorModel'
            }
        );
        KoViewModel.registerConstructor( FindingEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityEditorModel',
            'dcutils',
            'DCModalityMappingModal'
        ]
    }
);
