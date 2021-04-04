/**
 * User: pi
 * Date: 25/03/15  16:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'DCInviteParticipantModal', function( Y ) {

        var i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            ADD_USER = i18n( 'IntouchPrivateMojit.intouch_conference.title.ADD_USER' ),
            SUBJECT = i18n( 'IntouchPrivateMojit.inviteparticipant_modalJS.content.SUBJECT' ),
            BODY_GREETING = i18n( 'IntouchPrivateMojit.inviteparticipant_modalJS.content.BODY_GREETING' ),
            BODY_CONTENT_TOP = i18n( 'IntouchPrivateMojit.inviteparticipant_modalJS.content.BODY_CONTENT_TOP' ),
            BODY_CONTENT_BOTTOM = i18n( 'IntouchPrivateMojit.inviteparticipant_modalJS.content.BODY_CONTENT_BOTTOM' ),
            SEND = i18n( 'general.button.SEND' ),
            FIRSTNAME = i18n( 'general.title.FIRSTNAME' ),
            LASTNAME = i18n( 'general.title.LASTNAME' ),
            cuttedUrl = window.location.href && window.location.href.split('conference/') && window.location.href.split('conference/')[0],
            cleanUrl = Y.doccirrus.validations.common.url[0].validator( cuttedUrl ) && /\/intouch\/$/.test( cuttedUrl ) && cuttedUrl || '/intouch/',
            link = cleanUrl + 'conference';

        function TabNavModel( activeTabId ) {
            var self = this;

            self.activeTab = ko.observable( activeTabId );

            self.reset = function() {
                self.activeTab( activeTabId );
            };

            self.isActive = function( id ) {
                return ko.computed( function() {
                    var activeTab = self.activeTab();
                    return activeTab === id;
                } );
            };

            self.activate = function( id ) {
                if( id ) {
                    self.activeTab( id );
                }
            };

            self.clicked = function( data, event ) {
                var currentTabId = self.activeTab(),
                    id = event.currentTarget && event.currentTarget.id;
                if( id && id !== currentTabId ) {
                    self.activeTab( id );
                }
            };
        }

        function EmailInvintationModel() {
            var self = this,
                emailValidation = Y.doccirrus.validations.common.email[0],
                mandatoryValidation = Y.doccirrus.validations.common.mandatory[0];

            function validateEmail( newValue ) {
                var hasError = false,
                    msg = [];
                self.emailAddress.validationMessages( [] );
                if( !newValue ) {
                    msg.push( Y.Lang.sub( mandatoryValidation.msg, {PATH: 'email'} ) );
                    hasError = true;
                }
                if( !emailValidation.validator( newValue ) ) {
                    hasError = true;
                    msg.push( emailValidation.msg );
                }
                self.emailAddress.hasError( hasError );
                self.emailAddress.validationMessages( msg );
            }

            function validateMandatory( hasErrorToggle, newValue ) {
                if( !newValue ) {
                    hasErrorToggle( true );
                } else {
                    hasErrorToggle( false );
                }
            }

            self.link = link;
            self.firstName = ko.observable();
            self.firstName.hasError = ko.observable();
            self.firstName.validationMessages = ko.observableArray( [Y.Lang.sub( mandatoryValidation.msg, {PATH: FIRSTNAME} )] );
            self.firstName.subscribe( function( newValue ) {
                validateMandatory( self.firstName.hasError, newValue );
            } );

            self.lastName = ko.observable();
            self.lastName.hasError = ko.observable();
            self.lastName.validationMessages = ko.observableArray( [Y.Lang.sub( mandatoryValidation.msg, {PATH: LASTNAME} )] );
            self.lastName.subscribe( function( newValue ) {
                validateMandatory( self.lastName.hasError, newValue );
            } );

            self.subject = ko.observable();

            self.emailAddress = ko.observable();
            self.emailAddress.hasError = ko.observable();
            self.emailAddress.validationMessages = ko.observableArray();
            self.emailAddress.subscribe( function( newValue ) {
                validateEmail( newValue );
            } );

            self.content_top = ko.observable();
            self.content_bottom = ko.observable();

            self.areFielsdvalid = function() {
                var valid = true;
                validateEmail( self.emailAddress() );
                validateMandatory( self.firstName.hasError, self.firstName() );
                validateMandatory( self.lastName.hasError, self.lastName() );
                if( self.emailAddress.hasError() || self.firstName.hasError() || self.lastName.hasError() ) {
                    valid = false;
                }
                return valid;
            };

            self.getData = function(){
                return {
                    email: self.emailAddress(),
                    lastName: self.lastName(),
                    firstName: self.firstName(),
                    content: self.content_top() + '\n\n' + link + '\n\n' + self.content_bottom(),
                    subject: self.subject()
                };
            };
            self.areFielsdvalid();

        }

        function getGreeting(greetingName) {
            return BODY_GREETING + ' ' + greetingName + ',';
        }

        function getContentTop(greetingName) {
            return getGreeting( greetingName ) + '\n\n' + BODY_CONTENT_TOP;
        }

        function InviteParticipantModel() {
            var self = this;
            self.tabNav = new TabNavModel( 'emailInvitationTab' );
            self.emailModel = new EmailInvintationModel();
            self.isEmailModelValid = function() {
                return self.emailModel.areFielsdvalid();
            };
            self.emailModel.subject( SUBJECT );
            self.emailModel.content_top( getContentTop( '' ) );
            self.emailModel.content_bottom( BODY_CONTENT_BOTTOM );

            ko.computed(function () {
                var
                    firstName = unwrap( self.emailModel.firstName ),
                    firstNameValid = !unwrap( self.emailModel.firstName.hasError ),
                    lastName = unwrap( self.emailModel.lastName ),
                    lastNameValid = !unwrap( self.emailModel.lastName.hasError ),
                    emailAddress = unwrap( self.emailModel.emailAddress ),
                    emailAddressValid = !unwrap( self.emailModel.emailAddress.hasError ),
                    greetingName = [],
                    currentContentTop = peek( self.emailModel.content_top ),
                    regexMatch = new RegExp('^' + BODY_GREETING +'.+$', 'm');

                if (
                    firstName &&
                    firstNameValid
                ) {
                    greetingName.push( firstName );

                    if (
                        lastName &&
                        lastNameValid
                    ) {
                        greetingName.push( ' ' + lastName );
                    }
                } else if (
                    emailAddress &&
                    emailAddressValid
                ) {
                    greetingName.push( emailAddress );
                }

                if ( typeof currentContentTop === 'string' ) {
                    currentContentTop = currentContentTop.replace( regexMatch, getGreeting( greetingName.join('') ) );
                }

                self.emailModel.content_top( currentContentTop );

            });
        }

        function InviteParticipantModal() {

        }

        InviteParticipantModal.prototype.showDialog = function( callback ) {
            function show() {
                var modal,
                    node = Y.Node.create( '<div></div>' ),
                    inviteParticipantModel = new InviteParticipantModel();

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'inviteparticipant_modal',
                    'IntouchPrivateMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: ADD_USER,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: '90%',
                            height: '90%',
                            maximizable: true,
                            modal: true,
                            centered: true,
                            resizeable: true,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        label: SEND,
                                        isDefault: true,
                                        action: function() {
                                            var modal = this,
                                                emailDetails;
                                            if( inviteParticipantModel.isEmailModelValid() ) {
                                                emailDetails = inviteParticipantModel.emailModel.getData();
                                                emailDetails.link = link;
                                                callback( emailDetails);
                                                modal.close();
                                            }
                                        }

                                    } )
                                ]
                            }
                        } );
                        inviteParticipantModel.menuEmailI18n = i18n('IntouchPrivateMojit.inviteparticipant_modal.menu.EMAIL');
                        inviteParticipantModel.titleEmailI18n = i18n('general.title.EMAIL');
                        inviteParticipantModel.placeholderSubjectI18n = i18n('IntouchPrivateMojit.inviteparticipant_modal.placeholder.SUBJECT');
                        inviteParticipantModel.titleFirstnameI18n = i18n('general.title.FIRSTNAME');
                        inviteParticipantModel.titleLastnameI18n = i18n('general.title.LASTNAME');
                        inviteParticipantModel.titleMessageI18n = i18n( 'general.title.MESSAGE' );

                        if (window.innerHeight < 700) {
                            modal.resizeMaximized.set('maximized', true);
                        }

                        ko.applyBindings( inviteParticipantModel, node.getDOMNode().querySelector( '#inviteParticipant' ) );
                        ko.computed( function() {
                            var
                                modelValid = inviteParticipantModel.isEmailModelValid(),
                                okBtn = modal.getButton( 'OK' ).button;
                            if( modelValid ) {
                                okBtn.enable();
                            } else {
                                okBtn.disable();
                            }
                        } ) ;
                    }
                );
            }

            show();
        };

        Y.namespace( 'doccirrus.modals' ).inviteParticipantModal = new InviteParticipantModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dcvalidations',
            'location-schema'
        ]
    }
);