/**
 * User: pi
 * Date: 26/02/15  16:35
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global ko*/

import '../autoload/presence_list_table.client';
import '../autoload/caller-modal.client';
import '../../../autoload/dcauth-obfuscated.client';

export default function( Y ) {
    let
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n,
        VIDEO_CALL = i18n( 'IntouchPrivateMojit.intouch_presence_listJS.title.VIDEO_CALL' ),
        AUDIO_CALL = i18n( 'IntouchPrivateMojit.intouch_presence_listJS.title.AUDIO_CALL' );

    function PresenceListModel() {
        const self = this;

        self.titleI18n = i18n( 'IntouchPrivateMojit.intouch_presence_listJS.title.TITLE' );
        self.internalI18n = i18n('IntouchPrivateMojit.intouch_presence_listJS.filter.INTERNAL');
        self.partnersI18n = i18n('IntouchPrivateMojit.intouch_presence_listJS.filter.PARTNERS');
        self.patientsI18n = i18n('IntouchPrivateMojit.intouch_presence_listJS.filter.PATIENTS');
        self.othersI18n = i18n('IntouchPrivateMojit.intouch_presence_listJS.filter.OTHERS');

        self.query = ko.observable( {
            filters: {}
        } );
        self.internalChecked = ko.observable( true );
        self.partnerChecked = ko.observable();
        self.patientChecked = ko.observable();
        self.otherChecked = ko.observable();
        self.inTouchLicensed = Y.doccirrus.auth.hasAdditionalService( "inTouch" );
        ko.computed( function() {
            self.query( {
                filters: {
                    internals: self.internalChecked(),
                    partners: self.partnerChecked(),
                    patients: self.patientChecked(),
                    others: self.otherChecked()
                }
            } );
        } );
        self.presenceKoTable = Y.doccirrus.tables.createPresenceListTable( {
            stateId: 'IntouchPrivateMojit-IntouchNavigationBinderIndex-presenceKoTable',
            query: self.query
        } );

        self.presenceKoTable.getComponentColumnCheckbox().checked.subscribe( function( selectedUsers ) {
            var webRTCIsNotSupported = selectedUsers.some( function( user ) {
                return !user.supportsWebRTC;
            } );
            if( webRTCIsNotSupported ) {
                self.videoCall.disabled( true );
                self.audioCall.disabled( true );
            }
        } );

        self.videoCall = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'videoCall',
                text: VIDEO_CALL,
                click: function() {
                    var
                        users,
                        callerModal;

                    if( !Y.UA.secure && Y.UA.chrome ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: i18n( 'MediaMojit.message.videoChromeHttps' ),
                            window: { width: 'medium' }
                        } );
                    }
                    else {
                        users = self.presenceKoTable.getComponentColumnCheckbox().checked();
                        callerModal = Y.doccirrus.modals.callerModal;

                        callerModal.showModal( users, {} );
                    }
                }
            }
        } );

        self.audioCall = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'audioCall',
                text: AUDIO_CALL,
                option: 'PRIMARY',
                click: function() {
                    var
                        users = self.presenceKoTable.getComponentColumnCheckbox().checked(),
                        callerModal = Y.doccirrus.modals.callerModal;

                    callerModal.showModal( users, { audioOnly: true } );
                }
            }
        } );

    }

    return {
        registerNode: function( /*node, key, options*/ ) {
            Y.use( ['dcpresencelisttable', 'dccallermodal', 'dcauth'], () => {
                ko.applyBindings( new PresenceListModel(), document.querySelector( '#presenceList' ) );
            } );
        }
    };
}