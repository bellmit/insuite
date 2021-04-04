/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko, _, jQuery */
/*exported fun */

fun = function _fn( Y/*,NAME*/ ) {
    'use strict';

    return {

        registerNode: function() {
            var
                KoViewModel = Y.doccirrus.KoViewModel,
                i18n = Y.doccirrus.i18n,
                peek = ko.utils.peekObservable,
                InSightTimelineViewModel = KoViewModel.getConstructor( 'InSightTimelineViewModel' );

            function MyVM() {
                var
                    self = this;

                self.template = null;
                self.timeline = null;
                self.startDate = null;
                self.endDate = null;
                self.isSynchronizing = ko.observable( false );
                self.totalCount = ko.observable( 0 );
                self.partnersCount = ko.observable( null );
                self.processed = ko.observable( 0 );
                self.progressText = ko.computed( function() {
                    return ko.unwrap( self.processed ) + '/' + self.totalCount();
                } );
                self.progressWidth = ko.computed( function() {
                    return Math.round(ko.unwrap( self.processed ) / self.totalCount() * 100) + '%';
                } );

                self.regenerateTitleI18n = i18n('UserMgmtMojit.transfer_settings.title');
                self.regenerateTextWarnI18n = i18n( 'UserMgmtMojit.transfer_settings.warning' );
                self.activitiesToProcessI18n = i18n('UserMgmtMojit.transfer_settings.activitiesToProcess');
                self.useCache18 = i18n('UserMgmtMojit.transfer_settings.useCache');
                self.patientSearchI18n = i18n('UserMgmtMojit.transfer_settings.patientSearchTitle');
                self.tabPatientsShowI18n = i18n( 'UserMgmtMojit.transfer_settings.show' );

                self.selectedPartners = ko.observableArray( [] );
                self.patientLink = ko.observable( null );
                self.patient = ko.observable( null );

                self.patientAutocomplete = new PatientAutocomplete( function(e) {
                    self.patient( e.val );
                    self.patientLink( e.val ? '/incase#/patient/'+e.val : null );
                });

                self.partnerName = function( data ){
                    var comment = peek( data.comment );
                    return peek( data.name ) + ( comment ? ' ('+comment+') ' : ' ' );
                };

                self.partnerValue = function ( data ){
                    return -1 !== self.selectedPartners.indexOf( data && data._id );
                };
                self.partnerChecked = function ( id , checked ){
                    if(checked){
                        self.selectedPartners.push( id );
                    } else {
                        self.selectedPartners.remove( id );
                    }
                    return true;
                };

                self.initSelectorData = function initSelectorData() {
                    var
                        now = new Date();

                    this.startDate = ko.observable( now.toISOString() );
                    this.endDate = ko.observable( now.toISOString() );
                };
                self.useCache = ko.observable( false );

                self.initTimeLine = function initTimeLine() {
                    this.timeline = new InSightTimelineViewModel( this.getSelectorData() );
                };

                self.getSelectorData = function getSelectorData() {
                    return {
                        startDate: this.startDate,
                        endDate: this.endDate,
                        switchMode: ko.observable( 'day' ),
                        apiName: 'activityTransfer',
                        method: 'getActivityCounts',
                        useCache: this.useCache,
                        selectedPartners: self.selectedPartners,
                        totalCountBack: self.totalCount,
                        partnersBack: self.partnersCount,
                        patient: self.patient
                    };
                };

                self.startReSynchronize = function startReSynchronize() {
                    var
                        self = this;
                    self.isSynchronizing( true );
                    self.processed( 0 );
                    Y.doccirrus.jsonrpc.api.activityTransfer.reSynchronizeTransfer( {
                        dates: {
                            startDate: ko.unwrap( self.startDate ),
                            endDate: ko.unwrap( self.endDate )
                        },
                        patientId: ko.unwrap( self.patient ),
                        useCache: ko.unwrap( self.useCache ),
                        selectedPartners: ko.unwrap( self.selectedPartners ),
                        totalCount: ko.unwrap( self.totalCount )
                    } ).fail( function( error ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );
                };

                self.startDisabled = ko.computed( function() {
                    return self.isSynchronizing() || ( self.totalCount() === 0 );
                } );

                ko.computed( function(){
                    var partnersCount =  self.partnersCount();
                    if( Array.isArray(partnersCount) && partnersCount.length === 0 ){
                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            message: i18n( 'UserMgmtMojit.transfer_settings.noAutoPartners' ),
                            window: {
                                width: 'auto',
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'OK' )
                                    ]
                                }
                            }
                        } );
                    }
                });

                self.initSelectorData();
                self.initTimeLine();

                self.handleReSyncEvent = Y.doccirrus.communication.on( {
                    event: 'reSynchronizationReportDone',
                    handlerId: 'reSynchronizationReportDoneHandler',
                    done: function() {
                        self.useCache.valueHasMutated();
                        self.isSynchronizing( false );
                    }
                } );
                self.handleReSyncEvent = Y.doccirrus.communication.on( {
                    event: 'reSynchronizationReportProgress',
                    handlerId: 'reSynchronizationReportProgressHandler',
                    done: function( message ) {
                        if(message.data && message.data.length){
                            self.isSynchronizing( true );
                            self.processed( message.data[0].processed );
                        }
                    }
                } );

                self.showActivities = function( id ) {
                    Y.doccirrus.modals.activityModal.showDialog( {
                        dates: {
                            startDate: ko.unwrap( self.startDate ),
                            endDate: ko.unwrap( self.endDate )
                        },
                        patientId: ko.unwrap( self.patient ),
                        useCache: ko.unwrap( self.useCache ),
                        selectedPartners: id ? [ id ] : ko.unwrap( self.selectedPartners )
                    } );
                };
            }

            ko.applyBindings( new MyVM(), document.querySelector( '#transferSettings' ) );
        },

        deregisterNode: function() {
            Y.doccirrus.communication.off( 'reSynchronizationReportDone', 'reSynchronizationReportDoneHandler' );
            Y.doccirrus.communication.off( 'reSynchronizationReportProgress', 'reSynchronizationReportProgressHandler' );
        }
    };

    function buildSelect2ItemFromPatient( patient ) {
        return { id: patient._id, text: buildPatientLabelFromPatient( patient ) };
    }

    function buildPatientLabelFromPatient( patient ) {
        return Y.doccirrus.schemas.person.personDisplay( patient ) + ' [' + patient.kbvDob + ']';
    }


    function PatientAutocomplete( writeFn ) {
        var self = this,
            I18N_PLACEHOLDER_PLEASE_CHOOSE = Y.doccirrus.i18n( 'RepetitionKoViewModel_clientJS.placeholder.PLEASE_SELECT' );

        this.data = ko.computed( {
            read: function() {},
            write: writeFn
        } );
        this.select2 = {
            width: '100%',
            allowClear: true,
            placeholder: I18N_PLACEHOLDER_PLEASE_CHOOSE,
            minimumInputLength: 1,
            query: function( query ) {
                // abort pending requests
                if( self.pending ) {
                    self.pending.abort();
                }
                // build pending request
                var pending = self.pending = jQuery.ajax( {
                    type: 'GET',
                    xhrFields: { withCredentials: true },
                    url: Y.doccirrus.infras.getPrivateURL( '/r/calendar/?' ) + Y.QueryString.stringify( {
                        action: 'getPatients',
                        qe: Y.doccirrus.commonutils.$regexLikeUmlaut( query.term, { onlyRegExp: true } )
                    } )
                } );
                // handle select2 query.callback
                pending.done( function( data ) {
                    data = data || [];
                    query.callback( { results: data.map( buildSelect2ItemFromPatient ) } );
                } );
                // complete pending request
                pending.always( function() {
                    delete self.pending;
                } );
            }
        };
    }
};
