/**
 * User: do
 * Date: 03.02.21  08:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko, moment */

YUI.add( 'KimVerifySignatureModal', function( Y/*, NAME*/ ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        i18n = Y.doccirrus.i18n,
        NO_TI_CONTEXTS_CONFIGURED = i18n( 'InCaseMojit.casefile_nav.tab_kim.verifyDocument.NO_TI_CONTEXTS_CONFIGURED' ),
        VERIFY_BTN = i18n( 'InCaseMojit.casefile_nav.tab_kim.verifyDocument.VERIFY_BTN' ),
        SUCCESS = i18n( 'InCaseMojit.casefile_nav.tab_kim.verifyDocument.SUCCESS' ),
        WARN = i18n( 'InCaseMojit.casefile_nav.tab_kim.verifyDocument.WARN' ),
        ERROR = i18n( 'InCaseMojit.casefile_nav.tab_kim.verifyDocument.ERROR' ),
        UNKNOWN_ERROR = i18n( 'InCaseMojit.casefile_nav.tab_kim.verifyDocument.UNKNOWN_ERROR' );

    function KimVerifySignatureModel( config ) {
        KimVerifySignatureModel.superclass.constructor.call( this, config );
    }

    Y.extend( KimVerifySignatureModel, KoViewModel.getDisposable(), {
        initializer: function KimVerifySignatureModel_initializer( params ) {
            var
                self = this;

            self.noTiContextsConfiguredI18n = NO_TI_CONTEXTS_CONFIGURED;
            self.activities = ko.observableArray( JSON.parse( JSON.stringify( params.activities || params.attachedMedia ) ) );
            self.nActivities = (params.activities || params.attachedMedia).length;
            self.isVerifying = ko.observable( false );

            self.tiContexts = params.tiContexts.map( function( tiContext ) {
                tiContext.display = [tiContext.MandantName, tiContext.WorkplaceName, tiContext.ClientSystemId].join( '/' );
                return tiContext;
            } );

            self.selectedTiContext = ko.observable( self.tiContexts.length === 1 ? self.tiContexts[0] : undefined );

            self.hasNoContext = self.tiContexts.length === 0;

            self.startVerifySignatureBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'startVerifySignatureBtn',
                    title: VERIFY_BTN,
                    text: VERIFY_BTN,
                    disabled: ko.computed( function() {
                        var isVerifying = self.isVerifying();
                        return !self.selectedTiContext() || isVerifying;
                    } ),
                    visible: ko.computed( function() {
                        return self.activities().length && self.tiContexts.length !== 1;
                    } ),
                    click: function() {
                        self.processActivity();
                    }
                }
            } );

            self.verifyDocumentResultTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-incase-table',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: false,
                    data: [],
                    columns: [
                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'InCaseMojit.casefile_nav.tab_kim.colums.date' ),
                            isSortable: true,
                            isFilterable: false,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                    autoCompleteDateRange: true
                                }
                            },
                            renderer: function( meta ) {
                                return moment.utc( meta.row.timestamp ).format( 'DD.MM.YYYY' );
                            }
                        },
                        {
                            forPropertyName: 'content',
                            label: i18n( 'InCaseMojit.casefile_nav.tab_kim.colums.content' ),
                            isSortable: true,
                            isFilterable: false
                        },
                        {
                            forPropertyName: 'status',
                            label: i18n( 'InCaseMojit.casefile_nav.tab_kim.colums.state' ),
                            isSortable: true,
                            isFilterable: false,
                            renderer: function( meta ) {
                                if( meta.value ) {
                                    return "<div style='margin: auto; height:20px; width: 100%;background-color:" +
                                           self.getStatusCellColor( meta.value ) + ";'></div>";
                                }
                                return '';
                            }
                        },
                        {
                            forPropertyName: 'result',
                            label: i18n( 'InCaseMojit.casefile_nav.tab_kim.colums.result' ),
                            isSortable: true,
                            isFilterable: false
                        }
                    ],
                    selectMode: 'none'
                }
            } );

            self.processedActivities = ko.computed( function() {
                var nActivitiesToVerify = self.activities().length;
                return self.nActivities - nActivitiesToVerify;
            } );

            self.progressPercentage = ko.computed( function() {
                var processedActivities = self.processedActivities();
                var percent = Math.round( processedActivities / self.nActivities * 100 );
                return percent + '%';
            } );

            self.hasVerifiedAtLeastOne = ko.computed( function() {
                var rows = self.verifyDocumentResultTable.data();
                return rows.length > 0;
            } );

            self.verifyI18n = ko.computed( function() {
                return ['Verifiziere Signatur (', self.processedActivities(), '/', self.nActivities, ')'].join( '' );
            } );

            if( self.tiContexts.length === 1 ) {
                self.processActivity();
            }
        },
        getStatusCellColor: function( status ) {
            switch( status ) {
                case 'SUCCESS':
                    return "#419641";
                case 'ERROR':
                    return "#c12e2a";
            }
        },
        processActivity: function() {
            var self = this;
            var activity = self.activities.pop();
            var tiContext = self.selectedTiContext();

            if( !activity ) {
                self.isVerifying( false );
                return;
            }
            self.isVerifying( true );

            return Promise.resolve( Y.doccirrus.jsonrpc.api.tiQES.verifyDocument( {
                activityId: activity.mediaId ? undefined : activity._id,
                attachedMedia: activity.mediaId ? activity : undefined,
                tiContext: {
                    MandantId: tiContext.MandantId,
                    ClientSystemId: tiContext.ClientSystemId,
                    WorkplaceId: tiContext.WorkplaceId
                }
            } ) )
                .then( function( response ) {
                    var data = response.data;
                    var verificationResult = data && data.VerificationResult && data.VerificationResult.HighLevelResult;
                    if( verificationResult === 'VALID' ) {
                        self.addResult( activity, SUCCESS, 'SUCCESS' );
                    } else if( verificationResult === 'INVALID' ) {
                        self.addResult( activity, WARN, 'WARN' );
                    } else if( verificationResult === 'INCONCLUSIVE' ) {
                        self.addResult( activity, ERROR, 'ERROR' );
                    } else {
                        self.addResult( activity, UNKNOWN_ERROR + ': ' + JSON.stringify( data ), 'ERROR' );
                    }

                } )
                .catch( function( response ) {
                    self.addResult( activity, response.message || Y.doccirrus.errorTable.getMessage( response ), 'ERROR' );
                } ).finally( function() {
                    self.processActivity();
                } );
        },
        addResult: function( activity, result, status ) {
            var self = this;
            self.verifyDocumentResultTable.data.push( {
                timestamp: activity.timestamp,
                content: activity.content,
                status: status,
                result: result
            } );
        },
        destructor: function destructor() {
        }
    }, {
        NAME: 'KimVerifySignatureModel'
    } );

    KoViewModel.registerConstructor( KimVerifySignatureModel );

    function KimVerifySignatureModal() {
    }

    KimVerifySignatureModal.prototype.show = function( params ) {
        var template;
        return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
            .renderFile( {path: 'InTiMojit/views/KimVerifySignatureModal'} )
        ).then( function( response ) {
            template = response && response.data;
            return Promise.resolve( Y.doccirrus.jsonrpc.api.ticontext.getConfigurationParameters() );
        } ).then( function( response ) {
            var
                modal,
                kimVerifySignatureModel,
                tiContexts = (response && response.data || []).map( function( entry ) {
                    return entry.context;
                } ),
                bodyContent = Y.Node.create( template );

            modal = new Y.doccirrus.DCWindow( {
                id: 'KimVerifySignatureModal',
                className: 'DCWindow-KimVerifySignatureModal',
                bodyContent: bodyContent,
                title: i18n( 'InTiMojit.KimVerifySignatureModal.title' ),
                width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                centered: true,
                modal: true,
                render: document.body,
                buttons: {
                    header: ['close'],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true
                        } )
                    ]
                },
                after: {
                    destroy: function() {
                        ko.cleanNode( bodyContent.getDOMNode() );
                        kimVerifySignatureModel.destroy();
                    }
                }
            } );

            kimVerifySignatureModel = new KimVerifySignatureModel( {
                modal: modal,
                activities: params.activities,
                attachedMedia: params.attachedMedia,
                tiContexts: tiContexts
            } );

            ko.applyBindings( kimVerifySignatureModel, bodyContent.getDOMNode() );

        } ).catch( catchUnhandled );
    };

    Y.namespace( 'doccirrus.modals' ).kimVerifySignatureModal = new KimVerifySignatureModal();

}, '0.0.1', {
    requires: [
        'doccirrus',
        'promise',
        'KoViewModel',
        'DCWindow'
    ]
} );
