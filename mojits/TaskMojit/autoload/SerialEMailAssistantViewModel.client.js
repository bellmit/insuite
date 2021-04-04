/*global YUI, ko, moment, Promise, $ */

YUI.add( 'SerialEMailAssistantViewModel', function( Y, NAME ) {

    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        userLang = Y.doccirrus.comctl.getUserLang(),
        unwrap = ko.unwrap,
        MISSING_MANDATORY_VALUE = i18n( 'validations.message.MISSING_MANDATORY_VALUE' );

    function makeContactLink( data ) {
        return ['<a href="contacts#/', data.contactId, '" target="_blank">', data.contactName || data.contactId, '</a>'].join( '' );
    }

    function notifiyUser( errors, sentMails ) {
        var content = i18n( 'TaskMojit.SerialEMailModal.successMessage', {
                data: {
                    num: sentMails.length,
                    of: errors.length + sentMails.length,
                    typeOfRecipients: i18n( 'basecontact-schema.BaseContact_T.contacts.i18n' )
                }
            } ),
            errorContent = i18n( 'TaskMojit.SerialEMailModal.errorMessage', {
                data: {
                    typeOfRecipients: i18n( 'basecontact-schema.BaseContact_T.contacts.i18n' )
                }
            } );

        if( sentMails.length ) {
            content += '\n' + sentMails.map( makeContactLink ).join( '\n' );
            Y.doccirrus.DCSystemMessages.addMessage( {
                messageId: 'mailActivitiesMessage',
                content: content
            } );
        }

        if( errors.length ) {
            errorContent += '\n' + errors.map( makeContactLink ).join( '\n' );
            Y.doccirrus.DCSystemMessages.addMessage( {
                messageId: 'mailActivitiesMessageError',
                content: errorContent,
                level: 'ERROR'
            } );
        }
    }

    /**
     * @constructor
     * @class SerialEMailAssistantViewModel
     */
    function SerialEMailAssistantViewModel() {
        SerialEMailAssistantViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( SerialEMailAssistantViewModel, KoViewModel.getDisposable(), {

        formId: null,
        caseFolder: null,
        doctor: null,
        patientsList: ko.observableArray(),
        contactsList: ko.observableArray(),
        generateActivities: null,
        selectedPatientsIds: null,
        selectedContactsIds: null,
        patientsWithEmail: [],
        contactsWithEmail: [],
        // totalSteps: Object.freeze( 3 ),
        pdfFile: null,
        activityIds: null,
        showProgressBar: ko.observable( true ),
        progressBarValue: ko.observable( 0 ),
        progressBarWidth: ko.observable( '0%' ),

        formTemplate: null,

        isValid: function() {
            return false;
        },

        /**
         * @param {String} modelConfig.origin - CONTACTS || TASK
         * @param {Array} [modelConfig.selectedPatientsIds]
         * @param {Array} [modelConfig.selectedPatients]
         * @param {Array} [modelConfig.selectedContacts]
         * @param {Array} [modelConfig.selectedContactsIds]
         * @param {Array} modelConfig.locations
         * @param {Object} modelConfig.employee
         * @param {Array} [modelConfig] specialitiesList - necessary for contacts branch, optional for the rest
         *
         * @protected
         */
        initializer: function( {
                                   origin: origin,
                                   selectedPatientsIds: selectedPatientsIds = [],
                                   selectedPatients: selectedPatients = [],
                                   selectedContacts: selectedContacts = [],
                                   selectedContactsIds: selectedContactsIds = [],
                                   locations: locations = [],
                                   employee: employee = {},
                                   specialitiesList: specialitiesList
                               } ) {
            var self = this,
                emailValidation = Y.doccirrus.validations.common.email[0],
                mandatoryValidation = Y.doccirrus.validations.common.mandatory[0];

            switch( origin ) {
                case 'TASKS':
                    self.totalSteps = Object.freeze( 3 );
                    break;
                case 'CONTACTS':
                    self.totalSteps = Object.freeze( 2 );
                    break;
                default:
                    self.totalSteps = Object.freeze( 3 );
                    break;
            }

            self.origin = origin;
            self.currentStepIndex = ko.observable( 0 );
            self.formId = ko.observable();
            self.caseFolder = ko.observable( '_LATEST' );       //  placeholder for casefolder lookup on server
            self.doctor = ko.observable();
            self.generateActivities = ko.observable( true );
            self.selectedPatientsIds = ko.observableArray( selectedPatientsIds );
            self.selectedPatients = ko.observableArray( selectedPatients );
            self.selectedContactsIds = ko.observableArray( selectedContactsIds );
            self.selectedContacts = ko.observableArray( selectedContacts );
            self.locations = locations;
            self.employee = employee;
            self.specialitiesList = specialitiesList;

            // used for KO modal.pug if statement
            self.isPatientTable = function() {
                return (origin !== 'CONTACTS');
            };
            self.isContactTable = function() {
                return (origin === 'CONTACTS');
            };

            self.pdfFile = ko.observable( '' );
            self.activityIds = ko.observable( '' );

            self.formTemplate = null;

            self.showFormDiv = ko.computed( function() {
                return 1 === self.currentStepIndex() || 2 === self.currentStepIndex();
            } );

            self.locationTemplates = self.locations.map( function( location ) {
                return {
                    val: location && location._id,
                    i18n: location && location.locname
                };
            } );
            self.locationTemplate = ko.observable();
            self.locationName = ko.computed( function() {
                var locationTemplateId = self.locationTemplate(),
                    locationName = '';
                self.locations.some( function( location ) {
                    if( location && location._id === locationTemplateId ) {
                        locationName = location.locname;
                        return true;
                    }
                } );
                return locationName;
            } );

            self.emailAddress = ko.observable();
            self.emailAddress.hasError = ko.observable();
            self.emailAddress.validationMessages = ko.observableArray();
            self.emailAddress.readOnly = ko.observable( true );

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
                return !hasError;
            }

            self.emailAddress.subscribe( function( newValue ) {
                validateEmail( newValue );
            } );

            self.subject = ko.observable( '' );
            self.subject.hasError = ko.observable();
            self.subject.validationMessages = ko.observableArray();
            self.subject.subscribe( function( newValue ) {
                validateSubject( newValue );
            } );

            function validateSubject( newValue ) {
                if( newValue === '' ) {
                    self.subject.hasError( true );
                    self.subject.validationMessages( [MISSING_MANDATORY_VALUE] );
                } else {
                    self.subject.hasError( false );
                    self.subject.validationMessages( [] );
                }
            }

            self.emailContent = ko.observable( '' );
            self.emailContent.hasError = ko.observable();
            self.emailContent.validationMessages = ko.observableArray();
            self.emailContent.subscribe( function( newValue ) {
                validateEmailContent( newValue );
            } );

            function validateEmailContent( newValue ) {
                if( newValue === '' ) {
                    self.emailContent.hasError( true );
                    self.emailContent.validationMessages( [MISSING_MANDATORY_VALUE] );
                } else {
                    self.emailContent.hasError( false );
                    self.emailContent.validationMessages( [] );
                }
            }

            self.senderName = ko.observable( self.employee.firstname + ' ' + self.employee.lastname );
            self.senderEmail = ko.observable();
            self.senderEmailAddresses = [];

            if( self.employee && self.employee.communications ) {
                self.employee.communications.forEach( function( com ) {
                    if( ["EMAILPRIV", "EMAILJOB"].indexOf( com.type ) >= 0 ) {
                        self.senderEmailAddresses.push( {
                            val: self.senderEmailAddresses.length + 1,
                            i18n: com.value,
                            mail: com.value
                        } );
                    }
                } );
            }

            self.locations.forEach( function( location ) {
                if( location && location.email ) {
                    self.senderEmailAddresses.push( {
                        val: self.senderEmailAddresses.length + 1,
                        i18n: location.email + ' (' + location.locname + ')',
                        mail: location.email
                    } );
                }
            } );

            self.initStep0( {origin: origin} );

            self.initDoctorSelect();
        },

        initDoctorSelect: function() {
            var
                self = this,
                locations = self.locations || [],
                currentUser = self.employee,
                currentUserLocationIds = (currentUser.locations || []).map( function( location ) {
                    return location._id;
                } ),
                data = [];

            locations.filter( function( location ) {
                return currentUserLocationIds.includes( location._id );
            } ).forEach( function( location ) {
                var locname = location.locname,
                    locId = location._id;
                location.employees.filter( function( employee ) {
                    return 'PHYSICIAN' === employee.type && 'ACTIVE' === employee.status;
                } ).forEach( function( employee ) {
                    data.push( {
                        id: [employee._id, '-', locId].join( '' ),
                        text: [employee.lastname, ', ', employee.firstname, ' (', locname, ')'].join( '' )
                    } );
                } );
            } );

            data.sort( function( a, b ) {
                return a.text.toLocaleLowerCase().localeCompare(b.text.toLocaleLowerCase());
            } );

            self.select2Doctor = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return unwrap( self.doctor );
                    },
                    write: function( $event ) {
                        self.doctor( $event.val );
                    }
                } ) ),
                select2: {
                    allowClear: true,
                    width: '100%',
                    placeholder: i18n( 'InCaseMojit.casefile_browser.placeholder.DOCUMENTING_FOR' ),
                    minimumInputLength: 0,
                    data: data
                }
            };
        },

        initStep0: function( {origin: origin} ) {
            var self = this;

            switch( origin ) {
                case "CONTACTS":
                    return new Promise( function( resolve ) {
                        if( !self.contactsTable ) {
                            self.initContactsTable();
                        }

                        self.isValid = function() {
                            return unwrap( self.selectedContactsIds ).length !== 0;
                        };
                        resolve();
                    } );
                default:
                    return new Promise( function( resolve ) {
                        if( !self.patientsTable ) {
                            self.initPatientsTable();
                        }

                        self.isValid = function() {
                            return unwrap( self.selectedPatientsIds ).length !== 0;
                        };
                        resolve();
                    } );
            }

        },

        initStep1: function() {
            var self = this;

            return new Promise( function( resolve ) {

                self.isValid = function() {
                    return !!unwrap( self.emailContent ).length && !!unwrap( self.subject ).length;
                };

                if( self.select2Casefolder ) {
                    resolve();
                }

                var cfTypes = Y.doccirrus.schemas.casefolder.types.Additional_E.list.map( function( item ) {
                    return {
                        id: item.val,
                        text: item.i18n
                    };
                } );

                cfTypes.unshift( {'id': '_LATEST', 'text': i18n( 'TaskMojit.SerialEMailModal.latestCaseFolder' )} );

                self.select2Casefolder = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            return unwrap( self.caseFolder );
                        },
                        write: function( $event ) {
                            self.caseFolder( $event.val );
                        }
                    } ) ),
                    select2: {
                        allowClear: true,
                        placeholder: ' ',
                        width: '100%',
                        data: cfTypes
                    }
                };

                if( !unwrap( self.subject ).length ) {
                    self.subject.hasError( true );
                    self.subject.validationMessages( [MISSING_MANDATORY_VALUE] );
                }
                if( !unwrap( self.emailContent ).length ) {
                    self.emailContent.hasError( true );
                    self.emailContent.validationMessages( [MISSING_MANDATORY_VALUE] );
                }

                resolve();
            } );
        },

        initStep2: function() {

            var
                self = this;

            return new Promise( function( resolve ) {

                self.isValid = function() {
                    return true;
                };

                if( self.select2FormDC ) {
                    resolve();
                }

                var
                    emptyFolder = {
                        id: '',
                        text: self.LBL_TITLE = i18n( 'FormEditorMojit.forms_tree.NO_ENTRIES' ),
                        formVersion: ''
                    };

                Y.doccirrus.jsonrpc.api.formfolder.getFoldersWithForms().then( onFormListLoaded ).fail( onFormListErr );

                function onFormListLoaded( result ) {

                    var
                        //  we don't want the Archive or Recovered folders here
                        schm = Y.doccirrus.schemas.formfolder,
                        excludeFolders = [schm.recoveryFolderId, schm.archivFolderId],

                        folders = result.data,
                        dataGroupedDC = [],
                        dataGroupedUser = [],
                        i;

                    //  add root folders, with subfolders nested beneath
                    for( i = 0; i < folders.length; i++ ) {
                        if( !folders[i].parent || '' === folders[i].parent ) {
                            addFolder( folders[i], '', [] );
                        }
                    }

                    function addFolder( folder, path, parents ) {
                        var j, k, dcForms = [], userForms = [];

                        if( -1 !== excludeFolders.indexOf( folders[i]._id ) ) {
                            //  this folder is not shown in this context
                            return;
                        }

                        //  sanity check for circular references
                        if( -1 !== parents.indexOf( folder._id ) ) {
                            Y.log( 'Breaking infinte loop on circular folder structure.', 'error', NAME );
                            return;
                        }

                        parents.push( folder._id );

                        for( j = 0; j < folder.forms.length; j++ ) {
                            if( folder.forms[j].isReadOnly ) {
                                dcForms.push( formToChild( folder.forms[j] ) );
                            } else {
                                userForms.push( formToChild( folder.forms[j] ) );
                            }
                        }

                        if( dcForms.length === 0 ) {
                            dcForms.push( emptyFolder );
                        }

                        if( userForms.length === 0 ) {
                            userForms.push( emptyFolder );
                        }

                        userForms.sort( compareFormsAlphabetical );
                        dcForms.sort( compareFormsAlphabetical );   //

                        if( dcForms.length > 0 || folder.subfolders.length > 0 ) {
                            dataGroupedDC.push( {text: path + folder[userLang], children: dcForms} );
                        }

                        if( userForms.length > 0 || folder.subfolders.length > 0 ) {
                            dataGroupedUser.push( {text: path + folder[userLang], children: userForms} );
                        }

                        //  recursively add child folders

                        for( j = 0; j < folder.subfolders.length; j++ ) {
                            for( k = 0; k < folders.length; k++ ) {

                                if( folders[k]._id === folder.subfolders[j] ) {
                                    addFolder( folders[k], path + '.\\', parents );
                                }
                            }
                        }
                    }

                    function compareFormsAlphabetical( a, b ) {
                        var
                            aText = a.text.toLowerCase(),
                            bText = b.text.toLowerCase();

                        if( aText < bText ) {
                            return -1;
                        }
                        if( aText > bText ) {
                            return 1;
                        }
                        return 0;
                    }

                    function formToChild( form ) { //
                        return {
                            id: form._id,
                            text: form.title[userLang] + ' v' + form.version,
                            formVersion: form.version
                        };
                    }

                    self.select2FormDC = self.createSelect2Form( dataGroupedDC, 'Doc Cirrus Formulare' );
                    self.select2FormPRAC = self.createSelect2Form( dataGroupedUser, 'Praxis Formulare' );                    //  TODO: translateme
                    resolve();
                }

                function onFormListErr( err ) {
                    Y.log( 'Problem loading form folder list: ' + JSON.stringify( err ), 'warn', NAME );
                }

            } );
        },

        createSelect2Form: function( data, placeholder ) {
            var self = this;

            return {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            formId = unwrap( self.formId );
                        return formId;
                    },
                    write: function( $event ) {
                        self.formId( $event.val );

                        Y.dcforms.createTemplate( {
                            patientRegId: '',
                            canonicalId: self.formId(),
                            formVersionId: '',
                            divId: 'divFormRender',
                            il8nDict: Y.dcforms.il8nDict,
                            doRender: true,
                            callback: onFormTemplateLoaded
                        } );

                        function onFormTemplateLoaded( err, template ) {
                            if( err ) {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'error',
                                    message: err
                                } );
                                return;
                            }

                            template.highlightEditable = true;

                            //  resize the form into available space
                            template.resize( $( '#divFormRender' ).width(), function() {
                                template.render( Y.dcforms.nullCallback );
                            } );

                            self.formTemplate = template;
                        }

                    }
                } ) ),
                select2: {
                    allowClear: true,
                    placeholder: placeholder,
                    width: '100%',
                    data: data
                }
            };
        },

        isPreviousButtonEnabled: function() {
            return unwrap( this.currentStepIndex ) > 0;
        },

        nextStep: function( indexOfNextStep ) {
            var
                self = this,
                next = parseInt( indexOfNextStep, 10 ) || (self.currentStepIndex() + 1),
                nextStepFnName = 'initStep' + next;

            if( self[nextStepFnName] ) {
                self[nextStepFnName]().then( function() {
                    self.currentStepIndex( next );
                } ).then( reInitializeForm );
            } else {
                throw new Error( 'Wrong next step function name!' );
            }

            function reInitializeForm() {

                if( self.currentStepIndex() !== 1 && self.currentStepIndex() !== 2 ) {
                    //  no form is shown on first and last step
                    return;
                }

                var
                    jqRenderDiv = $( '#divFormRender' ),
                    i;

                if( self.formId() && '' !== self.formId() && self.formTemplate ) {

                    if( jqRenderDiv.html() || '' === jqRenderDiv.html() ) {
                        //  recreate form structure divs if they have been cleared by navigation to step 0
                        Y.log( '(re)Initializing form container from ' + self.formId(), 'debug', NAME );

                        if( self.formTemplate.isInDOM ) {
                            self.formTemplate.removeFromDOM();
                        }

                        self.formTemplate.domInitComplete = false;
                        self.formTemplate.addToDOM();

                        for( i = 0; i < self.formTemplate.pages.length; i++ ) {
                            if( !self.formTemplate.pages[i].isInDOM ) {
                                Y.log( '(re)Initializing form page ' + i + ' from ' + self.formId(), 'debug', NAME );
                                self.formTemplate.pages[i].addToDOM();
                                self.formTemplate.pages[i].createFixedCanvassses();
                            }
                        }
                    }

                    Y.log( 'Redrawing form after tab change: ' + self.currentStepIndex, 'debug', NAME );
                    self.formTemplate.render( Y.dcforms.nullCallback );
                }

            }

        },

        isLastStep: function() {
            return this.totalSteps === (unwrap( this.currentStepIndex ) + 1);
        },

        prevStep: function() {
            var
                self = this,
                nextStepFnName = 'initStep' + (self.currentStepIndex() - 1);

            if( self[nextStepFnName] ) {
                self[nextStepFnName]( {origin: self.origin} ).then( function() {
                    self.currentStepIndex( self.currentStepIndex() - 1 );
                } );
            } else {
                throw new Error( 'Wrong prev step function name!' );
            }
        },

        getCurrentStep: function() {
            return ko.unwrap( this.currentStepIndex );
        },

        /**
         * Handles creating an activity for the entity receiving the email
         * @param {String} origin - needed to split the branches of CONTACTS || TASK
         * @returns {*}
         */
        save: function( {origin: origin} ) {
            var
                self = this,
                pdfOptions = {
                    formId: unwrap( self.formId ),
                    formState: self.formTemplate && self.formTemplate.toDict(),
                    removeActivities: !unwrap( self.generateActivities ),
                    forCaseFolder: self.caseFolder(),
                    forDoctor: self.doctor(),
                    formName: self.formTemplate && self.formTemplate.name.de,
                    typeOfSerialCommunication: 'EMAIL',
                    subject: self.subject(),
                    emailContent: self.emailContent(),
                    origin: origin
                },
                data = {
                    baseContactIds: unwrap( self.selectedContactsIds ).filter( function( id ) {
                        return self.contactsWithEmail.indexOf( id ) !== -1;
                    } ),
                    senderEmail: self.senderEmailAddresses.length && self.senderEmailAddresses[self.senderEmail() - 1].mail,
                    content: self.emailContent(),
                    subject: self.subject(),
                    currentLocationId: self.locationTemplate(),
                    origin: origin
                };

            switch( origin ) {
                case 'CONTACTS':
                    return Y.doccirrus.jsonrpc.api.activity.sendEmailsFromContactId( {
                        data: data
                    } ).then( function( res ) {
                        var errors = (res && res.data && Array.isArray( res.data.errors )) ? res.data.errors : [],
                            sentEmails = (res && res.data && Array.isArray( res.data.sentEmails )) ? res.data.sentEmails : [];
                        notifiyUser( errors, sentEmails );
                    } ).fail( function( err ) {
                        Y.log( 'sendEmailsFromPatientId failed: ' + err, 'warn', NAME );
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'mailActivitiesError',
                            content: JSON.stringify( err ),
                            level: 'ERROR'
                        } );
                    } );
                default:
                    pdfOptions.patientIds = unwrap( self.selectedPatientsIds ).filter( function( id ) {
                        return self.patientsWithEmail.indexOf( id ) !== -1;
                    } );

                    return Y.doccirrus.jsonrpc.api.task.createActivitiesForPatients( {options: pdfOptions} )
                        .then( onMailmergeRequested )
                        .fail( onMailmergeError );
            }

            function onMailmergeRequested( result ) {
                Y.log( 'Requested serial email generation from server: ' + JSON.stringify( result ), 'debug', NAME );
                self.requestId = result.data && result.data.requestId;
            }

            function onMailmergeError( err ) {
                Y.log( 'Error generating mailmerge: ' + JSON.stringify( err ), 'warn', NAME );
                Y.doccirrus.DCSystemMessages.addMessage( {
                    messageId: 'mailActivitiesError',
                    content: "Error: " + JSON.stringify( err ),
                    level: 'ERROR'
                } );
            }
        },

        /**
         *
         * @param {Array} idList            list of IDs
         * @param {String} tableName        name of the table
         * @param {String} emailListName    name of the emailList
         */
        preselectRows: function( {idList: idList, tableName: tableName, emailListName: emailListName} ) {
            if( !idList.length ) {
                return;
            }

            var
                self = this,
                rows = ko.utils.peekObservable( self[tableName].data ),
                rowsFiltered = [],
                rowHasEmail;

            if( rows && 0 < rows.length ) {
                rowsFiltered = rows.filter( function( row ) {
                    return row && (idList.indexOf( row._id ) !== -1);
                } );
            }

            rowsFiltered.forEach( function( row ) {
                rowHasEmail = row.communications && row.communications.length > 0 && row.communications.find( function( communication ) {
                    return communication.type && communication.type.length > 0 && communication.type.includes( 'EMAIL' );
                } );
                if( rowHasEmail && row.checked === undefined ) {
                    row.checked = true;
                    self[emailListName].push( row._id );
                    self[tableName].getComponentColumnCheckbox().check( row );
                }
            } );
        },

        initContactsTable: function() {
            var
                self = this,
                // userFilter = Y.doccirrus.utils.getFilter(),     //  empty object?
                filterQuery = {
                    _id: {$in: unwrap( self.selectedContactsIds )},
                    "communications.0": {$exists: true} // only if the contact has an email
                },
                selectedContacts = unwrap( self.selectedContactsIds );

            // if( userFilter.location ) {
            //     filterQuery["insuranceStatus.locationId"] = userFilter.location;
            // }

            Y.doccirrus.jsonrpc.api.basecontact.read( {query: filterQuery} )
                .then( function( response ) {
                    self.contactsList( response.data );
                    setTimeout( function() {
                        self.preselectRows( {
                            idList: selectedContacts,
                            tableName: "contactsTable",
                            emailListName: "contactsWithEmail"
                        } );
                    }, 250 );
                } );

            self.contactsTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'InSuiteAdminMojit-contactsTable',
                    renderFooter: true,
                    data: self.contactsList,
                    sortersLimit: 2,
                    limit: 100,
                    limitList: [10, 20, 30, 40, 50],
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: ''
                        },
                        {
                            forPropertyName: 'baseContactType',
                            label: i18n( 'basecontact-schema.BaseContact_T.baseContactType.i18n' ),
                            title: i18n( 'basecontact-schema.BaseContact_T.baseContactType.i18n' ),
                            width: '160px',
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.value;

                                if( !value ) {
                                    return '';
                                }

                                return Y.doccirrus.schemaloader.translateEnumValue( '-de', value, Y.doccirrus.schemas.basecontact.types.BaseContactType_E.list, value );
                            },
                            isFilterable: true,
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.basecontact.types.BaseContactType_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'institutionType',
                            label: i18n( 'basecontact-schema.InstitutionContact_T.institutionType.i18n' ),
                            title: i18n( 'basecontact-schema.InstitutionContact_T.institutionType.i18n' ),
                            width: '160px',
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.value;

                                if( !value ) {
                                    return '';
                                }

                                return Y.doccirrus.schemaloader.translateEnumValue( '-de', value, Y.doccirrus.schemas.basecontact.types.InstitutionContactType_E.list, value );
                            },
                            isFilterable: true,
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.basecontact.types.InstitutionContactType_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'content',
                            label: i18n( 'basecontact-schema.BaseContact_T.content.i18n' ),
                            title: i18n( 'basecontact-schema.BaseContact_T.content.i18n' ),
                            isFilterable: true,
                            visible: false,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'contacts',
                            label: i18n( 'PhysicianBaseContactModel_clientJS.title.CONTACTS' ),
                            title: i18n( 'PhysicianBaseContactModel_clientJS.title.CONTACTS' ),
                            visible: true,
                            isFilterable: true,
                            isSortable: false,
                            renderer: function( meta ) {
                                var contacts = meta.value;
                                return contacts && contacts.filter( function( item ) {
                                    return '' !== item.trim();
                                } ).join( ', ' );
                            }
                        },
                        {
                            forPropertyName: 'addresses.0.addon',
                            label: i18n( 'person-schema.Address_T.addon' ),
                            title: i18n( 'person-schema.Address_T.addon' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            width: '120px',
                            pdfRenderer: function( meta ) {
                                var exists = (meta.row.addresses && meta.row.addresses[0] && meta.row.addresses[0].addon);
                                return exists ? meta.row.addresses[0].addon : '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.0.city',
                            label: i18n( 'person-schema.Address_T.city' ),
                            title: i18n( 'person-schema.Address_T.city' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: true,
                            pdfRenderer: function( meta ) {
                                var exists = (meta.row.addresses && meta.row.addresses[0] && meta.row.addresses[0].city);
                                return exists ? meta.row.addresses[0].city : '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.0.zip',
                            label: i18n( 'person-schema.Address_T.zip' ),
                            title: i18n( 'person-schema.Address_T.zip' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: true,
                            pdfRenderer: function( meta ) {
                                var exists = (meta.row.addresses && meta.row.addresses[0] && meta.row.addresses[0].zip);
                                return exists ? meta.row.addresses[0].zip : '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.0.houseno',
                            label: i18n( 'person-schema.Address_T.houseno' ),
                            title: i18n( 'person-schema.Address_T.houseno' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: true,
                            pdfRenderer: function( meta ) {
                                var exists = (meta.row.addresses && meta.row.addresses[0] && meta.row.addresses[0].houseno);
                                return exists ? meta.row.addresses[0].houseno : '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.0.street',
                            label: i18n( 'person-schema.Address_T.street' ),
                            title: i18n( 'person-schema.Address_T.street' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: true,
                            pdfRenderer: function( meta ) {
                                var exists = (meta.row.addresses && meta.row.addresses[0] && meta.row.addresses[0].street);
                                return exists ? meta.row.addresses[0].street : '';
                            }
                        },
                        {
                            forPropertyName: 'communications',
                            label: i18n( 'basecontact-schema.BaseContact_T.communications.i18n' ),
                            title: i18n( 'basecontact-schema.BaseContact_T.communications.i18n' ),
                            visible: true,
                            isFilterable: true,
                            isSortable: false,
                            renderer: function( meta ) {
                                var comm = meta.value,
                                    result = comm.filter( function( item ) {
                                        return item.preferred;
                                    } );
                                if( result[0] ) {
                                    return result[0].value || '';
                                } else {
                                    return (comm[0] && comm[0].value) ? comm[0].value : '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'bsnrs.0',
                            label: i18n( 'physician-schema.Physician_T.bsnrs.i18n' ),
                            title: i18n( 'physician-schema.Physician_T.bsnrs.i18n' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            pdfRenderer: function( meta ) {
                                var exists = (meta.row.bsnrs && meta.row.bsnrs[0]);
                                return exists ? meta.row.bsnrs[0] : '';
                            }
                        },
                        {
                            forPropertyName: 'officialNo',
                            label: i18n( 'physician-schema.Physician_T.officialNo.i18n' ),
                            title: i18n( 'physician-schema.Physician_T.officialNo.i18n' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false
                        },
                        {
                            forPropertyName: 'expertise',
                            label: i18n( 'physician-schema.Physician_T.expertise.i18n' ),
                            title: i18n( 'physician-schema.Physician_T.expertise.i18n' ),
                            visible: true,
                            isFilterable: true,
                            width: '140px',
                            isSortable: true,
                            renderer: function( meta ) {
                                var expertise = meta.value,
                                    specialitiesList = self.specialitiesList.slice(),
                                    oldExpertiseList = Y.doccirrus.schemas.basecontact.types.Expert_E.list,
                                    expertiseValues = [],
                                    result;
                                oldExpertiseList.forEach( function( oldExpertise ) {
                                    specialitiesList.push( {id: oldExpertise.val, text: oldExpertise.i18n} );
                                } );
                                if( Array.isArray( expertise ) && expertise[0] ) {
                                    expertise.forEach( function( entry ) {
                                        expertiseValues.push( specialitiesList.find( function( item ) {
                                            return item.id === entry;
                                        } ) );
                                    } );
                                }
                                if( Array.isArray( expertiseValues ) && expertiseValues.length ) {
                                    result = expertiseValues.filter( function( expertise ) {
                                        return Boolean( expertise && expertise.text );
                                    } ).map( function( expertise ) {
                                        return expertise.text;
                                    } );
                                    return result.join( ',<br>' );
                                }
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'basecontact', 'Expert_E', expertise, 'i18n', '' );
                            }
                        },
                        {
                            forPropertyName: 'firstname',
                            label: i18n( 'person-schema.Person_T.firstname.i18n' ),
                            title: i18n( 'person-schema.Person_T.firstname.i18n' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: true
                        },
                        {
                            forPropertyName: 'lastname',
                            label: i18n( 'person-schema.Person_T.lastname.i18n' ),
                            title: i18n( 'person-schema.Person_T.lastname.i18n' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: true
                        },
                        {
                            forPropertyName: 'talk',
                            label: i18n( 'physician-schema.Physician_T.talk.i18n' ),
                            title: i18n( 'physician-schema.Physician_T.talk.i18n' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.person.types.Talk_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Talk_E', meta.value, 'i18n', '' );
                            }
                        }
                    ]
                }
            } );

            self.selectedContactsIds = self.addDisposable( ko.computed( function() {
                var
                    componentColumnCheckbox = self.contactsTable.getComponentColumnCheckbox(),
                    checked = componentColumnCheckbox.checked();

                if( checked && checked.length ) {
                    return checked.map( function( item ) {
                        return item._id;
                    } );
                } else {
                    return [];
                }

            } ) );
        },

        initPatientsTable: function() {
            var
                self = this,
                userFilter = Y.doccirrus.utils.getFilter(),     //  empty object?
                filterQuery = {_id: {$in: unwrap( self.selectedPatientsIds )}},
                selectedPatients = unwrap( self.selectedPatientsIds );

            if( userFilter.location ) {
                filterQuery["insuranceStatus.locationId"] = userFilter.location;
            }

            Y.doccirrus.jsonrpc.api.patient.getForPatientBrowser( {query: filterQuery} )
                .then( function( data ) {
                    self.patientsList( data.data );
                    setTimeout( function() {
                        self.preselectRows( {
                            idList: selectedPatients,
                            tableName: "patientsTable",
                            emailListName: "patientsWithEmail"
                        } );
                    }, 250 );
                } );

            self.patientsTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'TaskMojit-SerialEMail-patientTable',
                    renderFooter: true,
                    data: self.patientsList,
                    //proxy: Y.doccirrus.jsonrpc.api.patient.getForPatientBrowser,
                    sortersLimit: 2,
                    limit: 100,
                    limitList: [10, 20, 30, 40, 50],
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            visible: true,
                            uncheckOnReload: false
                        },
                        {
                            forPropertyName: 'talk',
                            label: i18n( 'patient-schema.Talk_E.i18n' ),
                            title: i18n( 'patient-schema.Talk_E.i18n' ),
                            width: '10%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                return Y.doccirrus.schemaloader.translateEnumValue(
                                    '-de',
                                    meta.value,
                                    Y.doccirrus.schemas.patient.types.Talk_E.list,
                                    meta.value
                                );
                            }
                        },
                        {
                            forPropertyName: 'title',
                            label: i18n( 'InSuiteAdminMojit.tab_employees.employeesTable.label.TITLE' ),
                            isFilterable: true,
                            isSortable: true,
                            width: '5%'
                        },
                        {
                            forPropertyName: 'lastname',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                            width: '15%',
                            isSortable: true,
                            sortInitialIndex: 0,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var data = meta.row;
                                return data.lastname + (data.nameaffix ? ', ' + data.nameaffix : '');
                            }
                        },
                        {
                            forPropertyName: 'firstname',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                            width: '15%',
                            isSortable: true,
                            sortInitialIndex: 1,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'dob',
                            label: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                            width: '10%',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'InCaseMojit.patient_browserJS.label.DOB' )
                                }
                            },
                            renderer: function( meta ) {
                                var data = meta.row;
                                if( data.kbvDob ) {
                                    return data.kbvDob;
                                }
                                return moment.utc( data.dob ).local().format( 'DD.MM.YYYY' );
                            }
                        },
                        {
                            forPropertyName: 'communications.value',
                            label: i18n( 'person-schema.Communication_E.EMAILPRIV' ),
                            title: i18n( 'person-schema.Communication_E.EMAILPRIV' ),
                            width: '20%',
                            isSortable: false,
                            isFilterable: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.communications,
                                    emailOfPatient;

                                if( Array.isArray( value ) && value.length > 0 ) {
                                    emailOfPatient = value.find( function( communication ) {
                                        return communication.type && communication.type.length > 0 && communication.type.includes( 'EMAILPRIV' );
                                    } );
                                    return (emailOfPatient && emailOfPatient.value) || '';
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'communications.value',
                            label: i18n( 'person-schema.Communication_E.EMAILJOB' ),
                            title: i18n( 'person-schema.Communication_E.EMAILJOB' ),
                            width: '20%',
                            isSortable: false,
                            isFilterable: false,
                            queryFilterType: Y.doccirrus.DCQuery.IN_OPERATOR,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.communications,
                                    emailOfPatient;

                                if( Array.isArray( value ) && value.length > 0 ) {
                                    emailOfPatient = value.find( function( communication ) {
                                        return communication.type && communication.type.length > 0 && communication.type.includes( 'EMAILJOB' );
                                    } );
                                    return (emailOfPatient && emailOfPatient.value) || '';
                                }

                                return '';
                            }
                        }
                    ]
                }
            } );

            self.selectedPatientsIds = self.addDisposable( ko.computed( function() {
                var
                    componentColumnCheckbox = self.patientsTable.getComponentColumnCheckbox(),
                    checked = componentColumnCheckbox.checked();

                if( checked && checked.length ) {
                    return checked.map( function( item ) {
                        return item._id;
                    } );
                } else {
                    return [];
                }

            } ) );

        }
    }, {
        NAME: 'SerialEMailAssistantViewModel',
        ATTRS: {
            selectedPatientsIds: {
                value: [],
                lazyAdd: false
            },
            selectedContactsIds: {
                value: [],
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( SerialEMailAssistantViewModel );

}, '0.0.1', {
    requires: [
        'DCWindow',
        'doccirrus',
        'KoViewModel',
        'KoUI-all',
        'KoSchemaValue',
        'dcforms-template',
        'dcforms-packageutils',
        'casefolder-schema',
        'JsonRpcReflection-doccirrus',
        'JsonRpc'
    ]
} );
