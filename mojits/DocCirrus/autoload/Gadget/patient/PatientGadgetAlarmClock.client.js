/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _ */
YUI.add( 'PatientGadgetAlarmClock', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetAlarmClock
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        ignoreDependencies = ko.ignoreDependencies,

        getObject = Y.doccirrus.commonutils.getObject,
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadget = KoViewModel.getConstructor( 'PatientGadget' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_CONST = GADGET.constants,
        TPL_PATH_PATIENT = GADGET_CONST.paths.TPL_PATIENT;

    function Control( parameters ) {
        var
            self = this;

        self.name = parameters.name;
        self.css = parameters.css;
        self.title = parameters.title;
        self.disable = parameters.disabled || false;
        self.click = parameters.handler;
        self.nameAttr = 'control-' + self.name;
    }

    function Field( parameters ) {
        var
            self = this;

        self.name = parameters.name;
        self.value = parameters.value;
        self.focus = parameters.focus;
        self.disable = parameters.disabled || false;
        self.nameAttr = 'field-' + self.name;
    }

    /**
     * @constructor
     * @class PatientGadgetAlarmClock
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetAlarmClock() {
        PatientGadgetAlarmClock.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetAlarmClock, PatientGadget, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self._initPatientGadgetAlarmClock();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self._destroyCommunication();
            self.stopTimer();
            self.stopAudio();
        },
        _initPatientGadgetAlarmClock: function() {
            var
                self = this;

            self.fieldHoursI18n = i18n( 'PatientGadget.PatientGadgetAlarmClock.fieldHours.description' );
            self.fieldMinutesI18n = i18n( 'PatientGadget.PatientGadgetAlarmClock.fieldMinutes.description' );
            self.fieldSecondsI18n = i18n( 'PatientGadget.PatientGadgetAlarmClock.fieldSeconds.description' );

            self._initObservables();
            self._initModelConfig();
            self._initFields();
            self._initControls();
            self._initContextCss();
            self._initAudio();
            self._initNotification();
            self._initCommunication();
            self._initPatientSchedule();

        },
        /**
         * Current patients schedule.
         * @property currentSchedule
         * @type {ko.observable|Object}
         */
        currentSchedule: null,
        /**
         * The current timer state in seconds.
         * @property timerSeconds
         * @type {ko.observable|Number}
         */
        timerSeconds: null,
        /**
         * The initial timer state in seconds as entered by user.
         * @property timerSecondsInitial
         * @type {ko.observable|Number}
         */
        timerSecondsInitial: null,
        /**
         * Indicates timer is currently paused.
         * @property timerPaused
         * @type {ko.observable|Boolean}
         */
        timerPaused: null,
        /**
         * @property notifyByAudio
         * @type {ko.observable|Boolean}
         */
        notifyByAudio: null,
        /**
         * @property reNotifySecondsAfter
         * @type {ko.observable|Number}
         */
        reNotifySecondsAfter: null,
        /**
         * @property reNotifySecondsBefore
         * @type {ko.observable|Number}
         */
        reNotifySecondsBefore: null,
        /**
         * @property additionalNotification
         * @type {ko.observable|Boolean}
         * @default null
         */
        additionalNotification: false,
        /**
         * @property manualMode
         * @type {ko.observable|Boolean}
         * @default true
         */
        manualMode: false,
        _initObservables: function() {
            var
                self = this,
                selfPrototype = self.constructor.prototype;

            self.timerSeconds = ko.observable( 0 );
            self.timerSecondsInitial = ko.observable( 0 );
            self.timerPaused = ko.observable( true );
            self.notifyByAudio = ko.observable( true );
            self.reNotifySecondsBefore = ko.observable( selfPrototype.reNotifySecondsBefore );
            self.reNotifySecondsAfter = ko.observable( selfPrototype.reNotifySecondsAfter );
            self.additionalNotification = ko.observable( selfPrototype.additionalNotification );
            self.manualMode = ko.observable( selfPrototype.manualMode );
        },
        _initModelConfig: function() {
            var
                self = this,
                selfPrototype = self.constructor.prototype,
                model = self.get( 'gadgetModel' );

            /** Update Observables from config **/
            self.addDisposable( ko.computed( function() {
                var
                    modelConfig = unwrap( model.config ),
                    additionalNotification = getObject( 'alarmClock.additionalNotification', modelConfig ) || selfPrototype.additionalNotification,
                    reNotifySecondsAfter = getObject( 'alarmClock.reNotifySecondsAfter', modelConfig ) || selfPrototype.reNotifySecondsAfter,
                    reNotifySecondsBefore = getObject( 'alarmClock.reNotifySecondsBefore', modelConfig ) || selfPrototype.reNotifySecondsBefore,
                    manualMode = getObject( 'alarmClock.manualMode', modelConfig );

                if( _.isUndefined( manualMode ) ) {
                    manualMode = selfPrototype.manualMode;
                }

                self.additionalNotification( additionalNotification );
                self.reNotifySecondsAfter( reNotifySecondsAfter );
                self.reNotifySecondsBefore( reNotifySecondsBefore );
                self.manualMode( manualMode );
            } ) );
        },
        _timer: null,
        _setTimer: function() {
            var
                self = this;

            if( !self._timer ) {
                self._timer = window.setInterval( function() {
                    self.timerSeconds( peek( self.timerSeconds ) - 1 );
                }, 1000 );
            }
        },
        _clearTimer: function() {
            var
                self = this;

            if( self._timer ) {
                window.clearInterval( self._timer );
                self._timer = null;
            }
        },
        /**
         * Starts timer.
         * @method startTimer
         */
        startTimer: function() {
            var
                self = this;

            self._writeStartTimestampToSchedule();
            self._setTimer();
            self.timerPaused( false );
        },
        /**
         * Pauses timer.
         * @method pauseTimer
         */
        pauseTimer: function() {
            var
                self = this;

            self._clearTimer();
            self.timerPaused( true );
        },
        /**
         * Stop and reset timer.
         * @method stopTimer
         */
        stopTimer: function() {
            var
                self = this;

            self._writeEndTimestampToSchedule();
            self._clearTimer();
            self.stopAudio();
            self.timerPaused( true );
            self.timerSeconds( 0 );
            self.timerSecondsInitial( 0 );
        },
        /**
         * Enables notification by playing audio.
         * @method enableNotifyByAudio
         */
        enableNotifyByAudio: function() {
            var
                self = this;

            self.notifyByAudio( true );
        },
        /**
         * Disables notification by playing audio.
         * @method disableNotifyByAudio
         */
        disableNotifyByAudio: function() {
            var
                self = this;

            self.stopAudio();
            self.notifyByAudio( false );
        },
        /**
         * An instance of Field managing the hours input.
         * @property fieldHours
         * @type {Field}
         */
        fieldHours: null,
        /**
         * An instance of Field managing the minutes input.
         * @property fieldMinutes
         * @type {Field}
         */
        fieldMinutes: null,
        /**
         * An instance of Field managing the seconds input.
         * @property fieldSeconds
         * @type {Field}
         */
        fieldSeconds: null,
        /**
         * Determines if a time managing input has focus.
         * @property fieldsHaveFocus
         * @type {ko.computed|Boolean}
         */
        fieldsHaveFocus: null,
        _initFields: function() {
            var
                self = this,
                timerSecondsBeforeFocus = peek( self.timerSeconds ),
                timerSecondsAfterFocus = timerSecondsBeforeFocus;

            self.fieldHours = new Field( {
                name: 'hours',
                focus: ko.observable( false ),
                value: ko.observable( '00' )
            } );
            self.fieldMinutes = new Field( {
                name: 'minutes',
                focus: ko.observable( false ),
                value: ko.observable( '00' )
            } );
            self.fieldSeconds = new Field( {
                name: 'seconds',
                focus: ko.observable( false ),
                value: ko.observable( '00' )
            } );

            self.fieldsHaveFocus = self.addDisposable( ko.computed( function() {
                var
                    fieldHoursFocus = unwrap( self.fieldHours.focus ),
                    fieldMinutesFocus = unwrap( self.fieldMinutes.focus ),
                    fieldSecondsFocus = unwrap( self.fieldSeconds.focus );

                return fieldHoursFocus || fieldMinutesFocus || fieldSecondsFocus;

            } ).extend( {rateLimit: 0} ) );

            /** Compute to pause timer **/
            self.addDisposable( ko.computed( function() {
                var
                    fieldsHaveFocus = unwrap( self.fieldsHaveFocus );

                if( fieldsHaveFocus ) {
                    ignoreDependencies( self.pauseTimer, self );
                }

            } ) );

            /** Compute to set current timer seconds from inputs **/
            self.addDisposable( ko.computed( function() {
                var
                    fieldsHaveFocus = unwrap( self.fieldsHaveFocus ),
                    hours = unwrap( self.fieldHours.value ),
                    minutes = unwrap( self.fieldMinutes.value ),
                    seconds = unwrap( self.fieldSeconds.value ),
                    duration;

                if( fieldsHaveFocus ) {
                    duration = moment.duration( 0 );

                    hours = parseInt( hours, 10 );
                    if( !_.isNumber( hours ) ) {
                        hours = 0;
                    }
                    duration.add( hours, 'hours' );

                    minutes = parseInt( minutes, 10 );
                    if( !_.isNumber( minutes ) ) {
                        minutes = 0;
                    }
                    duration.add( minutes, 'minutes' );

                    seconds = parseInt( seconds, 10 );
                    if( !_.isNumber( seconds ) ) {
                        seconds = 0;
                    }
                    duration.add( seconds, 'seconds' );

                    self.timerSeconds( duration.asSeconds() );
                }

            } ) );

            /** Computed updating inputs from current timer state **/
            self.addDisposable( ko.computed( function() {
                var
                    fieldsHaveFocus = unwrap( self.fieldsHaveFocus ),
                    timerSeconds = unwrap( self.timerSeconds ),
                    hours,
                    minutes,
                    seconds;

                if( !fieldsHaveFocus ) {

                    timerSeconds = Math.abs( timerSeconds );
                    hours = String( Math.floor( timerSeconds / 3600 ) );
                    minutes = String( Math.floor( (timerSeconds / 60) % 60 ) );
                    seconds = String( timerSeconds % 60 );

                    if( hours.length < 2 ) {
                        hours = '0' + hours;
                    }
                    if( minutes.length < 2 ) {
                        minutes = '0' + minutes;
                    }
                    if( seconds.length < 2 ) {
                        seconds = '0' + seconds;
                    }

                    self.fieldHours.value( hours );
                    self.fieldMinutes.value( minutes );
                    self.fieldSeconds.value( seconds );
                }

            } ) );

            /** Compute setting initial timer seconds **/
            self.addDisposable( ko.computed( function() {
                var
                    fieldsHaveFocus = unwrap( self.fieldsHaveFocus ),
                    timerSeconds = peek( self.timerSeconds ),
                    timerSecondsEdited;

                if( fieldsHaveFocus ) {
                    timerSecondsBeforeFocus = timerSeconds;
                }
                else {
                    timerSecondsAfterFocus = timerSeconds;
                    timerSecondsEdited = timerSecondsBeforeFocus !== timerSecondsAfterFocus;

                    if( timerSecondsEdited ) {
                        self.timerSecondsInitial( timerSeconds );
                    }
                }

            } ) );

        },
        /**
         * An instance of Control managing the play/pause control.
         * @property controlPlay
         * @type {Control}
         */
        controlPlay: null,
        /**
         * An instance of Control managing the stop control.
         * @property controlStop
         * @type {Control}
         */
        controlStop: null,
        /**
         * An instance of Control managing the notification control.
         * @property controlAlarm
         * @type {Control}
         */
        controlAlarm: null,
        _initControls: function() {
            var
                self = this;

            self.controlPlay = new Control( {
                name: 'play',
                css: self.addDisposable( ko.computed( function() {
                    return unwrap( self.timerPaused ) ? 'fa-play-circle' : 'fa-pause-circle';
                } ) ),
                title: self.addDisposable( ko.computed( function() {
                    return unwrap( self.timerPaused ) ?
                        i18n( 'PatientGadget.PatientGadgetAlarmClock.controlPlay.title.play' ) :
                        i18n( 'PatientGadget.PatientGadgetAlarmClock.controlPlay.title.pause' );
                } ) ),
                handler: function() {
                    if( peek( self.timerPaused ) ) {
                        self.startTimer();
                    }
                    else {
                        self.pauseTimer();
                    }
                }
            } );
            self.controlStop = new Control( {
                name: 'stop',
                title: i18n( 'PatientGadget.PatientGadgetAlarmClock.controlStop.title' ),
                css: 'fa-stop-circle',
                handler: function() {
                    self.stopTimer();
                },
                disabled: self.addDisposable( ko.computed( function() {
                    var
                        timerSeconds = unwrap( self.timerSeconds ),
                        timerSecondsInitial = unwrap( self.timerSecondsInitial ),
                        timerPaused = unwrap( self.timerPaused );

                    return 0 === timerSecondsInitial && timerSecondsInitial === timerSeconds && timerPaused;
                } ) )
            } );
            self.controlAlarm = new Control( {
                name: 'alarm',
                css: self.addDisposable( ko.computed( function() {
                    return unwrap( self.notifyByAudio ) ? 'fa-bell-slash' : 'fa-bell-o';
                } ) ),
                title: self.addDisposable( ko.computed( function() {
                    return unwrap( self.notifyByAudio ) ?
                        i18n( 'PatientGadget.PatientGadgetAlarmClock.controlAlarm.title.disableNotifyByAudio' ) :
                        i18n( 'PatientGadget.PatientGadgetAlarmClock.controlAlarm.title.enableNotifyByAudio' );
                } ) ),
                handler: function() {
                    if( peek( self.notifyByAudio ) ) {
                        self.disableNotifyByAudio();
                    }
                    else {
                        self.enableNotifyByAudio();
                    }
                }
            } );
        },
        /**
         * An Object managing gadget's contextual class names.
         * @property
         * @type {Object}
         */
        contextCss: null,
        _initContextCss: function() {
            var
                self = this;

            self.contextCss = {
                'PatientGadgetAlarmClock-isPaused': self.timerPaused,
                'PatientGadgetAlarmClock-isCountDown': self.addDisposable( ko.computed( function() {
                    var
                        notPaused = !unwrap( self.timerPaused ),
                        timerSeconds = unwrap( self.timerSeconds );

                    return notPaused && timerSeconds >= 0;
                } ) ),
                'PatientGadgetAlarmClock-isCountUp': self.addDisposable( ko.computed( function() {
                    var
                        notPaused = !unwrap( self.timerPaused ),
                        timerSeconds = unwrap( self.timerSeconds );

                    return notPaused && timerSeconds < 0;
                } ) )
            };
        },
        /**
         * An instance of Audio managing playing audio.
         * @property audio
         * @type {Audio}
         */
        audio: null,
        _initAudio: function() {
            var
                self = this,
                audio = self.audio = new Audio();

            audio.autoplay = false;
            audio.loop = false;
            audio.preload = 'none';

        },
        /**
         * Plays an audio URL.
         * @method playAudio
         */
        playAudio: function() {
            var
                self = this,
                audio = self.audio;

            self.stopAudio();

            audio.src = '/static/dcbaseapp/assets/mp3/PatientGadgetAlarmClockCut.mp3';
            audio.play();
        },
        /**
         * Stops playing current audio.
         * @method stopAudio
         */
        stopAudio: function() {
            var
                self = this,
                audio = self.audio;

            audio.pause();
            audio.src = '';
        },
        _initNotification: function() {
            var
                self = this;

            /** Compute triggering notifications from current timer state **/
            self.addDisposable( ko.computed( function() {
                var
                    timerPaused = unwrap( self.timerPaused ),
                    timerSeconds = unwrap( self.timerSeconds ),
                    timerSecondsInitial = unwrap( self.timerSecondsInitial ),
                    additionalNotification = unwrap( self.additionalNotification ),
                    reNotifySecondsAfter = unwrap( self.reNotifySecondsAfter ),
                    reNotifySecondsBefore = unwrap( self.reNotifySecondsBefore ),

                    notifyNot = timerPaused || timerSecondsInitial === 0,
                    isRenotificationAfter = reNotifySecondsAfter && timerSeconds < 0 && timerSeconds === -reNotifySecondsAfter,
                    isRenotificationBefore = reNotifySecondsBefore && timerSeconds > 0 && timerSeconds === reNotifySecondsBefore,
                    isReNotification = additionalNotification && (isRenotificationAfter || isRenotificationBefore);

                if( !notifyNot && timerSeconds !== 0 && !isReNotification ) {
                    notifyNot = true;
                }

                if( notifyNot ) {
                    return;
                }

                ignoreDependencies( function() {
                    if( isReNotification ) {
                        self.triggerReNotification();
                    }
                    else {
                        self.triggerNotification();
                    }
                } );

            } ).extend( {rateLimit: 0} ) );
        },
        /**
         * Triggers notification for user.
         * @method triggerNotification
         */
        triggerNotification: function() {
            var
                self = this,
                notifyByAudio = peek( self.notifyByAudio );

            if( notifyByAudio ) {
                self.playAudio();
            }
        },
        /**
         * Triggers re-notification for user.
         * @method triggerNotification
         */
        triggerReNotification: function() {
            var
                self = this,
                notifyByAudio = peek( self.notifyByAudio );

            if( notifyByAudio ) {
                self.playAudio();
            }
        },
        _communicationScheduleSubscription: null,
        _initCommunication: function() {
            var
                self = this;

            self._communicationScheduleSubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'schedule',
                callback: function( /*data, meta*/ ) {
                }
            } );
        },
        _destroyCommunication: function() {
            var
                self = this;

            if( self._communicationScheduleSubscription ) {
                self._communicationScheduleSubscription.removeEventListener();
                self._communicationScheduleSubscription = null;
            }
        },

        _initPatientSchedule: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient );

            Y.doccirrus.jsonrpc.api.calevent.read( {
                noBlocking: true,
                dateFrom: 'today',
                patient: peek( currentPatient._id )
            } )
                .then( function( res ) {
                    var data = res.data,
                        schedule,
                        duration,
                        isManual = peek( self.manualMode );

                    if( !data.length ) {
                        return;
                    }

                    schedule = data.find( function( i ) {
                        return i.scheduled === Y.doccirrus.schemas.calendar.SCH_CURRENT;
                    } );

                    if( !schedule ) {
                        schedule = data.find( function( i ) {
                            return i.scheduled === Y.doccirrus.schemas.calendar.SCH_WAITING;
                        } );
                    }

                    if( !schedule ) {
                        return;
                    }

                    duration = schedule.duration || 0;

                    if( !duration ) {
                        return;
                    }

                    self.currentSchedule = schedule;

                    if( isManual ) {
                        return;
                    }

                    self.fieldMinutes.value( String( duration < 10 ? '0' + duration : duration ) );
                    duration = moment.duration( duration, 'minutes' ).asSeconds();
                    self.timerSeconds( duration );
                    self.timerSecondsInitial( duration );
                } )
                .fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
        },

        _writeStartTimestampToSchedule: function() {
            var
                self = this;
            if( !self.currentSchedule ) {
                return;
            }
            self.currentSchedule.doctorStart = new Date();
        },

        _writeEndTimestampToSchedule: function() {
            var
                self = this;
            if( !self.currentSchedule ) {
                return;
            }
            self.currentSchedule.doctorEnd = new Date();
            self._saveCurrentSchedule();
        },

        _saveCurrentSchedule: function() {
            var
                self = this,
                schedule = self.currentSchedule;
            if( !schedule ) {
                return;
            }

            Y.doccirrus.jsonrpc.api.calevent.update( {
                noBlocking: true,
                query: {_id: schedule._id},
                data: schedule,
                fields: ['doctorEnd', 'doctorStart']
            } ).fail( function( error ) {
               _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            } );

        },
        /**
         * If this Gadget is editable
         * @property editable
         * @type {Boolean}
         * @default true
         * @for PatientGadgetAlarmClock
         */
        editable: true
    }, {
        NAME: 'PatientGadgetAlarmClock',
        ATTRS: {
            /**
             * Some sort of markup string
             * - can be a promise to fulfill with a string (returned by valueFn)
             *
             * NOTE: this one is actually used in the context of PatientGadgetEditGadget
             *
             * @for PatientGadgetAlarmClock
             */
            editTemplate: {
                valueFn: function() {
                    return Y.doccirrus.jsonrpc.api.jade
                        .renderFile( {noBlocking: true, path: TPL_PATH_PATIENT + 'PatientGadgetAlarmClockConfigDialog'} )
                        .then( function( response ) {
                            return response.data;
                        } );
                }
            },
            /**
             * Some sort of model
             * - can be a promise to fulfill with a model (returned by valueFn)
             * - specify "toJSON" to not let ko.toJS be used
             * - specify "destroy" to let your model be destroyed (dispose is being ignored when destroy is available)
             * - specify "dispose" to let your model be disposed
             *
             * NOTE: this one is actually used in the context of PatientGadgetEditGadget
             *
             * @for PatientGadgetAlarmClock
             */
            editBindings: {
                getter: function() {
                    var
                        self = this,
                        model = self.get( 'gadgetModel' ),
                        modelConfig = unwrap( model.config ),
                        forGadgetConstructor = self.get( 'forGadgetConstructor' ),

                        additionalNotification = getObject( 'alarmClock.additionalNotification', modelConfig ) || forGadgetConstructor.prototype.additionalNotification,
                        reNotifySecondsAfter = getObject( 'alarmClock.reNotifySecondsAfter', modelConfig ) || forGadgetConstructor.prototype.reNotifySecondsAfter,
                        reNotifySecondsBefore = getObject( 'alarmClock.reNotifySecondsBefore', modelConfig ) || forGadgetConstructor.prototype.reNotifySecondsBefore,
                        manualMode = getObject( 'alarmClock.manualMode', modelConfig ),

                        bindings = {};

                    if( _.isUndefined( manualMode ) ) {
                        manualMode = forGadgetConstructor.prototype.manualMode;
                    }

                    if( _.isUndefined( additionalNotification ) ) {
                        manualMode = forGadgetConstructor.prototype.additionalNotification;
                    }

                    bindings.additionalNotification = ko.observable( additionalNotification );
                    bindings.manualMode = ko.observable( manualMode );
                    bindings.reNotifyMinAfter = ko.observable( reNotifySecondsAfter / 60 );
                    bindings.reNotifyMinBefore = ko.observable( reNotifySecondsBefore / 60 );

                    /** handle toJSON **/
                    bindings.toJSON = function() {
                        var
                            additionalNotification = peek( bindings.additionalNotification ),
                            reNotifyMinAfter = peek( bindings.reNotifyMinAfter ),
                            reNotifyMinBefore = peek( bindings.reNotifyMinBefore ),
                            manualMode = peek( bindings.manualMode ),
                            result = {alarmClock: {}};

                        if( _.isBoolean( additionalNotification ) ) {
                            result.alarmClock.additionalNotification = additionalNotification;
                        }

                        result.alarmClock.reNotifySecondsAfter = reNotifyMinAfter * 60;

                        result.alarmClock.reNotifySecondsBefore = reNotifyMinBefore * 60;

                        if( _.isBoolean( manualMode ) ) {
                            result.alarmClock.manualMode = manualMode;
                        }

                        return result;
                    };

                    bindings.manualModeI18n = i18n( 'PatientGadget.PatientGadgetAlarmClock.ConfigDialog.manualMode' );
                    bindings.hintI18n = i18n( 'PatientGadget.PatientGadgetAlarmClock.ConfigDialog.hint' );
                    bindings.additionalNotificationI18n = i18n( 'PatientGadget.PatientGadgetAlarmClock.ConfigDialog.additionalNotification' );
                    bindings.minutesBeforeI18n = i18n( 'PatientGadget.PatientGadgetAlarmClock.ConfigDialog.minutesBefore' );
                    bindings.minutesAfterI18n = i18n( 'PatientGadget.PatientGadgetAlarmClock.ConfigDialog.minutesAfter' );

                    return bindings;
                }
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetAlarmClock );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientGadget',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dccommonutils',
        'dccommunication-client',
        'calendar-schema'
    ]
} );
