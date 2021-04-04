/*
 *  Modal assign contacts to different roles in relation to a patient
 *
 *  @author: strix
 *  @date: 28/11/2018
 */

/*eslint strict:0 */
/*global YUI, ko */

'use strict';

YUI.add( 'DcAssignContactModal', function( Y, NAME ) {
        var
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            CANCEL = i18n( 'InCaseMojit.select_labdata_modalJS.button.CANCEL' ),
            SELECT = i18n( 'InCaseMojit.select_labdata_modalJS.button.SELECT' );

        /**
         *  ViewModel for the checkboxes defining the relationship between the patient and contact
         *
         *  @param config
         *  @constructor
         */

        function ContactsAssignmentViewModel( config ) {
            var
                self = this,
                selectedContact = config.selectedContact,
                currentPatient = config.currentPatient;

            function init() {
                var
                    additionalContacts = unwrap( currentPatient.additionalContacts ) || [],
                    physicians = unwrap( currentPatient.physicians ) || [],
                    i;

                self.ASSIGN_AS = i18n( 'InCaseMojit.assign_contact_modalJS.ASSIGN_AS' );
                self.PHYSICIAN = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.physician' );
                self.FAMILYDOCTOR = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.familyDoctor' );
                self.INSTITUTION = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.institution' );
                self.ADDITIONALCONTACTS = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.additionalContacts' );

                self.isPhysician = ko.observable( physicians[0] && physicians[0] === selectedContact._id );
                self.isFamilyDoctor = ko.observable( unwrap( currentPatient.familyDoctor ) === selectedContact._id );
                self.isInstitution = ko.observable( unwrap( currentPatient.institution ) === selectedContact._id );
                self.isAdditionalContact = ko.observable( false );

                for ( i = 0; i < additionalContacts.length; i++ ) {
                    if ( additionalContacts[i] === selectedContact._id ) {
                        self.isAdditionalContact( true );
                    }
                }

                self.isInstitutionType = ko.observable( false );

                if ( 'INSTITUTION' === selectedContact.baseContactType || self.isInstitution() ) {
                    self.isInstitutionType( true );
                }

                self.isPhysicianType = ko.observable( 'PHYSICIAN' === selectedContact.baseContactType );
            }


            self.getRoles = function() {
                return {
                    isPhysician: self.isPhysician(),
                    isFamilyDoctor: self.isFamilyDoctor(),
                    isInstitution: self.isInstitution(),
                    isAdditionalContact: self.isAdditionalContact()
                };
            };

            self.destroy = function() {
                Y.log( 'Destroy ContactsAssignmentViewModel', 'debug', NAME );
            };

            init();
        }

        /**
         *  Show a modal for assigning contacts to different relationships with the patient
         *
         *  @param  {Object}    options
         *  @param  {Object}    options.selectedContact     Single plain basecontact object
         *  @param  {Object}    currentPatient              Patient these contacts relate to
         *  @param  {Function}  onAssigned                  Called when user selects a contact
         */

        function showContactsModal( options ) {
            var
                JADE_TEMPLATE = 'InCaseMojit/views/assigncontact_modal',

                btnCancel = Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                    label: CANCEL
                } ),

                btnSelect = Y.doccirrus.DCWindow.getButton( 'OK', {
                    isDefault: true,
                    label: SELECT,
                    action: onSelectionComplete
                } ),

                modalOptions = {
                    className: 'DCWindow-AssignContact',
                    bodyContent: null,                                              //  added from template
                    title:  i18n( 'InCaseMojit.assign_contact_modalJS.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    height: Y.doccirrus.DCWindow.SIZE_SMALL,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: [ 'close', 'maximize' ],
                        footer: [ btnCancel, btnSelect ]
                    },
                    after: { visibleChange: onModalVisibilityChange }
                },

                modal,              //  eslint-disable-line no-unused-vars
                template,
                contactsAssignmentViewModel;

            Promise.resolve( Y.doccirrus.jsonrpc.api.jade.renderFile( { path: JADE_TEMPLATE } ) )
                .then( onTemplateLoaded )
                .catch( catchUnhandled );

            function onTemplateLoaded( response ) {
                template = ( response && response.data ) ? response.data : null;
                modalOptions.bodyContent = Y.Node.create( template );

                contactsAssignmentViewModel = new ContactsAssignmentViewModel( options );

                modal = new Y.doccirrus.DCWindow( modalOptions );

                ko.applyBindings( contactsAssignmentViewModel, modalOptions.bodyContent.getDOMNode() );

            }

            function onModalVisibilityChange( event ) {
                if( !event.newVal ) {
                    ko.cleanNode( modalOptions.bodyContent.getDOMNode() );
                    contactsAssignmentViewModel.destroy();
                }
            }

            /**
             *  User clicked the OK button, update patient
             */

            function onSelectionComplete() {
                if ( options.onAssigned && options.selectedContact ) {
                    options.onAssigned( options.selectedContact, contactsAssignmentViewModel.getRoles() );
                }
                modal.close();
            }

        }

        Y.namespace( 'doccirrus.modals' ).assignContact = {
            show: showContactsModal
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel',
            'KoUI-all',
            'inCaseUtils'
        ]
    }
);
