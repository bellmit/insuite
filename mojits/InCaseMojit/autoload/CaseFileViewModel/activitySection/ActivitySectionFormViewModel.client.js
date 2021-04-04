/**
 *  Render the current form into a div on the page
 *  This component previously managed the form life cycle, moved to activityDetailsViewModel for MOJ-8040
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI, ko, async, $, moment, jQuery */

YUI.add( 'ActivitySectionFormViewModel', function( Y, NAME ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        ActivitySectionViewModel = KoViewModel.getConstructor( 'ActivitySectionViewModel' ),
        WYSWYGViewModel = KoViewModel.getConstructor( 'WYSWYGViewModel' ),
    //  catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        ptv11FormRole = 'etermineservice-ptv11';

    /**
     *  @constructor
     *  @class ActivitySectionFormViewModel
     *  @extends ActivitySectionViewModel
     */
    function ActivitySectionFormViewModel() {
        ActivitySectionFormViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivitySectionFormViewModel, ActivitySectionViewModel, {

        templateName: 'ActivitySectionFormViewModel',

        //  objects necessary to display form

        template: null,
        mapper: null,
        formDoc: null,

        //  form details

        divId: 'divFormsCompose',
        patientRegId: null,
        isLetter: null,
        showWYSWYGButtons: null,

        //  state
        isReady: false,         //  true if template is ready

        formLoadListener: null,
        activityTransitionedListener: null,
        fullScreenListener: null,

        //  shortcuts
        currentActivity: null,
        currentPatient: null,

        /** @protected */
        initializer: function() {
            var self = this,
                binder = self.get( 'binder' );

            //  only used if passing through blind proxy
            self.patientRegId = '';

            self.showETSPanel = ko.observable( false );
            self.currentActivity = ko.computed( function() {
                return unwrap( binder.currentActivity );
            } );

            //  prevent premature mapping of contacts
            self.isFormRenderComplete = false;

            self.patientContactsInitialized = false;

            self.initializeMarkdownEditor();

            //  used for addressing letters to contacts
            self.initializePatientContacts();
        },

        initializeMarkdownEditor: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                activitysettings = binder.getInitialData( 'activitySettings' ) || [],
                currentActivity = unwrap( binder.currentActivity ),
                actType = unwrap( currentActivity.actType ),
                i;

            self.showWYSWYGButtons = ko.observable( false );

            for ( i = 0; i < activitysettings.length; i++ ) {
                if ( activitysettings[i].actType === actType && activitysettings[i].useWYSWYG ) {
                    self.showWYSWYGButtons( true );
                }
            }

            //  form text controls
            self.wyswyg = new WYSWYGViewModel({ isPinned: true });
            self.listenActivityStatusForm = ko.computed( function() {
                self.wyswyg.isEditable( currentActivity._isEditable() );
            } );
        },

        initializePatientContacts: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity );

            //  if form is a letter we need to show UI for selecting a contact
            self.isLetter = ko.observable( false );
            self.isLetterDisable = ko.computed( function() {
                return !self.isLetter() || !currentActivity._isEditable();
            } );

            self.patientContacts = ko.observableArray( [] );
            self.selectedContact = ko.observable( null );

            //  re-map when the selection changes
            self.selectedContactListener = self.selectedContact.subscribe( function( newContact ) {
                if ( !self.isFormRenderComplete || !self.patientContactsInitialized ) {
                    //  do not try to set contacts until form is ready and contacts are set up
                    return;
                }
                self.setSelectedContact( newContact, Y.dcforms.nullCallback );
            } );
        },

        /**
         *  Add contacts from patient and possibly Uberweisungsschein or the activity itself
         */

        updatePatientContacts: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( binder.currentPatient ),
                currentActivity = unwrap( binder.currentActivity ),
                activityDetailsVM = self.getActivityDetailsViewModel(),
                mapperContext = activityDetailsVM && activityDetailsVM.mapperContext,
                plainContacts = [],
                patientContact,
                setContact = null,
                copyObj,
                i;

            async.series(
                [
                    getContactsFromPatient,
                    getContactFromSchein,
                    getContactFromActivity,
                    addLabelsToContacts
                ],
                onContactsLoaded
            );

            function getContactsFromPatient( itcb ) {

                //  check for a referrer / Überweiser from schein
                if ( mapperContext && mapperContext.referringDoctor ) {
                    copyObj = JSON.parse( JSON.stringify( mapperContext.referringDoctor ) );
                    copyObj.roleString = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.referringDoctor' );
                    addContact( copyObj );
                }

                //  physician / zuweiser
                if ( currentPatient.physiciansObj ) {
                    copyObj = JSON.parse( JSON.stringify( currentPatient.physiciansObj ) );
                    copyObj.roleString = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.physician' );
                    addContact( copyObj );
                }

                //  family doctor / hausarzt
                if ( currentPatient.familyDoctorObj ) {
                    copyObj = JSON.parse( JSON.stringify( currentPatient.familyDoctorObj ) );
                    copyObj.roleString = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.familyDoctor' );
                    addContact( copyObj );
                }

                //  institution / einrichtung
                if ( currentPatient.institutionObj ) {
                    copyObj = JSON.parse( JSON.stringify( currentPatient.institutionObj ) );
                    copyObj.roleString = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.institution' );
                    addContact( copyObj );
                }

                //  additional contacts
                if ( currentPatient.additionalContactsObj ) {
                    for ( i = 0; i < currentPatient.additionalContactsObj.length; i++ ) {
                        copyObj = JSON.parse( JSON.stringify( currentPatient.additionalContactsObj[i] ) );
                        copyObj.roleString = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.additionalContacts' );
                        addContact( copyObj );
                    }
                }

                //  add the patient themselves so that they can be included in serial letters, not really a contact
                patientContact =  {
                    _id: unwrap( currentPatient._id ),
                    content: currentPatient._getNameSimple(),
                    baseContactType: 'PATIENT',
                    officialNo: '',
                    bsnrs: [],
                    lastname: currentPatient.lastname(),
                    firstname: currentPatient.firstname(),
                    title: currentPatient.title(),
                    talk: currentPatient.talk(),
                    communications: currentPatient.communications(),
                    addresses: currentPatient.addresses(),
                    contacts: [],
                    institutionType: 'OTHER',
                    nameaffix: currentPatient.nameaffix(),
                    roleString: i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.patient' )
                };

                addContact( patientContact );

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

            //  if there is an Ueberweisungsschein, try to get the referring doctor as a contact
            function getContactFromSchein( itcb ) {
                var lastSchein = currentActivity && currentActivity.get( 'lastSchein' );
                if ( !lastSchein || !lastSchein.scheinRemittor ) { return itcb( null ); }

                //  try to look up referrer by LANR
                Y.doccirrus.jsonrpc.api.basecontact.read( {
                    query: {
                        officialNo: lastSchein.scheinRemittor
                    }
                } ).done( onLoadReferrer ).fail( onLoadFailed );

                function onLoadReferrer( plainContacts ) {
                    if ( plainContacts[0] ) {
                        addContact( plainContacts[0] );
                    }
                    itcb( null );
                }

                function onLoadFailed( err ) {
                    Y.log( 'Problem while looking up referringDoctor from schein: ' + JSON.stringify( err ), 'error', NAME );
                    return itcb( null );
                }
            }

            //  check if some other contact is specified by the activity, we may need to include extra contact data
            function getContactFromActivity( itcb ) {
                if ( !currentActivity.selectedContact || !currentActivity.selectedContact() ) {
                    //  no selected contact, skip this
                    return itcb( null );
                }

                var
                    selectedContactObj = currentActivity.get( 'selectedContactObj' ),
                    i;

                if ( currentActivity.selectedContact() === unwrap( currentPatient._id ) ) {
                    selectedContactObj = patientContact;
                }

                for ( i = 0; i < plainContacts.length; i++ ) {
                    if ( plainContacts[i]._id === selectedContactObj._id ) {
                        setContact = plainContacts[i];
                    }
                }

                //  if we already have the selected contact loaded then we don't need to add another copy to plainContacts
                if ( setContact ) {
                    return itcb( null );
                }

                if ( selectedContactObj ) {
                    plainContacts.push( selectedContactObj );
                    setContact = selectedContactObj;
                }

                itcb( null );
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

                //  initialize with first contact in the list if no value set
                if ( !setContact && plainContacts.length > 0 ) {
                    setContact = plainContacts[ 0 ];
                    self.setSelectedContact( plainContacts[0], Y.dcforms.nullCallback );
                    self.patientContactsInitialized = true;
                    return;
                }

                if ( setContact ) {
                    self.selectedContact( setContact );
                }

                self.patientContactsInitialized = true;

            }

        },

        /**
         *  Utility to make label for rows in the select box
         *  @param contact
         *  @return {*}
         */

        addLabelToContact: function( contact ) {

            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( binder.currentPatient ),
                activityDetailsVM = self.getActivityDetailsViewModel(),
                mapperContext = activityDetailsVM && activityDetailsVM.mapperContext,

                physicianIds = unwrap( currentPatient.physicians ) || [],
                additionalContacts = unwrap( currentPatient.additionalContacts ),
                roles = [],
                i;

            //  may need to update roleString if contacts set from modal
            if ( mapperContext && mapperContext.referringDoctor && mapperContext.referringDoctor._id === contact._id ) {
                roles.push( i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.referringDoctor' ) );
            }

            if ( physicianIds && physicianIds[0] && physicianIds[0] === contact._id ) {
                roles.push( i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.physician' ) );
            }

            if ( unwrap( currentPatient.familyDoctor ) === contact._id ) {
                roles.push( i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.familyDoctor' ) );
            }

            if ( unwrap( currentPatient._id ) === contact._id ) {
                roles.push( i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.patient' ) );
            }

            if ( unwrap( currentPatient.institution ) === contact._id ) {
                roles.push( i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.institution' ) );
            }

            for ( i = 0; i < additionalContacts.length; i++ ) {
                if ( additionalContacts[i] === contact._id ) {
                    roles.push( i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.additionalContacts' ) );
                }
            }

            if ( roles.length === 0 ) {
                roles.push( i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.unassigned' ) );
            }

            //  include occupation / workDescription if available
            if (contact.workDescription) {
                roles.unshift( contact.workDescription );
            }

            //  include expertiseText if available
            if (contact.expertiseText) {
                roles.unshift( contact.expertiseText );
            }

            contact.roleString = roles.join('/');
            contact.label = contact.content + ( contact.roleString ? ' (' + contact.roleString + ')' : '' );

            return contact;
        },

        /**
         *  Click handler for 'search contacts' button
         */

        searchContacts: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                activityDetailsVM = self.getActivityDetailsViewModel(),
                template = activityDetailsVM ? activityDetailsVM.template : null,
                currentPatient = unwrap( binder.currentPatient ),
                currentActivity = unwrap( binder.currentActivity ),
                plainContacts = self.patientContacts();

            //  close any open valueeditor in form LAM-2226
            if ( template && template.valueEditor ) {
                template.setSelected( 'fixed', null );
            }

            Y.doccirrus.modals.selectContacts.show( {
                selectedContacts: plainContacts.slice(),
                currentPatient: currentPatient,
                currentActivity: currentActivity,

                onSelected: function( chosenContacts, selectedContact ) {
                    self.onContactsSelected( chosenContacts, selectedContact );
                },
                onRequestSerialLetter: function( chosenContacts, selectedContact ) {
                    self.onRequestSerialLetter( chosenContacts, selectedContact );
                }
            } );

        },

        onContactsSelected: function( chosenContacts, selectedContact ) {
            var
                self = this,
                plainContacts = self.patientContacts(),
                i;

            //  Add any new contacts to select box
            for ( i = 0; i < chosenContacts.length; i++ ) {
                if ( !self.hasContact( chosenContacts[i], plainContacts ) ) {
                    plainContacts.push( chosenContacts[i] );
                }
            }

            //  role may have been changed in modal, update the labels
            for ( i = 0; i < plainContacts.length; i++ ) {
                plainContacts[i] = self.addLabelToContact( plainContacts[i] );
            }

            try {
                self.patientContacts( [] );
                self.patientContacts( plainContacts );
            } catch ( koErr ) {
                Y.log( 'KO ERROR: ' + JSON.stringify( koErr ), 'error', NAME );
            }

            //  Set selected contact if available, and remap the form
            if ( selectedContact ) {
                self.selectedContact( selectedContact );
            }
        },

        /**
         *  Check if a contact exists in an array of contacts
         *  @param contact
         *  @param plainContacts
         *  @return {boolean}
         */

        hasContact: function( contact, plainContacts ) {
            var i;
            for ( i = 0; i < plainContacts.length; i++ ) {
                if ( plainContacts[i]._id === contact._id ) { return true; }
            }
            return false;
        },

        /**
         *  Raised when user selects a set of contacts in the modal and requests a serial letter
         *
         *  Overall process:
         *
         *      1.  Open a modal to show progress
         *      2.  Make a separate PDF for each contact
         *      3.  Show the selected contact in the form after all PDFs are complete
         *      4.  Join all PDFs into a single file for print / download
         *      5.  Save the activity to store new DOCLETTER attachments
         *
         *  @param  {Object}    chosenContacts      Array of plain contact objects
         *  @param  {Object}    selectedContact     The contact which was checked in the modal, if any
         */

        onRequestSerialLetter: function( chosenContacts , selectedContact ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                activityDetailsVM = self.getActivityDetailsViewModel(),

                docletterModalVM;

            if ( !currentActivity._isEditable() || 0 === chosenContacts.length ) { return; }

            async.series( [ createModal, makeDocLetterPDFs, setSelected, joinAllPdfs, saveActivity ], onAllDone );

            //  1.  Open a modal to show progress
            function createModal( itcb ) {
                Y.doccirrus.modals.serialDocletter.show( { onBind: onModalBound } );
                function onModalBound( vm ) {
                    docletterModalVM = vm;
                    docletterModalVM.activityId( unwrap( currentActivity._id ) );
                    docletterModalVM.formId( unwrap( currentActivity.formId ) );
                    docletterModalVM.selectedContacts( chosenContacts );
                    itcb( null );
                }
            }

            //  2.  Make a separate PDF for each contact
            function makeDocLetterPDFs( itcb ) {
                async.eachSeries( chosenContacts, makeSinglePdf, onPdfsComplete );
                function onPdfsComplete( err ) {

                    if ( err ) {
                        Y.log( 'Error while making serial letter: ' + JSON.stringify( err ), 'error', NAME );
                        return itcb( err );
                    }

                    docletterModalVM.currentContact( null );
                    Y.log( 'Created ' + chosenContacts.length + ' serial docletters.', 'info', NAME );
                    itcb( null );
                }
            }

            //  2.1 Make a PDF for a single contact
            function makeSinglePdf( contact, itcb ) {
                docletterModalVM.currentContact( contact );
                self.makeSingleContactPDF( contact, chosenContacts, onPdfCreated );
                function onPdfCreated( err, mediaId ) {
                    if ( err ) { return itcb( err ); }

                    docletterModalVM.mediaIds.push( mediaId );
                    itcb( null );
                }
            }

            //  3.  Show the selected contact in the form after all PDFs are complete
            function setSelected( itcb ) {
                if ( !selectedContact && unwrap( self.selectedContact ) ) {
                    //  if no contact selected in modal try to get previous selected contact from activity
                    selectedContact = unwrap( self.selectedContact );
                }
                if ( !selectedContact ) {
                    //  still no selected contact, use the first of the chosen contacts
                    selectedContact = chosenContacts[0];
                }

                self.onContactsSelected( chosenContacts, selectedContact, itcb );
            }

            //  4.  Join all PDFs into a single file for print / download
            function joinAllPdfs( itcb ) {
                var
                    concatOptions = {
                        mediaIds: docletterModalVM.mediaIds(),
                        waitCallback: true
                    };

                Y.doccirrus.jsonrpc.api.media.concatenatepdfs( concatOptions )
                    .then( onPdfsJoined )
                    .fail( onPdfJoinError );

                function onPdfsJoined( result ) {
                    var
                        fileName = result && result.data && result.data.fileName;

                    docletterModalVM.fileName( fileName );
                    itcb( null );
                }

                function onPdfJoinError( err ) {
                    Y.log( 'Problem concatenating PDFs: ' + JSON.stringify( err ), 'error', NAME );
                    return itcb( err );
                }
            }

            //  5.  Save the activity to store new DOCLETTER attachments
            function saveActivity( itcb ) {
                var
                    validTransition = Y.doccirrus.inCaseUtils.checkTransition( {
                        currentActivity: currentActivity,
                        transition: 'validate'
                    } );

                if ( !validTransition ) {
                    Y.log( 'Could not save activity, no valid transition.', 'error', NAME );
                    return;
                }

                activityDetailsVM.saveAttachmentsAndTransition( { transitionDescription: validTransition } ).then( onSaveComplete ).catch( onSaveFailed );

                function onSaveComplete( /* result */ ) {
                    Y.log( 'Completed save of serial docletter.', 'info', NAME );

                    //  this may be the first save, need to let modal know about new activity _id for ZIP button
                    docletterModalVM.activityId( unwrap( currentActivity._id ) );

                    itcb( null );
                }

                function onSaveFailed( err ) {
                    Y.log( 'Could not save activity while creating serial letter: ' + JSON.stringify( err ), 'error', NAME );
                    itcb( err );
                }
            }

            //  X
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Problem while generating serial docletter: ' + JSON.stringify( err ), 'error', NAME );
                    return;
                }

                Y.log( 'Completed serial docletter for ' + chosenContacts.length + ' contacts.', 'info', NAME );
            }

        },

        /**
         *  Make a single PDF for the given contact and add it to the activity attachments
         *
         *  Overall process:
         *
         *      1.  Map contact into the form
         *      2.  Set 'also sent to' mapping for serienbrief
         *      3.  Serialize the form for PDF generation
         *      4.  Make a new PDF with the current contact and load the media object
         *      5.  Add attached DOCLETTER document from the media object
         *
         *  @param  {Object}    contact             Contact for the current PDF
         *  @param  {Object}    selectedContacts    Additional contacts for the 'also sent to' table
         *  @param  {Function}  callback            Of the form fn( err, newMediaId )
         */

        makeSingleContactPDF: function( contact, selectedContacts, callback ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentPatient = unwrap( binder.currentPatient ),
                activityDetailsVM = self.getActivityDetailsViewModel(),
                attachmentsVM = activityDetailsVM.attachmentsModel,
                formForHPDF, newMediaId, newMediaObj, newMediaDoc,

                basecontactTypes = Y.doccirrus.schemas.basecontact.types.BaseContactType_E.list,
                institutionTypes = Y.doccirrus.schemas.basecontact.types.InstitutionContactType_E.list,
                expertiseTypes = Y.doccirrus.schemas.basecontact.types.Expert_E.list;

            async.series( [ setContact, setContactTable, formToHPDF, generateAndUpdatePDF, addAttachedDocument ], onPdfCreated );


            //  1.  Map contact into the form
            function setContact( itcb ) {
                self.setSelectedContact( contact, itcb );
            }

            //  2.  Set 'also sent to' mapping for serienbrief
            function setContactTable( itcb ) {
                var
                    COPY_FIELDS = [
                        'content',
                        'roleString',
                        'title',
                        'talk',
                        'firstname',
                        'lastname',
                        'nameaffix',
                        'basecontactType',
                        'institutionType',
                        'institutionName',
                        'expertise',
                        'expertiseText',
                        'workDescription',
                        'officialNo',
                        'nonStandardOfficialNo',
                        'glnNumber',
                        'zsrNumber',
                        'kNumber'
                    ],
                    contactsTable = [],
                    current, i, j,
                    tableRow;

                //
                for ( i = 0; i < selectedContacts.length; i++ ) {

                    current = selectedContacts[i];

                    //  formatted values
                    tableRow = {
                        card: contactToCard( current ),
                        cardLine: contactToCardLine( current ),
                        address: ''
                    };

                    //  copy all properties same as basic contacts table
                    for ( j = 0; j < COPY_FIELDS.length; j++ ) {
                        if ( current[ COPY_FIELDS[j] ] ) {
                            tableRow[ COPY_FIELDS[j] ] = current[ COPY_FIELDS[j] ];
                        } else {
                            tableRow[ COPY_FIELDS[j] ] = '';
                        }
                    }

                    //  translate some enums
                    if ( tableRow.basecontactType ) {
                        tableRow.basecontactType = Y.doccirrus.schemaloader.translateEnumValue( '-de', tableRow.basecontactType, basecontactTypes, tableRow.basecontactType);
                    }

                    if ( tableRow.institutionType ) {
                        tableRow.institutionType = Y.doccirrus.schemaloader.translateEnumValue( '-de', tableRow.institutionType, institutionTypes, tableRow.institutionType);
                    }

                    if ( tableRow.expertise ) {
                        tableRow.expertise = Y.doccirrus.schemaloader.translateEnumValue( '-de', tableRow.expertise, expertiseTypes, tableRow.expertise);
                    }

                    //  format the address
                    if ( Array.isArray( current.addresses ) && current.addresses[0] ) {
                        tableRow.address = Y.dcforms.mapper.genericformmappers.getAddressAsString( current.addresses[0] );
                    }

                    //  mapping is to show the other contacts receiving the serial letter, do not add card for current contact
                    if ( current._id !== contact._id ) {
                        contactsTable.push( tableRow );
                    }
                }

                activityDetailsVM.template.map( { contactsTable: contactsTable }, true, itcb );
            }

            /**
             *  2.1 Format a contact into markdown to be displayed in a single form table cell
             *
             *  @param  {Object}    cnt     A plain basecontact object
             *  @return {String}
             */

            function contactToCard( cnt ) {
                var
                    institutionTypes = Y.doccirrus.schemas.basecontact.types.BaseContactType_E.list,
                    txt = ( cnt.talk ? cnt.talk + ' ' : '') + ( cnt.title ? cnt.title + ' ' : '' ) + cnt.content,
                    bcType = cnt.baseContactType,
                    typeAndJob = '',
                    address;

                //  patients also have nameaffix
                if ( cnt.nameaffix ) {
                    txt = txt + ' ' + cnt.nameaffix;
                }

                //  make the name bold
                txt = '**' + txt + '**\n';

                if ( cnt.addresses && cnt.addresses[0] ) {
                    address = Y.dcforms.mapper.genericformmappers.getAddressAsString( cnt.addresses[0] );
                    address = address.replace( new RegExp( "\n", 'g' ), '\n' );      //  eslint-disable-line no-control-regex
                    txt = txt + address;
                }

                if ( bcType) {
                    typeAndJob = typeAndJob + Y.doccirrus.schemaloader.translateEnumValue( '-de', bcType, institutionTypes, bcType);
                }

                if ( 'PATIENT' === bcType ) {
                    typeAndJob = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.patient' );
                }

                if ( cnt.workDescription ) {
                    if ( '' !== typeAndJob ) {
                        typeAndJob = typeAndJob + ', ';
                    }
                    typeAndJob = typeAndJob + cnt.workDescription;
                }

                if ( '' !== typeAndJob ) {
                    txt = txt + '\n(' + typeAndJob + ')';
                }

                if ( currentPatient && currentPatient.physicians() && currentPatient.physicians()[0] === cnt._id  ) {
                    txt = txt + ' (' + i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.physician' ) + ')';
                }

                if ( currentPatient && currentPatient.familyDoctor() === cnt._id ) {
                    txt = txt + ' (' + i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.familyDoctor' ) + ')';
                }

                if ( currentPatient && currentPatient.institution() === cnt._id ) {
                    txt = txt + ' (' + i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.institution' ) + ')';
                }

                return txt;
            }

            function contactToCardLine( cnt ) {
                var card = contactToCard( cnt );
                return card.replace( new RegExp( "\n", 'g' ), ', ' );       //  eslint-disable-line no-control-regex
            }

            //  3.  Serialize the form for PDF generation
            function formToHPDF( itcb ) {
                activityDetailsVM.template.renderPdfServer( 'db', null, null, onFormSerialized );
                function onFormSerialized( err, serialized ) {
                    if ( err ) {
                        Y.log( 'Could not serialize form template: ' + JSON.stringify( err ), 'error', NAME );
                        return itcb( err );
                    }
                    formForHPDF = serialized;
                    itcb( null );
                }
            }

            //  4.  Make a new PDF with the current contact and load the media object
            function generateAndUpdatePDF( itcb ) {
                Y.doccirrus.jsonrpc.api.media.makepdf( { document: formForHPDF } ).then( onPdfCreated ).fail( itcb );
                function onPdfCreated( result ) {
                    if ( !result || !result.data || !result.data._id ) {
                        return itcb( new Error( 'PDF not created' ) );
                    }
                    newMediaId = result.data._id;
                    Y.log( 'Created new PDF with media id: ' + newMediaId, 'info', NAME );
                    Y.doccirrus.jsonrpc.api.media.read( { query: { _id: newMediaId } } ).then( onMediaLoaded ).fail( onMediaError );
                }
                function onMediaLoaded( mediaObj ) {
                    if ( !mediaObj || !mediaObj.data || !mediaObj.data[0] ) {
                        return itcb( new Error( 'Media ' + newMediaId + ' could not be loaded' ) );
                    }
                    newMediaObj = mediaObj.data[0];
                    itcb( null );
                }
                function onMediaError( err ) {
                    Y.log( 'Could not load new media ' + newMediaId + ': ' + JSON.stringify( err ), 'error', NAME );
                    return itcb( err );
                }
            }

            //  5.  Add attached DOCLETTER document from the media object
            function addAttachedDocument( itcb ) {
                newMediaDoc = attachmentsVM.addDocumentFromMedia( {}, newMediaObj, currentActivity, currentPatient );
                newMediaDoc.type( 'DOCLETTER' );
                newMediaDoc.caption( contact.content );
                itcb( null );
            }

            function onPdfCreated( err ) {
                if ( err ) {
                    Y.log( 'Could not create PDF for serial letter: ' + JSON.stringify( err ), 'error', NAME );
                }
                callback( err, newMediaId );
            }

        },

        /**
         *  Raised when user changes the selected contact from the select box
         *
         *      -   Set the contact on the activity
         *      -   Map the contact into the form
         *      -   Raise event to update form document
         *
         *  @param  {Object}    selectedContact     A plain basecontact object with label for select box
         */

        setSelectedContact: function( selectedContact, callback ) {
            //  Knockout sometimes raises this with no value, ignore
            if ( !selectedContact ) {
                if ( callback ) { return callback(); }
                return;
            }

            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                activityDetailsVM = self.getActivityDetailsViewModel(),
                template = activityDetailsVM.template || null,

                address = selectedContact.addresses && selectedContact.addresses[0] ? selectedContact.addresses[0] : {},

                //  default empty values for form
                mapData = {
                    selectedContactSalutation: '',
                    selectedContactNameTemplate: '',
                    selectedContactSurnameTemplate: '',
                    selectedContactAddress: '',
                    selectedContactGLN: '',

                    selectedContactFirstName: selectedContact.firstname || '',
                    selectedContactLastName: selectedContact.lastname || selectedContact.institutionName || '',
                    selectedContactTitle: selectedContact.title || '',

                    selectedContactHouseNo: unwrap( address.houseno ) || '',
                    selectedContactPostBox: unwrap( address.postbox ) || '',
                    selectedContactStreet: unwrap( address.street ) || '',
                    selectedContactCity: unwrap( address.city ) || '',
                    selectedContactZip: unwrap( address.zip ) || '',
                    selectedContactAddOn: unwrap( address.addon ) || '',
                    selectedContactCountry: unwrap( address.country ) || ''
                },

                translateTalk,
                formGender = 'n';

            //  don't remap while initializing patient contacts if there is already a value
            if ( currentActivity.selectedContact && currentActivity.selectedContact() && !self.patientContactsInitialized ) {
                return callback( null );
            }

            if ( selectedContact && currentActivity.selectedContact && ( currentActivity.selectedContact() === selectedContact._id ) ) {
                //  If value is not changed, no not remap the form or trigger dirty state
                return callback( null );
            }

            //  Set the contact on the activity

            if ( currentActivity.selectedContact ) {
                if ( selectedContact && selectedContact._id ) {
                    currentActivity.set( 'selectedContactObj', selectedContact );
                    currentActivity.selectedContact( selectedContact._id );
                } else {
                    currentActivity.selectedContact( null );
                }
            }

            //  Missing form or no form yet selected
            if ( !template ) {
                return callback( null );
            }

            //  Empty values
            if ( !selectedContact ) {
                return template.map( mapData, true, onTemplateMapped );
            }

            //  Form gender

            switch ( selectedContact.talk ) {
                case 'MS':  formGender = 'f';   break;
                case 'MR':  formGender = 'm';   break;
            }

            mapData.selectedContactSalutation = i18n( 'InCaseMojit.select_contacts_modalJS.salutation_' + formGender );

            if ( template.gender !== formGender ) {
                template.gender = formGender;
            }

            //  Map the contact into the form

            if ( selectedContact.talk ) {
                translateTalk = Y.doccirrus.schemaloader.translateEnumValue(
                    '-de',
                    ko.unwrap( selectedContact.talk ),
                    Y.doccirrus.schemas.person.types.Talk_E.list, ''
                );
            } else {
                translateTalk = '';
            }

            mapData.selectedContactNameTemplate = Y.dcforms.mapper.genericformmappers.concat(
                selectedContact.title,
                selectedContact.firstname,
                selectedContact.nameaffix,
                selectedContact.lastname
            );

            mapData.selectedContactSurnameTemplate = Y.dcforms.mapper.genericformmappers.concat(
                translateTalk,
                selectedContact.title,
                selectedContact.nameaffix,
                selectedContact.lastname
            );

            if ( selectedContact.addresses && selectedContact.addresses[0] ) {
                mapData.selectedContactAddress = Y.dcforms.mapper.genericformmappers.getAddressAsString( selectedContact.addresses[0] );
            }

            //  if an institution, add the institution name to the address
            if ( selectedContact.institutionName ) {
                mapData.selectedContactNameTemplate = selectedContact.institutionName;
                mapData.selectedContactSurnameTemplate = i18n( 'InCaseMojit.select_contacts_modalJS.DEAR_SIR' );
                mapData.selectedContactSalutation = i18n( 'InCaseMojit.select_contacts_modalJS.salutation_f' );
            }

            //  Available in Swiss country mode
            mapData.selectedContactGLN = selectedContact.glnNumber ? selectedContact.glnNumber : '';

            template.map( mapData, true, onTemplateMapped );

            function onTemplateMapped( err ) {

                if ( err ) {
                    Y.log( 'Problem remapping form template: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                //  mark the form as dirty / needs save
                template.raise( 'valueChanged', { force: true } );
                callback( null );
            }
        },

        /** @protected */
        destructor: function() {
            var
                self = this,
                template = self.getCurrentTemplate();

            if ( self.formLoadListener ) {
                self.formLoadListener.dispose();
            }

            if ( self.fullScreenListener ) {
                self.fullScreenListener.dispose();
            }

            //  unlink the form template from the DOM, will continue to exist in memory
            if ( template  ) {
                template.off( 'elementSelected', NAME );

                if ( template.valueEditor && template.valueEditor.destroy ) {
                    template.valueEditor.destroy();
                }

                template.removeFromDOM();
                template.isHidden = true;
            }

            //  destroy event listener
            self.formDataListener = null;
            self.onFormStateProvided = Y.dcforms.nullCallback;

            jQuery( window ).off( 'scroll.caseFileViewModel' );

            self.destroy();
        },

        initParentSubscriptions: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                activityDetailsVM = self.getActivityDetailsViewModel();

            if ( !activityDetailsVM ) {
                //  should not happen
                Y.log( 'ActivityDetailsViewModel is not available.', 'warn', NAME );
                return;
            }

            //  listen for form load / reload / change

            self.formLoadListener = activityDetailsVM.isFormLoaded.subscribe( function( newValue ) { onFormLoadStatusChange( newValue ); }  );

            function onFormLoadStatusChange( newValue ) {
                if ( true === newValue ) {
                    //  form was (re)loaded, update display
                    if ( true === self.isReady ) {
                        self.displayForm();
                    }
                } else {
                    //  should not happen - form is only cleared when changing activity type to one which does not
                    //  have a form, which should then close this view
                    Y.log( 'Form cleared in parent view.', 'warn', NAME );
                }
            }

            //  listen for css minimize / maximize

            self.fullScreenListener = binder.isFullScreen.subscribe( function ( newValue ) { onScreenResize( newValue ); } );

            function onScreenResize( /* newValue */ ) {
                var
                    template = self.getCurrentTemplate(),
                    formDiv,
                    containerWidth;

                function onResizeComplete( err ) {
                    if ( err ) {
                        Y.log( 'Problem resizing form: ' + JSON.stringify( err ), 'warn', NAME );
                    }
                    Y.log( 'Resized form after CSS min/max event', 'debug', NAME );
                }

                if ( template && self.isReady ) {
                    formDiv = $( '#' + template.domId );
                    containerWidth = Math.floor( formDiv.width() );
                    template.resize( containerWidth, function() { template.render( onResizeComplete ); } );
                }
            }
        },
        initETSPanel: function() {
            var self = this;
            self.addDisposable( ko.computed( function() {
                var
                    binder = self.get( 'binder' ),
                    template = self.getCurrentTemplate(),
                    currentPatient = ko.unwrap( binder.currentPatient ),
                    currentCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                    isPublicCaseFolder = currentCaseFolder && Y.doccirrus.schemas.patient.isPublicInsurance( currentCaseFolder ), // MOJ-14319: [OK]
                    isPTV11Form = template && ( template.defaultFor === ptv11FormRole );

                self.showETSPanel( isPublicCaseFolder && isPTV11Form );

                if ( template && template.valueEditor && template.valueEditor.reposition ) {
                    template.valueEditor.reposition();
                }

            } ) );
        },

        getActivityDetailsViewModel: function () {
            var
                self = this,
                binder = self.get( 'binder' ),
                caseFileVM = unwrap( binder.currentView );

            if ( !caseFileVM || !caseFileVM.activityDetailsViewModel ) { return null; }

            return unwrap( caseFileVM.activityDetailsViewModel );
        },

        getCurrentTemplate: function() {
            var
                self = this,
                activityDetailsVM = self.getActivityDetailsViewModel();

            if ( activityDetailsVM && activityDetailsVM.template ) {
                return activityDetailsVM.template;
            }

            return null;
        },

        /**
         *  Get attachments object for current activity
         *
         *  @returns    {Object}    Attachments model for current activity
         */
        getAttachments: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                caseFileVM = ko.unwrap( binder.currentView ),
                activityDetailsVM = ( ( caseFileVM && caseFileVM.activityDetailsViewModel ) ?  ko.unwrap( caseFileVM.activityDetailsViewModel ) : null ),
                attachments = ( ( activityDetailsVM && activityDetailsVM.attachmentsModel ) ? activityDetailsVM.attachmentsModel : null );

            return attachments;
        },

        templateReady: function() {
            Y.log( 'Jade template is ready, displaying form', 'debug', NAME );
            var
                self = this;

            self.isReady = true;

            self.displayForm();

            //  subscribe to form status changes from parent - update display when form loads or changes under us
            self.initParentSubscriptions();
        },

        /**
         *  Load form and mapper, perform initial mapping if not already done
         */

        displayForm: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                template = self.getCurrentTemplate(),
                currentActivity = ko.unwrap( binder.currentActivity ),
                canonicalId = ko.unwrap( currentActivity.formId || '' ) || '',
                activityDetailsVM = self.getActivityDetailsViewModel(),
                attachmentsVM = activityDetailsVM.attachmentsModel,
                curentUrl,
                sumexPdf = attachmentsVM.findDocument('SUMEXPDF');

            if( !currentActivity.formLookupInProgress || currentActivity.formLookupInProgress() ) {
                Y.log( 'Form lookup in progress, waiting', 'debug', NAME );
                //self.divId.html(Y.doccirrus.comctl.getThrobber());
                return;
            }

            if ( activityDetailsVM.isFormLoading && activityDetailsVM.isFormLoading() ) {
                Y.log( 'Form load currently in progress, wil display when load is complete.', 'debug', NAME );
                return;
            }

            if(sumexPdf) {
                //MOJ-13090 if activity has sumex pdf, then show it
                self.displaySumexPdf(sumexPdf);
                return;
            }

            if( !canonicalId || '' === canonicalId ) {
                // current activity does not have a form, this section should be disabled
                Y.log( 'current activity does not have a form: ' + ko.unwrap( currentActivity._id || 'new activity' ), 'info', NAME );
                Y.log( 'Switching to form tree tab', 'debug', NAME );

                // - below are alternative methods which were less reliable
                //activityDetailsNav.activateTab( 'formtreeform' );
                //window.location.hash = curentUrl.replace('formform', 'formtreeform');
                curentUrl = window.location.hash;
                if(-1 !== curentUrl.indexOf('/section/formform')){
                    window.location.hash = curentUrl.replace('formform', 'formtreeform');
                } else {
                    window.location.hash = curentUrl + '/section/formtreeform';
                }

                //window.location.hash = unwrap( activityDetailsNav.getItemByName( 'formtreeform' ).href );
                return;
            }

            if ( !template ) {
                Y.log( 'No form template loaded.', 'debug', NAME );
                return;
            }

            if( true === self.isLoading ) {
                Y.log( 'form load in progress, not starting another until it completes', 'debug', NAME );
                return;
            }

            //Y.log( 'displaying form: ' + unwrap( currentActivity.actType ) + ' / ' + unwrap( currentActivity.formId ), 'debug', NAME );
            async.series(
                [
                    resizeForm,
                    addToDOM,
                    remapMasked,
                    drawForm,
                    addEventListeners,
                    selectFirstElement
                ],
                onAllDone
            );

            //  1. Check that the form is the same width as the area it will be drawn into
            function resizeForm( itcb ) {
                var
                    formDiv = $( '#' + template.domId ),
                    containerWidth = Math.floor( formDiv.width() ),
                    paperWidth = template.paper && template.paper.width && template.paper.width.toString() || 0,
                    storedWidth = localStorage.getItem( 'defaultViewWidth.' + currentActivity.actType() + '.' + paperWidth ),
                    round2 = function(x){ return Math.round( x * 100 ) / 100; };

                storedWidth = storedWidth && round2( parseFloat( storedWidth ) );

                //  skip this step if the form width is already correct
                if ( template.px.width === containerWidth ) {
                    return itcb( null );
                }

                if( template.px.resizedWidth ){
                    formDiv.width( template.px.resizedWidth );
                } else if( storedWidth ) {
                    template.px.resizedWidth = storedWidth;
                    formDiv.width( template.px.resizedWidth  );
                }

                template.resize( template.px.resizedWidth || containerWidth, itcb );
            }

            //  2. re-initialize template in DOM if necessary
            function addToDOM( itcb ) {
                if ( template.isHidden ) {
                    template.isHidden = false;
                }

                template.removeFromDOM();
                template.addToDOM();
                itcb( null );
            }

            //  3. If activity type has mask then remap (update all values from the mask before displaying the form)
            function remapMasked( itcb ) {
                var actType = ko.unwrap( currentActivity.actType );
                if ( !Y.doccirrus.schemas.activity.isMaskType( actType ) ) { return itcb( null ); }
                Y.log( 'Switched to form tab, remapping masked activity type: ' + actType, 'debug', NAME );
                activityDetailsVM.mapper.map( itcb );
            }

            //  4. Draw the form and set the form name in userContent if none
            function drawForm( itcb ) {

                //  TODO: move to activity-api.client.js
                if( currentActivity._isEditable() ) {
                    //  set activity text/userContent to form name if empty
                    if( currentActivity.userContent && '' === currentActivity.userContent() ) {
                        currentActivity.userContent( template.name[template.userLang] );
                    }
                }

                //  ownership of media added in forms: image/audio/video elements
                template.ownerCollection = 'activity';
                template.ownerId = unwrap( currentActivity._id ) || unwrap( currentActivity._randomId );

                template.render( itcb );
            }

            //  5. Listen for form events which must be handled by parent context
            function addEventListeners( itcb ) {
                template.on( 'requestImage', NAME, function( args ) { self.onRequestImage( args ); } );

                template.on( 'requestAudioFile', NAME, function( args ) { self.onRequestImageSelect( args ); } );
                template.on( 'requestAudioPlayback', NAME, function( args ) { self.onRequestAudioPlay( args ); } );
                template.on( 'requestAudioRecord', NAME, function( args ) { self.onRequestAudioRecord( args ); } );
                template.on( 'requestLabData', NAME, function( args ) { self.onRequestLabdata( args ); } );
                template.on( 'requestContacts', NAME, function( args ) { self.onRequestContacts( args ); } );
                template.on( 'requestMarkdownModal', NAME, function( args ) { self.onRequestMarkdown( args ); } );

                $( window ).off( 'resize' ).on( 'resize', function onWindowResize() { resizeForm( Y.dcforms.nullCallback ); } );

                //  lock form if not editable
                if ( !currentActivity._isEditable() && 'fill' === template.mode ) {
                   return template.setMode( 'locked', itcb );
                }

                itcb( null );
            }

            //  6. Select the first element if appropriate
            function selectFirstElement( itcb ) {
                if( currentActivity._isEditable() ) {
                    template.setFirstSelected( 'fixed' );
                    if( template.valueEditor && template.valueEditor.reposition ) {
                        template.valueEditor.reposition();
                    }
                }
                //  additional resizing - KO continues to update the page without letting us know
                //  so we check that the rendering div width has not changed
                window.setTimeout( function() { resizeForm( Y.dcforms.nullCallback ); }, 50 );
                window.setTimeout( function() { resizeForm( Y.dcforms.nullCallback ); }, 120 );
                window.setTimeout( function() { resizeForm( Y.dcforms.nullCallback ); }, 250 );
                window.setTimeout( function() { resizeForm( Y.dcforms.nullCallback ); }, 500 );

                template.render( itcb );
                //itcb( null );
            }

            //  Finally
            function onAllDone( err ) {
                var element = document.getElementsByClassName('docTree'),
                    container = document.getElementById('activityDetailsContent');
                if (element && element[0] && element[0].lastElementChild) {
                    element[0].lastElementChild.style.maxHeight = (0.9 * container.offsetHeight).toString() + 'px';
                }
                Y.log( 'form load complete', 'debug', NAME );

                if( err ) {
                    Y.log( 'Error loading form: ' + JSON.stringify( err ) );
                    return;
                }

                //  listen for media uploads via the form
                template.on('addUserImage', NAME, function( evt ) { self.onFormMediaAttached( evt ); } );

                if ( template && template.isPdfAttached ) {
                    Y.log( 'This form is displayed along with attached PDFs', 'debug', NAME );
                    self.displayAttachedPdfs();
                }

                //  set up contacts UI of this is a letter

                self.isLetter( template.isLetter );

                if ( template.isLetter ) {
                    self.updatePatientContacts();
                    if ( template.valueEditor && template.valueEditor.reposition ) {
                        template.valueEditor.reposition();
                    }
                }

                //  link content-editable elements to the WYSWYG buttons if in use
                if ( self.showWYSWYGButtons() ) {
                    template.off( 'elementSelected', NAME );
                    template.on( 'elementSelected', NAME, function onElementSelected( /* elem */ ) {
                        if ( template.valueEditor && template.valueEditor.jqContentEditable ) {
                            self.wyswyg.setTextArea( template.valueEditor.jqContentEditable[0] );
                        }
                    } );
                }

                //  all done

                self.isFormRenderComplete = true;

                self.initETSPanel();
            }

        },

        displaySumexPdf: function(sumexPdf) {
            var
                self = this,
                mediaId = unwrap(sumexPdf.mediaId),
                jqContainer = $( '#divFormPdfPages' );

            jqContainer.append( '<div id="divFormPdfPg' + unwrap( mediaId )  + '"></div>' );
            self.insertPdfPages( mediaId, onPdfAdded );

            function onPdfAdded( err ) {
                if ( err ) {
                    Y.log( 'Problem adding SUMEX PDF pages into view: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                Y.log( 'Added SUMEX PDF document', 'debug', NAME );
            }
        },

        /**
         *  Show ttached PDFs concatenated together in the form tab, EXTMOJ-1985
         *
         *  TODO: figure out how to bind this instead of using jQuery
         *  TODO: disable / replace buttons in header
         *  TODO: insert sequentially so as not to stress server by invoking convert too much - can be a CPU and memory heavy operation
         */

        displayAttachedPdfs: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                attachedMedia = unwrap( currentActivity.attachedMedia ) || [],
                formPdf = unwrap( currentActivity.formPdf ),
                jqContainer = $( '#divFormPdfPages' ),
                mediaStub, stubId, stubType,
                queuePdfs = [],
                i;

            for ( i = 0; i < attachedMedia.length; i++ ) {
                mediaStub = attachedMedia[i];
                stubId = unwrap( mediaStub.mediaId );
                stubType = unwrap( mediaStub.contentType );

                if ( 'application/pdf' === stubType && formPdf !== stubId ) {
                    queuePdfs.push( stubId );
                }
            }

            async.eachSeries( queuePdfs, insertSinglePage, onAllAdded );

            function insertSinglePage( mediaId, itcb ) {
                jqContainer.append( '<div id="divFormPdfPg' + unwrap( mediaId )  + '"></div>' );
                self.insertPdfPages( mediaId, itcb );
            }

            function onAllAdded( err ) {
                if ( err ) {
                    Y.log( 'Problem adding PDF pages into view: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                Y.log( 'Added ' + queuePdfs.length + ' PDF documents', 'debug', NAME );
            }
        },

        /**
         *  Add all pages of the given PDF
         *
         *  @param  {String}    mediaId
         *  @param  {Function}  callback
         */

        insertPdfPages: function( mediaId, callback ) {
            var divId = 'divFormPdfPg' + mediaId;

            Y.doccirrus.jsonrpc.api.media.getPdfPageLayout( { mediaId: mediaId } )
                .then( onPdfLayout )
                .fail( onPdfErr );

            function onPdfLayout( result ) {
                result = result.data ? result.data : result;
                async.eachSeries( result, addSinglePage, callback );
            }

            function onPdfErr( err ) {
                $( '#' + divId ).append( '<pre>' + JSON.stringify( err ) + '</pre>' );
            }

            function addSinglePage( pageMeta, itcb ) {
                var
                    relUrl = '/media/' + mediaId + '_pdfpage' + pageMeta.idx + '.IMAGE_JPEG.jpg',
                    absUrl = Y.doccirrus.infras.getPrivateURL( relUrl ),
                    imgTag = '<img src="' + absUrl + '" width="100%" />',
                    divTag = '<div style="border: 1px solid #666666;">' + imgTag + '</div><br/><br/>';

                $( '#' + divId ).append( divTag );
                itcb( null );
            }

        },

        /**
         *  Event fired when a form adds media to the activity (edited pictures, sound recordings, etc)
         *
         *  @param  {Object}    evt
         *  @param  {Object}    evt.newMedia    Media object
         *  @param  {String}    evt.mediaId
         */

        onFormMediaAttached: function( evt ) {

            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentPatient = unwrap( binder.currentPatient ),
                attachments = self.getAttachments(),
                patientName = jQuery.trim( currentPatient.firstname() + ' ' + currentPatient.lastname() ),
                lookupId = unwrap( currentActivity._id ) || unwrap( currentActivity._randomId ),
                newDoc,
                newDocPlain,
                newMedia = evt.newMedia,
                newMediaId = evt.mediaId;

            if ( !attachments ) {
                //  should nto happen
                Y.log( 'Activity attachments are not initialized.', 'warn', NAME );
                return;
            }

            if ( attachments.hasMediaDoc( evt.mediaId ) ) {
                //  this media attachment is already reference by an attached document
                Y.log( 'Media ' + evt.mediaId + ' already has a document, not repeating attachment.', 'debug', NAME );
                return;
            }

            if( !currentActivity._isEditable() ) {
                Y.log( 'Cannot attach media, activity is read only in current state.', 'warn', NAME );
                return;
            }

            if( Y.config.debug ) {
                Y.log( 'Received media attachment from form' + newMediaId, 'debug', NAME );
            }

            if( !newMedia || !newMedia.hasOwnProperty( 'url' ) ) {
                if( Y.config.debug ) {
                    Y.log( 'Invalid file uploaded, or error on attaching media, not adding as document.', 'warn', NAME );
                    Y.log( 'Invalid media ' + newMediaId + ': ' + JSON.stringify( newMedia, undefined, 2 ), 'debug', NAME );
                }
                return;
            }

            // copy the newly added media as an attached document on the current activity

            Y.log( 'Creating new document to reference attached media: ' + newMediaId, 'info', NAME );

            newDocPlain = {
                'type': newMedia.docType || 'OTHER',
                'url': newMedia.source + '&from=casefile',
                'caption': patientName + ' - ' + moment().format( 'DD.MM.YYYY' ) + ' - ' + newMedia.name,
                'publisher': Y.doccirrus.comctl.fullNameOfUser, //Y.doccirrus.utils.loggedInUser,
                'createdOn': (new Date()).toJSON(),
                'contentType': newMedia.mime.replace( '_', '/' ).toLowerCase(),
                'attachedTo': lookupId,     //  to be removed, see MOJ-9190
                'activityId': lookupId,
                'patientId': null,          //  only set on approval
                'mediaId': newMediaId,
                'accessBy': [],
                'locationId': currentActivity.locationId(),
                'isEditable': false
            };

            newDoc = new KoViewModel.createViewModel( {
                NAME: 'DocumentModel',
                config: { data: newDocPlain }
            } );

            attachments.documents.push( newDoc );
        },

        /**
         *  This is used when copying values from another instance of the form, or a form with matching elements
         *
         *  @param formDoc
         */

        setFormState: function __setFormState( formDoc ) {

            var
                self = this,
                template = self.getCurrentTemplate(),
                currentActivity = unwrap( self.get( 'binder' ).currentActivity ),

                asDict,
                page, elem,
                i, j;

            if ( !currentActivity._isEditable() ) {
                Y.log( 'Activity is not editable, not updating form.', 'warn', NAME );
                return;
            }

            if ( !template || !template.fromDict ) {
                Y.log( 'Form not yet loaded, cannot update.', 'warn', NAME );
                return;
            }

            asDict = Y.doccirrus.api.document.formDocToDict( formDoc );

            //  MOJ-11044, exclude values for elements which are marked noCopyOver
            for ( i = 0; i < template.pages.length; i++ ) {
                page = template.pages[i];
                for ( j = 0; j < page.elements.length; j++ ) {
                   elem = page.elements[j];
                   if ( elem.noCopyOver ) {
                       removeFromDict( elem.elemId );
                   }
                }
            }

            template.fromDict( asDict, onLoadedFromDict );

            function removeFromDict( elemId ) {
                var extraKeys = [ '__options', '_formatted', '_plaintext', '_chartPoints', '_labdata' ];

                if ( asDict.hasOwnProperty( elemId ) ) {
                    delete asDict[ elemId ];
                }

                extraKeys.forEach( function( suffix ) {
                    if ( asDict.hasOwnProperty( elem.elemId + suffix ) ) {
                        delete asDict[ elem.elemId + suffix ];
                    }
                } );
            }

            function onLoadedFromDict( err ) {
                if ( err ) {
                    Y.log( 'Problem loading form from dict: ' + JSON.stringify( err ), 'warn', NAME );
                    //  continue with render in any case
                }
                template.render( onFormDocCopied );
            }

            function onFormDocCopied() {
                Y.log( 'Copied data into current form from document ' + formDoc._id, 'debug', NAME );
                //  raise dummy event so that mapper will update own formDoc, barcodes, etc
                template.raise( 'valueChanged', { 'elemType': 'dummy', 'page': template.pages[0] } );
            }
        },

        /**
         *  User has clicked an editable image in the form, show modal to select and image attachment from this or
         *  linked activities, or upload / create a new image.
         *
         *  @param  args                    {Object}
         *  @param  args.currentValue       {String}    Database _id of current image in media collection, if any
         *  @param  args.ownerCollection    {String}    Should always be 'activity' in this context
         *  @poram  args.ownerId            {String}    Database _id of the activity which owns selected image
         *  @param  args.widthPx            {Number}    Width of requested image in pixels
         *  @param  args.heightPx           {Number}    Height of requested image in pixels
         *  @param  args.onSelected         {Function}  Raise when user selects an image
         */

        onRequestImage: function __onRequestImage( args ) {
            var self = this;

            if (
                args.behavior &&
                'EDIT_IMAGE' === args.behavior &&
                args.currentValue &&
                '' !== args.currentValue
            ) {
                //  if editable image is set to annotation mode, and contains an image to annotate
                self.onRequestImageEdit( args );
            } else {
                //  image is editable, but not set to annotate by default, or has no current value to draw on
                self.onRequestImageSelect( args );
            }
        },

        /**
         *  Choose an image from the current activity, casefolder or patient
         *  @param args
         */

        onRequestImageSelect: function __onRequestImageSelect( args ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentPatient = unwrap( binder.currentPatient ),
                attachments = self.getAttachments();

            if ( !currentActivity._isEditable() ) { return; }

            Y.doccirrus.modals.linkedAttachedImages.show( {
                'currentValue': args.currentValue,
                'currentActivity': currentActivity,
                'currentPatient': currentPatient,
                'onSelected': onMediaSelected,
                'onMediaAdded': onMediaAdded
            } );

            function onMediaAdded( facade, mediaObj ) {
                attachments.addDocumentFromMedia( facade, mediaObj, currentActivity, currentPatient );
                args.onSelected( mediaObj, args.fixAspect );
            }

            function onMediaSelected( mediaObj /*, fixedAspect */ ) {
                var
                    ownDoc = mediaObj && mediaObj._id ? attachments.findDocument( mediaObj._id ) : null,
                    useId = unwrap( currentActivity._id ) || unwrap( currentActivity._randomId );

                //  in no media selected then nothing to do
                if ( !mediaObj || !mediaObj._id ) {
                    Y.log( 'No media selected, clearing image element: ' + JSON.stringify( mediaObj ), 'debug', NAME );
                    args.onSelected( mediaObj, args.fixAspect );
                    return;
                }

                //  if media is not owned by this activity then we will need to make a new copy of it, EXTMOJ-1530
                if ( ownDoc ) {
                    //  use the fixedAspect property of the element, not selected by user at this time
                    args.onSelected( mediaObj, args.fixAspect );
                    return;
                }

                Y.doccirrus.jsonrpc.api.media.makecopy( {
                    'mediaId': mediaObj._id,
                    'ownerCollection': 'activities',
                    'ownerId': useId
                } ).then( function onExternalMediaCopied( copyMediaId ) {

                    copyMediaId = copyMediaId.data ? copyMediaId.data : copyMediaId;
                    return Y.doccirrus.jsonrpc.api.media.read( { query: { _id: copyMediaId } } );

                } ).then( function onCopyMediaLoaded( copyMediaObj ) {

                    copyMediaObj = copyMediaObj.data ? copyMediaObj.data : copyMediaObj;
                    copyMediaObj = Array.isArray( copyMediaObj ) && copyMediaObj[0] ? copyMediaObj[0] : null;

                    if ( !copyMediaObj ) {
                        Y.log( 'Problem loading copied media.', 'warn', NAME );
                        return;
                    }

                    onMediaAdded( {}, copyMediaObj );
                } );
            }
        },

        /**
         *  Edit the current value of the image element
         *  @param args
         */

        onRequestImageEdit: function __onRequestImageEdit( args ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentPatient = unwrap( binder.currentPatient ),
                useId = unwrap( currentActivity._id ) || unwrap( currentActivity._randomId );

            Y.doccirrus.modals.editImageFabric.show( {
                'mediaId': args.currentValue,
                'resetId': args.defaultValue,
                'ownerCollection': 'activity',
                'ownerId': useId,
                'onImageSaved': onEditedImageSaved
            } );

            function onEditedImageSaved( mediaObj ) {

                if ( !currentActivity._isEditable() ) { return; }

                var attachments = self.getAttachments();

                if ( !attachments ) {
                    //  should never happen
                    Y.log( 'Activity attachments not initialized.', 'warn', NAME );
                    return;
                }

                attachments.addDocumentFromMedia( {}, mediaObj, currentActivity, currentPatient );

                args.onSelected( mediaObj, args.fixAspect );
            }

        },

        onRequestAudioPlay: function( options ) {
            Y.doccirrus.modals.transcribeAudio.show( options );
        },

        onRequestAudioRecord: function( options ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentPatient = unwrap( binder.currentPatient ),
                hookAdd = options.onAdd;

            //  skip this if user cannot attach recorded audio
            if ( !currentActivity._isEditable() ) { return; }

            //  intercept onAdd callback to copy new media into attachments
            options.onAdd = onMediaAdded;
            options.ownerCollection = 'activities';

            //  TODO: handle case of activity not yet saved to server
            options.ownerId = ko.unwrap( currentActivity._id );

            function onMediaAdded( facade, mediaObj ) {
                if ( !currentActivity._isEditable() ) { return; }

                var attachments = self.getAttachments();

                if ( !attachments ) {
                    Y.log( 'Activity attachments not initialized.', 'warn', NAME );
                    return;
                }

                attachments.addDocumentFromMedia( facade, mediaObj, currentActivity, currentPatient );

                //  pass it on to requester (probably a form element which needs the new mediaId)
                hookAdd( mediaObj );
            }

            //  testing new modal to capture audio with minimal editing / cropping
            Y.doccirrus.modals.dictaphone.show( options );
        },

        /**
         *  Raised by forms when user clicks labdata table, open modal to select labdata from current patient
         *  @param args
         */

        onRequestLabdata: function( args ) {
            Y.doccirrus.modals.selectLabData.show( args );
        },

        /**
         *  Raised by forms when user clicks contacts table, open modal to select contacts from current patient
         *  @param args
         */

        onRequestContacts: function( args ) {
            Y.doccirrus.modals.selectContacts.show( args );
        },

        onRequestMarkdown: function( element ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                isTable = ( 'table' === element.elemType ),
                mdValue = isTable ? element.renderer.getCellValue( element.selRow, element.selCol ) : element.getValue();

            Y.doccirrus.modals.editFormText.show( {
                'value': mdValue,
                'currentActivity': currentActivity,
                'showDocTree': true,
                'useWYSWYG': peek( self.showWYSWYGButtons ),
                'onUpdate': onModalTextUpdate
            } );

            function onModalTextUpdate( newValue ) {
                if ( isTable ) {
                    element.renderer.setCellValue( newValue, element.selRow, element.selCol );
                } else {
                    element.setValue( newValue, onValueSet );
                }

                function onValueSet() {
                    element.page.redraw(Y.dcforms.LAYER_TEXT);
                    element.page.form.raise( 'valueChanged', element );
                }
            }
        }

    }, {
        NAME: 'ActivitySectionFormViewModel'
    } );

    KoViewModel.registerConstructor( ActivitySectionFormViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'ActivitySectionViewModel',

        //  forms
        'dcforms-template',
        'dcforms-utils',
        'WYSWYGViewModel',

        //  mappers
        'dcforms-map-casefile',
        'dcforms-map-docletter',
        'dcforms-map-incase',           // <---- default mapper
        'dcforms-map-invoice',
        'dcforms-map-prescription',
        'dcforms-map-pubreceipt',

        //  modals
        'linkedattachedimagesmodal',
        'playaudiomodal',               //  DEPRECATED - to be replaced with wavesurfer/transcribe modal
        'microphoneinputmodal',         //  DEPRECATED - to be replaced with dictaphone modal
        'dictaphoneinputmodal',
        'transcribeaudiomodal',
        'DcSelectLabDataModal',
        'LabdataTableEditorModel',
        'DcSelectContactsModal',
        'DcSerialDocletterModal'
    ]
} );
