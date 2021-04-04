/*
 *  Modal to select contacts to be mapped into tables on forms
 *
 *  Opened in response to click on contacttable form elements
 *
 *  @author: strix
 *  @date: 28/11/2018
 */

/*eslint strict:0 */
/*global YUI, ko, $ */

'use strict';

YUI.add( 'DcSelectContactsModal', function( Y, NAME ) {
        var
            i18n = Y.doccirrus.i18n,
            logUnhandled = Y.doccirrus.promise.logUnhandled,
            CANCEL = i18n( 'InCaseMojit.select_labdata_modalJS.button.CANCEL' ),
            SELECT = i18n( 'InCaseMojit.select_labdata_modalJS.button.SELECT' ),

            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            unwrap = ko.unwrap;

        /**
         *  ViewModel to bind table to modal body
         *  @param config
         *  @constructor
         */

        function ContactsViewModel( config ) {
            var self = this;

            function init() {
                self.specialitiesList = ko.observableArray( [] );
                self.catalogDescriptors = ko.observableArray( [] );
                self.selectedContacts = ko.observable( config.selectedContacts || [] );
                self.checkedContact = ko.observable();

                self.ALL_CONTACTS = i18n( 'InCaseMojit.select_contacts_modalJS.ALL_CONTACTS' );
                self.SELECTED = i18n( 'InCaseMojit.select_contacts_modalJS.SELECTED' );
                self.SET_SELECTED_AS = i18n( 'InCaseMojit.select_contacts_modalJS.SET_SELECTED_AS' );

                self.PHYSICIAN = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.physician' );
                self.FAMILYDOCTOR = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.familyDoctor' );
                self.ADDITIONALCONTACTS = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.additionalContacts' );
                self.INSTITUTION = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.institution' );

                initSpecialitiesList();
                initCatalogDescriptors();
                initContactRoles();
                initAllContactsKoTable();
                initSelectedContactsKoTable();
                initComputeds();
                initButtons();
            }

            function initSpecialitiesList() {
                Y.doccirrus.jsonrpc.api.kbv.fachgruppe().then( formatSpecialitiesList );

                function formatSpecialitiesList( response ) {
                    if ( response || response.data || response.data[0] || response.data[0].kvValue ) { return; }

                    var
                        specialities = response.data[0].kvValue,
                        specialitiesItems = specialities.map( specialityToSelect2 );

                    self.specialitiesList( specialitiesItems );
                }

                function specialityToSelect2( entry ) {
                    return {id: entry.key, text: entry.value};
                }
            }

            function initCatalogDescriptors() {
                Y.doccirrus.jsonrpc.api.catalog
                    .getCatalogDescriptorsByActType()
                    .then( formatCatalogMap );

                function formatCatalogMap( response ) {
                    var catalogMap = Y.doccirrus.catalogmap.init( response.data );
                    self.catalogDescriptors( catalogMap );
                }
            }

            function initContactRoles() {
                var currentPatient = config.currentPatient;

                //  check if the given contact is the current patient's physician
                self.isPhysician = function( contact ) {
                    var
                        physicianIds = currentPatient && unwrap (currentPatient.physicians ),
                        contactId = contact && contact._id;

                    return ( physicianIds && physicianIds[0] && ( physicianIds[0] === contactId ) );
                };

                //  check if the given contact is the current patient's family doctor
                self.isFamilyDoctor = function( contact ) {
                    var
                        familyDoctorId = currentPatient && unwrap( currentPatient.familyDoctor ),
                        contactId = contact && contact._id;

                    return ( contactId && ( familyDoctorId === contactId ) );
                };

                //  check if the given contact is the current patient's insitution
                self.isInstitution = function( contact ) {
                    var
                        institutionId = currentPatient && unwrap( currentPatient.institution ),
                        contactId = contact && contact._id;

                    return ( contactId && ( institutionId === contactId ) );
                };

                //  check if the given contact is in the patient's additional contacts
                self.isAdditionalContact = function( contact ) {
                    var
                        additionalContacts = unwrap( currentPatient.additionalContacts ) || [],
                        contactId = contact && contact._id,
                        i;

                    for ( i = 0; i < additionalContacts.length; i++ ) {
                        if ( additionalContacts[i] === contactId ) {
                            return true;
                        }
                    }

                    return false;
                };
            }

            /**
             *  Computeds to watch the checked contact and update buttons accordingly
             */

            function initComputeds() {

                var
                    columns = self.selectedContactsKoTable.columns(),
                    checkboxCol = columns[0];

                self.selectedContactSubscription = checkboxCol.checked.subscribe( function onSelectionChanged( newVal ) {
                    if ( !newVal || newVal.length === 0 ) {
                        self.checkedContact( null );
                    } else {
                        self.checkedContact( newVal[0] );
                    }
                } );

                self.hasSelectedContact = ko.computed( function() {
                    return self.checkedContact() ? true : false;
                } );

                //  for disabling buttons
                self.selectedIsPhysician = ko.computed( function() {
                    var checked = self.checkedContact();
                    //  disable if not a physician
                    if ( !checked || checked.baseContactType !== 'PHYSICIAN' ) { return true; }
                    return self.isPhysician( checked );
                } );

                self.selectedIsFamilyDoctor = ko.computed( function() {
                    var checked = self.checkedContact();
                    //  disable if not a physician
                    if ( !checked || checked.baseContactType !== 'PHYSICIAN' ) { return true; }
                    return self.isFamilyDoctor( checked );
                } );

                self.selectedIsAdditionalContact = ko.computed( function() {
                    var checked = self.checkedContact();
                    //  cannot set patient to be contact of self
                    if ( !checked || 'PATIENT' === checked.baseContactType ) { return true; }
                    return self.isAdditionalContact( checked );
                } );
            }

            function initButtons() {
                self.showExplanation = function() {
                    Y.doccirrus.DCWindow.notice( {
                        message: i18n( 'InCaseMojit.select_contacts_modalJS.EXPLANATION' ),
                        window: {
                            width: 'medium'
                        }
                    } );
                };
            }

            /**
             *  Lock the left table and save the patient record with new contacts
             */

            self.savePatient = function( callback ) {
                var currentPatient = config.currentPatient;

                self.selectedContactsKoTable.masked( true );
                currentPatient.save().then( onPatientSaved ).catch( onPatientErr );

                function onPatientSaved( /* result */ ) {
                    self.selectedContactsKoTable.masked( false );
                    callback( null );
                }

                function onPatientErr( err ) {
                    Y.log( 'Could not save patient: ' + JSON.stringify( err ), 'error', NAME );
                    callback( null );
                }

            };

            /**
             *  Format a contact into HTML to be displayed in a single table cell
             *
             *  @param  {Object}    contact     A plain basecontact object
             *  @return {String}
             */

            function contactToCard( contact ) {
                var
                    institutionTypes = Y.doccirrus.schemas.basecontact.types.BaseContactType_E.list,
                    html = contact.content,
                    bcType = contact.baseContactType,
                    typeAndJob = '',
                    address;

                function getPill( label ) {
                    return '<small><span style="float: right;" class="badge badge-secondary">' + label + '</span></small>';
                }

                if ( contact.addresses && contact.addresses[0] ) {
                    address = Y.dcforms.mapper.genericformmappers.getAddressAsString( contact.addresses[0] );
                    address = address.replace( new RegExp( "\n", 'g' ), '<br/>' );      //  eslint-disable-line no-control-regex
                    html = html + '<br/><small>' + address  + '</small>';
                }

                if ( bcType) {
                    typeAndJob = typeAndJob + Y.doccirrus.schemaloader.translateEnumValue( '-de', bcType, institutionTypes, bcType);
                }

                //  not really a contact, dummy object to allow patient to be included in serial letter
                if ( 'PATIENT' === bcType ) {
                    typeAndJob = i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.patient' );
                }

                if ( contact.workDescription ) {
                    if ( '' !== typeAndJob ) {
                        typeAndJob = typeAndJob + ', ';
                    }
                    typeAndJob = typeAndJob + contact.workDescription;
                }

                if ( '' !== typeAndJob ) {
                    html = html + '<br/><small>(' + typeAndJob + '</small>)';
                }

                if ( self.isPhysician( contact ) ) {
                    html = html + getPill( self.PHYSICIAN );
                }

                if ( self.isFamilyDoctor( contact ) ) {
                    html = html + getPill( self.FAMILYDOCTOR );
                }

                if ( self.isAdditionalContact( contact ) ) {
                    html = html + getPill( self.ADDITIONALCONTACTS );
                }

                if ( self.isInstitution( contact ) ) {
                    html = html + getPill( self.INSTITUTION );
                }

                return html;
            }

            function initAllContactsKoTable() {
                var
                    column, filterCss;

                self.allContactsKoTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        formRole: 'casefile-ko-insuite-table',
                        pdfTitle: i18n( 'InSuiteAdminMojit.tab_contacts.pdfTitle' ),
                        stateId: 'InSuiteAdminMojit-allContactsTable',
                        states: ['limit'],
                        fillRowsToLimit: true,
                        limit: 5,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.basecontact.read,
                        baseParams: { forSelectContactModal: true },
                        columns: [
                            {
                                forPropertyName: 'content',
                                label: i18n( 'InCaseMojit.select_contacts_modalJS.SEARCH_CONTACTS' ),
                                title: i18n( 'InCaseMojit.select_contacts_modalJS.SEARCH_CONTACTS' ),
                                visible: true,
                                renderer: function( meta ) {
                                    return contactToCard( meta.row );
                                },
                                isFilterable: true,
                                isSortable: true
                            },
                            {
                                forPropertyName: 'communications',
                                label: i18n( 'InCaseMojit.select_contacts_modalJS.EMAIL' ),
                                title: i18n( 'InCaseMojit.select_contacts_modalJS.EMAIL' ),
                                visible: true,
                                isFilterable: true,
                                isSortable: false,
                                renderer: function( meta ) {
                                    var communications,
                                        email;
                                    if( meta.value ) {
                                        communications = meta.value;
                                        email = Y.doccirrus.schemas.simpleperson.getEmail( communications );
                                        return email && email.value;
                                    }
                                    return '';
                                }
                            },
                            {
                                forPropertyName: '_id',
                                label: '',
                                title: '',
                                isFilterable: false,
                                isSortable: false,
                                visible: true,
                                width: '50px',
                                renderer: function( /* meta */ ) {
                                    return '<button class="btn"><i class="fa fa-angle-right"></i></button>';
                                }
                            }
                        ],

                        /**
                         *  Select button clicked, add this contact to the 'selected' table at right
                         *  @param meta
                         *  @param evt
                         */

                        onRowClick: function( meta /*, evt */ ) {
                            if( meta.col.forPropertyName !== '_id' ) {
                                return;
                            }

                            var
                                data = meta.row,
                                plainContacts = self.selectedContacts(),
                                i;

                            //  check that this contact has not been selected before
                            for ( i = 0; i < plainContacts.length; i++ ) {
                                if ( data._id === plainContacts[i]._id ) {
                                    return;
                                }
                            }

                            plainContacts.push( data );
                            self.selectedContacts( plainContacts );
                            self.setSelectedItem( data );
                        }
                    }
                } );

                //  Add magnifying glass icon to the filter input
                column = self.allContactsKoTable.columns()[0];
                filterCss = column.filterField.css();
                filterCss['form-control-search'] = true;
                column.filterField.css( filterCss );
            }

            function initSelectedContactsKoTable() {

                var
                    plainContacts = self.selectedContacts(), i;

                self.selectedContactsKoTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        formRole: 'casefile-ko-insuite-table',
                        pdfTitle: i18n( 'InSuiteAdminMojit.tab_contacts.pdfTitle' ),
                        stateId: 'InSuiteAdminMojit-selectedContactsTable',
                        states: ['limit'],
                        fillRowsToLimit: true,
                        limit: 5,
                        remote: false,
                        data: self.selectedContacts,
                        columns: [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                checkMode: 'multi',
                                label: ''
                            },
                            {
                                forPropertyName: 'content',
                                label: i18n( 'InCaseMojit.select_contacts_modalJS.BUSINESS_CARD' ),
                                title: i18n( 'InCaseMojit.select_contacts_modalJS.BUSINESS_CARD' ),
                                visible: true,
                                renderer: function( meta ) {
                                    return contactToCard( meta.row );
                                },
                                isFilterable: false,
                                isSortable: false
                            },
                            {
                                forPropertyName: 'baseContactType',
                                label: '',
                                title: '',
                                isFilterable: false,
                                isSortable: false,
                                visible: true,
                                width: '50px',
                                renderer: function( meta ) {
                                    //  patient cannot be assigned to itself, MOJ-12331
                                    if ( 'PATIENT' === meta.value ) { return ''; }
                                    return '<button class="btn"><i class="fa fa-pencil"></i></button>';
                                }
                            },
                            {
                                forPropertyName: '_id',
                                label: '',
                                title: '',
                                isFilterable: false,
                                isSortable: false,
                                visible: true,
                                width: '50px',
                                renderer: function( /* meta */ ) {
                                    return '<button class="btn"><i class="fa fa-trash"></i></button>';
                                }
                            }
                        ],
                        onRowClick: function( meta /*, evt */ ) {
                            var
                                data = meta.row,
                                plainContacts = self.selectedContacts(),
                                newContacts = [],
                                i;


                            //  delete button clicked, remove this contact from the 'selected' table
                            if( '_id' === meta.col.forPropertyName ) {
                                for ( i = 0; i < plainContacts.length; i++ ) {
                                    if ( data._id !== plainContacts[i]._id ) {
                                        newContacts.push( plainContacts[i] );
                                    }
                                }
                                self.selectedContacts( newContacts );
                            }

                            //  pencil button clicked, show modal to assign contact as physician, familyDoctor, etc
                            if( 'baseContactType' === meta.col.forPropertyName && 'PATIENT' !== data.baseContactType ) {
                                Y.doccirrus.modals.assignContact.show( {
                                    currentPatient: config.currentPatient,
                                    selectedContact: data,
                                    onAssigned: function( selectedContact, roles ) { self.assignContact( selectedContact, roles ); }
                                } );
                            }

                        }
                    }
                } );

                //  pre-select contact currently selected on activity, if possible
                if ( config.currentActivity && config.currentActivity.selectedContact() ) {
                    for ( i = 0; i < plainContacts.length; i++ ) {
                        if ( plainContacts[i]._id === config.currentActivity.selectedContact() ) {
                            self.setSelectedItem( plainContacts[i] );
                        }
                    }
                }
            }

            /**
             *  Select the given contact in the right size table
             *
             *  @param  {Object}    contact
             */

            self.setSelectedItem = function __setSelectedItem( contact ) {
                var
                    self = this,
                    columns = self.selectedContactsKoTable.columns(),
                    checkBoxColumn = columns[0];

                checkBoxColumn.uncheckAll();
                checkBoxColumn.checked( [ contact ] );
                self.checkedContact( contact );
            };

            /**
             *  Update which contact belongs in which role
             *
             *  Do not save patient immediately, wait for 'OK' or 'Serial Letter' buttons
             *
             *  @param  {Object}    selectedContact     Plain contact object
             *  @param  {Object}    roles
             *  @param  {Object}    roles.isPhysician
             *  @param  {Object}    roles.isFamilyDoctor
             *  @param  {Object}    roles.isInstitution
             *  @param  {Object}    roles.isAdditionalContact
             */

            self.assignContact = function( selectedContact, roles ) {
                var
                    currentPatient = config.currentPatient,
                    additionalContactsPlain;

                if ( roles.isPhysician ) {
                    currentPatient.physicians( [ selectedContact._id ] );
                } else {
                    if ( self.isPhysician( selectedContact ) ) {
                        currentPatient.physicians( [] );
                    }
                }

                if ( roles.isFamilyDoctor ) {
                    currentPatient.familyDoctor( selectedContact._id );
                } else {
                    if ( self.isFamilyDoctor( selectedContact ) ) {
                        currentPatient.familyDoctor( null );
                    }
                }

                if ( roles.isInstitution ) {
                    currentPatient.institution( selectedContact._id );
                } else {
                    if ( self.isInstitution( selectedContact ) ) {
                        currentPatient.institution( null );
                    }
                }

                if ( roles.isAdditionalContact ) {
                    //  if not already an additional contact, add it to the set
                    if ( !self.isAdditionalContact( selectedContact ) ) {
                        additionalContactsPlain = unwrap( currentPatient.additionalContacts ) || [];
                        additionalContactsPlain.push( selectedContact._id );
                        currentPatient.additionalContacts( additionalContactsPlain );
                    }
                } else {
                    if ( self.isAdditionalContact( selectedContact ) ) {
                        self.removeAdditionalContact( selectedContact );
                    }
                }

            };

            /**
             *  Remove an additional contact from the patient object
             *  @param selectedContact
             */

            self.removeAdditionalContact = function( selectedContact ) {
                var
                    currentPatient = config.currentPatient,
                    additionalContacts = unwrap( currentPatient.additionalContacts ),
                    newAdditionalContacts = [],
                    i;

                for ( i = 0; i < additionalContacts.length; i++ ) {
                    if ( additionalContacts[i] !== selectedContact._id ) {
                        newAdditionalContacts.push( additionalContacts[i] );
                    }
                }

                currentPatient.additionalContacts( newAdditionalContacts );
            };

            //  PUBLIC METHODS

            self.getFormTableDefinition = function __getFormTableDefinition() {
                var
                    self = this,
                    initializedColumns = self.selectedContactsKoTable.columns.peek(),
                    strCols = [ '**CONTACTS' ],
                    column,
                    columnName,
                    i;

                for ( i = 0; i < initializedColumns.length; i++ ) {
                    column = initializedColumns[i];
                    if ( 'checked' !== column.forPropertyName && column.visible() ) {
                        columnName = column.forPropertyName.split( '.' ).pop();
                        strCols.push( '*|' + columnName + '|String|' + unwrap( column.label ) + '|left|-1'  );
                    }
                }
                return strCols.join( '\n' );

            };

            self.getAsFormTable = function __getAsFormTable() {
                var
                    self = this,
                    initializedColumns = self.selectedContactsKoTable.columns.peek(),
                    column, row,
                    colKey,
                    cellMeta,
                    cellValue,
                    contactsData = [],

                    checkboxCol = self.selectedContactsKoTable.getComponentColumnCheckbox(),
                    checkedRows = checkboxCol.checked ? checkboxCol.checked() : null,
                    i, j;

                for ( i = 0; i < checkedRows.length; i++ ) {
                    row = checkedRows[i];
                    contactsData[i] = {};

                    for ( j = 0; j < initializedColumns.length; j++ ) {
                        column = initializedColumns[j];
                        colKey = column.forPropertyName.split( '.' ).pop();

                        cellValue = Y.doccirrus.commonutils.getObject( column.forPropertyName, false, row );
                        cellMeta = {
                            'value': cellValue,
                            'row': row
                        };

                        if ( 'checked' !== colKey ) {
                            contactsData[i][colKey] = column.renderer ? column.renderer( cellMeta ) : cellValue;
                        }
                    }
                }

                return contactsData;
            };

            self.destroy = function __destroy() {
                self.allContactsKoTable.dispose();
                self.selectedContactsKoTable.dispose();
            };

            init();
        }

        /**
         *  Show a modal for selecting contacts
         *
         *  @param  {Object}    options
         *  @param  {Object}    options.selectedContacts        Array of plain basecontact objects to pre-select
         *  @param  {Object}    options.currentPatient          Patient these contacts relate to
         *  @param  {Object}    options.currentActivity         Activity which may have selectedContact
         *  @param  {Boolean}   options.formTable               True fi results should be formatted for forms table
         *  @param  {Function}  options.onSelected              Called when user selects a contact
         *  @param  {Function}  options.onRequestSerialLetter   Called when user presses the mail merge / serienbrief button
         */

        function showContactsModal( options ) {

            var
                JADE_TEMPLATE = 'InCaseMojit/views/selectcontacts_modal',
                MAX_MODAL_WIDTH =  1400,

                btnCancel = Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                    label: CANCEL
                } ),

                btnSerial = Y.doccirrus.DCWindow.getButton( 'GENERATE', {
                    isPrimary: true,
                    label: i18n( 'InCaseMojit.select_contacts_modalJS.SERIAL_LETTER' ),
                    action: onSerialClick
                } ),

                btnSelect = Y.doccirrus.DCWindow.getButton( 'OK', {
                    isPrimary: true,
                    label: SELECT,
                    action: onSelectionComplete
                } ),

                //  as wide as comfortably possible on smaller screens
                modalWidth = Math.ceil( 0.9 * $( window ).width() ),

                modalOptions = {
                    className: 'DCWindow-SelectContacts',
                    bodyContent: null,                                              //  added from template
                    title:  i18n( 'InCaseMojit.select_contacts_modalJS.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: ( ( modalWidth > MAX_MODAL_WIDTH ) ? MAX_MODAL_WIDTH : modalWidth ),
                    height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: [ 'close', 'maximize' ],
                        footer: options.isFromMailActivity ? [ btnCancel, btnSelect ] : [ btnCancel, btnSerial, btnSelect ]
                    },
                    after: { visibleChange: onModalVisibilityChange }
                },

                modal,              //  eslint-disable-line no-unused-vars
                template,
                contactsViewModel,
                selectedContactSubscription,
                selectedContact;

            Promise.resolve( Y.doccirrus.jsonrpc.api.jade.renderFile( { path: JADE_TEMPLATE } ) )
                .then( onTemplateLoaded )
                .catch( logUnhandled );

            function onTemplateLoaded( response ) {
                template = ( response && response.data ) ? response.data : null;
                modalOptions.bodyContent = Y.Node.create( template );

                contactsViewModel = new ContactsViewModel( options );

                modal = new Y.doccirrus.DCWindow( modalOptions );

                ko.applyBindings( contactsViewModel, modalOptions.bodyContent.getDOMNode() );

                subscribeToSelectedContact();
            }

            /**
             *  Enable / disable footer buttons according to selection
             */

            function subscribeToSelectedContact() {
                selectedContactSubscription = contactsViewModel.checkedContact.subscribe( function onSelectionChanged( newVal ) {
                    var
                        selectButton = modal.getButton( 'OK' ),
                        serialButton = modal.getButton( 'GENERATE' );

                    if ( !newVal ) {
                        selectedContact = null;
                        selectButton.set( 'disabled', true );
                        if( serialButton ) {
                            serialButton.set( 'disabled', false );
                        }

                    } else {
                        selectedContact = newVal;
                        selectButton.set( 'disabled', false );
                        if( serialButton ) {
                            serialButton.set( 'disabled', false );
                        }
                    }
                } );
            }

            function onModalVisibilityChange( event ) {
                if( !event.newVal ) {
                    ko.cleanNode( modalOptions.bodyContent.getDOMNode() );
                    if ( selectedContactSubscription ) {
                        selectedContactSubscription.dispose();
                    }
                    contactsViewModel.destroy();
                }
            }

            function onSerialClick() {
                var
                    koTable = contactsViewModel.selectedContactsKoTable,
                    checkboxColumn = koTable.columns()[0],
                    contacts = checkboxColumn.checked();
               //     contacts = contactsViewModel.selectedContacts();

                if ( 0 === contacts.length ) {
                    Y.log( 'No contacts selected cannot make serial letter', 'debug', NAME );
                    return;
                }

                //  make the first contact the selected one
                selectedContact = contacts[0];

                if ( options.onRequestSerialLetter ) {
                    options.onRequestSerialLetter( contacts, selectedContact );
                }

                contactsViewModel.savePatient( function() {
                    modal.close();
                } );
            }

            function onSelectionComplete() {
                var
                    formTableDef,
                    contactsData,

                    koTable = contactsViewModel.selectedContactsKoTable,
                    checkboxColumn = koTable.columns()[0],
                    checkedContacts = checkboxColumn.checked(),

                    contacts = contactsViewModel.selectedContacts();

                //  make the first checked contact the selected contact
                if ( checkedContacts[0] ) {
                    selectedContact = checkedContacts[0];
                }

                if ( options.onSelected ) {
                    if( options.isFromMailActivity ) {
                        options.onSelected( checkedContacts );
                    } else {
                        if( options.formTable ) {
                            formTableDef = contactsViewModel.getFormTableDefinition();
                            contactsData = contactsViewModel.getAsFormTable( true );
                            options.onSelected( formTableDef, contactsData, contacts, selectedContact );
                        } else {
                            options.onSelected( contacts, selectedContact );
                        }
                    }

                } else {
                    Y.log( 'onSelected Callback not given to contacts table modal.', 'warn', NAME );
                }
                if( options.isFromMailActivity ) {
                    //in this case we will save current patient later
                    modal.close();
                } else {
                    contactsViewModel.savePatient( function() {
                        modal.close();
                    } );
                }
            }

        }

        Y.namespace( 'doccirrus.modals' ).selectContacts = {
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
            'inCaseUtils',
            'DcAssignContactModal'
        ]
    }
);
