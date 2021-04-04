/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'ActivityHeadingViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        ActivityHeadingButtonsViewModel = KoViewModel.getConstructor( 'ActivityHeadingButtonsViewModel' ),

        i18n = Y.doccirrus.i18n,
        NEW_ENTRY = i18n( 'InCaseMojit.activity_model_clientJS.label.NEW_ENTRY' ),
        ENTRY = i18n( 'InCaseMojit.activity_model_clientJS.label.ENTRY' ),

        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable;

    /**
     * @constructor
     * @class ActivityHeadingViewModel
     */
    function ActivityHeadingViewModel() {
        ActivityHeadingViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivityHeadingViewModel, KoViewModel.getDisposable(), {
        //  print and PDF buttons
        activityHeadingButtonsViewModel: null,
        headingText: null,
        showReadCheckbox: null,
        readCheckbox: null,

        /** @protected */
        initializer: function() {
            var self = this;
            self.initActivityHeadingButtonsViewModel();
            self.initHeadingText();

            self.initDocLetterConfig();
        },
        /** @protected */
        destructor: function() {
            var self = this;
            self.destroyActivityHeadingButtonsViewModel();
        },
        initActivityHeadingButtonsViewModel: function() {
            var self = this;
            self.activityHeadingButtonsViewModel = new ActivityHeadingButtonsViewModel();
        },
        destroyActivityHeadingButtonsViewModel: function() {
            var self = this;
            if( self.activityHeadingButtonsViewModel ) {
                self.activityHeadingButtonsViewModel.destroy();
                self.activityHeadingButtonsViewModel = null;
            }

        },
        initHeadingText: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity );

            // the heading to show for this activity
            self.headingText = self.addDisposable( ko.computed( function() {
                var repetitions, parentPrescriptionId,
                    _id = unwrap( currentActivity._id ),
                    status = unwrap( currentActivity.status );

                if( currentActivity._isPrescriptionType && currentActivity._isPrescriptionType() && currentActivity.noOfRepetitions ) {

                    repetitions = unwrap( currentActivity.noOfRepetitions );
                    repetitions = 'number' === typeof repetitions ? --repetitions : repetitions;
                    parentPrescriptionId = unwrap( currentActivity.parentPrescriptionId );

                    if( parentPrescriptionId && repetitions > 0 ) {
                        return 'Folgeverordnung (' + repetitions + ')';
                    }
                }

                if( status && 'CREATED' !== status ) {
                    return Y.Lang.sub( '<strong>{key}</strong> {value}', {
                        key: i18n( 'activity-schema.Activity_T.status.i18n' ),
                        value: Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', status, 'i18n' )
                    } );
                }

                if( _id ) {
                    return ENTRY;
                }

                return NEW_ENTRY;
            } ) );
        },
        initDocLetterConfig: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity ),
                actType = peek( currentActivity.actType ),
                status = peek( currentActivity.status ),
                kimState;

            if ( actType === 'DOCLETTER' ) {

                self.kimState = currentActivity.kimState;

                kimState = peek( self.kimState );

                if (
                    [
                        'CREATED',
                        'VALID'
                    ].includes( status ) &&
                    [
                        'RECEIVED',
                        'RECEIVED_AND_READ'
                    ].includes( kimState )
                ) {
                    self.showReadCheckbox = ko.observable( true );

                    self.readCheckbox = ko.observable( kimState === 'RECEIVED_AND_READ' );

                    self.readCheckbox.subscribe(function(value) {
                        currentActivity.kimState( value ? 'RECEIVED_AND_READ' : 'RECEIVED' );
                    });

                    /**
                     * When kimState is received and the activity is opened,
                     * then the checkbox gets automatically set.
                     * Which will also call the subscribe and update the kimState
                     */
                    if ( kimState === 'RECEIVED' ) {
                        self.readCheckbox( true );
                    }

                    self.readCheckbox.i18n = i18n( 'patienttransfer-schema.PatientTransfer_T.Status_E.READ' );
                }
            }
        }
    }, {
        NAME: 'ActivityHeadingViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' )  || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                }
            }
        }
    } );

    KoViewModel.registerConstructor( ActivityHeadingViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'dcschemaloader',
        'dcutils',
        'ActivityHeadingButtonsViewModel'
    ]
} );
