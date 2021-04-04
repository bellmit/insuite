/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko */
fun = function _fn( Y/*, NAME*/ ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        PracticeModel = KoViewModel.getConstructor( 'PracticeModel' ),
        viewModel = null,
        beforeUnloadView = null;

    /**
     * clear handle ViewModel modifications when leaving view
     */
    function detachConfirmModifications() {
        if( beforeUnloadView ) {
            beforeUnloadView.detach();
            beforeUnloadView = null;
        }
    }

    /**
     * handle ViewModel modifications when leaving view
     */
    function attachConfirmModifications() {
        beforeUnloadView = Y.doccirrus.utils.getMojitBinderByType( 'InTimeAdminMojit' ).router.on( 'beforeUnloadView', function( yEvent, event ) {
            var
                modifications,
                isTypeRouter,
                isTypeAppHref;

            if( !(viewModel && viewModel.isModified()) ) {
                return;
            }

            isTypeRouter = (event.type === Y.doccirrus.DCRouter.beforeUnloadView.type.router);
            isTypeAppHref = (event.type === Y.doccirrus.DCRouter.beforeUnloadView.type.appHref);

            yEvent.halt( true );

            // no further handling for other kinds
            if( !(isTypeRouter || isTypeAppHref) ) {
                return;
            }

            modifications = Y.doccirrus.utils.confirmModificationsDialog();

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

    Y.extend( ViewModel, PracticeModel, {
        initializer: function() {
            var
                self = this;

            self.initViewModel();
            self.load();
            attachConfirmModifications();
            //translations
            self.notificationsHeadLineI18n = i18n('InTimeAdminMojit.tab_notifications.headline');
            self.notificationsAppHandlingI18n = i18n('InTimeAdminMojit.tab_notifications.group.APP_HANDLING');
            self.notificationsAppNewI18n = i18n('InTimeAdminMojit.tab_notifications.title.APP_NEW');
            self.emailPatI18n = i18n('InTimeAdminMojit.tab_notifications.checkbox.EMAIL_PAT');
            self.copyEstI18n = i18n('InTimeAdminMojit.tab_notifications.checkbox.COPY_EST');
            self.smsPatI18n = i18n('InTimeAdminMojit.tab_notifications.checkbox.SMS_PAT');
            self.appDeletedI18n = i18n('InTimeAdminMojit.tab_notifications.title.APP_DELETED');
            self.appRescheduledI18n = i18n('InTimeAdminMojit.tab_notifications.title.APP_RESCHEDULED');
            self.titleNoteI18n = i18n('InTimeAdminMojit.tab_notifications.title.NOTE');
            self.textNoteI18n = i18n('InTimeAdminMojit.tab_notifications.text.NOTE');
            self.titleCostsI18n = i18n('InTimeAdminMojit.tab_notifications.title.COSTS');
            self.textCostsI18n = i18n('InTimeAdminMojit.tab_notifications.text.COSTS');
            self.appRemindersI18n = i18n('InTimeAdminMojit.tab_notifications.group.APP_REMINDERS');
            self.appReminder1I18n = i18n('InTimeAdminMojit.tab_notifications.title.REMINDER1');
            self.labelTimeI18n = i18n('InTimeAdminMojit.tab_notifications.label.TIME');
            self.appReminder2I18n = i18n('InTimeAdminMojit.tab_notifications.title.REMINDER2');
            self.appReminder3I18n = i18n('InTimeAdminMojit.tab_notifications.title.REMINDER3');
            self.buttonSaveI18n = i18n('general.button.SAVE');
        },
        destructor: function() {
            detachConfirmModifications();
        },
        /**
         * Initializer
         */
        initViewModel: function() {
            var
                self = this;

            self.initCreateAlert();
            self.initUpdateAlert();
            self.initDeleteAlert();
            self.initReminderAlert1();
            self.initReminderAlert2();
            self.initReminderAlert3();

            self.initActions();
            self.initLoadMask();

        },
        createAlertForPatientByEmail: null,
        createAlertForLocationByEmail: null,
        createAlertForPatientBySms: null,
        // handle schema
        initCreateAlert: function() {
            var
                self = this;

            self.createAlertForPatientByEmail = ko.computed( function() {
                return Y.Array.find( self.createAlert(), function( item ) {
                    return 'patient' === peek( item.receiver ) && 'email' === peek( item.type );
                } );
            } );

            self.createAlertForLocationByEmail = ko.computed( function() {
                return Y.Array.find( self.createAlert(), function( item ) {
                    return 'location' === peek( item.receiver ) && 'email' === peek( item.type );
                } );
            } );

            self.createAlertForPatientBySms = ko.computed( function() {
                return Y.Array.find( self.createAlert(), function( item ) {
                    return 'patient' === peek( item.receiver ) && 'sms' === peek( item.type );
                } );
            } );

        },
        showConfirmDialogForCheckBox : function (checkedViewModel) {
            if( checkedViewModel.active() ) {
                checkedViewModel.active(false);
                Y.doccirrus.DCWindow.confirm( {
                    title: i18n( 'InTimeAdminMojit.tab_notifications.title.NOTE' ),
                    message: i18n( 'InTimeAdminMojit.tab_notifications.text.SMS_TEXT' ),
                    callback: function( dialog ) {
                        if( dialog.success ) {
                            checkedViewModel.active(true);

                        } else {
                            checkedViewModel.active(false);
                        }
                    },
                    window: {
                        width: 'medium'
                    }
                } );
            }
            return true;
        },

        updateAlertForPatientByEmail: null,
        updateAlertForLocationByEmail: null,
        updateAlertForPatientBySms: null,
        // handle schema
        initUpdateAlert: function() {
            var
                self = this;

            self.updateAlertForPatientByEmail = ko.computed( function() {
                return Y.Array.find( self.updateAlert(), function( item ) {
                    return 'patient' === peek( item.receiver ) && 'email' === peek( item.type );
                } );
            } );

            self.updateAlertForLocationByEmail = ko.computed( function() {
                return Y.Array.find( self.updateAlert(), function( item ) {
                    return 'location' === peek( item.receiver ) && 'email' === peek( item.type );
                } );
            } );

            self.updateAlertForPatientBySms = ko.computed( function() {
                return Y.Array.find( self.updateAlert(), function( item ) {
                    return 'patient' === peek( item.receiver ) && 'sms' === peek( item.type );
                } );
            } );

        },
        deleteAlertForPatientByEmail: null,
        deleteAlertForLocationByEmail: null,
        deleteAlertForPatientBySms: null,
        // handle schema
        initDeleteAlert: function() {
            var
                self = this;

            self.deleteAlertForPatientByEmail = ko.computed( function() {
                return Y.Array.find( self.deleteAlert(), function( item ) {
                    return 'patient' === peek( item.receiver ) && 'email' === peek( item.type );
                } );
            } );

            self.deleteAlertForLocationByEmail = ko.computed( function() {
                return Y.Array.find( self.deleteAlert(), function( item ) {
                    return 'location' === peek( item.receiver ) && 'email' === peek( item.type );
                } );
            } );

            self.deleteAlertForPatientBySms = ko.computed( function() {
                return Y.Array.find( self.deleteAlert(), function( item ) {
                    return 'patient' === peek( item.receiver ) && 'sms' === peek( item.type );
                } );
            } );

        },
        reminderAlert1ForPatientByEmail: null,
        reminderAlert1ForLocationByEmail: null,
        reminderAlert1ForPatientBySms: null,
        // handle schema
        initReminderAlert1: function() {
            var
                self = this;

            self.reminderAlert1ForPatientByEmail = ko.computed( function() {
                return Y.Array.find( self.reminderAlert1(), function( item ) {
                    return 'patient' === peek( item.receiver ) && 'email' === peek( item.type );
                } );
            } );

            self.reminderAlert1ForLocationByEmail = ko.computed( function() {
                return Y.Array.find( self.reminderAlert1(), function( item ) {
                    return 'location' === peek( item.receiver ) && 'email' === peek( item.type );
                } );
            } );

            self.reminderAlert1ForPatientBySms = ko.computed( function() {
                return Y.Array.find( self.reminderAlert1(), function( item ) {
                    return 'patient' === peek( item.receiver ) && 'sms' === peek( item.type );
                } );
            } );

        },
        reminderAlert2ForPatientByEmail: null,
        reminderAlert2ForLocationByEmail: null,
        reminderAlert2ForPatientBySms: null,
        // handle schema
        initReminderAlert2: function() {
            var
                self = this;

            self.reminderAlert2ForPatientByEmail = ko.computed( function() {
                return Y.Array.find( self.reminderAlert2(), function( item ) {
                    return 'patient' === peek( item.receiver ) && 'email' === peek( item.type );
                } );
            } );

            self.reminderAlert2ForLocationByEmail = ko.computed( function() {
                return Y.Array.find( self.reminderAlert2(), function( item ) {
                    return 'location' === peek( item.receiver ) && 'email' === peek( item.type );
                } );
            } );

            self.reminderAlert2ForPatientBySms = ko.computed( function() {
                return Y.Array.find( self.reminderAlert2(), function( item ) {
                    return 'patient' === peek( item.receiver ) && 'sms' === peek( item.type );
                } );
            } );

        },
        reminderAlert3ForPatientByEmail: null,
        reminderAlert3ForLocationByEmail: null,
        reminderAlert3ForPatientBySms: null,
        // handle schema
        initReminderAlert3: function() {
            var
                self = this;

            self.reminderAlert3ForPatientByEmail = ko.computed( function() {
                return Y.Array.find( self.reminderAlert3(), function( item ) {
                    return 'patient' === peek( item.receiver ) && 'email' === peek( item.type );
                } );
            } );

            self.reminderAlert3ForLocationByEmail = ko.computed( function() {
                return Y.Array.find( self.reminderAlert3(), function( item ) {
                    return 'location' === peek( item.receiver ) && 'email' === peek( item.type );
                } );
            } );

            self.reminderAlert3ForPatientBySms = ko.computed( function() {
                return Y.Array.find( self.reminderAlert3(), function( item ) {
                    return 'patient' === peek( item.receiver ) && 'sms' === peek( item.type );
                } );
            } );

        },
        // handle view
        /**
         * busy flag
         */
        pending: null,
        /**
         * save disabled computed
         */
        saveDisabled: null,
        /**
         * init actions this view exposes
         */
        initActions: function() {
            var
                self = this;

            self.pending = ko.observable( false );
            self.saveDisabled = ko.computed(function() {
                var
                    pending = self.pending(),
                    valid = self._isValid(),
                    modified = self.isModified();

                return pending || !(modified && valid);
            } ).extend( {rateLimit: 0} );

        },
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
         * load data for this view
         */
        load: function() {
            var
                self = this;

            self.pending( true );
            Y.doccirrus.jsonrpc.api.practice
                .getMyPractice()
                .then( function( response ) {
                    return response && response.data || null;
                } )
                .done( function( practice ) {
                    self.set( 'data', practice );
                    self.setNotModified();

                } )
                .fail( function( response ) {
                    var
                        errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                    if( errors.length ) {
                        Y.Array.invoke( errors, 'display' );
                    }

                } )
                .always( function() {
                    self.pending( false );
                } );

        },
        /**
         * save data for this view
         * @return {jQuery.Deferred}
         */
        save: function() {
            var
                self = this,
                data = self.toJSON();

            self.pending( true );
            return Y.doccirrus.jsonrpc.api.practice
                .update( {
                    query: {_id: data._id},
                    data: data,
                    fields: ['createAlert', 'deleteAlert', 'updateAlert', 'reminderAlert1', 'reminderAlert2', 'reminderAlert3']
                } )
                .done( function( response ) {
                    var
                        warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                    if( warnings.length ) {
                        Y.Array.invoke( warnings, 'display' );
                    }

                    if( response.data ) {
                        self.set( 'data', response.data );
                        self.setNotModified();
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'tab_notifications-save',
                            content: i18n( 'general.message.CHANGES_SAVED' )
                        } );
                    }

                } )
                .fail( function( response ) {
                    var
                        errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                    if( errors.length ) {
                        Y.Array.invoke( errors, 'display' );
                    }

                } )
                .always( function() {
                    self.pending( false );
                } );

        }

    }, {
        schemaName: PracticeModel.schemaName,
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
