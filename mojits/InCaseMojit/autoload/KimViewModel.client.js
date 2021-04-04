/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, moment, ko */
YUI.add( 'KimViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        NOT_ALL_ACTIVITIES_HAVE_SIGNATURES_AND_CAN_BE_VERIFIED = i18n( 'InCaseMojit.casefile_nav.tab_kim.verifyDocument.NOT_ALL_ACTIVITIES_HAVE_SIGNATURES_AND_CAN_BE_VERIFIED' ),
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        InCaseMojitViewModel = KoViewModel.getConstructor( 'InCaseMojitViewModel' );

    /**
     * @constructor
     * @class KimViewModel
     * @extends InCaseMojitViewModel
     */
    function KimViewModel() {
        KimViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( KimViewModel, InCaseMojitViewModel, {
        templateName: 'KimViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;
            self.initKimViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        initKimViewModel: function() {
            var
                self = this,
                binder = self.get( 'binder' );

            self.incaseConfig = binder.getInitialData( 'incaseconfiguration' );

            self.hasSendFunction = Y.doccirrus.auth.hasTelematikServices('eDocletter');
            self.hasQesLicence = Y.doccirrus.auth.hasTelematikServices('QES');

            self.qesHeadLineI18n = i18n( 'InCaseMojit.casefile_nav.tab_kim.headline' );
            self.signBtnText = i18n( 'InCaseMojit.casefile_nav.tab_kim.signBtnText' );
            self.sendBtnText = i18n( 'InCaseMojit.casefile_nav.tab_kim.sendBtnText' );
            self.verifySignatureBtnText = i18n( 'InCaseMojit.casefile_nav.tab_kim.verifySignatureBtnText' );

            function getCaseFileLight( request ) {
                var {query: query} = request;
                if( !query.actType ) {
                    query.actType = {'$in': 'DOCLETTER'};
                }
                return Y.doccirrus.jsonrpc.api.activity.getCaseFileLight( request );
            }

            self.qesTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-incase-table',
                    pdfTitle: i18n( 'InCaseMojit.casefile_nav.tab_kim.headline' ),
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: getCaseFileLight,
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'select',
                            notVisibleAtSummaryRow: true,
                            label: ''
                        },
                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'InCaseMojit.casefile_nav.tab_kim.colums.date' ),
                            isSortable: true,
                            direction: 'DESC',
                            sortInitialIndex: 0,
                            isFilterable: true,
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
                            forPropertyName: 'actType',
                            label: i18n( 'InCaseMojit.casefile_nav.tab_kim.colums.type' ),
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_ACTTYPE_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.Array.filter( Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs,
                                    function( item ) {
                                        if( item.val === 'DOCLETTER' ) {
                                            return {val: item.val, i18n: item.i18n};
                                        }
                                    } ),
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var
                                    actType = meta.value;
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', actType, 'i18n', 'k.A.' );
                            }
                        },
                        {
                            forPropertyName: 'kimState',
                            label: i18n( 'InCaseMojit.casefile_nav.tab_kim.colums.kimState' ),
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    kimState = meta.value;
                                if( !kimState ) {
                                    kimState = 'NOT_SIGNED';
                                }
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'KimState_E', kimState, '-de', '' );
                            },
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.Array.filter( Y.doccirrus.schemas.activity.types.KimState_E.list, function( item ) {
                                    return {val: item.val, i18n: item.i18n};
                                } ),
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'patientLastName',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                            isSortable: true,
                            isFilterable: true

                        },
                        {
                            forPropertyName: 'patientFirstName',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                            isSortable: true,
                            isFilterable: true
                        },

                        {
                            forPropertyName: 'status',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                            width: '115px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.activity.getFilteredStatuses(),
                                optionsText: '-de',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var
                                    status = meta.value;
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', status, '-de', '' );
                            }
                        },
                        {
                            forPropertyName: 'caseFolderTitle',
                            label: i18n( 'InCaseMojit.casefile_nav.tab_kim.colums.case' ),
                            isSortable: true
                            //isFilterable: true
                            /*queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemaloader.filterEnumByCountryMode(Y.doccirrus.schemas.person.types.Insurance_E.list),
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }*/
                        },
                        {
                            forPropertyName: 'employeeName',
                            label: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                            title: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'editor.name',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    editor = data.editor;

                                if( editor && editor.length ) {
                                    return editor[editor.length - 1].name;
                                } else {
                                    return '';
                                }
                            }
                        }
                    ],
                    selectMode: 'none'
                }
            } );

            self.verifySignatureBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'verifySignatureBtn',
                    title: self.verifySignatureBtnText,
                    text: self.verifySignatureBtnText,
                    option: 'DEFAULT',
                    disabled: ko.computed( function() {
                        var signed = self.qesTable.getComponentColumnCheckbox().checked().filter( function( activity ) {
                            return activity.kimState === 'SIGNED';
                        } );
                        return signed.length === 0;
                    } ),
                    click: function() {
                        var checked = self.qesTable.getComponentColumnCheckbox().checked(),
                            signedActivities = checked.filter( function( activity ) {
                                return activity.kimState === 'SIGNED';
                            } );

                        if( checked.length !== signedActivities.length ) {
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                content: NOT_ALL_ACTIVITIES_HAVE_SIGNATURES_AND_CAN_BE_VERIFIED,
                                level: 'INFO'
                            } );
                        }

                        Y.doccirrus.modals.kimVerifySignatureModal.show( {activities: signedActivities} );
                    }
                }
            } );

            self.signBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'signBtn',
                    title: self.signBtnText,
                    text: self.signBtnText,
                    option: 'PRIMARY',
                    disabled: ko.computed( function() {
                        var notSignedAndApprovedOrValid = self.qesTable.getComponentColumnCheckbox().checked().filter( function( activity ) {
                            var
                                activityStatusRule = (self.incaseConfig.onSigningReleaseCorrespondingActivity === true && activity.status === "VALID") ? true : (activity.status === "APPROVED"  ? true : false);
                            return (!activity.kimState || activity.kimState === 'NOT_SIGNED') && activityStatusRule;
                        } );
                        return notSignedAndApprovedOrValid.length === 0;
                    } ),
                    click: function() {
                        var
                            selectedActivities = self.qesTable.getComponentColumnCheckbox().checked();

                        Y.doccirrus.modals.kimSignatureModal.show( selectedActivities );
                    }
                }
            } );

            self.sendBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'signBtn',
                    title: self.sendBtnText,
                    text: self.sendBtnText,
                    option: 'PRIMARY',
                    disabled: ko.computed( function() {
                        var signedOrNotSigned = self.qesTable.getComponentColumnCheckbox().checked().filter( function( activity ) {
                            var
                                activityStatusRule = (self.incaseConfig.onSigningReleaseCorrespondingActivity === true && activity.status === "VALID") ? true : (activity.status === "APPROVED"  ? true : false);
                            return (!activity.kimState || !['SIGNED', 'NOT_SIGNED'].indexOf( activity.kimState )) && activityStatusRule;
                        } );
                        return signedOrNotSigned.length === 0;
                    } ),
                    click: function() {
                        var
                            selectedActivities = self.qesTable.getComponentColumnCheckbox().checked();
                        Y.doccirrus.modals.kimSignatureModal.decideToOpenSignOrSendModal( selectedActivities );
                    }
                }
            } );

            Y.doccirrus.communication.on( {
                event: 'signDocumentProcessFinished',
                done: function() {
                    self.qesTable.reload();
                },
                handlerId: 'signDocumentProcessFinishedListener'
            } );
        }
    }, {
        NAME: 'KimViewModel'
    } );

    KoViewModel.registerConstructor( KimViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'InCaseMojitViewModel',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'KoUI-all',
        'activity-schema',
        'KimVerifySignatureModal'
    ]
} );
