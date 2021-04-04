/*jslint anon:true, sloppy:true, nomen:true, latedef:false */
/*global YUI, ko, moment, async, _ */

YUI.add( 'ActivityCaseFileButtonsViewModel', function( Y, NAME ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,
        catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        logUnhandled = Y.doccirrus.promise.logUnhandled,
        unwrap = ko.unwrap,
        i18n = Y.doccirrus.i18n,
        NO_SCHEIN = i18n( 'InCaseMojit.casefile_detailJS.message.NO_SCHEIN' ),
        NO_CASEFOLDER = i18n( 'InCaseMojit.casefile_detailJS.message.NO_CASEFOLDER' ),
        NO_SCHEIN_IN_QUARTER = i18n( 'InCaseMojit.casefile_detailJS.message.NO_SCHEIN_IN_QUARTER' ),
        NO_SCHEIN_EXPLANATION = i18n( 'InCaseMojit.casefile_detailJS.message.NO_SCHEIN_EXPLANATION' ),
        CREATE_SCHEIN = i18n( 'InCaseMojit.casefile_detailJS.button.CREATE_SCHEIN' ),
        MEDICATION_LOCATION = i18n('InCaseMojit.casefile_detailJS.message.MEDICATION_LOCATION'),
        MULTIPLE_MEDPLANS_INFO = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.message.multipleMedicationPlans' ),
        KoViewModel = Y.doccirrus.KoViewModel,
        KBVMedicationPlan_T = Y.doccirrus.schemas.activity.types.KBVMedicationPlan_T,
        CASE_FOLDER_TYPE_TO_COUNTRY_MAP =  Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP;

    //function onlyActTypeSelected( actType, selected ) {
    //    if( !selected || !selected.length ) {
    //        return false;
    //    }
    //
    //    return selected.every( function( activity ) {
    //        return actType === activity.actType;
    //    } );
    //}

    function doConfirm( text ) {
        var
            table = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
            items = table.getComponentColumnCheckbox().checkedProperties();
        return new Promise( function( resolve, reject ) {
            var
                modal;
            if( 0 < items.length ) {
                modal = Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    message: 'Sollen diese ' + items.length + ' Einträge wirklich ' + text + ' werden?',
                    window: {
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    action: function() {
                                        this.close();
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        resolve();
                                        this.close();
                                    }
                                } )
                            ]
                        }
                    }
                } );
                modal.on( 'visibleChange', function( event ) {
                    if( false === event.newVal ) {
                        reject( new Error( 'CANCELLED' ) );
                    }
                } );
            }
        } );
    }

    function ActivityCaseFileButton( config ) {
        config = config || {};
        var
            self = this,
            templateName;

        Y.mix( self, Y.merge( {
            name: '',
            text: '',
            visible: true,
            disabled: false,
            click: null,
            menu: null,
            onShow: null,
            onHidden: null
        }, config ) );

        if( self.menu ) {
            templateName = 'activityCaseFileButtonsViewModel-buttonMenu';
        }
        else {
            templateName = 'activityCaseFileButtonsViewModel-button';
        }

        self.template = {
            name: templateName,
            data: self
        };
    }

    ActivityCaseFileButton.prototype.clickHandler = function() {
        var
            self = this;

        if( self.click && !peek( self.disabled ) ) {
            self.click.apply( self, arguments );
        }
    };

    function ActivityCaseFileButtonMenu( config ) {
        config = config || {};
        var
            self = this;

        Y.mix( self, Y.merge( {
            items: null
        }, config ) );
    }

    function ActivityCaseFileSubMenu( config ) {
        config = config || {};
        var
            self = this;

        Y.mix( self, Y.merge( {
            name: '',
            text: '',
            visible: true,
            disabled: false,
            click: null,
            menu: null,
            left: false
        }, config ) );

        self.template = {
            name: 'activityCaseFileButtonsViewModel-menuItemSubMenu',
            data: self
        };
    }

    ActivityCaseFileSubMenu.prototype.clickHandler = function() {
        var
            self = this;

        if( self.click && !peek( self.disabled ) ) {
            self.click.apply( self, arguments );
        }
    };

    function ActivityCaseFileMenuDivider( /* config */ ) {
        //config = config || {};
        var
            self = this;

        self.template = {
            name: 'activityCaseFileButtonsViewModel-divider',
            data: self
        };
    }

    function ActivityCaseFileMenuItem( config ) {
        config = config || {};
        var
            self = this;

        Y.mix( self, Y.merge( {
            name: '',
            text: '',
            visible: true,
            disabled: false,
            click: null
        }, config ) );

        self.template = {
            name: 'activityCaseFileButtonsViewModel-menuItem',
            data: self
        };
    }

    ActivityCaseFileMenuItem.prototype.clickHandler = function() {
        var
            self = this;

        if( self.click && !peek( self.disabled ) ) {
            self.click.apply( self, arguments );
        }
    };

    /**
     * @constructor
     * @class ActivityCaseFileButtonsViewModel
     */
    function ActivityCaseFileButtonsViewModel() {
        ActivityCaseFileButtonsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivityCaseFileButtonsViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initActivityCaseFileButtonsViewModel();
        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            self.destroyActivityCaseFileButtonsViewModel();
        },
        initActivityCaseFileButtonsViewModel: function() {
            var
                self = this;

            self.initPostMessageConnection();
            self.createButtons();
            self.defaultMappings = null;

            self.isRendered = self.addDisposable( ko.observable(false) );
            self.isPinned = self.addDisposable( ko.observable(null) );
            this.manageContainerClasses = ko.computed(function () {
                var
                    isPinned = unwrap( this.isPinned );

                return isPinned ? 'affix-enabled' : 'affix-disabled';
            }, this);
        },
        destroyActivityCaseFileButtonsViewModel: function() {
            var
                self = this;
            self.destroyButtons();
            self.destroyPostMessageConnection();
        },

        buttons: null,
        buttonsMap: null,
        actionNewMap: null,
        actionNewPrescriptionsMap: null,
        currentSolModal: null,
        PostMessageConnection: null,
        templateReady: function () {
            this.isRendered(true);
        },
        createButtons: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                incaseconfiguration = binder.getInitialData( 'incaseconfiguration' ),
                tenantSettings = binder.getInitialData( 'tenantSettings' ) || {},
                currentPatient = peek( self.get( 'currentPatient' ) ),
                buttons = self.buttons = ko.observableArray(),
                caseFolderActive = currentPatient.caseFolderCollection.getActiveTab(),
                // default buttons order
                buttonsToShow = [
                    'actionBack',
                    'actionNew',
                    'actionNewEdmpDoc',
                    'actionNewHgvDoc',
                    'actionNewZervixZytologieDoc',
                    'actionNewEhksDoc',
                    'actionAmtsNew',
                    'actionPrescribeMedication',
                    {
                        name: 'actionPrescriptionAddendum',
                        condition: incaseconfiguration && incaseconfiguration.showAddendumButton
                    },
                    {
                        name: 'actionPrescribeSwissMedication',
                        condition: Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() && caseFolderActive && CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolderActive.type] === 'CH'
                    },
                    'actionScanMedicationPlan',
                    'actionTransfer',
                    'actionCopy',
                    'actionPrint'
                ],
                buttonsMap = self.buttonsMap = {}, // root button references
                actionNewMap = self.actionNewMap = {}, // menu "new" item references
                actionNewPrescriptionsMap = self.actionNewPrescriptionsMap = {}, // menu "new>prescriptions" item references
                actionMoreMap = self.actionMoreMap = {}, // menu "more" item references
                swissPrescription = {},
                appRegs = Y.doccirrus.auth.getAppRegs() || [];

            self.activityStateRule =  function( activity ) {
                return !(incaseconfiguration.onSigningReleaseCorrespondingActivity === true && activity.status === 'VALID' || activity.status === 'APPROVED');
            };
            self.activityTypRule =  function ( actType ) {
                switch (actType) {
                    case 'DOCLETTER':
                        return  !Y.doccirrus.auth.hasTelematikServices('eDocletter'); // not disabeld => enables
                    default:
                        return true; // always true (disabled)
                }
            };
           // some button have a special behavior when being in an AMTS casefolder => setup a computed for that
            self.isAMTSFolder = ko.computed( function() {
                var
                    currentPatient = peek( self.get( 'currentPatient' ) ),
                    caseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab();

                return caseFolder && Y.doccirrus.schemas.casefolder.isAMTS( caseFolder );
            } );
            self.isNotAMTSFolder = ko.computed( function() {
                return !unwrap( self.isAMTSFolder );
            } );

            /** button back **/
            buttonsMap.actionBack = new ActivityCaseFileButton( {
                name: 'actionBack',
                text: i18n( 'InCaseMojit.casefile_browser.menu.BACK' ),
                click: Y.bind( self.clickHandlerBack, self )
            } );

            /** menu new **/
            actionNewMap.actionNewActivity = new ActivityCaseFileMenuItem( {
                name: 'actionNewActivity',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.ENTRY' ),
                click: Y.bind( self.clickHandlerNewActivity, self )
            } );
            actionNewMap.actionNewDivider = new ActivityCaseFileMenuDivider();
            actionNewMap.actionNewActivityAU = new ActivityCaseFileMenuItem( {
                name: 'actionNewActivityAU',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.AU' ),
                click: Y.bind( self.clickHandlerNewActivityAU, self )
            } );
            actionNewMap.actionNewActivityTREATMENT = new ActivityCaseFileMenuItem( {
                name: 'actionNewActivityTREATMENT',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.SERVICE' ),
                click: Y.bind( self.clickHandlerNewActivityTREATMENT, self )
            } );
            actionNewMap.actionNewActivityDIAGNOSIS = new ActivityCaseFileMenuItem( {
                name: 'actionNewActivityDIAGNOSIS',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.DIAGNOSIS' ),
                click: Y.bind( self.clickHandlerNewActivityDIAGNOSIS, self )
            } );
            actionNewMap.actionNewActivityMEDICATION = new ActivityCaseFileMenuItem( {
                name: 'actionNewActivityMEDICATION',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.MEDICAMENT' ),
                click: Y.bind( self.clickHandlerNewActivityMEDICATION, self )
            } );
            actionNewMap.actionNewActivityEXTERNAL = new ActivityCaseFileMenuItem( {
                name: 'actionNewActivityEXTERNAL',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.EXTERNAL' ),
                click: Y.bind( self.clickHandlerNewActivityEXTERNAL, self )
            } );
            actionNewMap.actionNewActivityMEDICATION_PLAN = new ActivityCaseFileMenuItem( {
                name: 'actionNewActivityMEDICATION_PLAN',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.MEDICATION_PLAN' ),
                click: Y.bind( self.clickHandlerNewActivityMEDICATION_PLAN, self )
            } );
            actionNewMap.actionNewTELECONSULT = new ActivityCaseFileMenuItem( {
                name: 'actionNewTELECONSULT',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.TELECONSULT' ),
                disabled: self.addDisposable( ko.computed( function() {
                    var
                        caseFolders = currentPatient.caseFolderCollection;
                    return !caseFolders.canCreateActivity() || !Y.doccirrus.auth.hasAdditionalService( "inTouch" );
                } ) ),
                click: Y.bind( self.clickHandlerTELECONSULT, self )
            } );

            actionNewMap.actionNewActivityFORM = new ActivityCaseFileMenuItem( {
                name: 'actionNewActivityFORM',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.FORM' ),
                click: Y.bind( self.clickHandlerNewActivityFORM, self )
            } );
            actionNewMap.actionNewActivityHISTORY = new ActivityCaseFileMenuItem( {
                name: 'actionNewActivityHISTORY',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.INFORMATION' ),
                click: Y.bind( self.clickHandlerNewActivityHISTORY, self )
            } );
            actionNewMap.actionNewActivitySCHEIN = new ActivityCaseFileMenuItem( {
                name: 'actionNewActivitySCHEIN',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.SCHEIN' ),
                click: Y.bind( self.clickHandlerNewActivitySCHEIN, self )
            } );

            actionNewPrescriptionsMap.actionNewPrescriptionPRIVPRESCR = new ActivityCaseFileMenuItem( {
                name: 'actionNewPrescriptionPRIVPRESCR',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.menusubitem.prescription.PRIVATE_PRES' ),
                click: Y.bind( self.clickHandlerNewPrescriptionPRIVPRESCR, self )
            } );
            actionNewPrescriptionsMap.actionNewPrescriptionPUBPRESCR = new ActivityCaseFileMenuItem( {
                name: 'actionNewPrescriptionPUBPRESCR',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.menusubitem.prescription.INSURANCE_PRES' ),
                disabled: ko.observable( true ),
                click: Y.bind( self.clickHandlerNewPrescriptionPUBPRESCR, self )
            } );
            actionNewPrescriptionsMap.actionNewPrescriptionPRESCRBTM = new ActivityCaseFileMenuItem( {
                name: 'actionNewPrescriptionPRESCRBTM',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.menusubitem.prescription.BTM_PRES' ),
                click: Y.bind( self.clickHandlerNewPrescriptionPRESCRBTM, self )
            } );
            actionNewPrescriptionsMap.actionNewPrescriptionPRESCRG = new ActivityCaseFileMenuItem( {
                name: 'actionNewPrescriptionPRESCRG',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.menusubitem.prescription.G_PRES' ),
                disabled: ko.observable( true ),
                click: Y.bind( self.clickHandlerNewPrescriptionPRESCRG, self )
            } );
            actionNewPrescriptionsMap.actionNewPrescriptionPRESCRT = new ActivityCaseFileMenuItem( {
                name: 'actionNewPrescriptionPRESCRT',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.menusubitem.prescription.T_PRES' ),
                click: Y.bind( self.clickHandlerNewPrescriptionPRESCRT, self )
            } );
            actionNewPrescriptionsMap.actionNewPrescriptionPRESASSISTIVE = new ActivityCaseFileMenuItem( {
                name: 'actionNewPrescriptionPRESASSISTIVE',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.menusubitem.prescription.H_PRES' ),
                click: Y.bind( self.clickHandlerNewPrescriptionPRESASSISTIVE, self )
            } );

            if (Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland()) {
                actionNewPrescriptionsMap.actionNewPrescriptionLONGPRESCR = new ActivityCaseFileMenuItem({
                    name: 'actionNewPrescriptionLONGPRESCR',
                    text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.menusubitem.prescription.LONGPRESCR_PRES' ),
                    click: Y.bind( self.clickHandlerNewPrescriptionLONGPRESCR, self )
                });
                swissPrescription = { 'LONGPRESCR': actionNewPrescriptionsMap.actionNewPrescriptionLONGPRESCR };
            }

            var actionNewPrescriptionDefaultSort;
            if ( Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ){
                actionNewPrescriptionDefaultSort = {
                    'PRIVPRESCR': actionNewPrescriptionsMap.actionNewPrescriptionPRIVPRESCR,
                    'PUBPRESCR': actionNewPrescriptionsMap.actionNewPrescriptionPUBPRESCR,
                    'PRESCRBTM': actionNewPrescriptionsMap.actionNewPrescriptionPRESCRBTM,
                    'PRESCRG': actionNewPrescriptionsMap.actionNewPrescriptionPRESCRG,
                    'PRESCRT': actionNewPrescriptionsMap.actionNewPrescriptionPRESCRT,
                    'PRESASSISTIVE': actionNewPrescriptionsMap.actionNewPrescriptionPRESASSISTIVE
                };
            } else {
                actionNewPrescriptionDefaultSort = Object.assign( swissPrescription, {
                    'PRIVPRESCR': actionNewPrescriptionsMap.actionNewPrescriptionPRIVPRESCR
                } );
            }

            actionNewMap.actionNewPrescription = new ActivityCaseFileSubMenu( {
                name: 'actionNewPrescription',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.PRESCRIPTIONS' ),
                click: Y.bind( self.clickHandlerNewPrescription, self ),
                menu: new ActivityCaseFileButtonMenu( {
                    items: ko.observableArray(), // filled on open
                    defaultSort: actionNewPrescriptionDefaultSort,
                    resetRecommendations: function() {
                        this.items( Y.Object.values( this.defaultSort ) );
                    },
                    sortRecommended: function( recommendations ) {
                        var
                            items,
                            defaults;

                        if( !(recommendations && recommendations.length) ) {
                            this.resetRecommendations();
                        }
                        else {
                            defaults = Y.Object.values( this.defaultSort );
                            items = recommendations.map( function( recommendation ) {
                                return this.defaultSort[recommendation];
                            }, this );
                            if( items.length !== defaults.length ) {
                                items.push( new ActivityCaseFileMenuDivider() );
                                items.push.apply( items, defaults.filter( function( item ) {
                                    return -1 === items.indexOf( item );
                                } ) );
                            }
                            this.items( items );
                        }
                    }
                } )
            } );

            actionNewMap.actionNewCaseFolder = new ActivityCaseFileMenuItem( {
                name: 'actionNewCaseFolder',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.CASEFOLDER' ),
                click: Y.bind( self.clickHandlerNewCaseFolder, self )
            } );
            actionNewMap.actionNewActivityINVOICE = new ActivityCaseFileMenuItem( {
                name: 'actionNewActivityINVOICE',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.INVOICE' ),
                click: Y.bind( self.clickHandlerNewActivityINVOICE, self )
            } );

            buttonsMap.actionNew = new ActivityCaseFileButton( {
                name: 'actionNew',
                text: i18n( 'InCaseMojit.casefile_browser.menu.NEW' ),
                visible: self.addDisposable( ko.computed( function() {
                    var caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                        isEDOC = caseFolder && Y.doccirrus.schemas.casefolder.isEDOC( caseFolder ),
                        isHGV = caseFolder && Y.doccirrus.schemas.casefolder.isHGV( caseFolder ),
                        isZervixZytologie = caseFolder && Y.doccirrus.schemas.casefolder.isZervixZytologie( caseFolder ),
                        isAMTS = caseFolder && Y.doccirrus.schemas.casefolder.isAMTS( caseFolder );
                    return !isEDOC && !isHGV && !isZervixZytologie && !isAMTS;
                } ) ),
                menu: new ActivityCaseFileButtonMenu( {
                    items: ko.observableArray( [
                        actionNewMap.actionNewActivity,
                        actionNewMap.actionNewDivider,
                        actionNewMap.actionNewActivityAU,
                        actionNewMap.actionNewActivityTREATMENT,
                        actionNewMap.actionNewActivityDIAGNOSIS,
                        actionNewMap.actionNewActivityMEDICATION,
                        actionNewMap.actionNewActivityFORM,
                        actionNewMap.actionNewActivityHISTORY,
                        actionNewMap.actionNewActivitySCHEIN,

                        actionNewMap.actionNewPrescription,

                        actionNewMap.actionNewCaseFolder,
                        actionNewMap.actionNewActivityINVOICE
                    ] )
                } ),
                onShow: function() {
                    var
                        aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                        caseFolder = currentPatient.caseFolderCollection.getActiveTab() || {},
                        activitiesTable = aCaseFileViewModel.activitiesTable,
                        checked = activitiesTable.getComponentColumnCheckbox().checked();

                    actionNewPrescriptionsMap.actionNewPrescriptionPUBPRESCR.disabled(
                        !Y.doccirrus.schemas.patient.isPublicInsurance( {type: caseFolder.type} ) && // MOJ-14319: [OK]
                        'BG' !== caseFolder.type && 'PREPARED' !== caseFolder.type );
                    actionNewPrescriptionsMap.actionNewPrescriptionPRESCRG.disabled( 'BG' === caseFolder.type );

                    if( !checked.length ) {
                        actionNewMap.actionNewPrescription.menu.resetRecommendations();
                        return true;
                    }

                    if( checked.some( function( activity ) {
                            return 'ASSISTIVE' === activity.actType;
                        } ) ) {
                        actionNewMap.actionNewPrescription.menu.sortRecommended( ['PRESASSISTIVE'] );
                        return true;
                    }

                    if( checked.every( function( activity ) {
                            return 'MEDICATION' === activity.actType;
                        } ) ) {

                        if( caseFolder.type ) {
                            Y.doccirrus.jsonrpc.api.activity
                                .getPrescriptionTypes( {
                                    query: {
                                        patientAge: currentPatient.age(),
                                        insuranceType: caseFolder.type,
                                        medications: checked.map( function( activity ) {
                                            return activity._id;
                                        } )
                                    }
                                } )
                                .done( function( response ) {
                                    var data = response && response.data;
                                    if( !data ) {
                                        actionNewMap.actionNewPrescription.menu.resetRecommendations();
                                        return;
                                    }
                                    actionNewMap.actionNewPrescription.menu.sortRecommended( data.rejected ? undefined : data.recommendations );
                                } );
                        }
                    }

                    actionNewMap.actionNewPrescription.menu.resetRecommendations();
                    return true;
                },
                onHidden: function() {

                    actionNewMap.actionNewPrescription.menu.items.removeAll();

                    return true;
                }
            } );

            buttonsMap.actionAmtsNew = new ActivityCaseFileButton( {
                name: 'actionAmtsNew',
                text: i18n( 'InCaseMojit.casefile_browser.menu.NEW' ),
                visible: self.isAMTSFolder,
                menu: new ActivityCaseFileButtonMenu( {
                    items: ko.observableArray( [
                        actionNewMap.actionNewActivity,
                        actionNewMap.actionNewDivider,
                        actionNewMap.actionNewActivityDIAGNOSIS,
                        actionNewMap.actionNewActivityMEDICATION,
                        actionNewMap.actionNewActivityMEDICATION_PLAN,
                        actionNewMap.actionNewActivityEXTERNAL,
                        actionNewMap.actionNewTELECONSULT
                    ] )
                } )
            } );

            /** button new eDMP Doc **/
            function getEDMPDocButtonLabel() {
                var
                    activeTab = currentPatient.caseFolderCollection.getActiveTab(),
                    activeTabTitle = ( activeTab && activeTab.title ) ? activeTab.title : '',
                    eDMPDocButtonLabel = ( activeTabTitle === 'BK' ) ? 'Neue DMP Dokumentation' : 'Neue eDMP Dokumentation';

                return eDMPDocButtonLabel;
            }

            buttonsMap.actionNewEdmpDoc = new ActivityCaseFileButton( {
                name: 'actionNewEdmpDoc',
                text: getEDMPDocButtonLabel(),
                visible: self.addDisposable( ko.computed( function() {
                    var
                        caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                        isDMP = caseFolder && Y.doccirrus.schemas.casefolder.isEDMP( caseFolder );
                    return isDMP;
                } ) ),
                click: Y.bind( self.clickHandlerNewEdmpDoc, self )
            } );

            buttonsMap.actionNewHgvDoc = new ActivityCaseFileButton( {
                name: 'actionNewHgvDoc',
                text: 'Neue HGV Dokumentation',
                visible: self.addDisposable( ko.computed( function() {
                    var
                        caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                        isHGV = caseFolder && Y.doccirrus.schemas.casefolder.isHGV( caseFolder );
                    return isHGV;
                } ) ),
                click: Y.bind( self.clickHandlerNewHgvDoc, self )
            } );

            /** button new Zervix Zytologie Doc **/
            buttonsMap.actionNewZervixZytologieDoc = new ActivityCaseFileButton( {
                name: 'actionNewZervixZytologieDoc',
                text: i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_ZERVIX_ZYTOLOGIE_SCHEIN' ),
                visible: self.addDisposable( ko.computed( function() {
                    var
                        caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                        isZervixZytologie = caseFolder && Y.doccirrus.schemas.casefolder.isZervixZytologie( caseFolder );
                    return isZervixZytologie;
                } ) ),
                click: Y.bind( self.clickHandlerNewZervixZytologieDoc, self )
            } );

            /** button new eHKS Doc **/
            buttonsMap.actionNewEhksDoc = new ActivityCaseFileButton( {
                name: 'actionNewEhksDoc',
                text: 'Neue eHKS Dokumentation',
                visible: self.addDisposable( ko.computed( function() {
                    var
                        caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                        isEHKS = caseFolder && Y.doccirrus.schemas.casefolder.isEHKS( caseFolder );
                    return isEHKS;
                } ) ),
                click: Y.bind( self.clickHandlerNewEhksDoc, self )
            } );

            if( tenantSettings.useExternalPrescriptionSoftware ) {
                buttonsMap.actionPrescribeMedication = new ActivityCaseFileButton( {
                    name: 'actionPrescribeMedication',
                    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.PRESCRIPTION_MODAL' ),
                    disabled: self.addDisposable( ko.computed( function() {
                        const activities = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.getComponentColumnCheckbox().checked() || [];
                        const caseFolder = currentPatient.caseFolderCollection.getActiveTab() || {};
                        return !this.isEnabled( caseFolder, activities );
                    }.bind( new Y.doccirrus.incase.actions.prescription( Y.doccirrus.commonutils.getCountryModeFromConfigs() ) ) ) ),
                    visible: self.addDisposable( ko.computed( function() {
                        return this.isAvailable( currentPatient.caseFolderCollection.getActiveTab(), Y.doccirrus.schemas.casefolder );
                    }.bind( new Y.doccirrus.incase.actions.prescription( Y.doccirrus.commonutils.getCountryModeFromConfigs() ) ) ) ),
                    click: function() {
                        return Y.doccirrus.incase.handlers.prescription( {
                            user: this.get( 'binder' ).getInitialData( 'currentUser' ),
                            patient: currentPatient.get( 'data' ),
                            caseFolder: currentPatient.caseFolderCollection.getActiveTab(),
                            externalPrescriptionSoftwareUrl: tenantSettings.externalPrescriptionSoftwareUrl
                        } );
                    }.bind( self )
                } );
            } else {
                buttonsMap.actionPrescribeMedication = new ActivityCaseFileButton( {
                    name: 'clickHandlerPrescriptionModal',
                    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.PRESCRIPTION_MODAL' ),
                    disabled: self.addDisposable( ko.computed( function() {
                        var
                            aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                            checked = _.get( aCaseFileViewModel, 'activitiesTable.getComponentColumnCheckbox().checked()', [] ),
                            dynamicallyChecked = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.getComponentColumnCheckbox().checked() || [],
                            someCheckedIsLocked = dynamicallyChecked.some( function( activity ) {
                                return 'LOCKED' === activity.status;
                            } ),
                            someCheckedHasLockedLinkedActivity = dynamicallyChecked.some( function( activity ) {
                                return activity.linkedAct && activity.linkedAct.filter( function( linkedActivity ) {
                                    return Boolean( linkedActivity );
                                } ).some( function( linkedActivity ) {
                                    return 'LOCKED' === linkedActivity.status;
                                } );
                            } ),
                            caseFolders = currentPatient.caseFolderCollection,
                            activeCaseFolder = caseFolders.getActiveTab() || {},
                            allValid = checked.every( function( activity ) {
                                return 'VALID' === activity.status;
                            } ),
                            allMedications = checked.every( function( activity ) {
                                return 'MEDICATION' === activity.actType;
                            } );

                        return !allValid || !activeCaseFolder.type || !allMedications ||
                               someCheckedIsLocked || someCheckedHasLockedLinkedActivity || 'PREPARED' === activeCaseFolder.type;
                    } ) ),
                    visible: self.addDisposable( ko.computed( function() {
                        var
                            caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                            isEDOC = caseFolder && Y.doccirrus.schemas.casefolder.isEDOC( caseFolder );
                        return !isEDOC;
                    } ) ),
                    click: Y.bind( self.clickHandlerPRESCRIPTION_MODAL, self, false )
                } );
            }

            buttonsMap.actionPrescriptionAddendum = new ActivityCaseFileButton( {
                    name: 'clickHandlerActionPrescriptionAddendumModal',
                    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.PRESCRIPTION_ADDENDUM_MODAL' ),
                    disabled: false,
                    visible: self.addDisposable( ko.computed( function() {
                        var
                            caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                            isEDOC = caseFolder && Y.doccirrus.schemas.casefolder.isEDOC( caseFolder ),
                            aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                            checked = aCaseFileViewModel.activitiesTable.getComponentColumnCheckbox().checked(),
                            hasOneElement = checked.length === 1,
                            isPrescription = hasOneElement && Y.doccirrus.schemas.activity.isPrescriptionType( checked[0].actType ),
                            isValid = hasOneElement && checked[0].status === 'VALID';
                        return !isEDOC && hasOneElement && isPrescription && isValid;
                    } ) ),
                    click: Y.bind( self.clickHandlerPRESCRIPTION_ADDENDUM_MODAL, self, false )
                } );

            buttonsMap.actionPrescribeSwissMedication = new ActivityCaseFileButton( {
                    name: 'clickHandlerSwissPrescriptionModal',
                    text: 'CDS',
                    disabled: self.addDisposable(ko.computed( function() {
                        var
                            aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                            checked = _.get(aCaseFileViewModel, 'activitiesTable.getComponentColumnCheckbox().checked()', []),
                            dynamicallyChecked = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.getComponentColumnCheckbox().checked() || [],
                            someCheckedIsLocked = dynamicallyChecked.some( function( activity ) {
                                return 'LOCKED' === activity.status;
                            } ),
                            someCheckedHasLockedLinkedActivity = dynamicallyChecked.some( function( activity ) {
                                return activity.linkedAct && activity.linkedAct.filter( function( linkedActivity ) {
                                    return Boolean( linkedActivity );
                                }).some( function( linkedActivity ) {
                                    return 'LOCKED' === linkedActivity.status;
                                } );
                            } ),
                            isSwiz = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland(),
                            documedisMedplanSelected = true,
                            documedisMedications = true,
                            caseFolders = currentPatient.caseFolderCollection,
                            activeCaseFolder = caseFolders.getActiveTab() || {},
                            allValid = checked.every( function( activity ) {
                                return 'VALID' === activity.status;
                            } ),
                            allMedications = checked.every( function( activity ) {
                                return 'MEDICATION' === activity.actType;
                            } );

                        if (isSwiz && dynamicallyChecked.length) {
                            if (onlyMedicationSelected()) {
                                documedisMedications = true;
                            } else {
                                documedisMedications = false;

                                if( dynamicallyChecked.length === 1 && dynamicallyChecked[0].actType === "MEDICATIONPLAN" ) {
                                    documedisMedplanSelected = true;
                                } else {
                                    documedisMedplanSelected = false;
                                }
                            }
                        }


                        return (!documedisMedications && !documedisMedplanSelected) || !allValid || !activeCaseFolder.type || !allMedications ||
                               someCheckedIsLocked || someCheckedHasLockedLinkedActivity;

                        function onlyMedicationSelected(  ) {
                            return (dynamicallyChecked.length && !dynamicallyChecked.find(function( act ) {
                                return act.actType !== "MEDICATION";}));
                        }
                    } )),
                    visible: self.addDisposable( ko.computed( function() {
                        var
                            caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                            isEDOC = caseFolder && Y.doccirrus.schemas.casefolder.isEDOC( caseFolder );
                        return !isEDOC;
                    } ) ),
                    click: Y.bind( self.clickHandlerPRESCRIPTION_MODAL, self, true )
                } );

            /** button copy **/
            buttonsMap.actionCopy = new ActivityCaseFileButton( {
                name: 'actionCopy',
                text: i18n( 'InCaseMojit.casefile_browser.menu.COPY' ),
                visible: self.isNotAMTSFolder,
                disabled: self.addDisposable( ko.computed( function() {
                    var checked = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.getComponentColumnCheckbox().checked(),

                        // Changed for MOJ-11034
                        caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                        isEDOC = caseFolder && Y.doccirrus.schemas.casefolder.isEDOC( caseFolder ),
                        isImportedCaseFolder = caseFolder && caseFolder.imported,
                        allowedActTypes = ['MEDICATION', 'DIAGNOSIS', 'HISTORY', 'FINDING', 'ASSESSMENT', 'DOCLETTERDIAGNOSIS', 'CAVE', 'REMINDER', 'EXTERNAL', 'COMMUNICATION', 'CONTACT', 'PUBRECEIPT', 'PROCEDERE', 'PREVENTION', 'TELECONSULT', 'THERAPY', 'THERAPYSTEP', 'PROCESS'],
                        allowedImportedTypes = checked && Boolean( checked.length ) && checked.every( function( activity ) {

                            var isImported = Boolean( activity.status === 'IMPORTED' || isImportedCaseFolder );

                            return !isImported || (isImported && allowedActTypes.includes( activity.actType ));
                        } ),
                        mirror = checked && Boolean( checked.length ) && checked.every( function( activity ) {
                            return activity.mirrorActivityId;
                        } ),
                        locked = checked && Boolean( checked.length ) && checked.some( function( activity ) {
                            return activity.status === 'LOCKED';
                        } );

                    if( locked ) {
                        return true;
                    }
                    if( mirror ) {
                        return false;
                    }

                    return isEDOC || !Boolean( checked.length ) || !allowedImportedTypes;
                } ) ),
                click: function(e, context) {
                    Y.bind( self.clickHandlerCopy(context), self );
                }
            } );

            buttonsMap.actionScanMedicationPlan = new ActivityCaseFileButton( {
                name: 'actionScanMedicationPlan',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.SCAN_MEDICATION_PLAN' ),
                disabled: ko.observable( false ),
                visible: self.isAMTSFolder,
                click: Y.bind( self.clickHandlerScanMedicationPlan, self )
            } );

            buttonsMap.actionTransfer = new ActivityCaseFileButton( {
                name: 'actionTransfer',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.TRANSFER' ),
                disabled: self.addDisposable(ko.computed( function() {
                    var
                        aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                        checked = aCaseFileViewModel.activitiesTable.getComponentColumnCheckbox().checked(),
                        allPrepared = checked.every( function( activity ) { return 'PREPARED' === activity.status; } ),
                        someLocked = checked.some( function( activity ) { return ( 'LOCKED' === activity.status ); } ),
                        notMirror = checked.every( function( activity ) { return !activity.mirrorActivityId; } );

                    return !(checked.length && notMirror) || allPrepared || someLocked;
                })),
                visible: self.isAMTSFolder,
                click: Y.bind( self.clickHandlerTRANSFER, self )
            } );

            /** menu print **/

            buttonsMap.actionNewEnvelope = new ActivityCaseFileSubMenu( {
                name: 'actionNewEnvelope',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.ENVELOPES' ),
                click: Y.bind( self.clickHandlerPrintENVELOPE, self ),
                menu: new ActivityCaseFileButtonMenu( {
                    items: ko.observableArray( [
                        new ActivityCaseFileMenuItem( {
                            name: 'actionNewEnvelopeC6',
                            text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.menusubitem.envelope.ENVELOPE_C6' ),
                            click: Y.bind( self.clickHandlerENVELOPEC6, self )
                        } ),
                        new ActivityCaseFileMenuItem( {
                            name: 'actionNewEnvelopeC5',
                            text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.menusubitem.envelope.ENVELOPE_C5' ),
                            click: Y.bind( self.clickHandlerENVELOPEC5, self )
                        } ),
                        new ActivityCaseFileMenuItem( {
                            name: 'actionNewEnvelopeC4',
                            text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.menusubitem.envelope.ENVELOPE_C4' ),
                            click: Y.bind( self.clickHandlerENVELOPEC4, self )
                        } ),
                        new ActivityCaseFileMenuItem( {
                            name: 'actionNewEnvelopeDL',
                            text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.menusubitem.envelope.ENVELOPE_DL' ),
                            click: Y.bind( self.clickHandlerENVELOPEDL, self )
                        } ),
                        new ActivityCaseFileMenuItem( {
                            name: 'actionEtiquette',
                            text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.menusubitem.envelope.ETIQUETTE' ),
                            click: Y.bind( self.clickHandlerETIQUETTE, self )
                        } )
                    ] )
                } )
            } );

            buttonsMap.actionNewPubreceipt = new ActivityCaseFileSubMenu( {
                name: 'actionNewPubreceipt',
                text: i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.PRINT_PUBRECEIPT' ),
                disabled: self.addDisposable( ko.computed( function() {
                    var
                        caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                        isPublic = caseFolder && Y.doccirrus.schemas.patient.isPublicInsurance( {type: unwrap( caseFolder.type )} ); // MOJ-14319: [OK]

                    return !isPublic;
                } ) ),
                click: Y.bind( self.clickHandlerPrintPUBRECEIPT, self ),
                menu: new ActivityCaseFileButtonMenu( {
                    items: ko.observableArray( [
                        new ActivityCaseFileMenuItem( {
                            name: 'actionNewPUBRECIEPTToday',
                            text: i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.PRINT_PUBRECEIPT_TODAY' ),
                            disabled: self.addDisposable( ko.computed( function() {
                                var
                                    caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                                    isPublic = caseFolder && Y.doccirrus.schemas.patient.isPublicInsurance( {type: unwrap( caseFolder.type )} ); // MOJ-14319: [OK]
                                return !isPublic;
                            } ) ),
                            click: Y.bind( self.clickHandlerPrintPUBRECEIPTToday, self )
                        } ),
                        new ActivityCaseFileMenuItem( {
                            name: 'actionNewPUBRECEIPTQuarter',
                            text: i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.PRINT_PUBRECEIPT_QUARTER' ),
                            disabled: self.addDisposable( ko.computed( function() {
                                var
                                    caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                                    isPublic = caseFolder && Y.doccirrus.schemas.patient.isPublicInsurance( {type: unwrap( caseFolder.type )} ); // MOJ-14319: [OK]
                                return !isPublic;
                            } ) ),
                            click: Y.bind( self.clickHandlerPrintPUBRECEIPTQuarter, self )
                        } )
                    ] )
                } )
            } );

            buttonsMap.actionPrint = new ActivityCaseFileButton( {
                name: 'actionPrint',
                text: i18n( 'InCaseMojit.casefile_browser.menu.PRINT' ),
                disabled: self.addDisposable( ko.computed( function() {
                    var caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                        isEDOC = caseFolder && Y.doccirrus.schemas.casefolder.isEDOC( caseFolder );
                    return isEDOC;
                } ) ),
                visible: self.isNotAMTSFolder,
                menu: new ActivityCaseFileButtonMenu( {
                    items: ko.observableArray( [
                        // not implemented
                        new ActivityCaseFileMenuItem( {
                            name: 'actionPrintENTRIES',
                            text: i18n( 'InCaseMojit.casefile_browser.print.menuitem.ENTRIES' ),
                            disabled: true,
                            click: Y.bind( self.clickHandlerPrintENTRIES, self )
                        } ),
                        new ActivityCaseFileMenuDivider(),
                        new ActivityCaseFileMenuItem( {
                            name: 'actionPrintHEALTH_RECORD',
                            text: i18n( 'InCaseMojit.casefile_browser.print.menuitem.HEALTH_RECORD' ),
                            disabled: false,
                            click: Y.bind( self.clickHandlerPrintHEALTH_RECORD, self )
                        } ),
                        new ActivityCaseFileMenuItem( {
                            name: 'actionPrintPDF_TO_CASEFILE',
                            text: i18n( 'InCaseMojit.casefile_browser.print.menuitem.PDF_TO_CASEFILE' ),
                            disabled: self.addDisposable( ko.computed( function() {
                                var caseFolder = currentPatient.caseFolderCollection.getActiveTab();
                                return caseFolder === null || Y.doccirrus.schemas.casefolder.isError( caseFolder );
                            } ) ),
                            click: Y.bind( self.clickHandlerPrintPDF_TO_CASEFILE, self )
                        } ),
                        new ActivityCaseFileMenuItem( {
                            name: 'actionPrintDOWNLOAD_ATTACHMENTS',
                            text: i18n( 'InCaseMojit.casefile_browser.print.menuitem.EXPORT_MEDIA' ),
                            disabled: self.addDisposable( ko.computed( function() {
                                var checkedActivities = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.getComponentColumnCheckbox().checked(),
                                    hasAttachments = checkedActivities.some( function( item ) {
                                        return item.attachments && item.attachments.length;
                                    });
                                return !hasAttachments;
                            })),
                            click: Y.bind( self.clickHandlerPrintDOWNLOAD_ATTACHMENTS, self )
                        } ),
                        buttonsMap.actionNewEnvelope,
                        new ActivityCaseFileMenuItem( {
                            name: 'actionPrintAPP_LIST',
                            text: i18n( 'InCaseMojit.casefile_browser.print.menuitem.APP_LIST' ),
                            click: Y.bind( self.clickHandlerPrintAPP_LIST, self )
                        } ),
                        buttonsMap.actionNewPubreceipt
                    ] )
                } )
            } );

            appRegs.forEach( function( appReg ) {
                var buttonsCreatedCounter = 0;

                // Do not add any of this appReg CASEFILE_BUTTON's if no access granted
                if( !appReg.hasAccess ) {
                    return;
                }

                if( appReg.uiConfiguration ) {
                    appReg.uiConfiguration.forEach( function( config ) {
                        var buttonName;

                        if(
                            Y.doccirrus.schemas.appreg.uiConfigurationTypes.CASEFILE_BUTTON === config.type &&
                            config.targetUrl &&
                            config.buttonText
                        ) {
                            buttonsCreatedCounter++;

                            buttonName = appReg.appName + '_' + buttonsCreatedCounter;

                            buttonsMap[ buttonName ] = new ActivityCaseFileButton( {
                                name: buttonName,
                                text: config.buttonText[ Y.doccirrus.i18n.language ],
                                disabled: self.addDisposable(ko.computed( function() {
                                    return false;
                                } )),
                                visible: self.addDisposable( ko.computed( function() {
                                    return true;
                                } ) ),
                                click: Y.bind( self.clickHandlerSolModal, self, config )
                            } );
                            buttonsToShow.push( buttonName );
                        }
                    } );
                }
            } );

            /** menu more **/
            actionMoreMap.actionMoreAttach = new ActivityCaseFileMenuItem( {
                name: 'actionMoreAttach',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.ATTACH' ),
                disabled: ko.observable( true ),
                click: Y.bind( self.clickHandlerATTACH, self )
            } );
            actionMoreMap.actionMoreResetStatus = new ActivityCaseFileMenuItem( {
                name: 'actionMoreResetStatus',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.RESET_STATUS' ),
                disabled: ko.observable( true ),
                visible: Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.employee.userGroups.SUPPORT ),
                click: Y.bind( self.clickHandlerResetStatus, self )
            } );
            actionMoreMap.actionMoreApprove = new ActivityCaseFileMenuItem( {
                name: 'actionMoreAPPROVE',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.APPROVE' ),
                disabled: ko.observable( true ),
                click: Y.bind( self.clickHandlerAPPROVE, self )
            } );
            actionMoreMap.actionMoreSign = new ActivityCaseFileMenuItem( {
                name: 'actionMoreSIGN',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.SIGN' ),
                visible:  Y.doccirrus.auth.hasTelematikServices('QES'),
                disabled: ko.computed( function() {
                    var checkedActivities = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.getComponentColumnCheckbox().checked();
                    return !checkedActivities.length || checkedActivities.some( ( act ) => {
                        return self.activityTypRule(act.actType)|| self.activityStateRule(act);
                    });
                } ),
                click: Y.bind( self.clickHandlerSIGN, self )
            } );
            actionMoreMap.actionMoreVerify = new ActivityCaseFileMenuItem( {
                name: 'actionMoreVerify',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.VERIFY' ),
                disabled: ko.observable( false ),
                visible: ko.computed( function() {
                    var checkedActivities = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.getComponentColumnCheckbox().checked();
                    return checkedActivities.length && checkedActivities.every( function( activity ) {
                        return activity.actType === 'DOCLETTER';
                    } ) && checkedActivities.some( function( activity ) {
                        return activity.kimState === 'SIGNED';
                    } );
                } ),
                click: Y.bind( self.clickHandlerVerify, self )
            } );
            actionMoreMap.actionMoreSend = new ActivityCaseFileMenuItem( {
                name: 'actionMoreSEND',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.SEND' ),
                visible:  Y.doccirrus.auth.hasTelematikServices('KIM'),
                disabled: ko.computed( function() {
                    var checkedActivities = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.getComponentColumnCheckbox().checked();
                    return !checkedActivities.length || checkedActivities.some( ( act ) => {
                        return self.activityTypRule(act.actType) || self.activityStateRule(act);
                    } );
                } ),
                click: Y.bind( self.clickHandlerSEND, self )
            } );
            actionMoreMap.actionMoreCancel = new ActivityCaseFileMenuItem( {
                name: 'actionMoreCANCEL',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.CANCEL' ),
                disabled: ko.observable( true ),
                click: Y.bind( self.clickHandlerCANCEL, self )
            } );
            actionMoreMap.actionMoreDel = new ActivityCaseFileMenuItem( {
                name: 'actionMoreDEL',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.DEL' ),
                disabled: ko.observable( true ),
                click: Y.bind( self.clickHandlerDEL, self )
            } );
            actionMoreMap.actionMoreTelekonsil = new ActivityCaseFileMenuItem( {
                name: 'actionMoreTELECONSULT',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.TELECONSULT' ),
                disabled: ko.observable( true ),
                click: Y.bind( self.clickHandlerTELECONSULT, self )
            } );
            actionMoreMap.actionMoreTransfer = new ActivityCaseFileMenuItem( {
                name: 'actionMoreTRANSFER',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.TRANSFER' ),
                disabled: ko.observable( false ),
                visible: self.isNotAMTSFolder,
                click: Y.bind( self.clickHandlerTRANSFER, self )
            } );
            actionMoreMap.actionMoreCaseFolderEdit = new ActivityCaseFileMenuItem( {
                name: 'actionMoreCASEFOLDER_EDIT',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.CASEFOLDER_EDIT' ),
                disabled: ko.observable( true ),
                click: Y.bind( self.clickHandlerCASEFOLDER_EDIT, self )
            } );
            actionMoreMap.actionMoreCaseFolderMove = new ActivityCaseFileMenuItem( {
                name: 'actionMoreCASEFOLDER_MOVE',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.CASEFOLDER_MOVE' ),
                disabled: ko.observable( true ),
                click: Y.bind( self.clickHandlerCASEFOLDER_MOVE, self )
            } );
            actionMoreMap.actionMoreActivitiesEdit = new ActivityCaseFileMenuItem( {
                name: 'actionMoreACTIVITIES_EDIT',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.CHANGE_ACTIVITIES' ),
                disabled: ko.observable( true ),
                click: Y.bind( self.clickHandlerACTIVITIES_EDIT, self )
            } );
            actionMoreMap.actionMoreExport = new ActivityCaseFileMenuItem( {
                name: 'actionMoreEXPORT',
                text: 'Export',
                disabled: ko.observable( true ),
                click: Y.bind( self.clickHandlerEXPORT, self )
            } );
            actionMoreMap.actionMoreSendToFormPortal = new ActivityCaseFileMenuItem( {
                name: 'actionMoreSEND_TO_FORM_PORTAL',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.SEND_TO_FORM_PORTAL' ),
                disabled: ko.observable( true ),
                click: Y.bind( self.clickHandlerSendToFormPortal, self )
            } );
            if( tenantSettings.useExternalPrescriptionSoftware ) {
                actionMoreMap.actionMoreScanMedicationPlan = new ActivityCaseFileMenuItem( {
                    name: 'actionMoreSCAN_MEDICATION_PLAN',
                    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.SCAN_MEDICATION_PLAN' ),
                    disabled: ko.observable( false ),
                    click: function() {
                        return Y.doccirrus.incase.handlers.scanMedicationPlan( {
                            user: binder.getInitialData( 'currentUser' ),
                            patient: currentPatient.get( 'data' ),
                            caseFolder: currentPatient.caseFolderCollection.getActiveTab(),
                            externalPrescriptionSoftwareUrl: tenantSettings.externalPrescriptionSoftwareUrl
                        } );
                    }
                } );
            } else {
                actionMoreMap.actionMoreScanMedicationPlan = new ActivityCaseFileMenuItem( {
                    name: 'actionMoreSCAN_MEDICATION_PLAN',
                    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.SCAN_MEDICATION_PLAN' ),
                    disabled: ko.observable( false ),
                    visible: self.isNotAMTSFolder,
                    click: Y.bind( self.clickHandlerScanMedicationPlan, self )
                } );
            }
            actionMoreMap.actionMoreMail = new ActivityCaseFileMenuItem( {
                name: 'clickHandlerACTIVITIES_MAIL',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.ACTIVITIES_MAIL' ),
                disabled: ko.observable( false ),
                click: Y.bind( self.clickHandlerACTIVITIES_MAIL, self )
            } );
            actionMoreMap.actionMoreFax = new ActivityCaseFileMenuItem( {
                name: 'clickHandlerACTIVITIES_FAX',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.ACTIVITIES_FAX' ),
                disabled: ko.observable( false ),
                click: Y.bind( self.clickHandlerACTIVITIES_FAX, self )
            } );
            actionMoreMap.actionMoreCreateTask = new ActivityCaseFileMenuItem( {
                name: 'actionMoreCREATE_TASK',
                text: i18n( 'InCaseMojit.casefile_browserJS.menu.activityCreateTask' ),
                disabled: ko.observable( false ),
                click: Y.bind( self.clickHandlerCREATE_TASK, self )
            } );
            actionMoreMap.actionMoreLockActivities = new ActivityCaseFileMenuItem( {
                name: 'actionMoreLOCK_ACTIVITIES',
                text: i18n( 'InCaseMojit.casefile_browserJS.menu.activityLock' ),
                disabled: ko.observable( false ),
                click: Y.bind( self.clickHandlerLOCK_ACTIVITIES, self )
            } );
            actionMoreMap.actionMoreUnLockActivities = new ActivityCaseFileMenuItem( {
                name: 'actionMoreUNLOCK_ACTIVITIES',
                text: i18n( 'InCaseMojit.casefile_browserJS.menu.activityUnLock' ),
                disabled: ko.observable( false ),
                click: Y.bind( self.clickHandlerUNLOCK_ACTIVITIES, self )
            } );
            actionMoreMap.actionMoreAppMenu = new ActivityCaseFileSubMenu( {
                name: 'actionMoreAppMenu',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.APPMENU' ),
                visible: ko.observable( false ),
                left: true,
                menu: new ActivityCaseFileButtonMenu( {
                    items: ko.observableArray( [] )

                } )
            } );

            actionMoreMap.actionDispenseMedications = new ActivityCaseFileMenuItem( {
                name: 'actionDispenseMenu',
                text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.STOCKDISPENSE' ),
                disabled: self.addDisposable( ko.computed( function() {
                    var checkedActivities = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.getComponentColumnCheckbox().checked();

                    var filteredAct = checkedActivities.filter(function( act ) {
                        return act.actType === 'MEDICATION' &&
                               act.isDispensed === false &&
                               act.isArrived === true &&
                               (act.status === 'VALID' || act.status === 'APPROVED' || act.status === 'ORDERED');
                    });

                    return checkedActivities.length !== filteredAct.length || filteredAct.length === 0;
                })),
                visible: ko.observable( Y.doccirrus.auth.hasAdditionalService('inStock') ),
                click: Y.bind(self.clickHandlerDispenseMedications,self)
            } );

            buttonsMap.actionMore = new ActivityCaseFileButton( {
                name: 'actionMore',
                text: i18n( 'InCaseMojit.casefile_browser.menu.MORE' ),
                menu: new ActivityCaseFileButtonMenu( {
                    items: ko.observableArray( [
                        actionMoreMap.actionMoreResetStatus,
                        actionMoreMap.actionMoreApprove,
                        actionMoreMap.actionMoreSign,
                        actionMoreMap.actionMoreVerify,
                        actionMoreMap.actionMoreSend,
                        actionMoreMap.actionMoreCancel,
                        actionMoreMap.actionMoreDel,
                        actionMoreMap.actionMoreAttach,
                        actionMoreMap.actionMoreTelekonsil,
                        actionMoreMap.actionMoreTransfer,
                        actionMoreMap.actionMoreCaseFolderEdit,
                        actionMoreMap.actionMoreCaseFolderMove,
                        actionMoreMap.actionMoreCreateTask,
                        actionMoreMap.actionMoreExport,
                        actionMoreMap.actionMoreActivitiesEdit,
                        actionMoreMap.actionMoreSendToFormPortal,
                        actionMoreMap.actionMoreScanMedicationPlan,
                        actionMoreMap.actionMoreMail,
                        actionMoreMap.actionMoreFax,
                        actionMoreMap.actionMoreAppMenu,
                        actionMoreMap.actionMoreLockActivities,
                        actionMoreMap.actionMoreUnLockActivities,
                        actionMoreMap.actionDispenseMedications
                    ] )
                } ),
                showWheel: true,
                onShow: function() {
                    var
                        aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                        checked = aCaseFileViewModel.activitiesTable.getComponentColumnCheckbox().checked(),
                        caseFolders = currentPatient.caseFolderCollection,
                        activeCaseFolder = caseFolders.getActiveTab(),
                        isEDOCFolder = (activeCaseFolder && Y.doccirrus.schemas.casefolder.isEDOC( activeCaseFolder )),
                        isErrorFolder = (activeCaseFolder && Y.doccirrus.schemas.casefolder.isError( activeCaseFolder )),
                        isImportedFolder = (activeCaseFolder && activeCaseFolder.imported),
                        allDeletable,
                        allValid,
                        allPrepared,
                        allCreatedValidOrInvalid,
                        allCreatedOrValid,
                        allCanCancel,
                        allLocked,
                        someLocked,
                        allApprovedOrMore,
                        exceptionForSwissModeForSendingEmails,
                        notMirror,
                        showCancelEnabled,
                        hasAccess,
                        transitions = Y.doccirrus.schemas.activity.getTransitionList(),
                        allHasForm = checked.every( function( activity ) {
                            return Y.doccirrus.schemas.activity.hasForm( activity.actType );
                        } ),
                        allowedImportedTypes = checked && Boolean( checked.length ) && checked.every( function( activity ) {
                            return ( -1 !== ['MEDICATION', 'DIAGNOSIS'].indexOf( activity.actType ) );
                        } ),
                        hasValid = checked.some( function( activity ) {
                            return 'VALID' === activity.status;
                        } ),
                        appMenuItems = [];

                    appRegs.forEach( function( appReg ) {
                        if( appReg.uiConfiguration ) {
                            appReg.uiConfiguration.some( function( config ) {
                                if( Y.doccirrus.schemas.appreg.uiConfigurationTypes.CASEFILE === config.type ) {
                                    appMenuItems.push( {
                                        appName: appReg.appName,
                                        title: appReg.title || appReg.appName
                                    } );
                                    return true;
                                }
                            } );
                        }
                    } );
                    actionMoreMap.actionMoreAppMenu.visible( Boolean( appMenuItems.length ) );
                    actionMoreMap.actionMoreAppMenu.menu.items( appMenuItems.map( function( item ) {
                        return new ActivityCaseFileMenuItem( {
                            name: 'clickHandlerSolApp_' + item.appName,
                            text: item.title,
                            disabled: ko.observable( false ),
                            click: function() {
                                var
                                    aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                                    checked = aCaseFileViewModel.activitiesTable.getComponentColumnCheckbox().checked();
                                Promise.resolve( Y.doccirrus.jsonrpc.api.appreg.callApp( {
                                    data: {
                                        appName: item.appName,
                                        selectedActivities: checked.map( function( activity ) {
                                            return activity._id;
                                        } ),
                                        patientId: peek( currentPatient._id )
                                    }
                                } ) )
                                    .then( function( response ) {
                                        Y.doccirrus.DCWindow.notice( {
                                            message: response.data && response.data.message
                                        } );
                                    } )
                                    .catch( function( error ) {
                                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                    } );
                            }
                        } );
                    } ) );


                    allDeletable = checked.every( function( activity ) {
                        return !(activity.notDeletable && true === activity.notDeletable && !Y.doccirrus.auth.memberOf( 'SUPPORT' ));
                    } );
                    allValid = checked.every( function( activity ) {
                        return 'VALID' === activity.status;
                    } );

                    allPrepared = checked.every( function( activity ) {
                        return 'PREPARED' === activity.status;
                    } );
                    allCreatedOrValid = checked.every( function( activity ) {
                        return -1 !== ['CREATED', 'VALID'].indexOf( activity.status );
                    } );
                    allCreatedValidOrInvalid = checked.every( function( activity ) {
                        return -1 !== ['CREATED', 'INVALID', 'VALID'].indexOf( activity.status );
                    } );
                    allApprovedOrMore = checked.every( function( activity ) {
                        return -1 === ["VALID", "CREATED", "CANCELLED", "INVALID"].indexOf( activity.status );
                    } );
                    exceptionForSwissModeForSendingEmails = checked.every( function( activity ) {
                        return -1 === ["CREATED", "CANCELLED", "INVALID"].indexOf( activity.status );
                    } );
                    allCanCancel = checked.every( function( activity ) {
                        //  for initial cancel, must be in state CREATED or INVALID, must not be deletable
                        if ( activity.notDeletable ) {
                            if ( ( 'CREATED' === activity.status ) || ( 'INVALID' === activity.status ) || ( 'DISPENSED' === activity.status ) || ( 'ORDERED' === activity.status ) || Y.doccirrus.auth.memberOf( 'SUPPORT' )) {
                                return true;
                            }
                        }

                        return ( 'APPROVED' === activity.status )  || ( 'DISPENSED' === activity.status ) || ( 'ORDERED' === activity.status );
                    } );

                    allLocked = checked.every( function( activity ) {
                        return ( 'LOCKED' === activity.status );
                    } );

                    someLocked = checked.some( function( activity ) {
                        return ( 'LOCKED' === activity.status );
                    } );

                    notMirror = checked.every( function( activity ) {
                        return !activity.mirrorActivityId;
                    } );

                    showCancelEnabled = (                           //  cancel button is enabled if
                        !isEDOCFolder &&                             //  we are not in a DMP folder
                        notMirror &&                                //  we are not in the mirror patient mojit
                        checked.length &&                           //  we have some selected activities
                        allCanCancel                                //  each selected activity can be cancelled
                    );
                    hasAccess = transitions.approve.accessGroups.some( Y.doccirrus.auth.memberOf );

                    actionMoreMap.actionMoreResetStatus.disabled( !checked.length || hasValid );
                    actionMoreMap.actionMoreExport.disabled( isEDOCFolder || !notMirror );
                    actionMoreMap.actionMoreTransfer.disabled( !(checked.length && notMirror) || allPrepared || someLocked );
                    actionMoreMap.actionMoreCaseFolderEdit.disabled( !(activeCaseFolder && activeCaseFolder._id && 'PREPARED' !== activeCaseFolder.type) );
                    actionMoreMap.actionMoreCaseFolderMove.disabled( !checked.length || (isImportedFolder && !allowedImportedTypes) || isEDOCFolder || !((checked.length && ( allValid || allPrepared ) && notMirror) || isErrorFolder ) );
                    actionMoreMap.actionMoreTelekonsil.disabled( isEDOCFolder || !caseFolders.canCreateActivity() || !Y.doccirrus.auth.hasAdditionalService( "inTouch" ) );
                    actionMoreMap.actionMoreActivitiesEdit.disabled( isEDOCFolder || !(checked.length && ( allValid || allPrepared ) && notMirror) );
                    actionMoreMap.actionMoreSendToFormPortal.disabled( isEDOCFolder || !(1 === checked.length && allCreatedOrValid && notMirror && allHasForm) );
                    actionMoreMap.actionMoreApprove.disabled( !( hasAccess && checked.length && allValid && notMirror) );
                    if( isEDOCFolder ) {
                        actionMoreMap.actionMoreDel.disabled( !(checked.length && ( allCreatedValidOrInvalid || allPrepared ) && allDeletable) );
                    } else {
                        actionMoreMap.actionMoreDel.disabled( !(checked.length && ( allCreatedOrValid  || allPrepared ) && allDeletable) );
                    }
                    actionMoreMap.actionMoreCancel.disabled( !showCancelEnabled );
                    if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                        actionMoreMap.actionMoreMail.disabled( allPrepared || isEDOCFolder || !(checked.length && exceptionForSwissModeForSendingEmails) );
                    } else {
                        actionMoreMap.actionMoreMail.disabled( allPrepared || isEDOCFolder || !(checked.length && allApprovedOrMore) );
                    }
                    actionMoreMap.actionMoreFax.disabled( allPrepared || isEDOCFolder || !(checked.length && allApprovedOrMore) );
                    actionMoreMap.actionMoreScanMedicationPlan.disabled( isEDOCFolder );
                    actionMoreMap.actionMoreCreateTask.disabled( !checked.length  );
                    actionMoreMap.actionMoreLockActivities.disabled( allPrepared || !checked.length || someLocked );
                    actionMoreMap.actionMoreUnLockActivities.disabled( !checked.length || !allLocked );

                    if( 1 === checked.length && notMirror ) {
                        actionMoreMap.actionMoreAttach.disabled( isEDOCFolder || !('DELETED' !== checked[0].status || 'CANCELLED' !== checked[0].status) );
                    } else {
                        actionMoreMap.actionMoreAttach.disabled( isEDOCFolder || true );
                    }

                    return true;
                },
                onHidden: function() {
                    return true;
                },
                clickHandlerAddButton: function() {
                    var currentPatient =peek( self.get( 'currentPatient' ) );
                    Y.doccirrus.modals.addNewButton.show( {
                        onClose: updateButtons,
                        caseFolder: currentPatient.caseFolderCollection.getActiveTab().type
                    } );

                    function updateButtons() {
                        var
                            binder = self.get( 'binder' ),
                            caseFileVM = unwrap( binder.currentView ),
                            acabVM;

                        if ( !caseFileVM || !caseFileVM.activityConfigurableActionButtonsViewModel || !caseFileVM.activityConfigurableActionButtonsViewModel() ) {
                            return;
                        }

                        acabVM = caseFileVM.activityConfigurableActionButtonsViewModel();
                        acabVM.createButtons();
                    }
                }
            } );

            // actionMore button should be the last one in array
            buttonsToShow.push( 'actionMore' );

            buttonsToShow.forEach( function( button ) {
                if( typeof button === 'string' ) {
                    if( buttonsMap[button] ) {
                        buttons.push( buttonsMap[button] );
                    }
                } else {
                    if( button.condition === undefined || (typeof button.condition === 'boolean' && button.condition) ) {
                        buttons.push( buttonsMap[button.name] );
                    }
                }
            } );
        },
        initPostMessageConnection: function() {
            var
                self = this;

            self.PostMessageConnection = Y.doccirrus.utils.getPostMessageConnectionInstance();

            self.PostMessageConnection
                .addListener(self.openActivity.bind(this), 'OPEN_ACTIVITY')
                .addListener(self.modalListener.bind(this), 'SHOW_SOL_MODAL')
                .addListener(self.closeSolModal.bind(this), 'CLOSE_SOL_MODAL');
        },
        destroyPostMessageConnection: function() {
            var
                self = this;

            if( self.PostMessageConnection ) {
                self.PostMessageConnection.clean();
            }
        },
        closeSolModal: function() {
            var
                self = this;

            self.currentSolModal.closeModal();
        },
        openActivity: function(event) {
            var
                self = this,
                activityId = event.data.payload.activityId;

            if( activityId ) {
                self
                    .get('binder')
                    .get( 'router' )
                    .save( '/activity/' + activityId );
            }
        },
        modalListener: function(event) {
            var
                self = this;

            self.currentSolModal = new Y.doccirrus.modals.DCSolModal(event.data.payload);
        },
        destroyButtons: function() {
            var
                self = this;

            if( self.buttons ) {
                self.buttons.removeAll();
                self.buttons = null;
            }

            if( self.buttonsMap ) {
                self.buttonsMap = null;
            }
            if( self.actionNewMap ) {
                self.actionNewMap = null;
            }
            if( self.actionNewPrescriptionsMap ) {
                self.actionNewPrescriptionsMap = null;
            }
            if( self.actionMoreMap ) {
                self.actionMoreMap = null;
            }

        },
        clickHandlerBack: function() {
            var
                self = this,
                binder = self.get( 'binder' );

            binder.navigateToPatientBrowser();
        },
        clickHandlerNewActivity: function() {
            Y.doccirrus.inCaseUtils.createActivity();
        },
        clickHandlerNewActivityAU: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'AU'
            } );
        },
        clickHandlerNewActivityTREATMENT: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'TREATMENT'
            } );
        },
        clickHandlerNewActivityDIAGNOSIS: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'DIAGNOSIS'
            } );
        },
        clickHandlerNewActivityMEDICATION: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'MEDICATION'
            } );
        },
        clickHandlerNewActivityEXTERNAL: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'EXTERNAL'
            } );
        },
        clickHandlerNewActivityMEDICATION_PLAN: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'MEDICATIONPLAN'
            } );
        },
        clickHandlerNewActivityFORM: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'FORM'
            } );
        },
        clickHandlerNewActivityHISTORY: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'HISTORY'
            } );
        },
        clickHandlerNewActivitySCHEIN: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'SCHEIN'
            } );
        },
        clickHandlerNewPrescription: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'PRIVPRESCR'
            } );
        },
        clickHandlerNewPrescriptionPRIVPRESCR: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'PRIVPRESCR'
            } );
        },
        clickHandlerNewPrescriptionPUBPRESCR: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'PUBPRESCR'
            } );
        },
        clickHandlerNewPrescriptionPRESCRBTM: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'PRESCRBTM'
            } );
        },
        clickHandlerNewPrescriptionPRESCRG: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'PRESCRG'
            } );
        },
        clickHandlerNewPrescriptionPRESCRT: function() {
            var
                activitiesTable = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                selected = activitiesTable.getComponentColumnCheckbox().checked(),
                preselectedMedications = selected.filter( function( selectedActivity ) {
                    return selectedActivity.actType === 'MEDICATION';
                } );
            if( preselectedMedications.length > 1 ) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'warn',
                    message: Y.doccirrus.errorTable.getMessage( {code: '50002'} )
                } );
                return;
            }

            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'PRESCRT'
            } );
        },
        clickHandlerNewPrescriptionLONGPRESCR: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'LONGPRESCR'
            } );
        },
        clickHandlerNewPrescriptionPRESASSISTIVE: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'PRESASSISTIVE'
            } );
        },
        clickHandlerNewCaseFolder: function() {
            Y.doccirrus.inCaseUtils.createNewCaseFolderWithSchein();
        },
        clickHandlerNewActivityINVOICE: function() {
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'INVOICE'
            } );
        },
        //TODO change this code. Currently it is copy-paste.
        clickHandlerCopy: function(context) {
            var
                self = this,
                table = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                toCopy = table.getComponentColumnCheckbox().checkedProperties(),
                checked = table.getComponentColumnCheckbox().checked(),
                mirror = checked && Boolean( checked.length ) && checked.every( function( activity ) {
                        return activity.mirrorActivityId;
                    } ),
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                caseFolderCollection = currentPatient.caseFolderCollection || {},
                caseFolders = caseFolderCollection.getCaseFolders(),
                activeTab = caseFolderCollection.getActiveTab(),
                // need this for Quotation not allow to copy to prepared
                additionalType = Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION,
                total = toCopy.length,
                completed = 0,
                currentDate = context.shiftKey,
                errorList = [];
            if( currentDate || mirror ) {
                if( caseFolders && Boolean( caseFolders.length ) ) {
                    Y.doccirrus.modals.changeActivityModal.showDialog( {
                        activities: checked,
                        caseFolders: caseFolders,
                        currentDate: currentDate,
                        mirror: mirror,
                        copy: true,
                        currentCaseFolder: ( activeTab && ( activeTab.type || additionalType === activeTab.additionalType ) ) ? activeTab : caseFolders && caseFolders[0]
                    }, function() {
                        table.getComponentColumnCheckbox().uncheckAll();
                        table.reload();
                    } );
                    return;
                } else {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        message: NO_CASEFOLDER,
                        window: {width: 'medium'}
                    } );
                    return;
                }
            }

            if( !total ) {
                return;
            }

            var
                promise,
                title = i18n('InCaseMojit.casefile_browserJS.menu.activityCopy'),
                errorMsgArr;

            function finishProgress() {
                Y.doccirrus.comctl.clearModal();
                Y.doccirrus.communication.off('activty.PROCESSED_ONE');
                table.getComponentColumnCheckbox().uncheckAll();
                table.reload();
            }

            function updateProgress() {
                var progressHtml = Y.doccirrus.comctl.makeProgressBar( completed++, total );
                Y.doccirrus.comctl.setModal( title, progressHtml, false );
            }

            Y.doccirrus.communication.on( {
                event: 'activty.PROCESSED_ONE',
                handlerId: 'changActivities',
                done: function success(message) {
                    (message && message.data || []).forEach( function(el){
                        if(el && el.error){
                            errorList.push(el.error);
                        }
                    });
                    updateProgress();
                }
            } );

            promise = new Promise( function( resolve, reject ) {
                Y.doccirrus.comctl.setModal( title, '<div id="divCopyMultiple"></div>', false, null, function(){
                    Y.doccirrus.jsonrpc.api.activity.updateBatch( {
                        query: {
                            activitiesId: toCopy
                        },
                        data: {},
                        fields: [],
                        copy: true
                    } ).done( function( response ) {
                        var
                            data = response.data;
                        if (errorList.length > 0) {
                            reject(errorList);
                        } else {
                            resolve( data );
                        }
                    } ).fail( function( error ) {
                        if( errorList.length > 0 ) {
                            errorMsgArr = Array.from(new Set( Y.doccirrus.errorTable.getMessages( errorList ) ));
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                window: {width: 'medium'},
                                message: errorMsgArr.join( '<br>' )
                            } );
                            reject( errorList );
                        } else {
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                            reject( error );
                        }
                    } ).always(function(){
                        finishProgress();
                    } );
                } );
            } );
            return promise;


        },

        clickHandlerPrintENTRIES: function() {

        },

        /**
         *  Action to print the casefolder table into a PDF
         */

        clickHandlerPrintHEALTH_RECORD: function() {

            var
                self = this,
                binder = self.get( 'binder' ),
                currentVM = unwrap( binder.currentView ),
                activitiesTable = currentVM.activitiesTable;

            activitiesTable.showExportPdfDataStart();
        },

        clickHandlerPrintPDF_TO_CASEFILE: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentVM = unwrap( binder.currentView ),
                currentPatient = peek( binder.currentPatient ),
                patientId = unwrap( currentPatient._id ),
                getActiveTab = currentPatient.caseFolderCollection.getActiveTab() || {},
                currentUser = binder.getInitialData( 'currentUser' ),
                activitiesTable = currentVM.activitiesTable,
                selectedDoctorAndLocation = Y.doccirrus.utils.localValueGet( 'incase-selected-doctor' ),
                split = selectedDoctorAndLocation.split( '-' ),
                employeeId = split && Array.isArray( split ) && split.length && split[0],
                locationId = split && Array.isArray( split ) && split.length && split[1];

            Promise.resolve( Y.doccirrus.jsonrpc.api.patient.lastSchein( {
                query: {
                    caseFolderId: getActiveTab && getActiveTab._id,
                    patientId: patientId,
                    timestamp: new Date().toISOString()
                }
            } ) )
                .then( function( response ) {
                    var lastSchein = response && response.data && response.data[0];
                    Y.doccirrus.modals.printKoTable.show( {
                        kotable: activitiesTable,
                        savePDFtoCaseFile: true,
                        patientId: patientId,
                        caseFolderId: getActiveTab._id,
                        user: currentUser,
                        employeeId: employeeId,
                        locationId: locationId,
                        lastSchein: lastSchein,
                        printOnlySelectedActivities: !!activitiesTable.getComponentColumnCheckbox().checked().length,
                        callback: function( err, result ) {
                            if( err ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            }
                            if( result ) {
                                KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.reload();
                            }
                        }
                    } );
                } )
                .catch( logUnhandled );
        },

        clickHandlerPrintDOWNLOAD_ATTACHMENTS: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentVM = unwrap( binder.currentView ),
                activitiesTable = currentVM.activitiesTable,
                checkboxCol = activitiesTable.getComponentColumnCheckbox(),
                checkedRows = ( checkboxCol && checkboxCol.checked ) ? checkboxCol.checked() : null,
                activitiesIds = ( checkedRows || [] ).filter( function( activity ) {
                    return -1 === ["CREATED", "CANCELED", "INVALID"].indexOf( activity.status );
                }).map( function( activity ) {
                    return activity._id;
                });
            Y.doccirrus.jsonrpc.api.media.exportActivitiesAttachmentsToZip( {
                data: {
                    activitiesIds: activitiesIds
                }
            }).done( function( res ) {
                var
                    data = res && res.data,
                    zipId = data && data.zipId,
                    fileNames = data && data.fileNames;
                Y.doccirrus.modals.downloadAttachments.show( {
                    zipId: zipId,
                    fileNames: fileNames
                } );
            }).fail( function( error ) {
                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            } );
        },

        clickHandlerPrintENVELOPE: function() {
            Y.log( 'Open envelope menu.', 'debug', NAME );
        },

        clickHandlerENVELOPEC6: function() {
            var self = this;
            self.openEnvelopeModal( 'envelope-c6' );
        },

        clickHandlerENVELOPEC5: function() {
            var self = this;
            self.openEnvelopeModal( 'envelope-c5' );
        },

        clickHandlerENVELOPEC4: function() {
            var self = this;
            self.openEnvelopeModal( 'envelope-c4' );
        },

        clickHandlerENVELOPEDL: function() {
            var self = this;
            self.openEnvelopeModal( 'envelope-dl' );
        },
        clickHandlerETIQUETTE: function() {
            var self = this;
            self.openEnvelopeModal( 'etiquette' );
        },
        openEnvelopeModal: function( formRole ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                currentUser = binder.getInitialData( 'currentUser' ),
                locations = binder.getInitialData( 'location' ),
                currentLocation = null,
                employeeProfile,
                formData,
                i,
                currentCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab();

            if( formRole === 'etiquette' && Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[currentCaseFolder.type || "ANY"] === "CH" ) {
                formRole = 'etiquette-ch';
            }

            async.series( [ getEmployeeProfile, getCurrentLocation, createFormData ], onDataPrepared );

            function getEmployeeProfile( itcb ) {
                Y.doccirrus.jsonrpc.api.employee
                    .getEmployeeForUsername( { username: Y.doccirrus.auth.getUserId() }  )
                    .done( onEmployeeProfileSuccess )
                    .fail( itcb  );

                function onEmployeeProfileSuccess( response ) {
                    employeeProfile = response && response.data ? response.data : {};

                    itcb( null );
                }
            }

            function getCurrentLocation( itcb ) {

                for( i = 0; i < locations.length; i++ ) {
                    if( locations[i]._id === currentUser.currentLocation ) {
                        currentLocation = locations[i];
                    }
                }

                itcb( null );
            }

            function createFormData( itcb ) {
                var
                    talkList = Y.doccirrus.schemas.person.types.Talk_E.list,
                    currentUserTalk = Y.doccirrus.schemaloader.translateEnumValue( '-de', employeeProfile.talk, talkList, '' ),
                    currentPatientTalk = Y.doccirrus.schemaloader.translateEnumValue( '-de', currentPatient.talk(), talkList, '' ),
                    address = unwrap( currentPatient.addresses )[0] || {};

                formData = {
                    'patientTalk': currentPatientTalk,
                    'patientName': currentPatient._getNameSimple(),
                    'postAddress': currentPatient.getAddressByKind( 'BILLING' ),
                    'senderTalk': currentUserTalk || '',
                    'senderAddress': '',
                    'senderName': employeeProfile.firstname + ' ' + employeeProfile.lastname,
                    'kbvDob': unwrap( currentPatient.kbvDob ),
                    'street': unwrap( address.street ),
                    'zip': unwrap( address.zip ),
                    'city': unwrap( address.city ),
                    'houseno': unwrap( address.houseno ),
                    'displayname': unwrap( currentPatient.firstname ) + ' ' + unwrap( currentPatient.lastname ),
                    'talk': currentPatientTalk
                };

                //  Special case, German grammatical rule changes the salutation of the receipient, MOJ-8830
                //  see: https://www.rocketlanguages.com/forum/german-grammar/difference-between-herr-and-herrn-in-german/
                formData.patientTalk = formData.patientTalk.replace( 'Herr', 'Herrn' );

                if( !formData.postAddress || '' === formData.postAddress ) {
                    formData.postAddress = currentPatient.getAddressByKind( 'OFFICIAL' );
                }

                if( !formData.postAddress || '' === formData.postAddress ) {
                    formData.postAddress = currentPatient.getAddressByKind( 'POSTBOX' );
                }

                if( !formData.postAddress || '' === formData.postAddress ) {
                    formData.postAddress = currentPatient.getAddressByKind( 'POSTAL' );
                }

                if( 'object' === typeof formData.postAddress ) {
                    formData.postAddress = formData.postAddress.toString();
                }

                if( currentLocation ) {
                    //  TODO: standard utility for serializing addresses

                    formData.senderAddress = '' +
                        ( currentLocation.addon ? currentLocation.addon + '\n' : '') +
                        currentLocation.street + ' ' +
                        currentLocation.houseno + '\n' +
                        currentLocation.zip + ' ' +
                        currentLocation.city;
                }

                itcb( null );
            }


            function onDataPrepared( err ) {
                var sizeLabel = formRole.replace( 'envelope-', '' ).toUpperCase();
                if( err ) {
                    Y.log( 'Could not create envelope modal: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                if( formRole === 'etiquette' || formRole === 'etiquette-ch' ) {
                    sizeLabel = i18n( 'InCaseMojit.envelope_modalJS.ETIQUETTE' );

                }

                Y.doccirrus.modals.envelope.show( {
                    'formRole': formRole,
                    'sizeLabel': sizeLabel,
                    'formData': formData
                } );
            }


        },

        /**
         *  Open a form in a modal to display current patient's schedule
         *
         *  NOTE: the semantics of currentPatient._events have changed, this property still exists, but no
         *  longer refers to calendar events as in previous CaseFileMojit
         */

        clickHandlerPrintAPP_LIST: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            Y.doccirrus.modals.appointments.show( {
                'patient': currentPatient,
                'patientId': unwrap( currentPatient._id )
            } );
        },

        /**
         *  Get the current schein and treatments for it, create a PUBRECEIPT, and make PDF
         */

        clickHandlerPrintPUBRECEIPT: function() {
            Y.log( 'Open PUBRECEIPT menu.', 'debug', NAME );
        },

        clickHandlerPrintPUBRECEIPTToday: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( binder.currentPatient ),
                getActiveTab = currentPatient.caseFolderCollection.getActiveTab() || {};

            var
                lastMidnight = moment( 0, 'HH' ),

                postArgs = {
                    'patientId': unwrap( currentPatient._id ),
                    'caseFolderId': unwrap( getActiveTab._id )
                };

            Y.log( 'Finding treatments for PUBRECEIPT since: ' + lastMidnight.format(), 'debug', NAME );

            Y.doccirrus.modals.datePicker.show( {
                'defaultValue': lastMidnight.format( 'DD.MM.YYYY' ),
                'onSelect': onDateSelected
            } );

            function onDateSelected( chosenDate ) {
                var
                    startDate = moment( chosenDate, 'DD.MM.YYYY' ),
                    endDate = moment( startDate ).add( 1, 'day' );

                postArgs.startDate = startDate.format();
                postArgs.endDate = endDate.format();

                Y.doccirrus.jsonrpc.api.invoice
                    .getTreatmentsForDateRange( postArgs )
                    .then( onTreatmentsListed )
                    .then( onPubReceiptCreated )
                    .fail( onPubReceiptErr );
            }

            function onTreatmentsListed( result ) {
                var data = result.data ? result.data : result;

                //  NOTE: this will no longer return a specific schein _id, will act as if selecting treatments from
                //  the form.

                if ( !data.treatmentIds || 0 === data.treatmentIds.length ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'warn',
                        title: i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.ERROR_TITLE' ),
                        message: i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.NO_TREATMENTS' )
                    } );
                    return false;
                }

                //  MOJ-8599 - Different form role for daily PUBRECEIPTs
                data.formRole = 'casefile-patientreciept-daily';

                return Y.doccirrus.jsonrpc.api.invoice.createPubReceipt( data );
            }

            function onPubReceiptCreated( result ) {
                var data = result.data ? result.data : result;

                if ( !data ) { return false; }

                if ( data.activityId ) {
                    Y.log( 'Recording PDF: ' + data.activityId + ' in queue: ' + JSON.stringify( binder.printWhenReady ), 'debug', NAME );
                    binder.printWhenReady.push( data.activityId );
                }

                Y.log( 'Created pubreceipt: ' + JSON.stringify( data, undefined, 2 ), 'debug', NAME );

                //  show print modal
                if ( data.mediaId && '' !== data.mediaId ) {
                    data.documentUrl = '/media/' + data.mediaId + '_original.APPLICATION_PDF.pdf';
                    Y.doccirrus.modals.printPdfModal.show( data );
                }

                //  reload table (FUTURE: possibly add own event)
                Y.fire( 'activityPDFChange', data );
                return Promise.resolve( true );
            }

            function onPubReceiptErr( err ) {
                Y.log( 'Could not create PUBRECEIPT: ' + JSON.stringify( err ) );
                Y.doccirrus.DCWindow.notice( {
                    type: 'warn',
                    title: i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.ERROR_TITLE' ),
                    message: i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.ERROR_PUBRECEIPT' )
                } );
            }
        },

        clickHandlerAPPROVE: function() {
            this.batchTransition( 'approve', 'freigegeben' );
        },
        clickHandlerSEND: function() {
            var
                aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                activitiesTable = aCaseFileViewModel.activitiesTable,
                selectedActivity = activitiesTable.getComponentColumnCheckbox().checked();

            if( selectedActivity && selectedActivity.length ) {
                Y.doccirrus.modals.kimSignatureModal.decideToOpenSignOrSendModal(selectedActivity);
            }
        },
        clickHandlerSIGN: function() {
            var
                aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                activitiesTable = aCaseFileViewModel.activitiesTable,
                selectedActivity = activitiesTable.getComponentColumnCheckbox().checked();

            if( selectedActivity && selectedActivity.length ) {
                Y.doccirrus.modals.kimSignatureModal.show(selectedActivity);

            }
        },
        clickHandlerVerify: function() {
            var checked = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.getComponentColumnCheckbox().checked(),
                signedActivities = checked.filter( function( activity ) {
                    return activity.kimState === 'SIGNED';
                } );

            if( checked.length !== signedActivities.length ) {
                Y.doccirrus.DCSystemMessages.addMessage( {
                    content: i18n( 'InCaseMojit.casefile_nav.tab_kim.verifyDocument.NOT_ALL_ACTIVITIES_HAVE_SIGNATURES_AND_CAN_BE_VERIFIED' ),
                    level: 'INFO'
                } );
            }

            Y.doccirrus.modals.kimVerifySignatureModal.show( {activities: signedActivities} );
        },
        clickHandlerResetStatus: function() {
            var
                activitiesTable = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                ids = activitiesTable.getComponentColumnCheckbox().checkedProperties();
            Y.doccirrus.jsonrpc.api.activity.resetActivityStatus( {
                data: {
                    activityIds: ids
                }
            } ).done( function() {
                activitiesTable.reload();
            } ).fail( function( error ) {
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            } );
        },

        clickHandlerPrintPUBRECEIPTQuarter: function() {
            //  TODO: re-enable with new server-side method to collect scheine
            Y.log( 'DISABLED', 'debug', NAME );

            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( binder.currentPatient ),
                getActiveTab = currentPatient.caseFolderCollection.getActiveTab() || {},
                postArgs = {
                    'patientId': unwrap( currentPatient._id ),
                    'caseFolderId': unwrap( getActiveTab._id )
                };

            Y.log( 'Compiling all PUBRECEIPTs for quarter....', 'debug', NAME );

            Y.doccirrus.jsonrpc.api.invoice
                .compilePubreceiptsForQuarter( postArgs )
                .then( onPubReceiptsCreated )
                .fail( onPubReceiptsErr );

            function onPubReceiptsCreated( result ) {
                var data = result.data ? result.data : result;

                if ( !data ) { return false; }

                Y.log( 'Created pubreceipts: ' + JSON.stringify( data, undefined, 2 ), 'debug', NAME );

                //  TODO: record _id of casefolder for when PDF is compiled, to show print notice

                //  reload table (FUTURE: possibly add own event)
                Y.fire( 'activityPDFChange', data );
                return Promise.resolve( true );
            }

            function onPubReceiptsErr( err ) {
                Y.log( 'Could not create PUBRECEIPT: ' + JSON.stringify( err ) );
                Y.doccirrus.DCWindow.notice( {
                    type: 'warn',
                    title: i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.ERROR_TITLE' ),
                    message: i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.ERROR_PUBRECEIPT' )
                } );
            }

        },
        clickHandlerCANCEL: function() {
            var
                self = this,
                REASON_TO_CANCEL = i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.REASON_TO_CANCEL' );
            Y.doccirrus.modals.activityCancel.show( { 'message': REASON_TO_CANCEL, callback: function( result ) {
                self.batchTransition( 'cancel', 'storniert', {cancelReason: result && result.data} );
            } } );
        },
        clickHandlerDEL: function() {
            var
                self = this;
            doConfirm( 'gelöscht' )
                .then( function() {
                    self.batchTransition( 'delete', 'gelöscht' );
                } )
                .catch( function() {
                } );
        },
        clickHandlerATTACH: function() {
            var
                self = this,
                table = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                selectedActivities = table.getComponentColumnCheckbox().checked();

            if( 1 === selectedActivities.length && ('DELETED' !== selectedActivities[0].status || 'CANCELLED' !== selectedActivities[0].status ) ) {
                currentPatient.attachActivity( selectedActivities[0]._id, selectedActivities[0].content, selectedActivities[0].severity )
                    .then( function() {
                        table.getComponentColumnCheckbox().uncheckAll();
                    } );
            }
        },
        clickHandlerTELECONSULT: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                getActiveTab = currentPatient.caseFolderCollection.getActiveTab() || {};
            Y.doccirrus.modals.startTelekonsil.show( {
                binder: binder,
                patientId: unwrap( currentPatient._id ),
                caseFolderId: getActiveTab._id
            } );

        },
        clickHandlerTRANSFER: function() {
            var
                self = this,
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                activitiesTable = aCaseFileViewModel.activitiesTable,
                activityIds = activitiesTable.getComponentColumnCheckbox().checkedProperties();
            if( activityIds && activityIds.length ) {

                Y.doccirrus.modals.transferActivity.show( {
                    transferTo: true,
                    patientId: peek( currentPatient._id ),
                    activityIds: activityIds
                } );
            }
        },
        clickHandlerCASEFOLDER_EDIT: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( self.get( 'currentPatient' ) ),
                caseFolders = currentPatient.caseFolderCollection,
                patientId = peek( currentPatient._id );

            Y.doccirrus.modals.editCaseFolderModal
                .show( caseFolders.getActiveTab() )
                .after( {
                    edit: function() {
                        caseFolders.load( {
                            patientId: patientId
                        } );
                    },
                    delete: function() {
                        caseFolders
                            .load( {
                                patientId: patientId
                            } )
                            .then( function() {
                                binder.navigateToCaseFolder();
                            } );
                    }
                } );
        },
        clickHandlerCASEFOLDER_MOVE: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                patientId = unwrap( currentPatient._id() ),
                aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                activitiesTable = aCaseFileViewModel.activitiesTable,
                selected = activitiesTable.getComponentColumnCheckbox().checked(),
                caseFolders = currentPatient.caseFolderCollection,
                activeTab = caseFolders.getActiveTab(),
                importedFolder = (activeTab && activeTab.imported),
                allMedications = selected.every( function(activity){
                    return 'MEDICATION' === activity.actType;
                });

            if (allMedications && importedFolder){
                selected = _.uniq(selected, 'phPZN').filter( function(x){return x.phPZN;} );
            }
            if( selected && selected.length ) {
                Y.doccirrus.modals.moveToCaseFolder.show( {
                    selectedActivities: selected,
                    caseFolders: caseFolders.getCaseFolders(),
                    currentCaseFolder: activeTab
                }, function( err, result ) {
                    if( err ) {
                        Y.log( 'error moving activity to new casefolder: ' + err, 'error', NAME );
                        return;
                    }
                    binder.navigateToCaseFolder( {
                        caseFolderId: result.caseFolderId
                    } );
                    if( patientId ) {
                        caseFolders.load( { patientId: patientId } );
                    }
                } );
            }
        },
        clickHandlerEXPORT: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );
            Y.doccirrus.utils.selectFlow( 'patient', currentPatient.toJSON() );
        },
        clickHandlerSendToFormPortal: function() {
            var
                aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                checked = aCaseFileViewModel.activitiesTable.getComponentColumnCheckbox().checked();
            Y.doccirrus.modals.sendToFormPortalModal.show( {
                selectedActivityId: checked[0] && checked[0]._id
            } );
        },
        clickHandlerScanMedicationPlan: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( self.get( 'currentPatient' ) ),
                locationList = binder.getInitialData( 'location' ),
                caseFolder = currentPatient.caseFolderCollection.getActiveTab() || {},
                caseFolderType = caseFolder && caseFolder.type,
                patientData = currentPatient.toJSON(),
                insurance = Y.doccirrus.schemas.patient.getInsurancesByType( patientData, caseFolderType )[0] || {};
            return Promise.resolve( Y.doccirrus.jsonrpc.api.patient.lastSchein( {
                query: {
                    caseFolderId: caseFolder && caseFolder._id,
                    patientId: patientData._id,
                    timestamp: moment().toISOString(),
                    patientData: patientData
                }
            } ) )
                .then( function( response ) {
                    var
                        lastSchein = response && response.data && response.data[ 0 ];
                    Y.doccirrus.modals.scanMedicationPlan.show( {
                        locationList: locationList,
                        lastSchein: lastSchein,
                        insurance: insurance,
                        patient: patientData,
                        caseFolderType: caseFolderType,
                        caseFolderId: caseFolder && caseFolder._id,
                        patientAge: patientData.kbvDob ? moment().diff( moment( patientData.kbvDob, 'DD.MM.YYYY' ), 'years' ) : ''
                    } );
                } )
                .catch( logUnhandled );

        },
        clickHandlerACTIVITIES_MAIL: function() {
            var self = this,
                binder = self.get( 'binder' ),
                activitiesTable = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                selected = activitiesTable.getComponentColumnCheckbox().checked(),
                currentUser = binder.getInitialData( 'currentUser' ),
                locations = binder.getInitialData( 'location' ),
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                currentEmployee, employeesFromActivities = [],
                patientContactIds = [],
                patientContacts,
                familyDoctor = unwrap( currentPatient.familyDoctor ),
                physicians = unwrap( currentPatient.physicians ),
                institution = unwrap( currentPatient.institution ),
                additionalContacts = unwrap( currentPatient.additionalContacts );

            currentPatient.additionalContactsObj = [];

            selected.forEach( function( activity ) {
                if( employeesFromActivities.indexOf( activity.employeeId ) < 0 ) {
                    employeesFromActivities.push( activity.employeeId );
                }
            } );

            if( familyDoctor && 'string' === typeof familyDoctor ) {
                patientContactIds.push( familyDoctor );
            }

            if( physicians && physicians.length ) {
                physicians.forEach( function( physician ) {
                    if( 'string' === typeof physician ) {
                        patientContactIds.push( physician );
                    }
                } );
            }

            if( institution && 'string' === typeof institution ) {
                patientContactIds.push( institution );
            }

            if( additionalContacts && additionalContacts.length ) {
                additionalContacts.forEach( function( additionalContact ) {
                    if( 'string' === typeof additionalContact ) {
                        patientContactIds.push( additionalContact );
                    }
                } );
            }

            return Promise
                .props( {
                    patientContacts: Y.doccirrus.jsonrpc.api.basecontact
                        .getExpandedPhysicians( {query: {'_id': {$in: patientContactIds}}} ),
                    currentEmployee: Y.doccirrus.jsonrpc.api.employee
                        .getEmployeeForUsername( {username: Y.doccirrus.auth.getUserId()} ),
                    employeesFromActivities: Y.doccirrus.jsonrpc.api.employee.read( {
                        query: {_id: {$in: employeesFromActivities}}
                    } )
                } )
                .then( function( props ) {
                    currentEmployee = props.currentEmployee && props.currentEmployee.data || null;
                    employeesFromActivities = props.employeesFromActivities && props.employeesFromActivities.data || [];
                    patientContacts = props.patientContacts && props.patientContacts.data || [];

                    patientContacts.forEach( function( contactObj ) {
                        if( physicians && physicians.length && contactObj._id === physicians[0] ) {
                            currentPatient.physiciansObj = contactObj;
                        }

                        if( institution && contactObj._id === institution ) {
                            currentPatient.institutionObj = contactObj;
                        }

                        if( familyDoctor && contactObj._id === familyDoctor ) {
                            currentPatient.familyDoctorObj = contactObj;
                        }

                        if( additionalContacts && (-1 !== additionalContacts.indexOf( contactObj._id )) ) {
                            currentPatient.additionalContactsObj.push( contactObj );
                        }
                    } );

                    Y.doccirrus.modals.mailActivitiesModal.showDialog( selected, currentPatient, currentUser, locations, currentEmployee, employeesFromActivities, function( data ) {
                        Y.doccirrus.jsonrpc.api.activity.mailActivities( {
                            data: data
                        } ).then( function() {
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: 'mailActivitiesMessage',
                                content: i18n( 'InCaseMojit.mailActivities.SUCCESS' )
                            } );
                        }, function( err ) {
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: 'mailActivitiesError',
                                content: "Error: " + err.message || err
                            } );
                        } );
                    } );
                } )
                .catch( catchUnhandled );
        },
        clickHandlerACTIVITIES_FAX: function() {
            var self = this,
                binder = self.get( 'binder' ),
                activitiesTable = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                selected = activitiesTable.getComponentColumnCheckbox().checked(),
                currentUser = binder.getInitialData( 'currentUser' ),
                currentPatient = unwrap( self.get( 'currentPatient' ) );

            Y.doccirrus.modals.faxActivitiesModal.showDialog( selected, currentPatient, currentUser, function( data ) {
                //  rotate landscape PDFs to portrait orientation MOJ-7590
                data.autorotate = true;

                Y.doccirrus.jsonrpc.api.activity.mailActivities( {
                    data: data
                } ).then( function() {
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'faxActivitiesMessage',
                        content: i18n( 'InCaseMojit.mailActivities.SUCCESS' )
                    } );
                }, function( err ) {
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'faxActivitiesError',
                        content: "Error: " + err
                    } );
                } );
            } );
        },
        clickHandlerCREATE_TASK: function() {
            var self = this,
                activitiesTable = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                selected = activitiesTable.getComponentColumnCheckbox().checked(),
                currentPatient = unwrap( self.get( 'currentPatient' ) );

            Y.doccirrus.modals.taskModal.showDialog( {
                patientId: peek( currentPatient._id ),
                selectedActivities: selected,
                patientName: Y.doccirrus.schemas.person.personDisplay( {
                    firstname: peek( currentPatient.firstname ),
                    lastname: peek( currentPatient.lastname ),
                    title: peek( currentPatient.title )
                } )
            } );
        },
        clickHandlerLOCK_ACTIVITIES: function() {
            var self = this,
                binder = self.get( 'binder' ),
                activitiesTable = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                selected = activitiesTable.getComponentColumnCheckbox().checked(),
                toLock = (selected || []).filter( function( el ){
                    return el.status !== 'LOCKED';
                }).map( function( el ){
                    return el._id;
                });

            if( !toLock.length ) {
                return;
            }

            Y.doccirrus.jsonrpc.api.activity.activitiesLockUnlock( {
                data: {
                    activities: toLock,
                    operation: 'lock'
                }
            } ).done( function(){
                binder.navigateToCaseFileBrowser({
                    refreshCaseFolder: true
                });
            }).fail( function( error ) {
                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            } );
        },
        clickHandlerUNLOCK_ACTIVITIES: function() {
            var self = this,
                binder = self.get( 'binder' ),
                activitiesTable = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                selected = activitiesTable.getComponentColumnCheckbox().checked(),
                toUnLock = (selected || []).filter( function( el ){
                    return el.status === 'LOCKED';
                }).map( function( el ){
                    return el._id;
                });

            if( !toUnLock.length ) {
                return;
            }

            Y.doccirrus.jsonrpc.api.activity.activitiesLockUnlock( {
                data: {
                    activities: toUnLock,
                    operation: 'unlock'
                }
            } ).done( function(){
                binder.navigateToCaseFileBrowser({
                    refreshCaseFolder: true
                });
            }).fail( function( error ) {
                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            } );
        },
        clickHandlerPRESCRIPTION_MODAL: function( swiss ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( self.get( 'currentPatient' ) ),
                activitiesTable = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                caseFolderActive = currentPatient.caseFolderCollection.getActiveTab(),
                selected = activitiesTable.getComponentColumnCheckbox().checked(),
                preselectedMedications = selected.filter( function( selectedActivity ) {
                    return selectedActivity.actType === 'MEDICATION';
                } ),
                preselectedMedPlans = selected.filter( function( selectedActivity ) {
                    return ['MEDICATIONPLAN', 'KBVMEDICATIONPLAN'].indexOf( selectedActivity.actType ) !== -1;
                } ),
                preselectedPrescriptionsAndMedicationPlans = selected.filter( function( selectedActivity ) {
                    return Y.doccirrus.schemas.activity.isPrescriptionType( selectedActivity.actType ) || (['MEDICATIONPLAN', 'KBVMEDICATIONPLAN'].indexOf( selectedActivity.actType ) !== -1);
                } ),
                expandedMedications;

            Promise.resolve()
                .then( function() {
                    var expandedMedicationIds = [];
                    preselectedPrescriptionsAndMedicationPlans.forEach( function( prescriptionOrMedicationPlan ) {
                        (prescriptionOrMedicationPlan.activities || []).forEach( function( activityId ) {
                            expandedMedicationIds.push( activityId );
                        } );
                    } );
                    expandedMedicationIds = expandedMedicationIds.filter( function( expandedMedicationId ) {
                        return !preselectedMedications.find( function( preselectedMedication ) {
                            return preselectedMedication._id === expandedMedicationId;
                        } );
                    } );
                    if( expandedMedicationIds.length ) {
                        Y.log( 'expanding ' + expandedMedicationIds.length + ' medication activities from prescriptions and medication plans that have been pre-selected', 'info', NAME );
                        return Promise.resolve( Y.doccirrus.jsonrpc.api.activity.read( {
                            query: {
                                _id: {
                                    $in: expandedMedicationIds
                                },
                                actType: 'MEDICATION'
                            }
                        } ) ).then( function( response ) {
                            expandedMedications = response.data;
                        } ).catch( function( err ) {
                            Y.log( 'could not expand linked activities of preselected prescriptions and medication plans: ' + (err.stack || err), 'warn', NAME );
                        } );
                    }
                } )
                .then( function() {
                    if( self.defaultMappings || Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland()) {
                        return self.defaultMappings;
                    } else {
                        return Promise.resolve( Y.doccirrus.jsonrpc.api.mmi.getMappingCatalogEntries( {
                            query: {
                                catalogShortNames: ['MOLECULETYPE', 'MOLECULEUNIT', 'PHARMFORM', 'DISCOUNTAGREEMENT']
                            }
                        } ) )
                            .then( function( response ) {
                                var
                                    data = response && response.data;
                                self.defaultMappings = data;
                                return data;
                            } )
                            .catch( function( error ) {
                                Y.log( 'can not get defaultMappings from MMI' + error.toString(), 'error', NAME );
                                return null;
                            } );
                    }
                } )
                .then( function( defaultMappings ) {
                    var
                        insurance = Y.doccirrus.schemas.patient.getInsuranceByType( currentPatient.toJSON(), caseFolderActive.type );
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.casefolder.getCaseFolderDataForActivity( {
                        data: {
                            insuranceLocation: insurance && insurance.locationId,
                            patientId: peek( currentPatient._id ),
                            caseFolderType: caseFolderActive.type,
                            caseFolderId: caseFolderActive._id
                        }
                    } ) )
                        .then( function( response ) {
                            var
                                caseFolderData = response.data || {};
                            return {
                                caseFolderData: caseFolderData,
                                defaultMappings: defaultMappings
                            };
                        } );
                } )
                .then( function( additionalData ) {
                    var
                        message,
                        shouldShowInfoModal = false,
                        fieldsToCheckInMedPlan = Object.keys( _.omit( KBVMedicationPlan_T, ['identificationName', 'medicationPlanVersion', 'patientGender']) ),
                        lastSchein = additionalData.caseFolderData && additionalData.caseFolderData.lastSchein,
                        activityDate = moment(),
                        showDialog = true;


                    function showPrescriptionModal() {
                        return Y.doccirrus.modals.medicationPlanPrescription.show( {
                            activitySettings: binder.getInitialData( 'activitySettings' ),
                            currentPatient: currentPatient,
                            defaultMappings: additionalData.defaultMappings,
                            locationId: additionalData.caseFolderData.locationId,
                            employeeId: additionalData.caseFolderData.employeeId,
                            preselectedMedications: preselectedMedications.concat( expandedMedications || [] ),
                            caseFolder: caseFolderActive,
                            swissCaseFolder: CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolderActive.type] === 'CH',
                            binder: binder,
                            swissPreselectedMedications: preselectedMedications,
                            swissMedPlans: preselectedMedPlans,
                            swissMedications: preselectedMedications,
                            swissMedicationPlan: preselectedMedPlans
                        } )
                            .then( function() {
                                binder.showBackgroundProcessMask();
                            } );
                    }

                    if( !Y.doccirrus.DCWindowManager.getById( 'checkQuarterHasSchein' ) ) {
                        if( lastSchein && ( 'VALID' === lastSchein.status || 'APPROVED' === lastSchein.status ) ) {
                            if( !Y.doccirrus.schemas.patient.isPublicInsurance( caseFolderActive ) ) { // MOJ-14319: [OK]
                                showDialog = false;
                            }
                            if( moment( lastSchein.timestamp ).isBetween( activityDate.startOf( 'quarter' ).toISOString(), activityDate.endOf( 'quarter' ).toISOString() ) ) {
                                showDialog = false;
                            }
                        }
                        if( showDialog ){
                            // MOJ-14319: [OK]
                            message = Y.doccirrus.schemas.patient.isPublicInsurance( caseFolderActive ) ? NO_SCHEIN_IN_QUARTER : (NO_SCHEIN + '<br/><br/>' + NO_SCHEIN_EXPLANATION);
                            Y.doccirrus.DCWindow.notice( {
                                message: message,
                                window: {
                                    id: 'checkQuarterHasSchein',
                                    width: 'medium',
                                    buttons: {
                                        footer: [
                                            {
                                                isDefault: true,
                                                label: CREATE_SCHEIN,
                                                action: function() {
                                                    this.close();
                                                    Y.doccirrus.inCaseUtils.createActivity( { actType: 'SCHEIN' } );
                                                }
                                            }
                                        ]
                                    }
                                }
                            } );
                            return;
                        }
                    }

                    if( swiss && Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() && CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolderActive.type] === 'CH' ) {
                        Y.doccirrus.jsonrpc.api.employee
                            .getEmployeeForUsername( {username: Y.doccirrus.auth.getUserId()} )
                            .done( function( response ) {
                                var vekaNumber = ko.computed( function() {
                                    var insuranceStatuses = peek( currentPatient.insuranceStatus() ) || [],
                                        number;
                                    var targetInsurance = insuranceStatuses.filter( function( insurance ) {
                                        return peek( insurance.type ) === caseFolderActive.type;
                                    } );
                                    if( targetInsurance.length ) {
                                        number = peek( targetInsurance[0].vekaCardNo() );
                                    }
                                    return number || null;
                                } );
                                currentPatient.insuranceCardNumber = ko.observable(vekaNumber());
                                Y.doccirrus.modals.documedisMedication.show( {
                                    activitySettings: binder.getInitialData( 'activitySettings' ),
                                    currentPatient: currentPatient,
                                    defaultMappings: additionalData.defaultMappings,
                                    locationId: additionalData.caseFolderData.locationId,
                                    employeeId: additionalData.caseFolderData.employeeId,
                                    employeeType: ( response && response.data ) ? response.data.type : "OTHER",
                                    preselectedMedications: preselectedMedications,
                                    medPlans: preselectedMedPlans,
                                    medications: preselectedMedications,
                                    caseFolder: caseFolderActive,
                                    binder: binder,
                                    lastSchein: lastSchein,
                                    medicationPlan: KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.getComponentColumnCheckbox().checked(),
                                    cdsCheck: true
                                } )
                                    .then( function() {
                                        binder.showBackgroundProcessMask();
                                    } );
                            });
                        return;
                    }

                    if( preselectedMedPlans && 1 < preselectedMedPlans.length ) {
                        shouldShowInfoModal = preselectedMedPlans.some( function( medicationPlan ) {
                            return fieldsToCheckInMedPlan.some( function( key ) {
                                if( 'medicationPlanEntries' === key ) {
                                    // check if there is some medicationPlanEntries with type !== MEDICATION
                                    return medicationPlan[key].some( function( medicationEntry ) {
                                        return 'MEDICATION' !== medicationEntry.type;
                                    } );
                                }
                                return medicationPlan[key];
                            } );
                        } );
                    }

                    if( shouldShowInfoModal ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            message: MULTIPLE_MEDPLANS_INFO,
                            window: {
                                width: 'medium',
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                            action: function() {
                                                this.close();
                                                return;
                                            }
                                        } ),
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            isDefault: true,
                                            label: i18n( 'general.button.NEXT' ),
                                            action: function() {
                                                this.close();
                                                showPrescriptionModal();
                                            }
                                        } )
                                    ]
                                }
                            }
                        } );
                    } else {
                        showPrescriptionModal();
                    }
                } )
                .catch( catchUnhandled );

        },
        clickHandlerPRESCRIPTION_ADDENDUM_MODAL: function() {
            var self = this,
                expandedMedicationIds = [],
                currentPatient = peek( self.get( 'currentPatient' ) ),
                activitiesTable = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                selected = activitiesTable.getComponentColumnCheckbox().checked(),
                prescription = selected[0],
                expandedMedications, defaultMappings;

            if( !prescription ) {
                // will be prevented by visible state of action button anyway
                return;
            }

            (prescription.activities || []).forEach( function( activityId ) {
                expandedMedicationIds.push( activityId );
            } );

            Y.log( 'expanding ' + expandedMedicationIds.length + ' medication activities from prescription that have been pre-selected', 'info', NAME );
            return Promise.resolve( Y.doccirrus.jsonrpc.api.activity.read( {
                query: {
                    _id: {
                        $in: expandedMedicationIds
                    },
                    actType: 'MEDICATION'
                }
            } ) ).then( function( response ) {
                expandedMedications = expandedMedicationIds.map( function( medicationId ) {
                    return response.data.find( function( medication ) {
                        return medication._id === medicationId;
                    } );
                } ).filter( Boolean );
            } ).catch( function( err ) {
                Y.log( 'could not expand linked activities of preselected prescriptions and medication plans: ' + (err.stack || err), 'warn', NAME );
            } ).then( function() {
                return Promise.resolve( Y.doccirrus.jsonrpc.api.mmi.getMappingCatalogEntries( {
                    query: {
                        catalogShortNames: ['MOLECULETYPE', 'MOLECULEUNIT', 'PHARMFORM', 'DISCOUNTAGREEMENT']
                    }
                } ) );
            } ).then( function( response ) {
                var
                    data = response && response.data;
                defaultMappings = data;
                return data;
            } ).catch( function( error ) {
                Y.log( 'can not get defaultMappings from MMI' + error.toString(), 'error', NAME );
            } ).then( function() {
                var binder = self.get( 'binder' ),
                    caseFolderActive = currentPatient.caseFolderCollection.getActiveTab();
                return Y.doccirrus.modals.medicationPlanPrescription.show( {
                    editPrescriptionMode: true,
                    activitySettings: binder.getInitialData( 'activitySettings' ),
                    currentPatient: currentPatient,
                    defaultMappings: defaultMappings,
                    locationId: prescription.locationId,
                    employeeId: prescription.employeeId,
                    preselectedMedications: expandedMedications,
                    preselectedPrescription: prescription,
                    caseFolder: caseFolderActive,
                    swissCaseFolder: CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolderActive.type] === 'CH',
                    binder: binder
                } ).then( function() {
                    binder.showBackgroundProcessMask();
                } );
            } ).catch( catchUnhandled );
        },
        clickHandlerACTIVITIES_EDIT: function() {
            var
                self = this,
                activitiesTable = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                selected = activitiesTable.getComponentColumnCheckbox().checked(),
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                caseFolders = currentPatient.caseFolderCollection,
                activeTab = caseFolders.getActiveTab();
            Y.doccirrus.modals.changeActivityModal.showDialog( {
                activities: selected,
                caseFolders: caseFolders.getCaseFolders(),
                currentCaseFolder: activeTab,
                copy: false
            }, function() {
                activitiesTable.reload();
            } );
        },
        batchTransition: function( transition, text, additionalParams ) {
            text = text || 'geändert';
            additionalParams = additionalParams || {};
            var
                self = this,
                activitiesTable = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                ids = activitiesTable.getComponentColumnCheckbox().checkedProperties(),
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                patientId = unwrap( currentPatient._id() ),
                caseFolders = currentPatient.caseFolderCollection;

            function onBatchTransition( err, result ) {

                if( err ) {
                    Y.log( 'Could not perform batch transition: ' + err, 'warn', NAME );
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: 'Nicht alle Einträge können  ' + text + ' werden.  Der Vorgang wurde abgebrochen.'
                    } );
                    return;
                }

                if( Y.config.debug ) {
                    Y.log( 'Success: ' + JSON.stringify( result, undefined, 2 ), 'debug', NAME );
                }
                Y.log( 'Batch transition complete, reloading table', 'info', NAME );
                activitiesTable.getComponentColumnCheckbox().uncheckAll();
                activitiesTable.reload();
                if( patientId ) {
                    caseFolders.load( { patientId: patientId } );
                }
            }

            Y.doccirrus.jsonrpc.api.activity
                .doTransitionBatch( { query: { ids: ids, transition: transition }, additionalParams: additionalParams } )
                .then( function( result ) {
                    onBatchTransition( null, result );
                } )
                .fail( function( err ) {
                    onBatchTransition( err );
                } );
        },
        clickHandlerNewEdmpDoc: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                caseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                isDMP = caseFolder && Y.doccirrus.schemas.casefolder.isEDMP( caseFolder ),
                selectedDoctorAndLocation = Y.doccirrus.utils.localValueGet( 'incase-selected-doctor' ),
                split = selectedDoctorAndLocation.split( '-' ),
                employeeId = split && Array.isArray( split ) && split.length && split[0],
                locationId = split && Array.isArray( split ) && split.length && split[1];

            if( !isDMP ) {
                return;
            }

            Promise.resolve(
                Y.doccirrus.jsonrpc.api.edmp.createEdmpDoc( {
                    edmpType: caseFolder.additionalType,
                    caseFolderId: caseFolder._id,
                    patientId: peek( currentPatient._id ),
                    employeeId: employeeId,
                    locationId: locationId
                } )
            ).catch( function( response ) {
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( response ), 'display' );
            } );
        },
        clickHandlerNewHgvDoc: function() {

            var self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                caseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                isHGV = caseFolder && Y.doccirrus.schemas.casefolder.isHGV( caseFolder );
            if( !isHGV ) {
                return;
            }

            Promise.resolve( Y.doccirrus.jsonrpc.api.edmp.createHgvDoc( {
                caseFolderId: caseFolder._id,
                patientId: peek( currentPatient._id ),
                dob: peek( currentPatient.dob )
            } ) ).catch( function( response ) {
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( response ), 'display' );
            } );
        },
        clickHandlerNewZervixZytologieDoc: function() {

            var self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                caseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                isZervixZytologie = caseFolder && Y.doccirrus.schemas.casefolder.isZervixZytologie( caseFolder );
            if( !isZervixZytologie ) {
                return;
            }

            Promise.resolve( Y.doccirrus.jsonrpc.api.edmp.createZervixZytologieDoc( {
                caseFolderId: caseFolder._id,
                patientId: peek( currentPatient._id ),
                dob: peek( currentPatient.dob )
            } ) ).catch( function( response ) {
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( response ), 'display' );
            } );

        },
        clickHandlerNewEhksDoc: function() {
            var self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                caseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                isEHKS = caseFolder && Y.doccirrus.schemas.casefolder.isEHKS( caseFolder );

            if( !isEHKS || !caseFolder ) {
                return;
            }

            if( caseFolder.disabled ) {
                // TODO
                return;
            }

            Promise.resolve( Y.doccirrus.jsonrpc.api.ehks.createEhksDoc( {
                caseFolderId: caseFolder._id,
                patientId: peek( currentPatient._id ),
                ehksDocType: peek( currentPatient.ehksDocType )
            } ) ).catch( function( response ) {
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( response ), 'display' );
            } );
        },
        clickHandlerDispenseMedications: function(){
            var
                self = this,
                binder = self.get('binder'),
                activitiesTable = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                checkedActivities = activitiesTable.getComponentColumnCheckbox().checked(),
                phPZNs,
                locationIds = [];
            checkedActivities = checkedActivities.filter(function( act ) {
                if (locationIds.indexOf(act.locationId) === -1) {
                    locationIds.push(act.locationId);
                }
                return act.actType === 'MEDICATION';
            });

            if (locationIds.length !== 1) {
                Y.doccirrus.DCWindow.notice({
                    type: 'error',
                    message: MEDICATION_LOCATION,
                    window: {
                        width: Y.doccirrus.DCWindow.SIZE_SMALL
                    }
                });
                return;
            }

            phPZNs = checkedActivities.map(function( act ) {
                return act.phPZN;
            });

            Y.doccirrus.modals.dispensingModal.showDialog({
                phPZNs: phPZNs,
                locationId: checkedActivities[0].locationId,
                activities: checkedActivities,
                currentUser: binder.getInitialData( 'currentUser' ),
                callback: function( err ) {
                    if (!err) {
                        KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.reload();
                    }
                }
            });
        },
        clickHandlerSolModal: function( config ) {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                activitiesTable = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable,
                caseFolderActive = currentPatient.caseFolderCollection.getActiveTab(),
                checked = activitiesTable.getComponentColumnCheckbox().checked(),
                searchParams = {};

            if ( currentPatient ) {
                searchParams.patientId = currentPatient._id();
            }

            if ( caseFolderActive ) {
                searchParams.caseFolderId = caseFolderActive._id;
            }

            if ( Array.isArray( checked ) && checked.length ) {
                searchParams.selectedActivities = checked.map( function( activity ) {
                    return activity._id;
                } );
            }

            self.PostMessageConnection.resetWindows();

            self.PostMessageConnection.setIframeWindow(config.targetUrl);

            // eslint-disable-next-line no-unused-vars
            self.currentSolModal = new Y.doccirrus.modals.DCSolModal({
                iframeUrl: config.targetUrl + '?' + new URLSearchParams(searchParams),
                title: {
                    de: config.buttonText.de,
                    en: config.buttonText.en
                },
                icon: 'ICON_LIST',
                size: {
                    width: 95,
                    height: 93,
                    percentageSize: true
                }

            }, function(data, cb) {
                cb();
            });
        }
    }, {
        NAME: 'ActivityCaseFileButtonsViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' );
                }
            },
            currentPatient: {
                valueFn: function() {
                    return this.get( 'binder' ).currentPatient;
                },
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( ActivityCaseFileButtonsViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'dc-comctl',
        'dcutils',
        'DCWindow',
        'dcstarttelekonsilmodal',
        'inCaseUtils',
        'dceditcasefoldermodal',
        'dcmovetocasefolderrmodal',
        'activity-schema',
        'DCChangeActivityModal',
        'DCSelectFlowModal',
        'dcpatienttransfermodal',
        'dcforms-map-patient',
        'dctransfermodal',
        'casefolder-schema',
        'DCSendToFormPortalModal',
        'DCScanMedicationPlanModal',
        'envelope-modal',
        'DCMailActivitiesModal',
        'DCFaxActivitiesModal',
        'appointment-modal',
        'printpdf-modal',
        'datepicker-modal',
        'MedicationPlanPrescriptionsModal',
        'DocumedisMedicationModal',
        'appreg-schema',
        'addnewbuttonmodal',
        'downloadattachmentsmodal',
        'exportpatientattachmentsmodal',
        'DCSolModal',
        'prescription-action',
        'prescription-handler',
        'scan-medicationplan-handler',
        'DCKimSignatureModal',
        'DCKimMessageOutboxModal',
        'DCKimReceiverVZDContactsModal'
    ]
} );
