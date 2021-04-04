/*jslint anon:true, sloppy:true, nomen:true, latedef:false */
/*global YUI, ko, async, $ */
YUI.add( 'MirrorActivityCaseFileButtonsViewModel', function( Y, NAME ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel;

    function onlyActTypeSelected( actType, selected ) {
        if( !selected || !selected.length ) {
            return false;
        }

        return selected.every( function( activity ) {
            return actType === activity.actType;
        } );
    }

    function doConfirm( text ) {
        var
            table = KoViewModel.getViewModel( 'MirrorCaseFileViewModel' ).activitiesTable,
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
            menu: null
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

    function ActivityCaseFileMenuDivider() {
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
     * @class MirrorActivityCaseFileButtonsViewModel
     */
    function MirrorActivityCaseFileButtonsViewModel() {
        MirrorActivityCaseFileButtonsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( MirrorActivityCaseFileButtonsViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initMirrorActivityCaseFileButtonsViewModel();
        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            self.destroyMirrorActivityCaseFileButtonsViewModel();
        },
        initMirrorActivityCaseFileButtonsViewModel: function() {
            var
                self = this;

            self.createButtons();
        },
        destroyMirrorActivityCaseFileButtonsViewModel: function() {
            var
                self = this;

            self.destroyButtons();
        },
        buttons: null,
        buttonsMap: null,
        actionNewMap: null,
        actionNewPrescriptionsMap: null,
        createButtons: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                buttons = self.buttons = ko.observableArray(),
                buttonsMap = self.buttonsMap = {}, // root button references
                actionNewMap = self.actionNewMap = {}, // menu "new" item references
                actionNewPrescriptionsMap = self.actionNewPrescriptionsMap = {}, // menu "new>prescriptions" item references
                actionMoreMap = self.actionMoreMap = {}; // menu "more" item references

            /** button back **/
            buttonsMap.actionBack = new ActivityCaseFileButton( {
                name: 'actionBack',
                text: i18n( 'InCaseMojit.casefile_browser.menu.BACK' ),
                click: Y.bind( self.clickHandlerBack, self )
            } );
            buttons.push( buttonsMap.actionBack );

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
            actionNewPrescriptionsMap.actionNewPrescriptionLONGPRESCR = new ActivityCaseFileMenuItem( {
                name: 'actionNewPrescriptionLONGPRESCR',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.menusubitem.prescription.LONGPRESCR_PRES' ),
                click: Y.bind( self.clickHandlerNewPrescriptionLONGPRESCR, self )
            } );
            actionNewPrescriptionsMap.actionNewPrescriptionPRESASSISTIVE = new ActivityCaseFileMenuItem( {
                name: 'actionNewPrescriptionPRESASSISTIVE',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.menusubitem.prescription.H_PRES' ),
                click: Y.bind( self.clickHandlerNewPrescriptionPRESASSISTIVE, self )
            } );
            actionNewMap.actionNewPrescription = new ActivityCaseFileSubMenu( {
                name: 'actionNewPrescription',
                text: i18n( 'InCaseMojit.casefile_browser.new.menuitem.PRESCRIPTIONS' ),
                click: Y.bind( self.clickHandlerNewPrescription, self ),
                menu: new ActivityCaseFileButtonMenu( {
                    items: ko.observableArray(), // filled on open
                    defaultSort: {
                        'PRIVPRESCR': actionNewPrescriptionsMap.actionNewPrescriptionPRIVPRESCR,
                        'PUBPRESCR': actionNewPrescriptionsMap.actionNewPrescriptionPUBPRESCR,
                        'PRESCRBTM': actionNewPrescriptionsMap.actionNewPrescriptionPRESCRBTM,
                        'PRESCRG': actionNewPrescriptionsMap.actionNewPrescriptionPRESCRG,
                        'PRESCRT': actionNewPrescriptionsMap.actionNewPrescriptionPRESCRT,
                        'PRESASSISTIVE': actionNewPrescriptionsMap.actionNewPrescriptionPRESASSISTIVE,
                        'LONGPRESCR': actionNewPrescriptionsMap.actionNewPrescriptionLONGPRESCR
                    },
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
                disabled: true,
                //menu: new ActivityCaseFileButtonMenu( {
                //    items: ko.observableArray( [
                //        actionNewMap.actionNewActivity,
                //        actionNewMap.actionNewDivider,
                //        actionNewMap.actionNewActivityAU,
                //        actionNewMap.actionNewActivityTREATMENT,
                //        actionNewMap.actionNewActivityDIAGNOSIS,
                //        actionNewMap.actionNewActivityMEDICATION,
                //        actionNewMap.actionNewActivityFORM,
                //        actionNewMap.actionNewActivityHISTORY,
                //        actionNewMap.actionNewActivitySCHEIN,
                //
                //        actionNewMap.actionNewPrescription,
                //
                //        actionNewMap.actionNewCaseFolder,
                //        actionNewMap.actionNewActivityINVOICE
                //    ] )
                //} ),
                onShow: function() {
                    var
                        aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                        caseFolder = currentPatient.caseFolderCollection.getActiveTab() || {},
                        activitiesTable = aCaseFileViewModel.activitiesTable,
                        checked = activitiesTable.getComponentColumnCheckbox().checked();

                    actionNewPrescriptionsMap.actionNewPrescriptionPUBPRESCR.disabled( true );
                    actionNewPrescriptionsMap.actionNewPrescriptionPRESCRG.disabled( true );

                    // MOJ-14319: [OK]
                    if( Y.doccirrus.schemas.patient.isPublicInsurance( {type: caseFolder.type} ) ) {
                        actionNewPrescriptionsMap.actionNewPrescriptionPUBPRESCR.disabled( false );
                        actionNewPrescriptionsMap.actionNewPrescriptionPRESCRG.disabled( false );
                    }

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
            buttons.push( buttonsMap.actionNew );

            /** button copy **/
            buttonsMap.actionCopy = new ActivityCaseFileButton( {
                name: 'actionCopy',
                text: i18n( 'InCaseMojit.casefile_browser.menu.COPY' ),
                disabled: true,
                //disabled: self.addDisposable( ko.computed( function() {
                //    return !Boolean( KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.getComponentColumnCheckbox().checked().length );
                //} ) ),
                click: Y.bind( self.clickHandlerCopy, self )
            } );
            buttons.push( buttonsMap.actionCopy );

            /** menu print **/
            buttonsMap.actionPrint = new ActivityCaseFileButton( {
                name: 'actionPrint',
                text: i18n( 'InCaseMojit.casefile_browser.menu.PRINT' ),
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
                        // not implemented
                        new ActivityCaseFileMenuItem( {
                            name: 'actionPrintHEALTH_RECORD',
                            text: i18n( 'InCaseMojit.casefile_browser.print.menuitem.HEALTH_RECORD' ),
                            disabled: true,
                            click: Y.bind( self.clickHandlerPrintHEALTH_RECORD, self )
                        } ),
                        new ActivityCaseFileMenuItem( {
                            name: 'actionPrintAPP_LIST',
                            text: i18n( 'InCaseMojit.casefile_browser.print.menuitem.APP_LIST' ),
                            disabled: true,
                            click: Y.bind( self.clickHandlerPrintAPP_LIST, self )
                        } )
                    ] )
                } )
            } );
            buttons.push( buttonsMap.actionPrint );

            /** menu more **/
            //actionMoreMap.actionMoreAttach = new ActivityCaseFileMenuItem( {
            //    name: 'actionMoreAttach',
            //    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.ATTACH' ),
            //    disabled: ko.observable( true ),
            //    click: Y.bind( self.clickHandlerATTACH, self )
            //} );
            //actionMoreMap.actionMoreApprove = new ActivityCaseFileMenuItem( {
            //    name: 'actionMoreAPPROVE',
            //    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.APPROVE' ),
            //    disabled: ko.observable( true ),
            //    click: Y.bind( self.clickHandlerAPPROVE, self )
            //} );
            //actionMoreMap.actionMoreCancel = new ActivityCaseFileMenuItem( {
            //    name: 'actionMoreCANCEL',
            //    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.CANCEL' ),
            //    disabled: ko.observable( true ),
            //    click: Y.bind( self.clickHandlerCANCEL, self )
            //} );
            //actionMoreMap.actionMoreDel = new ActivityCaseFileMenuItem( {
            //    name: 'actionMoreDEL',
            //    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.DEL' ),
            //    disabled: ko.observable( true ),
            //    click: Y.bind( self.clickHandlerDEL, self )
            //} );
            //actionMoreMap.actionMoreTelekonsil = new ActivityCaseFileMenuItem( {
            //    name: 'actionMoreTELECONSULT',
            //    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.TELECONSULT' ),
            //    disabled: ko.observable( true ),
            //    click: Y.bind( self.clickHandlerTELECONSULT, self )
            //} );
            //actionMoreMap.actionMoreTransfer = new ActivityCaseFileMenuItem( {
            //    name: 'actionMoreTRANSFER',
            //    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.TRANSFER' ),
            //    disabled: ko.observable( true ),
            //    click: Y.bind( self.clickHandlerTRANSFER, self )
            //} );
            //actionMoreMap.actionMoreCaseFolderEdit = new ActivityCaseFileMenuItem( {
            //    name: 'actionMoreCASEFOLDER_EDIT',
            //    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.CASEFOLDER_EDIT' ),
            //    disabled: ko.observable( true ),
            //    click: Y.bind( self.clickHandlerCASEFOLDER_EDIT, self )
            //} );
            //actionMoreMap.actionMoreCaseFolderMove = new ActivityCaseFileMenuItem( {
            //    name: 'actionMoreCASEFOLDER_MOVE',
            //    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.CASEFOLDER_MOVE' ),
            //    disabled: ko.observable( true ),
            //    click: Y.bind( self.clickHandlerCASEFOLDER_MOVE, self )
            //} );
            //actionMoreMap.actionMoreActivitiesEdit = new ActivityCaseFileMenuItem( {
            //    name: 'actionMoreACTIVITIES_EDIT',
            //    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.CHANGE_ACTIVITIES' ),
            //    disabled: ko.observable( true ),
            //    click: Y.bind( self.clickHandlerACTIVITIES_EDIT, self )
            //} );

            buttonsMap.actionMore = new ActivityCaseFileButton( {
                name: 'actionMore',
                text: i18n( 'InCaseMojit.casefile_browser.menu.MORE' ),
                disable: true,
                //menu: new ActivityCaseFileButtonMenu( {
                //    items: ko.observableArray( [
                //        actionMoreMap.actionMoreApprove,
                //        actionMoreMap.actionMoreCancel,
                //        actionMoreMap.actionMoreDel,
                //        actionMoreMap.actionMoreAttach,
                //        actionMoreMap.actionMoreTelekonsil,
                //        actionMoreMap.actionMoreTransfer,
                //        actionMoreMap.actionMoreCaseFolderEdit,
                //        actionMoreMap.actionMoreCaseFolderMove,
                //        new ActivityCaseFileMenuItem( {
                //            name: 'actionMoreEXPORT',
                //            text: 'Export',
                //            click: Y.bind( self.clickHandlerEXPORT, self )
                //        } ),
                //        actionMoreMap.actionMoreActivitiesEdit
                //    ] )
                //} ),
                onShow: function() {
                    var
                        aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                        checked = aCaseFileViewModel.activitiesTable.getComponentColumnCheckbox().checked(),
                        caseFolders = currentPatient.caseFolderCollection,
                        activeCaseFolder = caseFolders.getActiveTab(),
                        allValid,
                        allApproved;
                    allValid = checked.every( function( activity ) {
                        return 'VALID' === activity.status;
                    } );
                    allApproved = checked.every( function( activity ) {
                        return 'APPROVED' === activity.status;
                    } );

                    actionMoreMap.actionMoreTransfer.disabled( !onlyActTypeSelected( 'TELECONSULT', checked ) );
                    actionMoreMap.actionMoreCaseFolderEdit.disabled( !(activeCaseFolder && activeCaseFolder._id) );
                    actionMoreMap.actionMoreCaseFolderMove.disabled( !(checked.length && allValid) );
                    actionMoreMap.actionMoreTelekonsil.disabled( !caseFolders.canCreateActivity() );
                    actionMoreMap.actionMoreActivitiesEdit.disabled( !(checked.length && allValid) );
                    actionMoreMap.actionMoreApprove.disabled( !(checked.length && allValid) );
                    actionMoreMap.actionMoreDel.disabled( !(checked.length && allValid) );
                    actionMoreMap.actionMoreCancel.disabled( !(checked.length && allApproved) );

                    if( 1 === checked.length ) {
                        actionMoreMap.actionMoreAttach.disabled( !('DELETED' !== checked[0].status || 'CANCELLED' !== checked[0].status) );
                    } else {
                        actionMoreMap.actionMoreAttach.disabled( true );
                    }

                    return true;
                },
                onHidden: function() {
                    return true;
                }
            } );
            //buttons.push( buttonsMap.actionMore );

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
            Y.doccirrus.inCaseUtils.createActivity( {
                actType: 'PRESCRT'
            } );
        },
        clickHandlerNewPrescriptionLONGPRESCR: function(  ) {
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
        clickHandlerCopy: function() {
            var
                table = KoViewModel.getViewModel( 'MirrorCaseFileViewModel' ).activitiesTable,
                toCopy = table.getComponentColumnCheckbox().checkedProperties(),
                total = toCopy.length,
                completed = 0;

            if( !total ) {
                return;
            }
            function updateCopyProgress() {
                var progressHtml = Y.doccirrus.comctl.makeProgressBar( completed, total );
                Y.doccirrus.comctl.setModal( 'Kopieren', progressHtml, false );
            }

            function onCopyComplete( err /*, data */ ) {
                if( err ) {
                    onAllComplete();
                    return;
                }

                completed = completed + 1;
                copyNext();
            }

            function onAllComplete() {
                Y.doccirrus.comctl.clearModal();
                Y.log( 'Copying complete, reloading table' );
                table.getComponentColumnCheckbox().uncheckAll();
                table.reload();
            }

            function copyNext() {

                updateCopyProgress();

                if( 0 === toCopy.length ) {
                    //
                    window.setTimeout( function() {
                        onAllComplete();
                    }, 1000 );
                    return;
                }

                var
                    nextId = toCopy.pop(),
                    promise;

                Y.log( 'Copying activity: ' + nextId, 'info', NAME );
                promise = Y.doccirrus.api.activity.copyActivity( {activityId: nextId} );

                promise.then( function() {
                        onCopyComplete();
                    } )
                    .catch( function( error ) {
                        onCopyComplete( error );
                    } )
                    .finally( function() {
                        if( promise.isCancelled() ) {
                            onCopyComplete( 'cancelled' );
                        }
                    } );
            }

            Y.doccirrus.comctl.setModal( 'Kopieren', '<div id="divCopyMultiple"></div>', false, null, copyNext );
        },
        clickHandlerPrintENTRIES: function() {

        },
        clickHandlerPrintHEALTH_RECORD: function() {

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
                currentPatient = unwrap( self.get( 'currentPatient' ) ),

                prefix = 'InCaseMojit.MirrorActivityCaseFileButtonsViewModel.calevent.',

                modal,
                node = Y.Node.create( '<div id="divPrintEventList"></div>' ),
                modalPrint = {
                    label: '',
                    name: 'printCal',
                    value: 'Drucken',
                    action: function() {
                        printCalEvents();
                    },
                    section: 'header',
                    template: '<button id="btnPrintCalEntries" type="button" style="display: none; margin-left: 10px; margin-right: 10px;"/>',
                    classNames: 'glyphicon glyphicon-print close'
                },
                modalConfig = {
                    className: 'DCWindow-patientCalEvent',
                    title: i18n( prefix + 'TITLE' ),
                    bodyContent: node,
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: 550,
                    minHeight: 50,
                    minWidth: 550,
                    centered: true,
                    modal: true,
                    dragable: true,
                    maximizable: false,
                    resizeable: true,
                    render: document.body,
                    buttons: {
                        header: ['close', modalPrint],
                        footer: [] ///
                    }
                },

                formOptions = {
                    'patientRegId': '',             //  used by PUC proxy, not applicable here
                    'canonicalId': '',              //  formtemplate with role 'casefile-terminliste',
                    'formVersionId': '',            //  latest version of this form
                    'divId': 'divPrintEventList',   //  div to render into, in modal
                    'il8nDict': {},                 //  not used at present
                    'doRender': false,              //  we will call template.render after load
                    'mapperName': 'patient',        //  type of form mapper driving this form
                    'width': 500
                },

                mapperContext = {                   //  objects which mapper will use to populate the form
                    'patient': currentPatient,
                    'events': ko.observableArray( [] )
                },

                template,
                mapper;

            modal = new Y.doccirrus.DCWindow( modalConfig );

            modal.on( 'visibleChange', function( event ) {
                if( false === event.newVal ) {
                    if( mapper ) {
                        mapper.destroy();
                    }
                    if( template ) {
                        template.destroy();
                    }
                }
            } );

            node.setStyles( {width: 500} );
            node.setHTML( Y.doccirrus.comctl.getThrobber() );

            //  async steps

            //  (1) load patient appointments

            function getPatientAppointments( itcb ) {
                Y.doccirrus.jsonrpc.api.patient.getAppointments( {
                    patientId: unwrap( currentPatient._id )
                } ).done( function( response ) {
                    if( response && response.data && response.data[0] ) {
                        mapperContext.events( response.data );
                        itcb( null );
                    } else {
                        Y.log( 'did not load appointments, none recorded', 'info', NAME );
                        node.setHTML( i18n( prefix + 'NO_ENTRIES' ) );
                        itcb( new Error( 'no appointments could be loaded' ) );
                    }
                } ).fail( function() {
                    Y.log( 'could not load appointments', 'error', NAME );
                    node.setHTML( i18n( prefix + 'NO_ENTRIES' ) );
                    itcb( new Error( 'Appoints could not be loaded' ) );
                } );
            }

            //  (2) look up appointment listing / Termin Liste form
            function getFormIDFromRole( itcb ) {
                function onFormLookup( err, formId ) {

                    if( err || '' === formId ) {
                        node.setHTML( i18n( prefix + 'NO_FORM' ) );
                        itcb( new Error( 'No form assigned to role casefile-terminliste' ) );
                        return;
                    }

                    formOptions.canonicalId = formId;
                    itcb( null );
                }

                Y.log( 'Querying config for Termin Liste Form', 'debug', NAME );
                Y.dcforms.getConfigVar( '', 'casefile-terminliste', false, onFormLookup );
            }

            //  (3) look up form metadata
            function getFormMeta( itcb ) {
                function onFormMetaLoaded( err, formMeta ) {

                    if( err ) {
                        //  TODO: translateme
                        node.setHTML( i18n( prefix + 'NO_FORM' ) );
                        itcb( new Error( 'Termine liste form metadata could not be loaded' ) );
                        return;
                    }

                    formOptions.formVersionId = formMeta.latestVersionId;

                    //Y.log( 'Adding form Appointment List form modal: ' + formOptions.canonicalId, 'debug', NAME );
                    itcb( null );
                }

                Y.dcforms.getFormListing( '', formOptions.canonicalId, onFormMetaLoaded );
            }

            //  (4) instantiate and load the form
            function createCaleventsFormTemplate( itcb ) {
                formOptions.callback = function onFormTemplateCreated( err, newFormTemplate ) {
                    template = newFormTemplate || null;
                    itcb( err );
                };

                Y.dcforms.createTemplate( formOptions );
            }

            //  (5) instantiate the mapper
            function createPatientMapper( itcb ) {
                mapper = Y.dcforms.mapper.patient( template, mapperContext );
                //  width of rendering div seems to be unstable
                template.resize( 500, itcb );
            }

            async.series(
                [
                    getPatientAppointments,
                    getFormIDFromRole,
                    getFormMeta,
                    createCaleventsFormTemplate,
                    createPatientMapper
                ],

                function onEventListReady( err ) {
                    if( err ) {
                        Y.log( 'Could not render calender event list form: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }

                    //  show print button in model header
                    $( '#btnPrintCalEntries' ).show();
                    template.render( Y.dcforms.nullCallback );
                    modal.centered();
                }
            );

            function printCalEvents() {
                $( '#btnPrintCalEntries' ).hide();
                if( !template ) {
                    return;
                }

                template.renderPdfServer( 'temp', '', 'Termin', onDocumentReady );

                function onDocumentReady( err, formForPDF ) {
                    if ( err ) { return onPDFRendered( err ); }

                    //  call formtemplate API via REST
                    Y.doccirrus.comctl.privatePost('1/media/:makepdf', { 'document': formForPDF }, onPDFRendered );
                }

                function onPDFRendered( err, data ) {

                    data = data.data ? data.data : data;

                    if( err || !data || !data.tempId || '' === data.tempId ) {
                        Y.log( 'Could not generate PDF: ' + JSON.stringify( err ), 'warn', NAME );
                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            message: i18n( 'InCaseMojit.casefile_browser.print.menuitem.COULD_NOT_PRINT_CAL' )
                        } );
                    }

                    var
                        tempId = data.tempId,
                        relUrl = '/pdf/' + tempId.split( '/' ).pop(),
                        fullUrl = Y.doccirrus.infras.getPrivateURL( relUrl ),
                        openButton = '<a class="btn" href="' + fullUrl + '" target="_blank" >' + i18n( prefix + 'OPEN_PDF' ) + '</a>',
                        downloadButton = '<a class="btn" href="' + fullUrl + '" download>' + i18n( prefix + 'DOWNLOAD_PDF' ) + '</a>',
                        html = '<div class="well">' + openButton + downloadButton + '</div>';

                    $( '#divPrintEventList' ).parent().prepend( html );
                }
            }

        },
        clickHandlerAPPROVE: function() {
            this.batchTransition( 'approve', 'freigegeben' );
        },
        clickHandlerCANCEL: function() {
            var
                self = this;
            doConfirm( 'storniert' )
                .then( function() {
                    self.batchTransition( 'cancel', 'storniert' );
                } )
                .catch( function() {
                } );
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
                table = KoViewModel.getViewModel( 'MirrorCaseFileViewModel' ).activitiesTable,
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
                aCaseFileViewModel = KoViewModel.getViewModel( 'MirrorCaseFileViewModel' ),
                activitiesTable = aCaseFileViewModel.activitiesTable,
                activityIds = activitiesTable.getComponentColumnCheckbox().checkedProperties();
            if( activityIds && activityIds.length ) {
                Y.doccirrus.modals.patientTransfer.show( {
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
                aCaseFileViewModel = KoViewModel.getViewModel( 'MirrorCaseFileViewModel' ),
                activitiesTable = aCaseFileViewModel.activitiesTable,
                selected = activitiesTable.getComponentColumnCheckbox().checked(),
                caseFolders = currentPatient.caseFolderCollection,
                activeTab = caseFolders.getActiveTab();
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
                } );
            }
        },
        clickHandlerEXPORT: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );
            Y.doccirrus.utils.selectFlow( 'patient', currentPatient.toJSON() );
        },
        clickHandlerACTIVITIES_EDIT: function() {
            var
                activitiesTable = KoViewModel.getViewModel( 'MirrorCaseFileViewModel' ).activitiesTable,
                selected = activitiesTable.getComponentColumnCheckbox().checked();
            Y.doccirrus.modals.changeActivityModal.showDialog( {activities: selected, copy: false}, function() {
                activitiesTable.reload();
            } );
        },
        clickHandlerTELEKARDIO: function() {
            var self = this,
                activitiesTable = KoViewModel.getViewModel( 'MirrorCaseFileViewModel' ).activitiesTable,
                currentPatient = peek( self.get( 'currentPatient' ) );
            Y.doccirrus.jsonrpc.api.biotronik.addDataFromServer( {
                patientId: peek( currentPatient._id )
            }, function() {
                activitiesTable.reload();
            } );

        },
        batchTransition: function( transition, text ) {
            text = text || 'geändert';
            var
                activitiesTable = KoViewModel.getViewModel( 'MirrorCaseFileViewModel' ).activitiesTable,
                ids = activitiesTable.getComponentColumnCheckbox().checkedProperties();

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
            }

            Y.doccirrus.jsonrpc.api.activity
                .doTransitionBatch( { query: { ids: ids, transition: transition } } )
                .then( function( result ) { onBatchTransition( null, result ); } )
                .fail( function( err ) { onBatchTransition( err ); } );
        }
    }, {
        NAME: 'MirrorActivityCaseFileButtonsViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
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

    KoViewModel.registerConstructor( MirrorActivityCaseFileButtonsViewModel );

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
        'DCChangeActivityModal',
        'DCSelectFlowModal',
        'dcpatienttransfermodal',
        'dcforms-map-patient'
    ]
} );
