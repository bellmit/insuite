/**
 * User: pi
 * Date: 25/03/15  16:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, async, _ */

YUI.add( 'DCMailActivitiesModal', function( Y, NAME ) {
        'use strict';

        var unwrap = Y.doccirrus.commonutils.unwrap,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            TITLE = i18n( 'InCaseMojit.mailActivities.TITLE' ),
            SUBJECT = i18n( 'InCaseMojit.mailActivities.SUBJECT' ),
            BODY = i18n( 'InCaseMojit.mailActivities.BODY' ),
            SEND = i18n( 'general.button.SEND' ),
            DEFAULT_LOCATION_TEMPLATE = i18n( 'InCaseMojit.mailActivities.DEFAULT_LOCATION_TEMPLATE' ),
            TARGETDEFAULT = i18n( 'InCaseMojit.mailActivities.TARGETDEFAULT' ),
            TARGETPATIENT = i18n( 'InCaseMojit.mailActivities.TARGETPATIENT' ),
            TARGETOTHER = i18n( 'InCaseMojit.mailActivities.TARGETOTHER' );

        /**
         *  Check if a contact exists in an array of contacts
         *  @param contact
         *  @param plainContacts
         *  @return {boolean}
         */

        function hasContact( contact, plainContacts ) {
            var i;
            for( i = 0; i < plainContacts.length; i++ ) {
                if( plainContacts[i]._id === contact._id ) {
                    return true;
                }
            }
            return false;
        }

        function EmailSendModel( activities, patient, currentUser, locations, employee, employeesFromActivities ) {
            var self = this,
                emailValidation = Y.doccirrus.validations.common.email[0],
                mandatoryValidation = Y.doccirrus.validations.common.mandatory[0],
                firstname = unwrap( patient.firstname ),
                lastname = unwrap( patient.lastname ),
                communications = unwrap( patient.communications );

            self.locationTemplateI18n = i18n( 'InCaseMojit.mailActivities.LOCATION_TEMPLATE' );
            self.targetI18n = i18n( 'InCaseMojit.mailActivities.TARGET' );
            self.emailI18n = i18n( 'InCaseMojit.mailActivities.EMAIL' );
            self.senderI18n = i18n( 'InCaseMojit.mailActivities.SENDER' );
            self.senderEmailI18n = i18n( 'InCaseMojit.mailActivities.SENDER_EMAIL' );
            self.toI18n = i18n( 'InCaseMojit.mailActivities.TO' );
            self.fromI18n = i18n( 'InCaseMojit.mailActivities.FROM' );
            self.replyToI18n = i18n( 'InCaseMojit.mailActivities.REPLY_TO' );
            self.emailTextI18n = i18n( 'InCaseMojit.mailActivities.E_MAIL' );
            self.attachmentsI18n = i18n( 'InCaseMojit.mailActivities.ATTACHMENTS' );
            self.subjectI18n = i18n( 'InCaseMojit.mailActivities.SUBJECT_SHORT' );
            self.titleMessageI18n = i18n( 'general.title.MESSAGE' );
            self.cleanContentI18n = i18n( 'InCaseMojit.mailActivities.CLEAN_TEXT' );

            function getValidationMessage( newValue ) {
                var msg = [];
                if( !newValue ) {
                    msg.push( Y.Lang.sub( mandatoryValidation.msg, {PATH: 'email'} ) );
                }
                if( !emailValidation.validator( newValue ) ) {
                    msg.push( emailValidation.msg );
                }
                return msg;
            }

            self.locationTemplates = locations.map( function( location ) {
                return {
                    val: location._id,
                    i18n: location.locname
                };
            } );

            self.locationTemplates.unshift( {
                i18n: DEFAULT_LOCATION_TEMPLATE
            } );

            self.contentWasCleanedByUser = ko.observable( false );
            self.patientContacts = ko.observableArray( [] );
            self.selectedContact = ko.observable( null );
            self.replyTo = ko.observable();
            self.otherReplyTo = ko.observable();
            self.otherReplyTo.hasError = ko.observable( true );
            self.otherReplyTo.validationMessages = ko.observableArray();
            self.otherReplyTo.subscribe( function( newValue ) {
                var
                    validationMessage = getValidationMessage( newValue );
                self.otherReplyTo.validationMessages( [] );
                if( validationMessage && validationMessage.length ) {
                    self.otherReplyTo.validationMessages( validationMessage );
                    self.otherReplyTo.hasError( true );
                } else {
                    self.otherReplyTo.hasError( false );
                }
            } );

            self.replyToOptions = ko.observableArray( [{val: "default", i18n: DEFAULT_LOCATION_TEMPLATE}] );

            if( employee ) {
                employee.communications.forEach( function( com ) {
                    if( ["EMAILPRIV", "EMAILJOB"].indexOf( com.type ) >= 0 ) {
                        self.replyToOptions.push( {
                            val: self.replyToOptions().length + 1,
                            i18n: com.value + " (" + employee.firstname + ' ' + employee.lastname + ' '
                                  + {EMAILPRIV: "privat", EMAILJOB: "beruflich"}[com.type] + ")",
                            mail: com.value
                        } );
                    }
                } );
            }

            employeesFromActivities.forEach( function( activityEmployee ) {
                if( activityEmployee._id !== employee._id ) {
                    activityEmployee.communications.forEach( function( com ) {
                        if( ["EMAILPRIV", "EMAILJOB"].indexOf( com.type ) >= 0 ) {
                            self.replyToOptions.push( {
                                val: self.replyToOptions().length + 1,
                                i18n: com.value + " (" + activityEmployee.firstname + ' ' + activityEmployee.lastname +
                                      ' ' + {EMAILPRIV: "privat", EMAILJOB: "beruflich"}[com.type] + ")",
                                mail: com.value
                            } );
                        }
                    } );
                }
            } );

            self.replyToOptions.push( {val: "other", i18n: TARGETOTHER} );

            self.isOtherReplyToSelected = ko.computed( function() {
                var
                    selectedReplyTo = unwrap( self.replyTo );
                return 'other' === selectedReplyTo;
            } );

            self.locationTemplate = ko.observable( activities && activities[0] && activities[0].locationId );

            self.locationName = ko.computed( function() {
                var locationTemplateId = self.locationTemplate(),
                    locationName = '';

                if( !locationTemplateId ) { // set DEFAULT_LOCATION_TEMPLATE
                    self.replyToOptions.replace( self.replyToOptions()[0], {
                        val: "default",
                        i18n: DEFAULT_LOCATION_TEMPLATE
                    } );
                }

                locations.some( function( location ) {
                    if( location._id === locationTemplateId ) {
                        locationName = location.locname;
                        self.replyToOptions.replace( self.replyToOptions()[0], {
                            val: self.replyToOptions().length + 1,
                            i18n: location.email + ' (' + location.locname + ')',
                            mail: location.email
                        } );
                        return true;
                    }
                } );

                return locationName;
            } );

            self.subject = ko.observable();

            self.emailAddress = ko.observable();
            self.emailAddress.hasError = ko.observable();
            self.emailAddress.validationMessages = ko.observableArray();
            self.emailAddress.readOnly = ko.observable( true );
            self.emailAddress.subscribe( function( newValue ) {
                var
                    validationMessage = getValidationMessage( newValue );
                self.emailAddress.validationMessages( [] );
                if( validationMessage && validationMessage.length ) {
                    self.emailAddress.validationMessages( validationMessage );
                    self.emailAddress.hasError( true );
                } else {
                    self.emailAddress.hasError( false );
                }
            } );

            self.content = ko.observable();
            self.content.readOnly = ko.observable( true );
            if( employee ) {
                self.senderName = ko.observable( employee.firstname + ' ' + employee.lastname );
            }
            self.senderEmail = ko.observable();
            self.senderEmailAddresses = [];

            if( employee && employee.communications ) {
                employee.communications.forEach( function( com ) {
                    if( ["EMAILPRIV", "EMAILJOB"].indexOf( com.type ) >= 0 ) {
                        self.senderEmailAddresses.push( {
                            val: self.senderEmailAddresses.length + 1,
                            i18n: com.value,
                            mail: com.value
                        } );
                    }
                } );
            }

            locations.forEach( function( location ) {
                if( location.email ) {
                    self.senderEmailAddresses.push( {
                        val: self.senderEmailAddresses.length + 1,
                        i18n: location.email + ' (' + location.locname + ')',
                        mail: location.email
                    } );
                }
            } );

            self.cleanEmailContent = function() {
                self.contentWasCleanedByUser( true );
                self.content('');
            };

            self.addLabelToContact = function( contact ) {
                var
                    physicianIds = unwrap( patient.physicians ) || [],
                    additionalContacts = unwrap( patient.additionalContacts ),
                    roles = [],
                    i;

                if( physicianIds && physicianIds[0] && physicianIds[0] === contact._id ) {
                    roles.push( i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.physician' ) );
                }

                if( unwrap( patient.familyDoctor ) === contact._id ) {
                    roles.push( i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.familyDoctor' ) );
                }

                if( unwrap( patient._id ) === contact._id ) {
                    roles.push( i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.patient' ) );
                }

                if( unwrap( patient.institution ) === contact._id ) {
                    roles.push( i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.institution' ) );
                }

                if( !contact.roleString ) {
                    roles.push( i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.unassigned' ) );
                }

                for( i = 0; i < additionalContacts.length; i++ ) {
                    if( additionalContacts[i] === contact._id ) {
                        roles.push( i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.additionalContacts' ) );
                    }
                }

                //  include occupation / workDescription if available
                if( contact.workDescription ) {
                    roles.unshift( contact.workDescription );
                }

                //  include epertiseText if available
                if( contact.expertiseText ) {
                    roles.unshift( contact.expertiseText );
                }

                contact.email = Y.doccirrus.schemas.simpleperson.getEmail( contact.communications );
                contact.roleString = roles.join( '/' );
                contact.label = contact.content + (contact.roleString ? ' (' + contact.roleString + ')' : '');

                return contact;
            };

            function addPatientAndOtherAsContact() {
                communications.forEach( function( com ) {
                    var
                        type = peek( com.type ),
                        value = peek( com.value );

                    if( ["EMAILPRIV", "EMAILJOB"].indexOf( type ) >= 0 ) {
                        self.patientContacts.push( {
                            email: {value: value, type: type},
                            label:  TARGETPATIENT + " (" + {
                                EMAILPRIV: "privat",
                                EMAILJOB: "beruflich"
                            }[type] + ")",
                            content: firstname + " " + lastname
                        } );
                    }
                });
                self.patientContacts.push( {email: "other", label: TARGETOTHER} );
            }

            self.updatePatientContacts = function(){
                var
                    plainContacts = [],
                    copyObj,
                    i;

                async.series(
                    [
                        getContactsFromPatient,
                        addLabelsToContacts
                    ],
                    onContactsLoaded
                );

                function getContactsFromPatient( itcb ) {

                    //  physician / zuweiser
                    if ( patient.physiciansObj ) {
                        copyObj = JSON.parse( JSON.stringify( patient.physiciansObj ) );
                        copyObj.roleString = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.physician' );
                        addContact( copyObj );
                    }

                    //  family doctor / hausarzt
                    if ( patient.familyDoctorObj ) {
                        copyObj = JSON.parse( JSON.stringify( patient.familyDoctorObj ) );
                        copyObj.roleString = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.familyDoctor' );
                        addContact( copyObj );
                    }

                    //  institution / einrichtung
                    if ( patient.institutionObj ) {
                        copyObj = JSON.parse( JSON.stringify( patient.institutionObj ) );
                        copyObj.roleString = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.institution' );
                        addContact( copyObj );
                    }

                    //  additional contacts
                    if ( patient.additionalContactsObj ) {
                        for ( i = 0; i < patient.additionalContactsObj.length; i++ ) {
                            copyObj = JSON.parse( JSON.stringify( patient.additionalContactsObj[i] ) );
                            copyObj.roleString = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.additionalContacts' );
                            addContact( copyObj );
                        }
                    }
                    itcb( null );
                }

                //  add a contact to plainContacts if not already present
                function addContact( newContact ) {
                    var i;
                    for ( i = 0; i < plainContacts.length; i++ ) {
                        if ( plainContacts[i]._id === newContact._id ) {
                            return;
                        }
                    }
                    plainContacts.push( newContact );
                }

                //  add label for select box
                function addLabelsToContacts( itcb ) {
                    for ( i = 0; i < plainContacts.length; i++ ) {
                        plainContacts[i] = self.addLabelToContact( plainContacts[i] );
                    }
                    itcb( null );
                }

                //  finished
                function onContactsLoaded( err ) {
                    if ( err ) {
                        Y.log( 'Problem loading contacts: ' + JSON.stringify( err ), 'warn', NAME );
                        //  continue, best effort
                    }
                    self.patientContacts( plainContacts );
                    addPatientAndOtherAsContact();
                }
            };
            self.updatePatientContacts();


            self.searchContacts = function() {
                var
                    plainContacts = self.patientContacts().filter( function( item ) {
                        // return actual contacts here
                        return Boolean( item._id );
                    } );

                Y.doccirrus.modals.selectContacts.show( {
                    isFromMailActivity: true,
                    selectedContacts: plainContacts.slice(),
                    currentPatient: patient,
                    onSelected: function( checkedContacts ) {
                        checkedContacts.forEach( function( contact ) {
                            if( !hasContact( contact, plainContacts ) ) {
                                plainContacts.push( self.addLabelToContact( contact ) );
                            }
                        } );

                        try {
                            self.patientContacts( [] );
                            self.patientContacts( plainContacts );
                            addPatientAndOtherAsContact();

                            if( checkedContacts && checkedContacts.length ) {
                                // set first selected contact (could be not first in the list but first actually checked)
                                // as selected value for patientContacts dropdown
                                self.selectedContact( self.addLabelToContact( checkedContacts[0] ) );
                            }
                        } catch( koErr ) {
                            Y.log( 'KO ERROR: ' + JSON.stringify( koErr ), 'error', NAME );
                        }
                    }
                } );

            };

            self.areFielsdvalid = function() {
                var valid = true;
                if( self.emailAddress.hasError() || (self.isOtherReplyToSelected() && self.otherReplyTo.hasError()) ) {
                    valid = false;
                }
                return valid;
            };

            self.getData = function() {
                var
                    replyTo;
                if( self.isOtherReplyToSelected() ) {
                    replyTo = self.otherReplyTo();
                }
                if( self.replyTo() && _.isNumber( self.replyTo() ) ) {
                    replyTo = self.replyToOptions().find( function( option ) {
                        return option.val === self.replyTo();
                    } ).mail;
                }

                return {
                    email: self.emailAddress(),
                    senderEmail: self.senderEmailAddresses.length && self.senderEmailAddresses[self.senderEmail() - 1].mail,
                    content: self.content(),
                    subject: self.subject(),
                    attachmentIds: self.attachments().map( function( obj ) {
                        return obj.mediaId;
                    } ),
                    replyTo: replyTo,
                    targetName: self.targetName,
                    senderName: unwrap( self.senderName )
                };
            };

            ko.computed( function() {
                var target = "",
                    selectedContact = self.selectedContact(),
                    locationName = self.locationName();

                if( selectedContact ) {
                    switch( selectedContact.email ) {
                        case "other":
                            self.content.readOnly( false );
                            break;
                        default:
                            target = selectedContact.content;
                            self.content.readOnly( false );
                    }
                }
                self.targetName = target || TARGETDEFAULT;
                if( !self.contentWasCleanedByUser() ) {
                    self.content( getContentReplaced( activities, currentUser, locationName, target ) );
                }
            } );

            ko.computed( function() {
                var
                    selectedContact = self.selectedContact();

                if( selectedContact ) {
                    switch( selectedContact.email ) {
                        case "other":
                            self.emailAddress.readOnly( false );
                            self.emailAddress( '' );
                            break;
                        default:
                            self.emailAddress( selectedContact.email && selectedContact.email.value );
                            self.emailAddress.readOnly( true );
                    }
                }
            } );

            self.attachments = ko.observableArray();

            // TODO: MOJ-1246 should be reviewed by strix
            activities.forEach( function( item ) {
                var attachedMediaIds = [];
                if( Array.isArray( item.attachedMedia ) ) {
                    attachedMediaIds = item.attachedMedia.map( function( media ) {
                        return media.mediaId;
                    } );
                }
                if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                    Y.doccirrus.communication.apiCall( {
                        method: 'media.list',
                        data: {
                            collection: 'activity',
                            id: item._id
                        }
                    }, function( err, response ) {
                        if( err ) {
                            return;
                        }
                        if( response && response.data && Array.isArray( response.data ) ) {
                            response.data.forEach( function( media ) {
                                if( -1 !== attachedMediaIds.indexOf( media._id ) ) {
                                    self.attachments.push( getAttachmentFromMediaObj( media ) );
                                }
                            } );
                        }
                    } );
                } else {
                    Y.doccirrus.media.listMR( '', 'activity', item._id, '', function( err, result ) {
                        if( err ) {
                            return;
                        }
                        result.forEach( function( media ) {
                            if( -1 !== attachedMediaIds.indexOf( media._id ) ) {
                                self.attachments.push( getAttachmentFromMediaObj( media ) );
                            }
                        } );
                    } );
                }
            } );

            self.removeAttachment = function( e ) {
                var self = this;
                self.attachments.remove( e );
            };

            function getAttachmentFromMediaObj( mediaObj ) {
                return {
                    mediaId: mediaObj._id,
                    caption: mediaObj.name,
                    contentType: mediaObj.mime,
                    thumbUrl: Y.doccirrus.media.getMediaThumbUrl( mediaObj, 68, false ),
                    fullUrl: Y.doccirrus.infras.getPrivateURL( Y.doccirrus.media.getMediaUrl( mediaObj, 'original' ) )
                };
            }

        }

        function getContentReplaced( activities, currentUser, locationName, target ) {
            var targetName = target || TARGETDEFAULT;

            var actTypei18n = "activity-schema.Activity_E.";

            var activityString = [];

            activities.forEach( function( activity ) {
                activityString.push(
                    i18n( actTypei18n + activity.actType ) + "\n" +
                    activity.content + "\n"
                );
            } );

            return BODY
                .replace( "[target]", targetName )
                .replace( "[activity list]", activityString.join( "------\n" ) )
                .replace( "[doctor title]", "" )
                .replace( "[doctor firstname]", currentUser.firstname )
                .replace( "[doctor lastname]", currentUser.lastname )
                .replace( "[locationname]", (locationName && ", " + locationName) || "" );
        }

        function getSubjectReplaced( patient ) {
            var
                title = unwrap( patient.title ),
                firstname = unwrap( patient.firstname ),
                lastname = unwrap( patient.lastname );

            return SUBJECT
                .replace( "[patient title]", (title && title + " ") || "" )
                .replace( "[patient firstname]", firstname )
                .replace( "[patient lastname]", lastname );
        }

        function MailActivitiesModel( activities, patient, currentUser, locations, employee, employeesFromActivities ) {
            var self = this;
            self.step2_messageI18n = i18n( 'InCaseMojit.mailActivities.STEP2_MESSAGE' );
            self.currentStep = ko.observable( 1 );

            self.isVisibleOn = function( step ) {
                return ko.computed( function() {
                    var currentStep = self.currentStep();
                    return step === 'step' + currentStep;
                } );
            };

            self.emailModel = new EmailSendModel( activities, patient, currentUser, locations, employee, employeesFromActivities );
            self.isEmailModelValid = function() {
                return self.emailModel.areFielsdvalid();
            };
            self.emailModel.subject( getSubjectReplaced( patient ) );
            if( !self.emailModel.contentWasCleanedByUser() ) {
                self.emailModel.content( getContentReplaced( activities, currentUser ) );
            }
        }

        function MailActivitiesModal() {}

        MailActivitiesModal.prototype.showDialog = function( activities, patient, currentUser, locations, currentEmployee, employeesFromActivities, callback ) {
            function load() {
                var modal,
                    node = Y.Node.create( '<div></div>' ),
                    mailActivitiesModel = new MailActivitiesModel( activities, patient, currentUser, locations, currentEmployee, employeesFromActivities );
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'mailactivities_modal',
                    'InCaseMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: TITLE,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        label: SEND,
                                        isDefault: true,
                                        action: function() {
                                            var emailModel = mailActivitiesModel.emailModel,
                                                locationTemplate = emailModel && emailModel.locationTemplate(),
                                                currentStep = mailActivitiesModel.currentStep(),
                                                modal = this,
                                                emailDetails;

                                            if( 2 === currentStep ) {
                                                if( mailActivitiesModel.isEmailModelValid() ) {
                                                    emailDetails = mailActivitiesModel.emailModel.getData();
                                                    emailDetails.currentLocationId = locationTemplate;
                                                    emailDetails.activities = activities.map( function( activity ) {
                                                        return activity._id;
                                                    } );
                                                    patient.save();
                                                    callback( emailDetails );
                                                    modal.close();
                                                }
                                            } else if( 1 >= currentStep ) {
                                                mailActivitiesModel.currentStep( currentStep + 1 );
                                            }
                                        }
                                    } )
                                ]
                            }
                        } );
                        ko.applyBindings( mailActivitiesModel, node.getDOMNode().querySelector( '#mailActivities' ) );
                        ko.computed( function() {
                            var
                                modelValid = mailActivitiesModel.isEmailModelValid(),
                                okBtn = modal.getButton( 'OK' ).button;
                            if( modelValid ) {
                                okBtn.enable();
                            } else {
                                okBtn.disable();
                            }
                        } );
                    }
                );
            }

            function show() {
                async.series( [
                    function( next ) {
                        var physicians = unwrap( patient.physicians );

                        if( physicians && physicians.length ) {
                            async.map( physicians, function( item, innerNext ) {
                                Y.doccirrus.jsonrpc.api.basecontact.read( {
                                    query: {
                                        _id: item
                                    }
                                } ).done( function( res ) {
                                    innerNext( null, res.data[0] );
                                } ).fail( innerNext );
                            }, function( err, results ) {
                                if( err ) {
                                    patient.physiciansData = [];
                                }
                                patient.physiciansData = results;
                                return next();
                            } );
                        } else {
                            patient.physiciansData = [];
                            return next();
                        }
                    },
                    function( next ) {
                        var familyDoctor = unwrap( patient.familyDoctor );

                        if( familyDoctor ) {
                            Y.doccirrus.jsonrpc.api.basecontact.read( {
                                query: {
                                    _id: familyDoctor
                                }
                            } ).done( function( familyDoctor ) {
                                patient.familyDoctorData = familyDoctor.data[0];
                                return next();
                            } ).fail( function() {
                                patient.familyDoctorData = null;
                                return next();
                            } );
                        } else {
                            patient.familyDoctorData = null;
                            return next();
                        }
                    },
                    function( next ) {
                        var institution = unwrap( patient.institution );

                        if( institution ) {
                            Y.doccirrus.jsonrpc.api.basecontact.read( {
                                query: {
                                    _id: institution
                                }
                            } ).done( function( institutionData ) {
                                patient.institutionData = institutionData.data[0];
                                return next();
                            } ).fail( function() {
                                patient.institutionData = null;
                                return next();
                            } );
                        } else {
                            patient.institutionData = null;
                            return next();
                        }
                    }
                ], function() {
                    return load();
                } );
            }

            show();
        };

        Y.namespace( 'doccirrus.modals' ).mailActivitiesModal = new MailActivitiesModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dcvalidations',
            'dccommonutils'
        ]
    }
);
