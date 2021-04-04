/*
 @author: pi
 @date: 2014/09/22
 */
/*jshint noempty:false */

/*global YUI, ko, $ */

'use strict';

YUI.add( 'dcstarttelekonsilmodal', function( Y ) {
        var i18n = Y.doccirrus.i18n,
            CHOOSE_PARTER = i18n( 'InCaseMojit.start-telekonsil-modalJS.CHOOSE_PARTER' ),
            CHOOSE_PARTICIPANTS = i18n( 'InCaseMojit.start-telekonsil-modalJS.CHOOSE_PARTICIPANTS' ),
            CANCEL = i18n( 'general.button.CANCEL' ),
            START = i18n( 'general.button.START' ),
            NEXT = i18n( 'general.button.NEXT' );

        function getTemplate( node, data, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'starttelekonsil_modal',
                'InCaseMojit',
                data,
                node,
                callback
            );
        }

        function ProcessViewModel() {
            var self = this;

            self.intervalI18n = i18n('IntouchPrivateMojit.intouch_presence_listJS.filter.INTERNAL');
            self.partnersI18n = i18n('IntouchPrivateMojit.intouch_presence_listJS.filter.PARTNERS');
            self.patientsI18n = i18n('IntouchPrivateMojit.intouch_presence_listJS.filter.PATIENTS');
            self.othersI18n = i18n('IntouchPrivateMojit.intouch_presence_listJS.filter.OTHERS');
            self.telekonsilInfoI18n = i18n( 'InCaseMojit.start-telekonsil-modalJS.TELEKONSIL_INFO' );

            self.currentStep = ko.observable( 1 );

            self.isVisibleOn = function( step ) {
                return ko.computed( function() {
                    var currentStep = self.currentStep();
                    return step === 'step' + currentStep;
                } );
            };

            self.partnerTable = Y.doccirrus.tables.createPartnerTable( {query: {status: {$eq: 'CONFIRMED'}}});

            self.getPartners = function() {
                return self.partnerTable.getComponentColumnCheckbox().checked();
            };

            self.getCheckedPartnerNumbers = function() {
                return self.getPartners().map( function( partner ) {
                    return partner.dcId;
                } );
            };
            self._query = { filters: {} };
            self.query = ko.observable();

            self.internalChecked = ko.observable();
            self.partnerChecked = ko.observable();
            self.patientChecked = ko.observable();
            self.otherChecked = ko.observable();
            ko.computed( function() {
                self._query.filters.internals = self.internalChecked();
                self._query.filters.partners = self.partnerChecked();
                self._query.filters.patients = self.patientChecked();
                self._query.filters.others = self.otherChecked();
                self.query( self._query );
            } );

            self.presenceListTable = Y.doccirrus.tables.createPresenceListTable( { fillRowsToLimit: false, query: self.query } );

            self.presenceListReady = function() {
                var checked = self.presenceListTable.getComponentColumnCheckbox().checked(),
                    webRTCIsNotSupported = checked.some( function( user ) {
                        return !user.supportsWebRTC;
                    } );
                return Boolean( checked.length ) && !webRTCIsNotSupported;
            };

            self.partnersReady = ko.computed( function() {
                var checked = self.partnerTable.getComponentColumnCheckbox().checked();
                self._query.filters.dcIds = null; // forget previous selection
                return Boolean( checked.length );
            } );

            self.currentStepIsReady = ko.computed( function() {
                if( 1 === self.currentStep() ) {
                    return self.partnersReady();
                } else if( 2 === self.currentStep() ) {
                    return self.presenceListReady();
                }
            } );

            self.getParticipants = function() {
                return self.presenceListTable.getComponentColumnCheckbox().checked();
            };

            self.getCheckedPartnerNames = function() {
                return self.getPartners().map( function( partner ) {
                    return partner.name;
                } );
            };

            self.setPresenceListFilter = function() {
                var
                    dcIds = self.getCheckedPartnerNumbers();
                if( !self._query.filters.dcIds ) { // if partner selection is new
                    self.partnerChecked( true );
                }
                self._query.filters.dcIds = dcIds;
            };

        }

        function showCallModal( params ) {
            var
                processVM = params.processVM,
                data = params.data,
                participants = processVM.getParticipants(),
                activityId,
                binder = params.binder;
            Y.doccirrus.modals.callerModal.showModal( participants, Y.mix( { teleConsult: true }, data ),
                function dataCb( err, data ) {
                    if(err){
                        console.warn( 'dataCb Error:', err ); //eslint-disable-line no-console
                    }
                    console.warn( 'dataCb:', arguments ); //eslint-disable-line no-console
                    activityId = data && data.activityId;
                },
                function callCb( err, picked ) {
                    if(err){
                        console.warn( 'callCb Error:', err ); //eslint-disable-line no-console
                    }
                    console.warn( 'callCb:', arguments ); //eslint-disable-line no-console
                    if( picked && activityId ) {
                        if( binder && binder.navigateToActivity ) {
                            binder.navigateToActivity( { activityId: activityId } );
                        }
                    }
                } );
        }

        function show( data ) {

            var node = Y.Node.create( '<div></div>' );

            getTemplate( node, data, function() {

                var
                    binder = data.binder,
                    notice,
                    processVM = new ProcessViewModel();
                delete data.binder;
                notice = Y.doccirrus.DCWindow.notice( {
                    title: CHOOSE_PARTER,
                    type: 'info',
                    window: {
                        width: 'xlarge',
                        maximizable: true,
                        buttons: {
                            header: [ 'close', 'maximize' ],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'BACK', {
                                    disabled: true,
                                    action: function() {
                                        var currentStep = processVM.currentStep();
                                        if( 1 < currentStep ) {
                                            processVM.currentStep( currentStep - 1 );
                                        }
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    label: CANCEL
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    label: NEXT,
                                    disabled: true,
                                    action: function() {
                                        var currentStep = processVM.currentStep();
                                        if( 2 === currentStep ) {
                                            showCallModal( {
                                                binder: binder,
                                                processVM: processVM,
                                                data: data
                                            } );
                                            this.close(); // the last step here
                                        } else if( 1 >= currentStep ) {
                                            processVM.currentStep( currentStep + 1 );
                                        }
                                    }
                                } ),
                                {
                                    label: START,
                                    name: 'START',
                                    classNames: 'btn btn-primary',
                                    isDefault: true,
                                    action: function() {
                                        showCallModal( {
                                            binder: binder,
                                            processVM: processVM,
                                            data: data
                                        } );
                                        this.close();
                                    }

                                }
                            ]
                        }

                    },
                    message: node
                } );

                ko.computed( function() {

                    var
                        currentStep = processVM.currentStep(),
                        ready = processVM.currentStepIsReady(),
                        startBtn = $( notice.getButton( 'START' ).getDOMNode() );

                    if( notice && ready ) {
                        startBtn.hide();
                        notice.getButton( 'OK' ).button.enable();
                    } else if( notice ) {
                        if( 1 === currentStep ) {
                            startBtn.show();
                        }
                        notice.getButton( 'OK' ).button.disable();
                    }

                    if( 1 >= currentStep ) {
                        notice.getButton( 'BACK' ).button.disable();
                        notice.getButton( 'OK' ).button.set( 'label', NEXT );
                        notice.set( 'title', CHOOSE_PARTER );
                    } else {
                        notice.getButton( 'BACK' ).button.enable();
                        notice.getButton( 'OK' ).button.set( 'label', START );
                        notice.set( 'title', CHOOSE_PARTICIPANTS );
                        processVM.setPresenceListFilter();
                    }

                } );

                ko.applyBindings( processVM, document.querySelector( '#start-teleconsult' ) );

            } );
        }

        Y.namespace( 'doccirrus.modals' ).startTelekonsil = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dcpartnertable',
            'dcpresencelisttable',
            'dccallermodal',
            'partner-schema'
        ]
    }
);
