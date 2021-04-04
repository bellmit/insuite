/*global YUI, ko, moment, Promise, $ */

YUI.add( 'SerialLetterAssistantViewModel', function( Y, NAME ) {

    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        userLang = Y.doccirrus.comctl.getUserLang(),
        unwrap = ko.unwrap;

    /**
     * @constructor
     * @class SerialLetterAssistantViewModel
     */
    function SerialLetterAssistantViewModel() {
        SerialLetterAssistantViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( SerialLetterAssistantViewModel, KoViewModel.getDisposable(), {

        formId: null,
        caseFolder: null,
        doctor: null,
        patientsList: ko.observableArray(),
        generateActivities: null,
        selectedPatientsIds: null,
        totalSteps: Object.freeze( 5 ),
        isWaitingForPdf: ko.observable(),
        resultDisplay: null,
        pdfFile: null,
        zipId: null,
        activityIds: null,
        showProgressBar: ko.observable( true ),
        progressBarValue: ko.observable( 0 ),
        progressBarWidth: ko.observable( '0%' ),

        formTemplate: null,

        isValid: function() {
            return false;
        },

        /**
         * @param {Object} modelConfig - configuration object
         *
         * @protected */
        initializer: function ActivityCreateButtonsViewModel_initializer( modelConfig ) {
            var
                self = this;

            self.currentStepIndex = ko.observable( 0 );
            self.formId = ko.observable();
            self.isWaitingForPdf( false );
            self.caseFolder = ko.observable( '_LATEST' );       //  placeholder for casefolder lookup on server
            self.doctor = ko.observable();
            self.generateActivities = ko.observable( true );
            self.selectedPatientsIds = ko.observableArray( modelConfig.selectedPatientsIds || [] );
            self.locations = modelConfig.locations || [];
            self.employee = modelConfig.employee || {};

            self.resultDisplay = ko.observable( '' );
            self.pdfFile = ko.observable( '' );
            self.zipId = ko.observable( '' );
            self.activityIds = ko.observable( '' );

            self.formTemplate = null;

            self.showFormDiv = ko.computed( function() {
                if ( 1 === self.currentStepIndex() ) { return true; }
                if ( 2 === self.currentStepIndex() ) { return true; }
                return false;
            } );

            self.initSocketListeners();
            self.initStep0();
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

        initSocketListeners: function() {
            var self = this;

            //  add socket listener for async PDFs
            //  note that this was moved from ActivityHeadingButtonsViewModel.client.js where ws was unreliable
            Y.doccirrus.communication.on( {
                event: 'onSerialLetterProgress',
                done: function onSerialLetterProgress( message ) {
                    var data = message.data && message.data[0];
                    self.setProgress( data.percent, data.label);
                },
                handlerId: 'TaskMojit_onSerialLetterProgress'
            } );

            //  add socket listener for async PDFs
            //  note that this was moved from ActivityHeadingButtonsViewModel.client.js where ws was unreliable
            Y.doccirrus.communication.on( {
                event: 'onSerialLetterComplete',
                done: function onSerialLetterComplete( message ) {
                    var result = message.data && message.data[0] && message.data[0].data;

                    var
                        pdfFile = '/pdf/' + result.diskFile,
                        pdfUrl = Y.doccirrus.infras.getPrivateURL( pdfFile ),
                        pdfIframe = '<iframe src="' + pdfUrl + '" style="width: 100%; height: 810px" frameborder="none"></iframe>';

                    self.pdfFile( result.diskFile || '' );
                    self.zipId( result.zipId || '' );
                    if (result.patients) {
                        self.activityIds( Object.keys( result.patients ).map(function(key){return result.patients[key].activityId;}));
                    }
                    self.showProgressBar( false );
                    self.resultDisplay( pdfIframe );
                },
                handlerId: 'TaskMojit_onSerialLetterComplete'
            } );

            Y.doccirrus.communication.on( {
                event: 'onSerialLetterError',
                done: function onSerialLetterError( message ) {
                    var result = message.data && message.data[0];
                    self.resultDisplay( '<pre>' + JSON.stringify( result ) + '</pre>' );
                },
                handlerId: 'TaskMojit_onSerialLetterError'
            } );

        },

        initStep0: function() {
            var
                self = this;

            return new Promise( function( resolve ) {
                if( !self.patientsTable ) {
                    self.initPatientsTable();
                }

                self.isValid = function() {
                    return unwrap( self.selectedPatientsIds ).length !== 0;
                };
                resolve();
            } );
        },

        initStep1: function() {

            var
                self = this;

            return new Promise( function( resolve ) {

                self.isValid = function() {
                    return unwrap( self.formId );
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
                        excludeFolders = [ schm.recoveryFolderId, schm.archivFolderId ],

                        folders = result.data,
                        dataGroupedDC = [],
                        dataGroupedUser = [],
                        i;

                    //  add root folders, with subfolders nested beneath
                    for ( i = 0; i < folders.length; i++ ) {
                        if ( !folders[i].parent || '' === folders[i].parent ) {
                            addFolder( folders[i], '', [] );
                        }
                    }

                    function addFolder( folder, path, parents ) {
                        var j, k, dcForms = [], userForms = [];

                        if ( -1 !== excludeFolders.indexOf( folders[i]._id ) ) {
                            //  this folder is not shown in this context
                            return;
                        }

                        //  sanity check for circular references
                        if ( -1 !== parents.indexOf( folder._id ) ) {
                            Y.log( 'Breaking infinte loop on circular folder structure.', 'error', NAME );
                            return;
                        }

                        parents.push( folder._id );

                        for ( j = 0; j < folder.forms.length; j++ ) {
                            if ( folder.forms[j].isReadOnly ) {
                                dcForms.push( formToChild( folder.forms[j] ) );
                            } else {
                                userForms.push( formToChild( folder.forms[j] ) );
                            }
                        }

                        if ( dcForms.length === 0 ) {
                            dcForms.push( emptyFolder );
                        }

                        if ( userForms.length === 0 ) {
                            userForms.push( emptyFolder );
                        }

                        userForms.sort( compareFormsAlphabetical );
                        dcForms.sort( compareFormsAlphabetical );   //

                        if ( dcForms.length > 0 || folder.subfolders.length > 0 ) {
                            dataGroupedDC.push( { text: path + folder[ userLang ], children: dcForms } );
                        }

                        if ( userForms.length > 0 || folder.subfolders.length > 0 ) {
                            dataGroupedUser.push( { text: path + folder[ userLang ], children: userForms } );
                        }

                        //  recursively add child folders

                        for ( j = 0; j < folder.subfolders.length; j++ ) {
                            for ( k = 0; k < folders.length; k++ ) {

                                if ( folders[k]._id === folder.subfolders[j] ) {
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
                            text: form.title[ userLang ] + ' v' + form.version,
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

        initStep2: function() {

            var
                self = this;

            return new Promise( function( resolve ) {
                if( self.select2Casefolder ) {
                    resolve();
                }

                var cfTypes = Y.doccirrus.schemas.casefolder.types.Additional_E.list.map( function( item ) {
                    return {
                        id: item.val,
                        text: item.i18n
                    };
                } );

                cfTypes.unshift( { 'id': '_LATEST', 'text': i18n( 'TaskMojit.SerialLetterModal.latestCaseFolder' ) } );

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

                resolve();
            } );
        },

        initStep3: function() {
            var
                self = this;
            return Promise.resolve( true ).then( function() {
                self.isWaitingForPdf( true );
                setTimeout( function() {
                    Y.doccirrus.utils.showLoadingMask( Y.one( '.serial-letter-modal__loading-mask' ) );
                }, 300 );
            } );
        },

        initStep4: function() {
            var
                self = this;
            return Promise.resolve( true ).then( function() {
                self.isWaitingForPdf( false );
            } );
        },

        createSelect2Form: function( data, placeholder ) {
            var
                self = this;

            return {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            formId = unwrap( self.formId );
                        return formId;
                    },
                    write: function( $event ) {
                        self.formId( $event.val );

                        Y.dcforms.createTemplate({
                            'patientRegId': '',
                            'canonicalId': self.formId(),
                            'formVersionId': '',
                            'divId': 'divFormRender',
                            'il8nDict': Y.dcforms.il8nDict,
                            'doRender': true,
                            'callback': onFormTemplateLoaded
                        });

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
                            template.resize( $('#divFormRender').width(), function() {
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

        nextStep: function() {
            var self = this,
                nextStepFnName = 'initStep' + (self.currentStepIndex() + 1);

            if( self[nextStepFnName] ) {
                self[nextStepFnName]().then( function() {
                    self.currentStepIndex( self.currentStepIndex() + 1 );
                } ).then( reInitializeForm );
            } else {
                throw new Error( 'Wrong next step function name!' );
            }

            function reInitializeForm() {

                if ( self.currentStepIndex() !== 1 && self.currentStepIndex() !== 2 ) {
                    //  no form is shown on first and last step
                    return;
                }

                var
                    jqRenderDiv = $('#divFormRender'),
                    i;

                if ( self.formId() && '' !== self.formId() && self.formTemplate ) {

                    if ( jqRenderDiv.html() || '' === jqRenderDiv.html() ) {
                        //  recreate form structure divs if they have been cleared by navigation to step 0
                        Y.log( '(re)Initializing form container from ' + self.formId(), 'debug', NAME );

                        if ( self.formTemplate.isInDOM ) {
                            self.formTemplate.removeFromDOM();
                        }

                        self.formTemplate.domInitComplete = false;
                        self.formTemplate.addToDOM();

                        for  ( i = 0; i < self.formTemplate.pages.length; i++ ) {
                            if ( !self.formTemplate.pages[i].isInDOM ) {
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
            return this.totalSteps === ( unwrap( this.currentStepIndex ) + 1 );
        },

        prevStep: function() {
            var
                self = this,
                nextStepFnName = 'initStep' + (self.currentStepIndex() - 1);

            if( self[nextStepFnName] ) {
                self[nextStepFnName]().then( function() {
                    self.currentStepIndex( self.currentStepIndex() - 1 );
                } );
            } else {
                throw new Error( 'Wrong prev step function name!' );
            }
        },

        getCurrentStep: function() {
            return ko.unwrap( this.currentStepIndex );
        },

        getIsWaitingForPDF: function() {
            return ko.unwrap( this.isWaitingForPdf );
        },

        save: function() {
            var
                self = this,
                pdfOptions= {
                    formId: unwrap( self.formId ),
                    formState: self.formTemplate.toDict(),
                    patientIds: unwrap( self.selectedPatientsIds ),
                    removeActivities: !unwrap( self.generateActivities ),
                    forCaseFolder: self.caseFolder(),
                    forDoctor: self.doctor(),
                    formName: self.formTemplate.name.de,
                    typeOfSerialCommunication: 'LETTER'
                };

            self.resultDisplay( i18n( 'TaskMojit.SerialLetterModal.steps.STEP_4.GEN_PDF' ) );
            self.showProgressBar( true );

            return Y.doccirrus.jsonrpc.api.task
                .createActivitiesForPatients( { options: pdfOptions } )
                .then( onMailmergeRequested )
                .fail( onMailmergeError );

            function onMailmergeRequested( result ) {
                Y.log( 'Requested serial letter generation from server: ' + JSON.stringify( result ), 'debug', NAME );
            }

            function onMailmergeError( err ) {
                Y.log( 'Error generating mailmerge: ' + JSON.stringify( err ), 'warn', NAME );
            }
        },

        preselectPatients: function( patientsIds ) {

            if( !patientsIds.length ) {
                return;
            }

            var
                self = this,
                rows = ko.utils.peekObservable( self.patientsTable.rows ),
                rowsFiltered = [];

            if( rows && 0 < rows.length ) {
                rowsFiltered = rows.filter( function( row ) {
                    return row && (patientsIds.indexOf( row._id ) !== -1);
                } );
            }

            rowsFiltered.forEach( function( row ) {
                self.patientsTable.getComponentColumnCheckbox().check( row );
            } );
        },

        initPatientsTable: function() {

            var
                self = this,
                userFilter = Y.doccirrus.utils.getFilter(),     //  empty object?
                filterQuery = { _id: { $in: unwrap( self.selectedPatientsIds ) } },
                selectedPatients = unwrap( self.selectedPatientsIds );


            if ( userFilter.location ) {
                filterQuery[ "insuranceStatus.locationId" ] = userFilter.location;
            }

            Y.doccirrus.jsonrpc.api.patient.getForPatientBrowser( { query: filterQuery } ).then( function( data ) {
                self.patientsList( data.data );
                setTimeout( function() {
                    self.preselectPatients( selectedPatients );
                }, 250 );
            } );

            self.patientsTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'TaskMojit-serialLetter-patientTable',
                    renderFooter: false,
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
                            width: '10%'
                        },
                        {
                            forPropertyName: 'lastname',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                            width: '35%',
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
                            width: '35%',
                            isSortable: true,
                            sortInitialIndex: 1,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'dob',
                            label: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                            width: '170px',
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
                            forPropertyName: 'addresses.street',
                            label: i18n( 'person-schema.Address_T.street' ),
                            title: i18n( 'person-schema.Address_T.street' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].street;
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.zip',
                            label: i18n( 'person-schema.Address_T.zip' ),
                            title: i18n( 'person-schema.Address_T.zip' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].zip;
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.country',
                            label: i18n( 'person-schema.Address_T.country' ),
                            title: i18n( 'person-schema.Address_T.country' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].country;
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

            self.openPrintDialog = function() {
                Y.doccirrus.modals.printPdfModal.show( {
                    'canonicalId': self.formId(),
                    'cacheFile': self.pdfFile(),
                    'documentUrl': '/pdf/' + self.pdfFile(),
                    'activityIds': unwrap(self.activityIds)
                } );
            };

            self.downloadZip = function() {
                var
                    zipId = self.zipId(),
                    zipUrl = Y.doccirrus.infras.getPrivateURL( '/zip/' + zipId );

                if ( '' === zipId ) { return; }
                window.open( zipUrl );
            };

            self.setProgress = function( percent, label ) {
                self.progressBarValue( parseInt( percent, 10 ) );
                self.progressBarWidth( parseInt( percent, 10 ) + '%' );
                self.resultDisplay( label );
            };

        }
    }, {
        NAME: 'SerialLetterAssistantViewModel',
        ATTRS: {
            selectedPatientsIds: {
                value: [],
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( SerialLetterAssistantViewModel );

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
