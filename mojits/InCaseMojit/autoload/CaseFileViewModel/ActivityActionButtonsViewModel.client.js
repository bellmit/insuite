/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, Promise, _ */
YUI.add( 'ActivityActionButtonsViewModel', function( Y, NAME ) {
    'use strict';

    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        ignoreDependencies = ko.ignoreDependencies,

        i18n = Y.doccirrus.i18n,
        CONFIRM_TRANSITION = i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.CONFIRM_TRANSITION' ),
        CONFIRM_UNLINKING_TREATMENT_FROM_SURGERY = i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.CONFIRM_UNLINKING_TREATMENT_FROM_SURGERY' ),
        REASON_TO_CANCEL = i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.REASON_TO_CANCEL' ),
        RULE_ERROR = i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.RULE_ERROR' ),
        RULE_WARNING = i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.RULE_WARNING' ),
        KoViewModel = Y.doccirrus.KoViewModel;

    function ActivityActionButton( config ) {
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
    }

    /**
     * @constructor
     * @class ActivityActionButtonsViewModel
     */
    function ActivityActionButtonsViewModel() {
        ActivityActionButtonsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivityActionButtonsViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity );

            currentActivity.status.subscribe( function( previousValue ) {
                self.activityStatusBefore = previousValue;
            }, self, 'beforeChange' );

            self.initDocumentNeedsSave();
            self.initActivityActionButtonsViewModel();

            self.isRendered = self.addDisposable( ko.observable(false) );
            self.isPinned = self.addDisposable( ko.observable(null) );
            this.manageContainerClasses = self.addDisposable( ko.computed(function () {
                var
                    isPinned = unwrap( this.isPinned );

                return isPinned ? 'affix-enabled' : 'affix-disabled';
            }, this));
        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            self.destroyActivityActionButtonsViewModel();
            self.destroyDocumentNeedsSave();
        },
        buttons: null,
        initActivityActionButtonsViewModel: function() {
            var
                self = this;

            //  lock all the buttons while waiting for the form - MOJ-10565
            self.lockAllButtons = ko.observable( false );
            self.disableDispenseButton = ko.observable (false);
            self.isFormValid = ko.observable( true );
            self.createButtons();
        },
        destroyActivityActionButtonsViewModel: function() {
            var
                self = this;

            self.destroyButtons();
        },
        templateReady: function () {
            var
                binder = this.get( 'binder' ),
                PostMessageConnection = binder.PostMessageConnection,
                isFrameView = unwrap(binder.isFrameView);

            this.isRendered(true);

            if ( isFrameView ) {
                PostMessageConnection.postMessageToIframe({
                    action: 'CONNECTED',
                    isInsuitePage: true,
                    targetUrl: binder.iframeUrl
                });
            }
        },
        /**
         * Checks location of employee and activity in ASV case folder.
         * If employee has activity location - return false,
         * if employee does not have - returns true
         * For non ASV case folder returns false
         * @method disableButtonsInASVCaseFolder
         * @returns {boolean}
         */
        disableButtonsInASVCaseFolder: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity ),
                currentUser = binder.getInitialData( 'currentUser' ),
                caseFolder = currentActivity && currentActivity.get( 'caseFolder' ),
                currentUserLocations = currentUser.locations.map( function( location ) {
                    return location._id;
                } );
            if( caseFolder && Y.doccirrus.schemas.casefolder.additionalTypes.ASV === caseFolder.additionalType ) {
                return -1 === currentUserLocations.indexOf( peek( currentActivity.locationId ) );
            }
            return false;
        },
        /**
         * Returns disable state of buttons if noCrossLocationAccess option is enabled.
         * If user has activity location - return false.
         * If employee does not have - returns true.
         * If noCrossLocationAccess is not enabled - return false.
         * @method disableButtonsIfNoCrossLocationAccessReadOnly
         * @returns {boolean}
         */
        disableButtonsInNoCrossLocationAccessReadOnly: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                tenantSettings = binder.getInitialData( 'tenantSettings' ),
                currentActivity = peek( binder.currentActivity ),
                currentUser = binder.getInitialData( 'currentUser' ),
                currentUserLocations = currentUser.locations && currentUser.locations.length && currentUser.locations.map( function( location ) {
                    return location._id;
                } );
            if( !currentActivity ){
                return false;
            }
            if( true === (tenantSettings && tenantSettings.noCrossLocationAccess) ) {
                return -1 === currentUserLocations.indexOf( peek( currentActivity.locationId ) );
            } else {
                return false;
            }
        },
        /**
         * Get current case file view model.
         * @returns {null|KoDisposable}
         */
        getCaseFileViewModel: function() {
            return KoViewModel.getViewModel( 'CaseFileViewModel' ) || KoViewModel.getViewModel( 'MirrorCaseFileViewModel' );
        },
        /**
         * Get current case file view model.
         * @returns {null|KoDisposable}
         */
        getActivityDetailsViewModel: function() {
            return KoViewModel.getViewModel( 'ActivityDetailsViewModel' ) || KoViewModel.getViewModel( 'MirrorActivityDetailsViewModel' );
        },
        /**
         * Get current activities table of case file.
         * @returns {null|KoTable}
         */
        getActivitiesTable: function() {
            var
                self = this,
                caseFileViewModel = self.getCaseFileViewModel(),
                activitiesTable = null;

            if( caseFileViewModel && caseFileViewModel.activitiesTable ) {
                activitiesTable = caseFileViewModel.activitiesTable;
            }

            return activitiesTable;

        },
        //  returns true if the current activity is being printed or rendered to PDF
        isPdfRenderInProgress: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentActivityId = unwrap( currentActivity._id );

            return Boolean( binder.getCurrentPdfJob( currentActivityId ) );
        },
        createButtons: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                transitions = Y.doccirrus.schemas.activity.getTransitionList(),
                buttons = self.buttons = ko.observableArray(),
                transitionButtonsMap = {};

            if( !Y.doccirrus.commonutils.isFrameView() ) {
                /** back button **/
                buttons.push( new ActivityActionButton( {
                    name: 'activity-back',
                    text: i18n( 'InCaseMojit.casefile_detail.menu._BACK' ),
                    click: Y.bind( self.buttonClickHandlerBack, self )
                } ) );
            }

            /** transition button: create **/
            transitionButtonsMap.create = new ActivityActionButton( {
                name: 'transition-create',
                text: transitions.create.i18n,
                visible: ko.observable( false ),
                disabled: self.addDisposable( ko.computed( function() {
                    // declare subscriptions from here
                    var
                        currentActivity = peek( binder.currentActivity ),

                        /**
                         * Activities may define an isCreatable-computed,
                         * to be able to define own criteria for activating this button.
                         * This is required for nested models. E.g. inside a MEDDATA activity,
                         * multiple MedDataItems are stored. However, the MedDataItem
                         * requires a "type" to be set (by the database schema).
                         * A MEDDATA activity is inValid if no type is set, but could still not
                         * be stored as CREATED, because the schema validation fails.
                         * => MedDataModel defines an isCreatable property which ensures that a type is set.
                         */
                        isCreatable = unwrap( currentActivity.isCreatable );

                    if( self.disableButtonsInNoCrossLocationAccessReadOnly() ) {
                        return true;
                    }

                    if ( self.lockAllButtons() ) {
                        return true;
                    }

                    if ( typeof isCreatable === 'boolean' ) {
                        return !isCreatable;
                    }

                    /**
                     * The view model may define an own .isValid() method.
                     * This is done in the root model (KoViewModel) or
                     * in any child model derived from that.
                     */
                    if( typeof currentActivity.isValid === "function" ) {
                        return currentActivity.isValid();
                    }

                    /**
                     * if the view model does not define an own .isValid() method,
                     * fallback to the native observable property.
                     */
                    return unwrap( currentActivity._isValid );

                } ).extend( {rateLimit: 0} ) ),
                click: Y.bind( self.buttonClickHandlerTransition, self ),
                transitionDescription: transitions.create
            } );
            buttons.push( transitionButtonsMap.create );

            /** save medication plan button **/
            buttons.push( new ActivityActionButton( {
                name: 'save-medication-plan',
                text: i18n( 'activity-schema.transitionList.validate.i18n' ),
                visible: ko.computed( function() {
                    var
                        currentActivity = peek( binder.currentActivity ),
                        transitionsForState = Y.doccirrus.schemas.activity.getTransitions( unwrap( currentActivity.actType ), unwrap( currentActivity.status ) ),
                        canBeSaved = transitionsForState.some( function( transitionsDescriptor ) {
                            return 'validate' === transitionsDescriptor.transition;
                        } ),
                        medicationsChanged = unwrap( currentActivity.medicationsChanged );
                    return 'MEDICATIONPLAN' === unwrap( currentActivity.actType ) && ( canBeSaved || medicationsChanged );
                } ),
                disabled: self.addDisposable( ko.computed( function() {
                    // declare subscriptions from here
                    var
                        currentActivity = peek( binder.currentActivity ),
                        isValid = unwrap( currentActivity._isValid ),
                        areMedicationsValid = unwrap( currentActivity.areMedicationsValid );

                    if( self.disableButtonsInNoCrossLocationAccessReadOnly() ) {
                        return true;
                    }

                    if ( self.lockAllButtons() ) {
                        return true;
                    }

                    // no declaring of dependent subscriptions from here
                    return ignoreDependencies( function() {
                        return !(isValid && areMedicationsValid);
                    } );
                } ).extend( { rateLimit: 0 } ) ),
                click: function() {
                    var
                        currentActivity = peek( binder.currentActivity ),
                        activityDetailsVM = KoViewModel.getViewModel( 'ActivityDetailsViewModel' ),
                        currentActivitySectionViewModel = peek( activityDetailsVM && activityDetailsVM.currentActivitySectionViewModel ),
                        medicationPlanEditor = currentActivitySectionViewModel && peek( currentActivitySectionViewModel.currentActivityEditor ),
                        data,
                        medications = [];
                    if( medicationPlanEditor ) {
                        data = medicationPlanEditor.medicationTable && peek( medicationPlanEditor.medicationTable.rows ) || [];
                        data.forEach( function( viewModel ) {
                            if( viewModel.isModified() || viewModel.isNew() ) {
                                medications.push( viewModel.toJSON() );
                            }
                        } );
                        Y.doccirrus.jsonrpc.api.activity.saveMedicationPlan( {
                            data: {
                                medicationPlan: currentActivity.toJSON(),
                                medications: medications
                            }
                        } )
                            .done( function(){
                                currentActivity.setNotModified();
                                binder.navigateToCaseFileBrowser({
                                    refreshCaseFolder: true
                                });
                            })
                            .fail( function( error ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                            } );
                    }
                }
            } ) );

            /** dispensing button **/
            transitionButtonsMap.dispense = new ActivityActionButton( {
                name: 'transition-dispense',
                text: i18n( 'InCaseMojit.casefile_detail.menu.Dispensing' ),
                transitionDescription: transitions.dispense,
                visible: self.addDisposable( ko.computed( {
                        read: function() {
                            var  currentActivity = unwrap( binder.currentActivity );

                            return  'MEDICATION' === unwrap( currentActivity.actType ) && Y.doccirrus.auth.hasAdditionalService('inStock') &&
                                    unwrap(currentActivity.status) !== "DISPENSED";
                        },
                        write: function() { }
                })),
                disabled: self.addDisposable( ko.computed( function() {
                    var
                        currentActivity = unwrap( binder.currentActivity ),
                        ignoreIsOrdered = unwrap(binder.ignoreIsOrdered),
                        disableDispenseButton = unwrap(self.disableDispenseButton);
                    if ( self.lockAllButtons()  || disableDispenseButton) {
                        return true;
                    }

                    return !unwrap( currentActivity._id ) ||
                           (unwrap( currentActivity.status ) !== "APPROVED" &&
                            unwrap( currentActivity.status ) !== "VALID" &&
                            unwrap( currentActivity.status ) !== "ORDERED" &&
                            !unwrap( currentActivity.isArrived )
                           ) ||
                           unwrap( currentActivity.isDispensed ) ||
                           self.isPdfRenderInProgress() ||
                           isOrdered();

                    function isOrdered( ) {
                        return ignoreIsOrdered ? false : !unwrap(currentActivity.isArrived);
                    }
                })),
                click: Y.bind( self.buttonClickDispensing, self )

            } );

            /** other transition buttons **/
            Y.each( transitions, function( transitionDescription, key ) {
                if( Y.Object.owns( transitionButtonsMap, key ) ) {
                    // exclude separate handled transition buttons
                    return;
                }

                // no need to show delete button in frameViewMode for amts. MOJ-14013
                if ( 'delete' === key && Y.doccirrus.commonutils.isFrameView() ) {
                    return;
                }

                if ( 'store' === key || key === 'order' ) {
                    //MOJ-12448do not display order transition, it is a special case of 'DISPENSE'
                    // MOJ-8650 do not display store transition, it is a special case of 'VALIDATE'
                    return;
                }

                var
                    button = transitionButtonsMap[key] = new ActivityActionButton( {
                        name: 'transition-' + key,
                        text: transitionDescription.i18n,
                        visible: ko.observable( false ),
                        disabled: self.addDisposable( ko.computed( function() {
                            // declare subscriptions from here
                            var
                                activitiesTable = self.getActivitiesTable(),
                                componentColumnLinked = activitiesTable.getComponentColumnLinked(),
                                rows = activitiesTable.rows(),
                                linkedActivities = rows && rows.filter( function( item ) {
                                    return componentColumnLinked && componentColumnLinked.linked().includes( item._id );
                                } ),
                                isAnyOfLinkedLocked = linkedActivities && linkedActivities.some( function( item ) {
                                    return "LOCKED" === item.status;
                                } ),
                                hasAccess = transitionDescription.accessGroups.some( Y.doccirrus.auth.memberOf ),
                                currentActivity = peek( binder.currentActivity ),
                                isValid = currentActivity.isValid(),
                                notEnableButtons = ['credit', 'remind', 'warn1', 'warn2', 'partialpay', 'pay', 'derecognize'],
                                disableButtonsInASVCaseFolder = self.disableButtonsInASVCaseFolder(),
                                pdfRenderInProgress = self.isPdfRenderInProgress(),
                                mirrorActivityId = unwrap( currentActivity.mirrorActivityId );

                            // disable APPROVE button for activities with linked LOCKED activities
                            if ( ['approve', 'repeat'].includes( transitionDescription.transition ) && isAnyOfLinkedLocked ) {
                                return true;
                            }

                            if( self.disableButtonsInNoCrossLocationAccessReadOnly() ) {
                                return true;
                            }

                            if ( self.lockAllButtons() ) {
                                return true;
                            }

                            //  disable delete button for Docquvide activites which cannot be deleted, EXTMOJ-861
                            if (
                                ( 'delete' === transitionDescription.transition ) &&
                                ( peek( currentActivity.notDeletable ) && !Y.doccirrus.auth.memberOf( 'SUPPORT' ) )
                            ) {
                                return true;
                            }

                            if( -1 !== notEnableButtons.indexOf( transitionDescription.transition ) && currentActivity.totalReceiptsOutstanding && 0 === Number( parseFloat( unwrap( unwrap( currentActivity.totalReceiptsOutstanding ) ).toFixed(2) ) ) ) {
                                return true;
                            }

                            if( 'PKVSCHEIN' === currentActivity.actType() && currentActivity.reasonType.hasError() ) {
                                return true;
                            }

                            // no declaring of dependent subscriptions from here
                            return ignoreDependencies( function() {
                                if( disableButtonsInASVCaseFolder ) {
                                    return true;
                                }
                                if( !hasAccess ) {
                                    return true;
                                }
                                if( !isValid ) {
                                    return true;
                                }
                                if( pdfRenderInProgress ) {
                                    return true;
                                }
                                if( key === 'validate' && mirrorActivityId ) {
                                    return true;
                                }
                                return false;
                            } );
                        } ).extend( {rateLimit: 0} ) ),
                        click: Y.bind( self.buttonClickHandlerTransition, self ),
                        transitionDescription: transitionDescription
                    } );

                //  special case for Save button if form is not valid, instead display 'Partial save', MOJ-11933
                if ( 'validate' === key ) {
                    button.text = ko.computed( function() {
                        return self.isFormValid() ? i18n( 'activity-schema.transitionList.validate.i18n' ) : i18n( 'activity-schema.transitionList.create.i18n' );
                    } );
                }

                buttons.push( button );
            } );

            /** quotationTreatments save button **/
            buttons.push( new ActivityActionButton( {
                name: 'quotationTreatments-save',
                text: i18n( 'InCaseMojit.casefile_detail.menu.SAVE' ),
                disabled: self.addDisposable( ko.computed( function() {
                    // declare subscriptions from here
                    unwrap( binder.route );
                    var
                        quotationTreatmentsHasModifications = binder.quotationTreatmentsHasModifications();

                    if( self.disableButtonsInNoCrossLocationAccessReadOnly() ) {
                        return true;
                    }

                    if ( self.lockAllButtons() ) {
                        return true;
                    }

                    // no declaring of dependent subscriptions from here
                    return ignoreDependencies( function() {
                        return !quotationTreatmentsHasModifications;
                    } );
                } ).extend( {rateLimit: 0} ) ),
                visible: self.addDisposable( ko.computed( function() {
                    var
                        currentActivity = unwrap( binder.currentActivity ),
                        route = unwrap( binder.route ),
                        sectionTab = route.params.sectionTab,
                        hasQuotationTreatments = binder.hasQuotationTreatments();

                    return currentActivity.status() !== 'LOCKED' && 'tableform' === sectionTab && hasQuotationTreatments;

                } ).extend( {rateLimit: 0} ) ),
                click: Y.bind( self.buttonClickHandlerQuotationTreatmentsSave, self )
            } ) );

            /** save plus button **/
            buttons.push( new ActivityActionButton( {
                name: 'activity-savePlus',
                text: i18n( 'InCaseMojit.casefile_detail.menu.SAVE_PLUS' ),
                visible: self.addDisposable( ko.computed( function() {
                    var
                        currentActivity = unwrap( binder.currentActivity ),
                        currentActivityActType = unwrap( currentActivity.actType ),
                        currentActivityStatus = unwrap( currentActivity.status ),
                        medidataRejected = unwrap( currentActivity.medidataRejected ),
                        isEDOC = currentActivityActType && Y.doccirrus.schemas.activity.isEdoc( currentActivityActType ),
                        route = unwrap( binder.route ),
                        sectionTab = route.params.sectionTab;

                    if( isEDOC ) {
                        return false;
                    }

                    if( currentActivityActType === 'INVOICEREF' && medidataRejected ) {
                        return false;
                    }

                    if( self.disableButtonsInASVCaseFolder() ) {
                        return false;
                    }

                    if( 'tableform' === sectionTab ) {
                        return false;
                    }

                    if( 'MEDICATIONPLAN' === currentActivityActType ) {
                        return false;
                    }

                    if( !currentActivityActType ) {
                        return true;
                    }

                    if( currentActivityStatus === 'IMPORTED' ) {
                        return false;
                    }

                    if( Y.doccirrus.commonutils.isFrameView() && currentActivityActType === 'COMMUNICATION' ) {
                        return false;
                    }

                    return 'CREATED' === currentActivityStatus;
                } ) ),
                disabled: self.addDisposable( ko.computed( function() {
                    var
                        currentActivity = unwrap( binder.currentActivity ),
                        currentActivityActType = unwrap( currentActivity.actType ),
                        pdfRenderInProgress = self.isPdfRenderInProgress(),
                        mirrorActivityId = unwrap( currentActivity.mirrorActivityId ),
                        transitionDescription = Y.doccirrus.schemas.activity.getTransitionDescription( 'validate' ),
                        valid = currentActivity.isValid();

                    if( !currentActivityActType ) {
                        return true;
                    }


                    if(mirrorActivityId) {
                        return true;
                    }

                    if( !valid || ( 'PKVSCHEIN' === currentActivity.actType() && currentActivity.reasonType.hasError() ) ) {
                        return true;
                    }

                    if ( pdfRenderInProgress ) {
                        return true;
                    }

                    if( self.disableButtonsInNoCrossLocationAccessReadOnly() ) {
                        return true;
                    }

                    return !transitionDescription.accessGroups.some( Y.doccirrus.auth.memberOf );
                } ) ),
                click: Y.bind( self.buttonClickHandlerSavePlus, self )
            } ) );

            /** table editor save button **/
            buttons.push( new ActivityActionButton( {
                name: 'tableeditor-save',
                text: i18n( 'InCaseMojit.casefile_detail.menu.SAVE' ),
                disabled: self.addDisposable( ko.computed( function() {

                    var activityDetailsVM = KoViewModel.getViewModel( 'ActivityDetailsViewModel' ),
                        route = unwrap( binder.route ),
                        sectionTab = route.params.sectionTab,
                        currentActivity = unwrap( binder.currentActivity ),
                        currentActivityId = currentActivity && unwrap( currentActivity._id ),
                        currentActivitySectionViewModel = unwrap( activityDetailsVM && activityDetailsVM.currentActivitySectionViewModel ),
                        currentTableEditor;

                    if( !currentActivity ) {
                        return true;
                    }

                    if( self.disableButtonsInASVCaseFolder() ) {
                        return true;
                    }

                    if( 'tableform' !== sectionTab || !currentActivitySectionViewModel || binder.getCurrentPdfJob( currentActivityId ) ) {
                        return true;
                    }

                    if ( self.lockAllButtons() ) {
                        return true;
                    }

                    currentTableEditor = unwrap( currentActivitySectionViewModel.currentTableEditor );

                    if( !currentTableEditor || !unwrap( currentTableEditor.isValid ) ) {
                        return true;
                    }

                    if( self.disableButtonsInNoCrossLocationAccessReadOnly() ) {
                        return true;
                    }

                    return !currentTableEditor.isValid();
                } ) ),
                visible: self.addDisposable( ko.computed( function() {
                    var
                        route = unwrap( binder.route ),
                        currentActivity = unwrap( binder.currentActivity ),
                        currentActivityActType = unwrap( currentActivity && currentActivity.actType ),
                        sectionTab = route.params.sectionTab,
                        hasQuotationTreatments = binder.hasQuotationTreatments();

                    if( hasQuotationTreatments ) {
                        return false;
                    }

                    return currentActivity.status() !== 'LOCKED' && 'tableform' === sectionTab && 'LABDATA' !== currentActivityActType;

                } ) ),
                click: Y.bind( self.buttonClickHandlerTableSave, self )
            } ) );
            /** table editor "savePlus" button **/
            buttons.push( new ActivityActionButton( {
                name: 'tableeditor-savePlus',
                text: i18n( 'InCaseMojit.casefile_detail.menu.SAVE_PLUS' ),
                disabled: self.addDisposable( ko.computed( function() {

                    var activityDetailsVM = KoViewModel.getViewModel( 'ActivityDetailsViewModel' ),
                        route = unwrap( binder.route ),
                        sectionTab = route.params.sectionTab,
                        currentActivitySectionViewModel = unwrap( activityDetailsVM && activityDetailsVM.currentActivitySectionViewModel ),
                        currentTableEditor;

                    if( self.disableButtonsInASVCaseFolder() ) {
                        return true;
                    }

                    if( self.disableButtonsInNoCrossLocationAccessReadOnly() ) {
                        return true;
                    }

                    if ( self.lockAllButtons() ) {
                        return true;
                    }

                    if( 'tableform' !== sectionTab || !currentActivitySectionViewModel || self.isPdfRenderInProgress() ) {
                        return true;
                    }

                    currentTableEditor = unwrap( currentActivitySectionViewModel.currentTableEditor );

                    if( !currentTableEditor || !currentTableEditor.isValid ) {
                        return true;
                    }

                    return !currentTableEditor.isValid();
                } ) ),
                visible: self.addDisposable( ko.computed( function() {
                    var
                        route = unwrap( binder.route ),
                        currentActivity = unwrap( binder.currentActivity ),
                        currentActivityActType = unwrap( currentActivity && currentActivity.actType ),
                        sectionTab = route.params.sectionTab;

                    return currentActivity.status() !== 'LOCKED' && 'tableform' === sectionTab && 'LABDATA' !== currentActivityActType;

                } ) ),
                click: Y.bind( self.buttonClickHandlerTableSavePlus, self )
            } ) );


            if ( !Y.doccirrus.commonutils.isFrameView() ) {
                /** copy button **/
                buttons.push( new ActivityActionButton( {
                    name: 'activity-copy',
                    text: i18n( 'InCaseMojit.casefile_detail.menu.COPY_ITEM' ),
                    visible: self.addDisposable( ko.computed( function() {
                        var
                            route = unwrap( binder.route ),
                            sectionTab = route.params.sectionTab,
                            currentActivity = unwrap( binder.currentActivity );

                        return currentActivity.status() !== 'LOCKED' && 'tableform' !== sectionTab;

                    } ) ),
                    disabled: self.addDisposable( ko.computed( function() {
                        var
                            currentActivity = unwrap( binder.currentActivity ),
                            currentActivityActType = unwrap( currentActivity.actType ),
                            currentActivityStatus = unwrap( currentActivity.status ),
                            isDMP = currentActivityActType && -1 !== Y.doccirrus.schemas.casefolder.eDmpTypes.indexOf( currentActivityActType );

                        if( !currentActivityActType || isDMP || self.isPdfRenderInProgress() ) {
                            return true;
                        }

                        if( self.disableButtonsInNoCrossLocationAccessReadOnly() ) {
                            return true;
                        }

                        if( self.lockAllButtons() ) {
                            return true;
                        }

                        return 'CREATED' === currentActivityStatus || 'IMPORTED' === currentActivityStatus;
                    } ) ),
                    click: Y.bind( self.buttonClickHandlerCopy, self )
                } ) );
            }

            buttons.push( transitionButtonsMap.dispense );


            /**
             * compute visibility for transitions
             *
             * Note: since the same save button is used for changes to both documents and activities
             * an activity may be considered dirty if its form or Ext Dokuments have been changed
             *
             * The combination of activity and document dirty states is reflected in self.effectiveStatus()
             */
            self.addDisposable( ko.computed( function() {
                var
                    currentActivity = unwrap( binder.currentActivity ),
                    isNew = currentActivity.isNew(),
                    isNotDeletable = currentActivity.notDeletable && currentActivity.notDeletable(),
                    currentActivityActType = unwrap( currentActivity.actType ),
                    currentActivityStatus = self.effectiveStatus(),
                    activityStatus = unwrap( currentActivity.status ),
                    medidataRejected = unwrap( currentActivity.medidataRejected ),
                    originalStatus = activityStatus === 'CREATED' ? self.activityStatusBefore : activityStatus,
                    isCreatedOrInvalid = ( 'CREATED' === currentActivityStatus || 'INVALID' === currentActivityStatus ),
                    isMedidataRejectedOrFixed = -1 !== ['MEDIDATAREJECTED', 'MEDIDATAFIXED'].indexOf( originalStatus ),
                    isSwissInvoiceRef = -1 !== ['INVOICEREF', 'INVOICE'].indexOf( currentActivityActType ),
                    transitionsForState = Y.doccirrus.schemas.activity.getTransitions( currentActivityActType, currentActivityStatus ),
                    hideInitialCancel = ( isCreatedOrInvalid && !isNotDeletable ),
                    hideInitialDelete = ( isCreatedOrInvalid && isNotDeletable ),
                    transitionsForStateMap = {},
                    route = unwrap( binder.route ),
                    sectionTab = route.params.sectionTab,
                    isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

                Y.each( transitionsForState, function( transitionDescription ) {
                    transitionsForStateMap[transitionDescription.transition] = transitionDescription;
                } );

                Y.each( transitionButtonsMap, function( button, key ) {

                    var
                        isVisible = false,

                        // state-buttons
                        isValidate = false,
                        isCancel = false,
                        isDelete = false,
                        isMedidataFix = false,
                        isOnHold = false,
                        isRevokeWarn = false,
                        isDecline = false,

                        // tabs
                        isTableFormTab = false;

                    switch( key ) {
                        case 'validate':
                            isValidate = true;
                            break;
                        case 'cancel':
                            isCancel = true;
                            break;
                        case 'delete':
                            isDelete = true;
                            break;
                        case 'medidataFix':
                            isMedidataFix = true;
                            break;
                        case 'onHold':
                            isOnHold = true;
                            break;
                        case 'revokeWarn':
                            isRevokeWarn = true;
                            break;
                        case 'decline':
                            isDecline = true;
                            break;
                    }

                    switch( sectionTab ) {
                        case 'tableform':
                            isTableFormTab = true;
                            break;
                    }

                    switch( true ) {
                        // deactivate delete, cancel and validate for imported activities
                        case ((isDelete || isCancel || isValidate) && activityStatus === 'IMPORTED'):
                        // hide cancel for new activities
                        case (isCancel && hideInitialCancel):
                        // hide delete for new activities
                        case (isDelete && hideInitialDelete):
                        // hide validate for QUOTATION and tableform tab
                        case (isValidate && 'QUOTATION' === currentActivityActType && isTableFormTab):
                        // hide validate for MEDICATIONPLAN
                        case (isValidate && 'MEDICATIONPLAN' === currentActivityActType):
                        // disable medidata button for swiss inVoice
                        case (isMedidataFix && (!isSwissInvoiceRef || (isSwissInvoiceRef && !isMedidataRejectedOrFixed))):
                        // disable delete button for new activities
                        case (isDelete && isNew):
                        // disable any other button on table form if activity type is NOT LABDATA
                        case (isTableFormTab && 'LABDATA' !== currentActivityActType):
                        // hide decline button for non Swiss
                        case (!isSwiss && isDecline):
                        // disable onHold/Mahnstopp button
                        case (isOnHold || isRevokeWarn):
                            // stay with false
                            isVisible = false;
                            break;
                        default:
                            isVisible = Y.Object.owns( transitionsForStateMap, key );
                    }

                    // change naming of special buttons
                    if( isValidate ) {
                        switch( true ) {
                            case (isSwissInvoiceRef && medidataRejected && ['MEDIDATAREJECTED', 'MEDIDATAFIXED'].includes( currentActivityStatus )):
                                button.text = i18n( 'activity-schema.transitionList.completeCorrection.i18n' );
                                break;
                            default:
                                button.text = i18n( 'activity-schema.transitionList.validate.i18n' );
                        }
                    }

                    // toggle the button's visibility
                    button.visible( isVisible );
                } );

            } ) );
        },
        destroyButtons: function() {
            var
                self = this;

            if( self.buttons ) {
                self.buttons.removeAll();
                self.buttons = null;
            }
        },
        buttonClickHandlerTransition: function( button ) {
            var
                self = this,
                transitionDescription = button.transitionDescription,
                transitionArgs = { transitionDescription: transitionDescription },
                binder = self.get( 'binder' ),
                tenantSettings = binder.getInitialData( 'tenantSettings' ) || {},
                currentActivity = peek( binder.currentActivity ),
                currentActType = peek( currentActivity.actType ),
                referencedBy = peek( currentActivity.referencedBy ),
                activities = peek( currentActivity.activities ),
                isPrescriptionType = Y.doccirrus.schemas.activity.isPrescriptionType( currentActType ),
                currentPatient = peek( binder.currentPatient ),
                caseFolders = currentPatient.caseFolderCollection,
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),
                allowedActTypes = [ 'RECEIPT', 'WARNING2', 'WARNING1', 'REMINDER', 'CREDITNOTE', 'BADDEBT' ],
                transition,
                fsmName = Y.doccirrus.schemas.activity.getFSMName( 'INVOICE' ),
                fsm = Y.doccirrus.schemas.activity.getFSM( fsmName ),
                roundReceiptAmount,
                roundOutstanding,
                willBalanceInvoice = false,
                activityData,
                callId,
                eventId,
                modal; //eslint-disable-line

            if( transitionDescription.transition === 'repeat' && tenantSettings.useExternalPrescriptionSoftware ) {
                Y.doccirrus.incase.handlers.repeatPrescription( {
                    user: this.get( 'binder' ).getInitialData( 'currentUser' ),
                    patient: currentPatient.get( 'data' ),
                    caseFolder: currentPatient.caseFolderCollection.getActiveTab(),
                    prescription: currentActivity,
                    externalPrescriptionSoftwareUrl: tenantSettings.externalPrescriptionSoftwareUrl
                } );
                return;
            }

            if( "transition-validate" === button.name && -1 !== allowedActTypes.indexOf( currentActType ) && activities && 0 < activities.length ) {
                switch( currentActType ) {
                    case 'WARNING2':
                        transition = { transition: 'warn2' };
                        break;
                    case 'WARNING1':
                        transition = { transition: 'warn1' };
                        break;
                    case 'REMINDER':
                        transition = { transition: 'remind' };
                        break;
                    case 'CREDITNOTE':
                        transition = { transition: 'credit' };
                        break;
                    case 'BADDEBT':
                        transition = { transition: 'derecognize' };
                        break;
                    case 'RECEIPT':
                        transition = { transition: 'pay' };
                        break;
                }

                saveActivityAndDoTransition();

                return;
            }

            if( currentActType === 'KBVUTILITY' && transitionDescription && 'validate' === transitionDescription.transition ) {
                (peek( currentActivity.hasWarnings ) ? currentActivity.askConfirmWarnings( transitionDescription ) : Promise.resolve( {confirmed: true} )).then( function( result ) {
                    if( true === result.confirmed ) {
                        return currentActivity.createDiagnoses();
                    }
                    return result;
                } ).then( function( result ) {
                    if( true === result.confirmed ) {
                        return activityDetailsVM.saveAttachmentsAndTransition( transitionArgs );
                    }
                } );
            } else if( 'KBVUTILITY2' === currentActType && transitionDescription && 'validate' === transitionDescription.transition ) {
                currentActivity.createDiagnoses().then( function() {
                    activityDetailsVM.saveAttachmentsAndTransition( transitionArgs );
                    if( peek( currentActivity.hasWarnings ) ) {
                        currentActivity.showWarnings();
                    }
                } );
            } else if( transitionDescription && 'repeat' === transitionDescription.transition && isPrescriptionType ) {
                Y.doccirrus.uam.utils.checkPrescription( {
                    activity: currentActivity,
                    locations: binder.getInitialData( 'location' ),
                    patient: currentPatient,
                    caseFolder: currentActivity.get( 'caseFolder' )
                } ).then( function( result ) {
                    if( result && true === result.success ) {
                        return activityDetailsVM.saveAttachmentsAndTransition( transitionArgs );
                    }
                } ).catch( function( err ) {
                    Y.log( 'could not check prescription: ' + err + ' create repeated presc anyway', 'error', NAME );
                    return activityDetailsVM.saveAttachmentsAndTransition( transitionArgs );
                } );
            } else if( transitionDescription && 'delete' === transitionDescription.transition ) {
                self.askConfirmTransition( transitionDescription );
            } else if( transitionDescription && 'cancel' === transitionDescription.transition ) {
                self.askCancelReason( transitionDescription );
            } else if( ( 'INVOICEREF' === currentActType || 'INVOICE' === currentActType ) && transitionDescription && ( 'pay' === transitionDescription.transition || 'derecognize' === transitionDescription.transition ) ) {
                ActivityActionButtonsViewModel.createReceipt( {
                    id: peek( currentActivity._id ),
                    total: peek( currentActivity.total ),
                    createBadDebt: 'derecognize' === transitionDescription.transition ? true : false,
                    totalReceiptsOutstanding: peek( currentActivity.totalReceiptsOutstanding ),
                    locationId: peek( currentActivity.locationId ),
                    onReceiptCreate: function( receipt ) {
                        var
                            activitiesTable = self.getActivitiesTable(),
                            currentActivity = peek( binder.currentActivity ),
                            componentColumnLinked = activitiesTable.getComponentColumnLinked(),
                            linkIds = [],

                            //  intermittent floating point weirdness can cause tiny fractions, round to the cent when comparing receipts to invoice
                            roundReceiptAmount = parseFloat( receipt && receipt.amount ? receipt.amount : 0 ).toFixed( 2 ),
                            roundOutstanding = parseFloat( unwrap( currentActivity.totalReceiptsOutstanding ) ).toFixed( 2 ),
                            willBalanceInvoice = false;

                        if ( currentActivity && currentActivity.receipts ) {
                            linkIds = currentActivity.receipts.slice();
                        }
                        if( receipt && receipt._id ) {
                            linkIds.push( receipt._id );
                        } else if( receipt && receipt.data ) {
                            linkIds.push( receipt.data._id );
                        }

                        if ( receipt && ( roundReceiptAmount === roundOutstanding ) ) {
                            willBalanceInvoice = true;
                        }

                        if( 0 < linkIds.length ) {
                            // redirect to last item
                            transitionArgs.loadAfter = linkIds[ linkIds.length - 1 ];
                        }

                        componentColumnLinked.removeLinks();
                        componentColumnLinked.addLinks( linkIds );

                        if( activitiesTable ) {
                            activitiesTable.reload(); // reflect changes in the table
                        }

                        //  TODO: switch to new receipt, only transition to PAID if remaining balance will be 0

                        if ( willBalanceInvoice ) {
                            //  billing
                            return activityDetailsVM.saveAttachmentsAndTransition( transitionArgs);
                        } else {
                            //  just switch to new receipt - invoice will be updated by post-processes on creation of receipt
                            if( binder && binder.navigateToActivity && receipt._id ) {
                                binder.navigateToActivity( { activityId: receipt._id } );
                            }
                        }
                    }
                } );
        // -------------------------------------------------- SURGERY --------------------------------------------------
            } else if( 'SURGERY' === currentActType && 'validate' === transitionDescription.transition ) {
                if(
                    ( currentActivity.get( 'caseFolder' ) && currentActivity.get( 'caseFolder' ).type === "PUBLIC" ) &&
                    ( currentActivity.linkedTreatments() && currentActivity.linkedTreatments().length )
                ) {
                    // The modal only shows for GKV with linked treatments
                    Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        message: i18n( 'InCaseMojit.SurgeryEditorModel.modals.savingModalMessage' )
                    } );
                }

                return activityDetailsVM.saveAttachmentsAndTransition( transitionArgs );
        // ---------------------------------------- TREATMENT linked to SURGERY ----------------------------------------
            } else if( 'TREATMENT' === currentActType && 'validate' === transitionDescription.transition && referencedBy && referencedBy.length ) {
                Y.doccirrus.jsonrpc.api.activity.read( {
                    query: {
                        _id: {$in: referencedBy},
                        actType: "SURGERY"
                    }
                } ).done( function( result ) {
                    var surgeryActivityId, modifiedFields, SURGERY_FIELDS;

                    if( result && result.data && result.data.length ) {
                        surgeryActivityId = result.data[0]._id;
                        modifiedFields = self.getModifiedFields();
                        SURGERY_FIELDS = Object.keys( Y.doccirrus.schemas.activity.types.Surgery_T );

                        if( _.intersection( modifiedFields, SURGERY_FIELDS ).length ) {
                            return self.askConfirmationUnlinkTreatmentFromSurgery( surgeryActivityId, transitionDescription );
                        } else { // Normal saving behavior
                            return activityDetailsVM.saveAttachmentsAndTransition( transitionArgs );
                        }
                    } else {
                        return activityDetailsVM.saveAttachmentsAndTransition( transitionArgs );
                    }
                } ).fail( function( result, err ) {
                    Y.log( 'Error in looking for referenced parent SURGERY: ' + err, 'error', NAME );
                    return activityDetailsVM.saveAttachmentsAndTransition( transitionArgs );
                } );
            } else if( 'TREATMENT' === currentActType && 'validate' === transitionDescription.transition && ( peek( currentActivity.hierarchyRules ) || []).some( function( el){
                return el.checked();
            }) ) {

                activityData = currentActivity.toJSON();
                callId = (new Y.doccirrus.mongo.ObjectId()).toString();
                eventId = 'preEvaluateRule_' + callId;

                Y.doccirrus.DCSystemMessages.removeMessage( 'hirerachyRules-prevalidate' );
                Y.doccirrus.jsonrpc.api.rule.triggerIpcQueue( {
                    caseFolderId: activityData.caseFolderId,
                    locationId: activityData.locationId.toString(),
                    patientId: activityData.patientId,
                    type: 'activity',
                    onDelete: false,
                    preValidateActivities: true,
                    callId: callId,
                    data: activityData
                } ).done( function() {
                    Y.doccirrus.communication.on( {
                        event: eventId,
                        handlerId: 'preEvaluateRuleHandler',
                        done: function success( res ) {
                            var
                                ruleResponse,
                                checkedHierarchy,
                                messageText = '',
                                checkedSeq,
                                messageForCurrentActivity = [];
                                //currentActivityCode = peek( currentActivity.code );

                            if( res && res.data && res.data.length ){
                                try {
                                    ruleResponse = JSON.parse( res.data );
                                } catch ( err ){
                                    //do nothing, still need to save activity
                                }

                                checkedHierarchy = ( peek( currentActivity.hierarchyRules ) || [] ).filter( function( el ){
                                    return peek( el.checked ) === true;
                                }).map( function( el ) {
                                    return peek( el.seq );
                                });

                                if( ruleResponse && ruleResponse.length && checkedHierarchy.length ){
                                    checkedHierarchy = checkedHierarchy.map( function( el ){
                                        return {
                                            seq: el,
                                            message: (ruleResponse.find( function( ruleResponse ){
                                                return ruleResponse.affectedCodes.includes( el );
                                            } ) || {}).message
                                        };
                                    } ).filter( function( el){
                                        return el.message;
                                    });

                                    checkedHierarchy.forEach( function( el ){
                                        //uncheck hierarchy
                                        checkedSeq = peek( currentActivity.hierarchyRules ).find( function( heirarchy ){
                                            return peek( heirarchy.checked ) === true && peek( heirarchy.seq ) === el.seq;
                                        });
                                        if( checkedSeq ){
                                            checkedSeq.checked( false );
                                        }
                                        messageText += el.seq + ' : ' + el.message + '\n';
                                    } );
                                }

                                // commented for now functionality that prevent saving activity in case of rule error
                                //
                                // if( ruleResponse && ruleResponse.length ){
                                //     //additionally check if main activity has no error
                                //     messageForCurrentActivity  = ruleResponse.filter( function( ruleResponse ){
                                //         return ruleResponse.affectedCodes.includes( currentActivityCode );
                                //     } ).map( function( el ){
                                //         return el.message;
                                //     });
                                //     if( messageForCurrentActivity.length ){
                                //         messageText += messageForCurrentActivity.join( '\n' ) + '\n';
                                //     }
                                // }

                                if( messageText ){

                                    Y.doccirrus.DCSystemMessages.addMessage( {
                                        messageId: 'hirerachyRules-prevalidate',
                                        content: ( messageForCurrentActivity.length ? RULE_ERROR : RULE_WARNING ) + '\n\n' +messageText,
                                        level: messageForCurrentActivity.length ? 'ERROR' : 'WARNING'
                                    } );
                                }
                            }
                            Y.doccirrus.communication.off( eventId, 'preEvaluateRuleHandler' );
                            if( !messageForCurrentActivity || !messageForCurrentActivity.length ){
                                return activityDetailsVM.saveAttachmentsAndTransition( transitionArgs );
                            }
                        }
                    } );
                } ).fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    return activityDetailsVM.saveAttachmentsAndTransition( transitionArgs );
                } );
            } else if ('INVOICE' === currentActType && transitionDescription.transition === "approve" && unwrap(currentActivity.blockApprove)) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'warn',
                    message: Y.Lang.sub( i18n( 'activityModel_clientJS.message.NO_CASE_NUMBER' ), { link: '<a target="_blank" href="/incase#/activity/' + unwrap( currentActivity.scheinId ) +'">Link</a><br/>' } ),
                    window: {
                        width: 'medium'
                    }
                } );
                return;
            } else {
                return activityDetailsVM.saveAttachmentsAndTransition( transitionArgs );
            }
            // do invoice transition on save activity
            function saveActivityAndDoTransition() {
                Y.doccirrus.jsonrpc.api.activity.read( { query: { _id: ko.unwrap( activities[0] ) } } )
                    .then(function( res ) {
                        var
                            data = res.data && res.data[0],
                            isCorrectTransition = false;
                        // checking if transition is allowed
                        if( 'INVOICEREF' === data.actType || 'INVOICE' === data.actType ) {
                            fsm[data.status].forEach(function( item ) {
                                if( item.transition === transition.transition ) {
                                    isCorrectTransition = true;
                                }
                            });
                        }
                        if( !isCorrectTransition ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'info',
                                message: i18n( 'InCaseMojit.ActivityDetailsVM.error.not_correct_status' ),
                                window: {
                                    width: 'medium'
                                }
                            } );
                            return null;
                        }
                        return data;
                    }).then(function( res ) {
                    if( res ) {
                        // test transition
                        activityDetailsVM.saveAttachmentsAndTransition( transitionArgs )
                            .then(function( res ) {
                                return res;
                            }).then(function() {
                                roundReceiptAmount = parseFloat( currentActivity && currentActivity.amount ? currentActivity.amount() : 0 ).toFixed( 2 );
                                roundOutstanding = parseFloat( res.totalReceiptsOutstanding ).toFixed( 2 );

                                if ( currentActivity && ( roundReceiptAmount !== roundOutstanding ) && ( 'pay' === transition.transition || 'derecognize' === transition.transition ) ) {
                                    willBalanceInvoice = true;
                                }
                                if( !willBalanceInvoice ) {
                                    Y.doccirrus.api.activity
                                        .transitionActivity( {
                                            activity: res,
                                            transitionDescription: transition,
                                            letMeHandleErrors: true,
                                            isTest: true
                                        } );
                                }
                            }).then(function() {
                                if( !willBalanceInvoice ) {
                                    res.notCreateNew = true;
                                    return Y.doccirrus.api.activity
                                        .transitionActivity( {
                                            activity: res,
                                            transitionDescription: transition,
                                            letMeHandleErrors: true,
                                            isTest: false
                                        } ).then( function() {
                                            var patientId = unwrap( currentPatient._id() );
                                            if( patientId ) {
                                                caseFolders.load( { patientId: patientId } );
                                            }
                                        });
                                }
                            });
                    }
                }).fail( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
            }
        },



        askConfirmTransition: function( transitionDescription ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel );

            Y.doccirrus.DCWindow.notice( {
                type: 'info',
                message: Y.Lang.sub( CONFIRM_TRANSITION, {transition: transitionDescription.i18n.toLowerCase() } ),
                window: {
                    width: 'auto',
                    buttons: {
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function() {
                                    this.close();
                                    activityDetailsVM.saveAttachmentsAndTransition( {
                                        transitionDescription: transitionDescription
                                    } );
                                }
                            } )
                        ]
                    }
                }
            } );
        },

        /**
         *  When cancelling an activity we prompt the user for a reason
         *  @param transitionDescription
         */

        askCancelReason: function( transitionDescription ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = ko.unwrap( binder.currentActivity ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel );

            Y.doccirrus.modals.activityCancel.show( { 'message': REASON_TO_CANCEL, callback: onPromptCompleted } );

            function onPromptCompleted( result ) {
                if( result && result.data ) {
                    currentActivity.cancelReason( result.data );
                }
                currentActivity.setNotModified();

                activityDetailsVM.saveAttachmentsAndTransition( {
                    transitionDescription: transitionDescription
                } );
           }

        },
        askConfirmationUnlinkTreatmentFromSurgery: function( surgeryActivityId, transitionDescription ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel );

            Y.doccirrus.DCWindow.notice( {
                type: 'info',
                message: Y.Lang.sub( CONFIRM_UNLINKING_TREATMENT_FROM_SURGERY, {transition: transitionDescription.i18n.toLowerCase() } ),
                window: {
                    width: 'auto',
                    buttons: {
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function() {
                                    currentActivity.referencedBy.remove( surgeryActivityId ); // The link from the SURGERY 'activities field will be removed in a post process.
                                    this.close();
                                    activityDetailsVM.saveAttachmentsAndTransition( {
                                        transitionDescription: transitionDescription
                                    } );
                                }
                            } )
                        ]
                    }
                }
            } );
        },
        getModifiedFields: function() {
        // NB: for TREATMENTs created through a SURGERY activity, the fields fk5020Set and fk5042Set may be recognized
        // as modified on the first save, as they are not populated with default values. This should not matter though
        // as they are not SURGERY fields.
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = ko.unwrap( binder.currentActivity ),
                data = currentActivity.get( 'data' ),
                updatedData = currentActivity.toJSON(),
                modifiedFields = [];

            Object.keys( data ).forEach( function( field ) {
                if( data[field] !== updatedData[field] && !_.isEqual( data[field], updatedData[field] ) ) {
                    modifiedFields.push( field );
                }
            } );

            return modifiedFields.filter( function( modifiedField ) {
                return ["status", "__t"].indexOf( modifiedField ) === -1;
            } );
        },
        buttonClickHandlerBack: function( /*button*/ ) {
            var
                self = this,
                binder = self.get( 'binder' );

            binder.navigateToCaseFileBrowser();
        },
        buttonClickHandlerSavePlus: function( /*button*/ ) {
            var
                self = this,
                transitionDescription = Y.doccirrus.schemas.activity.getTransitionDescription( 'validate' ),
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),

                transitionArgs = {
                    transitionDescription: transitionDescription,
                    skipRedirectBack: true
                };

            return activityDetailsVM.saveAttachmentsAndTransition( transitionArgs ).then( createNewAfterSave );

            function createNewAfterSave() {
                if( 'PREPARED' === currentActivity.status() ) {
                    currentActivity.timestamp( moment( new Date() ).toISOString() );
                    currentActivity.timestamp.readOnly( true );
                    currentActivity.setNotModified();
                }
                Y.doccirrus.inCaseUtils.createActivity( {
                    newActivityConfig: {
                        timestamp: moment( peek( currentActivity.timestamp ) ).add( 1, 'milliseconds' ).toISOString(),
                        locationId: peek( currentActivity.locationId ),
                        employeeId: peek( currentActivity.employeeId )
                    },
                    actType: peek( currentActivity.actType )
                } );
            }

        },
        buttonClickHandlerCopy: function( /*button*/ ) {
            var
                self = this,
                binder = self.get( 'binder' );

            binder.copyCurrentActivity();

        },
        /**
         * Save quotation treatment modifications if any.
         * @returns {Promise}
         */
        saveQuotationTreatments: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                reject, resolve,
                promise = new Promise( function( res, rej ) {
                    resolve = res;
                    reject = rej;
                } ),
                transitionDescription = Y.doccirrus.schemas.activity.getTransitionDescription( 'validate' ),
                quotationTreatments = binder.getQuotationTreatments(),
                currentActivity = peek( binder.currentActivity ),
                caseFolder = currentActivity && currentActivity.get( 'caseFolder' ),
                modifications;

            if( quotationTreatments && caseFolder.additionalType === 'QUOTATION' ) {
                modifications = quotationTreatments.getModifications();
                if( modifications.length ) {
                    Promise
                    // first run a test on all modifications, we don't want to mess around with some saved, some not
                        .all( modifications.map( function( activity ) {
                            return Y.doccirrus.api.activity
                                .transitionActivity( {
                                    activity: activity,
                                    transitionDescription: transitionDescription,
                                    letMeHandleErrors: true,
                                    isTest: true
                                } );
                        } ) )
                        // if test successful save them
                        .then( function() {
                            return Promise.all( modifications.map( function( activity ) {
                                return Y.doccirrus.api.activity
                                    .transitionActivity( {
                                        activity: activity,
                                        transitionDescription: transitionDescription,
                                        letMeHandleErrors: true,
                                        skipInvalidateParentActivities: true
                                    } );
                            } ) );
                        } )
                        .then( function( result ) {
                            resolve( result );
                        } )
                        .catch( function( response ) {
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( response ), 'display' );
                            reject( response );
                        } );
                }
                else {
                    resolve( null );
                }
            }
            else {
                resolve( null );
            }

            return promise;
        },
        /**
         * Button click handler of quotationTreatments save button
         */
        buttonClickHandlerQuotationTreatmentsSave: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity ),
                quotationTreatmentsHasModifications = binder.quotationTreatmentsHasModifications();

            // Workaround for old code: if special quotation table editor button is clicked and there modifications
            // we need this to get valid transition.
            if( quotationTreatmentsHasModifications ) {
                currentActivity.status( 'CREATED' );
            }

            var caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),
                validTransition = Y.doccirrus.inCaseUtils.checkTransition( {
                    currentActivity: currentActivity,
                    transition: 'validate'
                } );

            if( validTransition ) {
                return activityDetailsVM.saveAttachmentsAndTransition( {
                    transitionDescription: validTransition
                } ).then( function() {
                    var
                        activitiesTable = self.getActivitiesTable(),
                        currentActivity = peek( binder.currentActivity );

                    if( activitiesTable ) {
                        activitiesTable.reload(); // reflect changes in the table
                    }
                    if( currentActivity ) {
                        // reflect changes in modifications
                        currentActivity._reloadLinkedActivities().then( function() {
                            // note that linked activities need to be refreshed in the form
                            self.getActivityDetailsViewModel().attachmentsModel.markLinkedActivitiesDirty();
                        } );
                        currentActivity.setNotModified();
                    }

                } );
            }
            return Promise.resolve();
        },
        buttonClickHandlerTableSave: function() {
            var
                self = this,
                catalogTableEditorModel = KoViewModel.getViewModel( 'CatalogTableEditorModel' );
            if( catalogTableEditorModel ) {
                catalogTableEditorModel.createActivities()
                    .then( function() {
                        var
                            binder = self.get( 'binder' );
                        binder.navigateToCaseFileBrowser();
                    } )
                    .catch(function() {
                    } );
            }
        },
        buttonClickHandlerTableSavePlus: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity ),
                catalogTableEditorModel = KoViewModel.getViewModel( 'CatalogTableEditorModel' ),
                timestampPlus = moment( peek( currentActivity.timestamp ) ).add( 1, 'milliseconds' ).toISOString();
            if( catalogTableEditorModel ) {
                catalogTableEditorModel.createActivities()
                    .then( function() {
                        if( currentActivity.isNew() ) {
                            currentActivity.timestamp( timestampPlus );
                            currentActivity.setNotModified();
                        } else {
                            Y.doccirrus.inCaseUtils.createActivity( {
                                newActivityConfig: {
                                    timestamp: timestampPlus,
                                    locationId: peek( currentActivity.locationId ),
                                    employeeId: peek( currentActivity.employeeId )
                                },
                                actType: peek( currentActivity.actType )
                            } );
                        }

                    } )
                    .catch( function() {
                    } );
            }
        },
        buttonClickDispensing: function() {
            var self = this,
                binder = self.get('binder'),
                currentActivity = unwrap(binder.currentActivity ),
                currentUser = binder.getInitialData( 'currentUser' );

            Y.doccirrus.modals.dispensingModal.showDialog({
                phPZNs: [unwrap(currentActivity.phPZN)],
                locationId: unwrap(currentActivity.locationId),
                activities: [currentActivity.toJSON()],
                currentUser: currentUser,
                callback: function( err ) {
                    if (!err) {
                       self.disableDispenseButton( true );
                       self.getActivitiesTable().reload();
                    }
                }
            });

        },


        doocumentListener: null,
        documentNeedsSave: null,
        documentNeedsSaveText: null,
        activityStatus: null,
        effectiveStatus: null,

        /**
         *  This combines the activity and document dirty state into a single boolean indicating whether
         *  the current activity needs to be saved
         *
         *  TODO: move to ActivityDetailsViewModel
         */

        initDocumentNeedsSave: function() {

            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity );

            self.documentNeedsSave = ko.observable( false );

            self.documentListener = Y.on( 'documentUpdated', function( data ) {
                if ( currentActivity._isEditable() ) {
                    if ( self.documentNeedsSave ) {
                        self.documentNeedsSave( data );
                    } else {
                        Y.log( 'documentListener documentNeedsSave is not defined', 'warn', NAME );
                        self.documentNeedsSave = ko.observable( data );
                    }
                }
            } );

            self.documentSaveListener = Y.on( 'documentsAllSaved', function() {
                if ( self.documentNeedsSave ) {
                    Y.log( 'Marking all documents as saved', 'debug', NAME );
                    self.documentNeedsSave( false );
                } else {
                    Y.log( 'saveListener documentNeedsSave is not defined', 'warn', NAME );
                    self.documentNeedsSave = ko.observable( false );
                }
            } );

            // TODO: move to ActivityDetailsViewModel

            self.effectiveStatus = self.addDisposable( ko.computed( function() {
                //  should not generally happen
                if ( !currentActivity || !currentActivity.status ) { return ''; }
                if ( 'string' === typeof currentActivity.status ) { return currentActivity.status; }

                var activityStatus = currentActivity.status();

                return self.documentNeedsSave() || currentActivity.isModified() ? 'CREATED' : activityStatus;
            } ) );

        },
        destroyDocumentNeedsSave: function() {
            var self = this;
            self.documentNeedsSave = null;
            self.documentListener = null;
            self.documentSaveListener = null;
        }
    }, {
        NAME: 'ActivityActionButtonsViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' )  || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                }
            }
        }
    } );

    ActivityActionButtonsViewModel.createReceipt = function( data ) {
        Y.doccirrus.modals.createReceiptsModal.show( data );
    };

    KoViewModel.registerConstructor( ActivityActionButtonsViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'dcmongo',
        'KoViewModel',
        'dcutils',
        'dcauth',
        'activity-schema',
        'casefolder-schema',
        'activitycancelmodal',
        'DcCreateReceiptModal',
        'dcdispensingmodal',
        'activity-api',
        'selectcodemodal',
        'repeat-prescription-handler'
    ]
} );
