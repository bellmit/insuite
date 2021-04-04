/**
 * User: do
 * Date: 02/02/16  12:56
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment, _ */

'use strict';

YUI.add( 'crselectpatientmodal', function( Y, NAME ) {
        var i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            SURENAME = i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
            FORENAME = i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
            DOB = i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
            SEX = i18n( 'InCaseMojit.patient_browserJS.label.SEX' ),
            INSURANCE = i18n( 'InCaseMojit.patient_browserJS.placeholder.INSURANCE' ),
            CONTACT = i18n( 'InCaseMojit.patient_browserJS.placeholder.CONTACT' ),
            ASSIGN_SEVERAL = i18n( 'InCaseMojit.patient_browserJS.message.ASSIGN_SEVERAL_PATIENTS' ),
            INSURANCEID = i18n( 'activity-schema.KBVUtility2Approval_T.insuranceId.i18n' );

        function getDatatable( type, data ) {
            var
                allOrKim = ['all','kim'].includes( type ),
                nonKim = type !== 'kim';

            return Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    fillRowsToLimit: false,
                    remote: allOrKim,
                    proxy: allOrKim ? Y.doccirrus.jsonrpc.api.patient.getForPatientBrowser : undefined,
                    data: (allOrKim ? [] : (data || [])),
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            checkMode: 'single',
                            allToggleVisible: false
                        },
                        {
                            forPropertyName: 'lastname',
                            label: SURENAME,
                            isSortable: true,
                            isFilterable: true,
                            sortInitialIndex: 0,
                            width: '35%',
                            renderer: function( meta ) {
                                var data = meta.row;
                                return data.lastname + (data.nameaffix ? ', ' + data.nameaffix : '') + (data.title ? ', ' + data.title : '');
                            }
                        },
                        {
                            forPropertyName: 'firstname',
                            label: FORENAME,
                            isSortable: true,
                            isFilterable: true,
                            width: '35%'
                        },
                        {
                            forPropertyName: 'dob',
                            label: DOB,
                            width: '142px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            renderer: function( meta ) {
                                var data = meta.row;
                                if( data.kbvDob ) {
                                    return data.kbvDob;
                                }
                                return moment.utc( data.dob ).local().format( 'DD.MM.YYYY' );
                            }
                        },
                        {
                            forPropertyName: 'gender',
                            visible: nonKim,
                            label: SEX,
                            width: '60px',
                            renderer: function( meta ) {
                                var gender = meta.value;

                                switch( gender ) {
                                    case 'MALE':
                                        return 'm';
                                    case 'FEMALE':
                                        return 'w';
                                    case 'UNDEFINED':
                                        return 'x';
                                    case 'VARIOUS':
                                        return 'd';
                                    default:
                                        return 'u';
                                }

                            },
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect',
                                options: Y.Array.filter( Y.doccirrus.schemas.patient.types.Gender_E.list, function( item ) {
                                    return Boolean( item.val );
                                } ).map( function( item ) {
                                    var gender = item.val;

                                    switch( gender ) {
                                        case 'MALE':
                                            return {val: gender, i18n: 'm'};
                                        case 'FEMALE':
                                            return {val: gender, i18n: 'w'};
                                        case 'UNDEFINED':
                                            return {val: gender, i18n: 'x'};
                                        case 'VARIOUS':
                                            return {val: gender, i18n: 'd'};
                                        default:
                                            return {val: gender, i18n: 'u'};
                                    }
                                } ),
                                optionsCaption: '',
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'insuranceStatus.insuranceId',
                            label: INSURANCEID,
                            visible: (type === 'kim'),
                            isSortable: true,
                            isFilterable: true,
                            width: '25%',
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    insuranceStatus = data.insuranceStatus;

                                if( Array.isArray( insuranceStatus ) && insuranceStatus.length ) {
                                    return insuranceStatus.filter( function( entry ) {
                                        return entry.type === 'PRIVATE';
                                    }).map( function( entry ) {
                                        return entry.insuranceId;
                                    } ).join( ', ' );
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'insuranceStatus.type',
                            label: INSURANCE,
                            width: '136px',
                            visible: nonKim,
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    insuranceStatus = data.insuranceStatus;

                                if( Array.isArray( insuranceStatus ) && insuranceStatus.length ) {
                                    return insuranceStatus.map( function( entry ) {
                                        return Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', entry.type, 'i18n', '' );
                                    } ).join( ', ' );
                                }

                                return '';
                            },
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.person.types.Insurance_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'communications.value',
                            label: CONTACT,
                            visible: nonKim,
                            width: '30%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.communications;

                                if( Array.isArray( value ) ) {
                                    value = value.map( function( communication ) {
                                        return communication.value;
                                    } );
                                    return value.join( ',<br>' );
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'pseudonym',
                            label: i18n( 'patient-schema.Patient_T.pseudonym.i18n' ),
                            width: '120px',
                            isSortable: true,
                            isFilterable: true,
                            visible: false
                        },
                        {
                            label: i18n( 'patient-schema.Patient_T.partnerCount.i18n' ),
                            width: '70px',
                            isSortable: false,
                            isFilterable: false,
                            visible: nonKim,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    linkedPartners = ( data.mirrorPatientId ? [data.mirrorPatientId ] : [] ).concat( data.additionalMirrorPatientIds || [] ) ;
                                if( linkedPartners.length ) {
                                    return linkedPartners.length;
                                }
                                return '';
                            }
                        }
                    ]
                }
            } );
        }

        function createModel( config, aDCWindow ) {
            var patients = config.patients || [],
                publicInsurance,
                publicCardSwipe,
                model = {
                    all: getDatatable( config.kim ? 'kim' : 'all' ),
                    some: getDatatable( 'some', patients ),
                    current: ko.observable(),
                    kim: config.kim,
                    kimPatient: config.parsedKIMPatient && config.parsedKIMPatient[0]
                };
            if( config.kim ){
                model = Object.assign( model, {
                    caseFolders: ko.observableArray( [] ),
                    selectedPatientId: ko.observable(),
                    selectedFolder: ko.observable(),
                    patientCommonData: ko.observable(),
                    patientInsuranceData: ko.observable(),
                    patientAddressData: ko.observable(),
                    initCaseSelection: function() {
                        var
                            self = this;

                        self.selectCaseFolderI18n = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.selectCaseFolder' );
                        self.updatePatientDataI18n = i18n( 'IncaseAdminMojit.rules.actions.labels.PATIENT' );
                        self.patientCommonDataI18n = i18n( 'InCaseMojit.patient_detailJS.subnav.MAIN_DATA' );
                        self.patientInsuranceDataI18n = i18n( 'InCaseMojit.patient_detailJS.subnav.INSURANCE' );
                        self.patientAddressDataI18n = i18n( 'catalog-schema.INSURANCE_COMMON_T.addresses' );
                        self.selectedFolder.subscribe( function( selectedFolder ) {
                            aDCWindow.getButton( 'select' ).set( 'disabled', !selectedFolder );
                        } );
                        self.selectedPatientId.subscribe( function( selectedPatientId ) {
                            aDCWindow.getButton( 'diff' ).set( 'disabled', !selectedPatientId || !self.kimPatient );
                        } );
                        self.all.getComponentColumnCheckbox().checked.subscribe( function( selectedPatient ) {
                            self.patientCommonData( false );
                            self.patientInsuranceData( false );
                            self.patientAddressData( false );
                            if( selectedPatient && selectedPatient.length ) {
                                publicInsurance = (selectedPatient[0].insuranceStatus || []).find( function( element ) {
                                    return element.type === 'PUBLIC';
                                } );
                            }
                            if( selectedPatient && selectedPatient.length && publicInsurance ) {
                                self.selectedPatientId( selectedPatient[0]._id );
                                publicCardSwipe = publicInsurance.cardSwipe;
                                if( publicCardSwipe && moment(publicCardSwipe).isBetween( moment().startOf( 'quarter' ), moment().endOf( 'quarter') ) ){
                                    aDCWindow.getButton( 'diff' ).set( 'disabled', true );
                                }

                                Y.doccirrus.jsonrpc.api.casefolder.read( {
                                    noBlocking: true,
                                    query: {
                                        patientId: selectedPatient[0]._id,
                                        type: 'PUBLIC'
                                    }
                                }).done(function( folders ) {
                                    folders = folders && folders.data || [];
                                    self.caseFolders( folders.filter( function( folder ) {
                                        return (
                                            !folder.imported &&
                                            !folder.additionalType
                                        );
                                    } ) );
                                    if( !self.caseFolders().length ){
                                        self.caseFolders.push( { title: 'inBox'} );
                                    }
                                }).fail( function( error ) {
                                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                } );
                            } else {
                                self.selectedPatientId( null );
                                self.caseFolders( [] );
                                self.selectedFolder( null );
                                aDCWindow.getButton( 'select' ).set( 'disabled', true );
                            }
                        } );
                    }
                } );

                model.initCaseSelection();
            }

            return model;
        }

        function showDiff( patientId, patientData ) {

            function getTemplate() {
                return Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'CardreaderMojit/views/patientdiff-window'} )
                    .then( function( response ) {
                        return response.data;
                    } );
            }


            //this.closeModal();

            function getDiff( patientId, patientData ) {
                return new Promise( function( resolve, reject ) {
                    Y.doccirrus.jsonrpc.api.patient.getPatientDiff( {
                        data: {
                            patientId: patientId,
                            patientData: patientData
                        }
                    } ).done( function( result ){
                        resolve( result && result.data );
                    }).fail( function( error ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        reject( error );
                    } );
                } );
            }

            var diff;
            getDiff( patientId, patientData ).then( function( compareResult ){
                diff = compareResult;
                return getTemplate();
            } ).then( function( template ) {
                var bodyContent = Y.Node.create( template ),
                    dcWindow,
                    patientDiffModel = KoViewModel.createViewModel( {
                        NAME: 'PatientDiffModel',
                        config: {data: {diff: diff}}
                    } );

                dcWindow = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-PatientDiffModal',
                    bodyContent: bodyContent,
                    title: 'Kartendaten',
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: 'xlarge',
                    height: 600,
                    centered: true,
                    modal: false,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CLOSE', {
                                isDefault: true,
                                action: function() {
                                    dcWindow.close();
                                }
                            } )
                        ]
                    }
                } );
                ko.applyBindings( patientDiffModel, bodyContent.getDOMNode() );
            } ).catch( function( err ) {
                Y.log( 'could not get template for patient diff window: ' + err, 'error', NAME );
            } );

        }


        /**
         *
         * @param config
         * @param {boolean} [config.noCreate=false] won't show create button.
         */
        function show( config ) {
            var
                node = Y.Node.create( '<div></div>' ),
                aDCWindow,
                noCreate = Boolean(config.noCreate),
                model;

            function templateLoaded() {
                aDCWindow = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-SelectPatient',
                    bodyContent: node,
                    title: i18n( 'utils_clientJS.selectPatient.dialog.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_WARN,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    minHeight: 400,
                    minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            {
                                label: i18n( 'utils_clientJS.selectPatient.dialog.showAll' ),
                                name: 'all',
                                action: function() {
                                    model.current( 'all' );
                                    aDCWindow.getButton( 'some' ).show();
                                    aDCWindow.getButton( 'all' ).hide();
                                }
                            },
                            {
                                label: i18n( 'utils_clientJS.selectPatient.dialog.showLess' ),
                                name: 'some',
                                action: function() {
                                    model.current( 'some' );
                                    aDCWindow.getButton( 'some' ).hide();
                                    aDCWindow.getButton( 'all' ).show();
                                }
                            },
                            {
                                label: i18n( 'utils_clientJS.selectPatient.dialog.showDiff' ),
                                name: 'diff',
                                disabled: true,
                                action: function() {
                                    showDiff( model.selectedPatientId(), config.parsedKIMPatient && config.parsedKIMPatient[0] );
                                }
                            },
                            Y.doccirrus.DCWindow.getButton( 'SELECT', {
                                isDefault: true,
                                name: 'select',
                                disabled: function(){
                                    return config.kim;
                                },
                                action: function( e ) {
                                    e.target.button.disable();
                                    var current = model.current(),
                                        patient,
                                        componentColumnCheckbox = model[current].getComponentColumnCheckbox(),
                                        selectedPatients = componentColumnCheckbox.checked(),
                                        linkedPartners = [];
                                    if( 1 !== selectedPatients.length ) {
                                        e.target.button.enable();
                                        Y.doccirrus.DCWindow.notice( {
                                            type: 'warn',
                                            message: 'Bitte prüfen Sie ihre Auswahl'
                                        } );
                                    } else {
                                        patient = selectedPatients[0];
                                        linkedPartners = ( patient.mirrorPatientId ? [patient.mirrorPatientId ] : [] ).concat( patient.additionalMirrorPatientIds || [] ) ;
                                        if(!config.kim && linkedPartners.length){
                                            Y.doccirrus.DCWindow.confirm( {
                                                title: i18n( 'DCWindow.notice.title.info' ),
                                                message: ASSIGN_SEVERAL,
                                                callback: function ( dialog ) {
                                                    if( dialog.success ) {
                                                        aDCWindow.close();
                                                        config.callback( {action: 'select', patient: patient} );
                                                    } else {
                                                        e.target.button.enable();
                                                    }
                                                }
                                            } );
                                        } else {
                                            aDCWindow.close();
                                            config.callback( Object.assign(
                                                {action: 'select', patient: patient},
                                                config.kim ? {
                                                    caseFolder: model.selectedFolder(),
                                                    update: {
                                                        common: model.patientCommonData(),
                                                        insurance: model.patientInsuranceData(),
                                                        address: model.patientAddressData()
                                                    }
                                                }: {}
                                            ) );
                                        }
                                    }
                                }
                            } ),
                            {
                                label: i18n( 'InSuiteAdminMojit.tab_contacts.overview.button.CREATE' ),
                                name: 'create',
                                action: function( e ) {
                                    e.target.button.disable();
                                    aDCWindow.close();
                                    config.callback( {action: 'create', patient: config.patientFromCard} );
                                }
                            }
                        ]
                    }
                } );

                if (noCreate || config.kim) {
                    aDCWindow.getButton( 'create' ).hide();
                }

                if (!config.kim) {
                    aDCWindow.getButton( 'diff' ).hide();
                }

                model = createModel( config, aDCWindow );

                if( config.patients.length ) {
                    model.current( 'some' );
                    aDCWindow.getButton( 'some' ).hide();
                } else {
                    model.current( 'all' );
                    aDCWindow.getButton( 'some' ).hide();
                    aDCWindow.getButton( 'all' ).hide();
                }

                ko.applyBindings( model, node.getDOMNode().querySelector( '#cr-select-patient' ) );
            }

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'selectpatient_modal',
                'CardreaderMojit',
                {},
                node,
                templateLoaded
            );

        }

        Y.namespace( 'doccirrus.modals' ).crSelectPatient = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'PatientDiffModel'
        ]
    }
)
;
