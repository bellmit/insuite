/*global ko, fun:true, $, _ */
/*exported fun */
//TRANSLATION INCOMPLETE!! MOJ-3201
fun = function _fn( Y ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        PracticeModel = KoViewModel.getConstructor( 'PracticeModel' ),

        viewModel = null,
        beforeUnloadView = null;

    /**
     * default error notifier
     */
    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            _.invoke( errors, 'display' );
        }

    }

    /**
     * read practice objects from server
     * @return {jQuery.Deferred}
     */
    function readPractice() {

        return Y.doccirrus.jsonrpc.api.practice
            .read()
            .then( function( response ) {
                return response && response.data && response.data[0] || null;
            } );
    }

    /**
     * read incase configuration from server
     * @return {jQuery.Deferred}
     */
    function readIncaseConfig() {
        return Y.doccirrus.jsonrpc.api.incaseconfiguration.getConfigs()
            .then( function( response ) {
                return response && response.data || null;
            } );
    }

    /**
     * clear modifications when leaving view
     */
    function detachConfirmModifications() {
        if( beforeUnloadView ) {
            beforeUnloadView.detach();
            beforeUnloadView = null;
        }
    }

    /**
     * handle modifications when leaving view
     */
    function attachConfirmModifications() {
        beforeUnloadView = Y.doccirrus.utils.getMojitBinderByType( 'InTimeAdminMojit' ).router.on( 'beforeUnloadView', function( yEvent, event ) {
            var
                modifications,
                practice = viewModel && peek( viewModel.practice ),
                isTypeRouter,
                isTypeAppHref;

            if( !(practice && practice.isModified()) ) {
                return;
            }

            isTypeRouter = (event.type === Y.doccirrus.DCRouter.beforeUnloadView.type.router);
            isTypeAppHref = (event.type === Y.doccirrus.DCRouter.beforeUnloadView.type.appHref);

            yEvent.halt( true );

            // no further handling for other kinds
            if( !(isTypeRouter || isTypeAppHref) ) {
                return;
            }

            modifications = Y.doccirrus.utils.confirmModificationsDialog( {
                saveButton: !peek( practice.saveHandlerDisabled )
            } );

            modifications.on( 'discard', function() {

                detachConfirmModifications();

                if( isTypeRouter ) {
                    event.router.goRoute();
                }
                if( isTypeAppHref ) {
                    event.appHref.goHref();
                }

            } );

            modifications.on( 'save', function() {

                viewModel.save().done( function() {

                    detachConfirmModifications();

                    if( isTypeRouter ) {
                        event.router.goRoute();
                    }
                    if( isTypeAppHref ) {
                        event.appHref.goHref();
                    }

                } );

            } );

        } );
    }

    /**
     * This views ViewModel
     * @constructor
     */
    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, KoViewModel.getBase(), {
        initializer: function() {
            var
                self = this;
            //translations
            self.commonConfigurationI18n = i18n( 'InTimeAdminMojit.tab_settings.label.COMMON_CONFIGURATIONS' );
            self.spontaneousAppI18n = i18n( 'InTimeAdminMojit.tab_settings.label.SPONTANEOUS_APP' );
            self.onlyPracticesPatientsCanBookInfoI18n = i18n( 'InTimeAdminMojit.tab_settings.onlyPracticesPatientsCanBook.info' );
            self.onlyPracticesPatientsCanBookLabelI18n = i18n( 'InTimeAdminMojit.tab_settings.onlyPracticesPatientsCanBook.label' );
            self.buttonSaveI18n = i18n('general.button.SAVE');
            self.allowAdhocI18n = i18n( 'general.PAGE_TITLE.PATIENT_PORTAL' );
            self.automaticConfigurationI18n = i18n( 'InTimeAdminMojit.tab_settings.label.AUTOMATIC_CONFIGURATION' );
            self.autoReloadingI18n = i18n( 'InTimeAdminMojit.tab_settings.label.AUTO_RELOCATING' );
            self.autoEndLabelI18n = i18n( 'InTimeAdminMojit.tab_settings.autoEnd.label' );
            self.updateNoShowAtEodLabelI18n = i18n( 'InTimeAdminMojit.tab_settings.updateNoShowAtEod.label' );
            self.updateNoShowAtEodInfoI18n = i18n( 'InTimeAdminMojit.tab_settings.updateNoShowAtEod.info' );
            self.autoMutateOff = ko.observable();
            self.autoMutateOffI18n = i18n( 'InTimeAdminMojit.tab_settings.label.AUTO_MUTATE_OFF' );
            self.autoMutateOffInfoI18n = i18n( 'InTimeAdminMojit.tab_settings.label.AUTO_MUTATE_OFF_INFO' );
            self.supportSettingsI18n = i18n( 'InTimeAdminMojit.tab_settings.label.SUPPORT_SETTINGS' );
            self.colorModeI18n = i18n( 'InTimeAdminMojit.tab_settings.label.COLOR_MODE' );
            self.colorModeCalendarI18n = i18n( 'InTimeAdminMojit.tab_settings.colorMode.calendar_label' );
            self.colorModeMeetingI18n = i18n( 'InTimeAdminMojit.tab_settings.colorMode.meeting_label' );
            self.saturdayI18n = i18n( 'practice-schema.IntimeConfiguration_T.saturday.i18n' );
            self.sundayI18n = i18n( 'practice-schema.IntimeConfiguration_T.sunday.i18n' );
            self.isSupport = Y.doccirrus.auth.memberOf( 'SUPPORT' );

            self.initViewModel();
            self.load();
        },
        destructor: function() {
            var
                self = this,
                practice = self.practice;

            if( practice ) {
                practice.destroy();
                self.practice = null;
            }

            detachConfirmModifications();
        },
        /**
         * Initializer
         */
        initViewModel: function() {
            var
                self = this;

            self.pending = ko.observable( false );

            self.initPractice();
            self.initLoadMask();

            attachConfirmModifications();
        },
        /**
         * busy flag
         */
        pending: null,
        /**
         * init the loading mask
         */
        initLoadMask: function() {
            var
                self = this,
                node = self.get( 'node' );

            self.addDisposable( ko.computed( function() {

                if( self.pending() ) {
                    Y.doccirrus.utils.showLoadingMask( node );
                }
                else {
                    Y.doccirrus.utils.hideLoadingMask( node );
                }

            } ) );
        },
        /**
         * practice ViewModel
         */
        practice: null,
        initPractice: function() {
            var
                self = this,
                practiceModel = new PracticeModel( {
                    validatable: true
                } );

            self.practice = practiceModel;

            practiceModel.saveHandlerDisabled = ko.computed( function() {
                var
                    pending = self.pending(),
                    isModified = practiceModel.isModified(),
                    isValid = practiceModel._isValid();

                return pending || !(isModified && isValid);
            } );

            practiceModel.deactivateCardReadAdHoc = ko.observable( false );

            practiceModel.saveHandler = function() {
                self.save();
            };
            self.hiddenDays = self.addDisposable( ko.observableArray( unwrap(self.practice.hiddenDays) ));

            $( 'input[name="allowPRCAdhoc"]' ).off( 'change' ).on( 'change', function() {
                if( !this.checked ) {
                    if( self.isAutoEventsOnCardReadNoAppointment ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            forceDefaultAction: true,
                            window: {
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'NO', {
                                            isDefault: false,
                                            action: function() {
                                                practiceModel.allowPRCAdhoc( true );
                                                this.close();
                                            }
                                        } ),
                                        Y.doccirrus.DCWindow.getButton( 'YES', {
                                            isDefault: true,
                                            action: function() {
                                                practiceModel.deactivateCardReadAdHoc( true );
                                                this.close();
                                            }
                                        } )
                                    ]
                                }
                            },
                            message: i18n( 'InTimeAdminMojit.tab_settings.label.DEACTIVATE_ADHOC' )
                        } );
                    }
                } else {
                    practiceModel.deactivateCardReadAdHoc( false );
                }
            } );
        },
        /**
         * load data for this view
         */
        load: function() {
            var
                self = this;

            self.pending( true );

            Promise.all( [
                readPractice(),
                readIncaseConfig()
            ] ).then( function( response ) {
                var practice = response && response[0],
                    incaseConf = response && response.length && response[1] && response[1].inCaseConfig;

                self.practice.set( 'data', practice );
                self.practice.setNotModified();
                self.isAutoEventsOnCardReadNoAppointment = incaseConf.autoEventsOnCardReadNoAppointment || false;
                self.pending( false );
            } ).catch( fail );
        },
        /**
         * reload data for this view
         */
        reload: function() {
            var
                self = this;

            self.load();

        },
        save: function() {
            var
                self = this,
                practiceModel = self.practice;

            self.pending( true );
            return Y.doccirrus.jsonrpc.api
                .practice.saveIntimeConfig( {
                    data: {
                        practiceId: peek( practiceModel._id ),
                        allowAdhoc: peek( practiceModel.allowAdhoc ),
                        allowPRCAdhoc: peek( practiceModel.allowPRCAdhoc ),
                        autoShift: peek( practiceModel.autoShift ),
                        autoMutateOff: peek( practiceModel.autoMutateOff ),
                        onlyPracticesPatientsCanBook: peek( practiceModel.onlyPracticesPatientsCanBook ),
                        allowBookingsOutsideOpeningHours: peek( practiceModel.allowBookingsOutsideOpeningHours ),
                        calendarViewDayStart: peek( practiceModel.calendarViewDayStart ),
                        calendarViewDayEnd: peek( practiceModel.calendarViewDayEnd ),
                        autoEnd: peek( practiceModel.autoEnd ),
                        colorMode: peek( practiceModel.colorMode ),
                        hiddenDays: peek( practiceModel.hiddenDays ),
                        updateNoShowAtEod: peek( practiceModel.updateNoShowAtEod ),
                        deactivateCardReadAdHoc: peek( practiceModel.deactivateCardReadAdHoc ),
                        activateOverview: peek( practiceModel.activateOverview )
                    }
                } )
                .then( function( response ) {
                    return response.data || null;
                } )
                .done( function( data ) {
                    practiceModel.set( 'data', data );
                    practiceModel.setNotModified();
                    practiceModel.deactivateCardReadAdHoc( false );
                    self.isAutoEventsOnCardReadNoAppointment = false;
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'tab_calendars-practice-save',
                        content: i18n( 'general.message.CHANGES_SAVED' )
                    } );
                } )
                .fail( fail )
                .always( function() {
                    self.pending( false );
                } );
        }
    }, {
        ATTRS: {
            node: {
                value: null,
                lazyAdd: false
            }
        }
    } );

    return {

        registerNode: function( node ) {

            // set viewModel
            viewModel = new ViewModel( {
                node: node.getDOMNode()
            } );

            ko.applyBindings( viewModel, node.getDOMNode() );

        },

        deregisterNode: function( node ) {

            ko.cleanNode( node.getDOMNode() );

            // clear the viewModel
            if( viewModel ) {
                viewModel.destroy();
                viewModel = null;
            }
        }
    };
};