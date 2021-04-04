/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'PatientSectionDocumentsViewModel', function( Y, NAME ) {
    'use strict';

    var
    // unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
    // ignoreDependencies = ko.ignoreDependencies,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientSectionViewModel = KoViewModel.getConstructor( 'PatientSectionViewModel' ),
        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager;

    /**
     * @constructor
     * @class PatientSectionDocumentsViewModel
     * @extends PatientSectionViewModel
     */
    function PatientSectionDocumentsViewModel() {
        PatientSectionDocumentsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientSectionDocumentsViewModel, PatientSectionViewModel, {
        templateName: 'PatientSectionDocumentsViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.regenEnabled = ko.observable( true );

            self.initDocumentTable();

            self.titleDocumentsI18n = i18n( 'InCaseMojit.document_browser.title.DOCUMENTS' );
        },
        /** @protected */
        destructor: function() {
        },
        documentKoTable: null,
        initDocumentTable: function() {
            var
                self = this,
                documentKoTable,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                patientName = currentPatient._getNameSimple();

            self.documentKoTable = documentKoTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {

                    //  use patient header when printing
                    formRole: 'casefile-patient-folder',
                    pdfTitle: i18n( 'InCaseMojit.casefile_detailJS.pdfTitle' ),
                    pdfFile: i18n( 'InCaseMojit.casefile_detailJS.pdfTitle' ) + patientName,
                    pdfFields: {
                        'patientName': patientName,
                        'dob': moment( peek( currentPatient.dob ) ).format( 'DD.MM.YYYY' ),
                        'insuranceNames': currentPatient.getInsuranceNames()
                    },

                    stateId: 'CaseFileMojit-patientDetail-documentKoTable',
                    states: ['limit'],
                    remote: self.addDisposable( ko.computed( function() {
                        return !currentPatient.isNew();
                    } ) ),
                    proxy: Y.doccirrus.jsonrpc.api.document.read,
                    baseParams: {
                        query: {

                            /*,     attachedTo replaced by patientId in MOJ-9190
                            attachedTo: self.addDisposable( ko.computed( function() {
                                if( !currentPatient.isNew() ) {
                                    return peek( currentPatient._id );
                                }
                            } ) ),
                            */

                            patientId: self.addDisposable( ko.computed( function() {
                                if( !currentPatient.isNew() ) {
                                    return peek( currentPatient._id );
                                }
                            } ) ),

                            contentType: { $ne: 'dc/form' },
                            checkHidePdfSettings: true
                        }
                    },
                    selectMode: 'none',
                    columns: [
                        {
                            forPropertyName: 'accessBy',
                            label: i18n( 'InCaseMojit.patient_detailJS.columns.accessBy.label' ),
                            title: i18n( 'InCaseMojit.patient_detailJS.columns.accessBy.label' ),
                            width: '100px',
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    accessBy = data.accessBy,
                                    accessByUser = Array.isArray( accessBy ) && Y.Array.filter( accessBy, function( accessId ) {
                                            return accessId === peek( currentPatient._id );
                                        } ).length,
                                    link = '<a href="javascript:;" class="btn {cls} btn-block btn-xs"{disabled}>{text}</a>',
                                    span = '<span class="btn {cls} btn-block btn-xs" style="cursor: not-allowed">{text}</span>',
                                    linkCls = 'btn-danger',
                                    linkText = i18n( 'InCaseMojit.patient_detailJS.columns.accessBy.renderer.button.accessByUserNot.text' );

                                if( accessByUser ) {
                                    linkCls = 'btn-success';
                                    linkText = i18n( 'InCaseMojit.patient_detailJS.columns.accessBy.renderer.button.accessByUser.text' );
                                }

                                return Y.Lang.sub( Y.doccirrus.auth.hasAPIAccess( 'document.check' ) ? link : span, {
                                    text: linkText,
                                    cls: linkCls,
                                    disabled: peek( currentPatient._isModelReadOnly ) ? ' disabled' : ''
                                } );

                            },
                            onCellClick: function( meta ) {
                                var
                                    isLink = meta.isLink,
                                    data = meta.row,
                                    document;

                                // Added this flag to send the document to vivy sol
                                const
                                    fromPatDocumentSection = true;

                                function onToggleAccess( err ) {

                                    delete documentKoTable._togglePatientAccessPending;
                                    documentKoTable.reload();

                                    if( err ) {
                                        Y.log( 'Could not change patient access' );
                                    }
                                }

                                if( isLink && Y.doccirrus.auth.hasAPIAccess( 'document.check' ) && !documentKoTable._togglePatientAccessPending ) {
                                    documentKoTable._togglePatientAccessPending = true;

                                    document = new KoViewModel.createViewModel( {
                                        NAME: 'DocumentModel',
                                        config: { data: data }
                                    } );

                                    document.setPatientAccess( !document._patientAccess(), onToggleAccess, fromPatDocumentSection );
                                }

                                return false;
                            }
                        },
                        {
                            forPropertyName: 'createdOn',
                            label: i18n( 'InCaseMojit.patient_detailJS.columns.CREATED_ON' ),
                            title: i18n( 'InCaseMojit.patient_detailJS.columns.CREATED_ON' ),
                            width: '130px',
                            renderer: function( meta ) {
                                return moment( meta.value ).format( 'DD.MM.YYYY' );
                            },
                            isSortable: true,
                            sortInitialIndex: 0,
                            direction: 'DESC',
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR
                        },
                        {
                            forPropertyName: 'type',
                            label: i18n( 'InCaseMojit.patient_detailJS.columns.TYPE' ),
                            title: i18n( 'InCaseMojit.patient_detailJS.columns.TYPE' ),
                            width: '140px',
                            renderer: function( meta ) {
                                var
                                    value = meta.value,
                                    display;

                                //  some legacy data is missing this field for QUESTIONNAIREs
                                if( !value ) {
                                    value = 'FORM';
                                }

                                display = Y.doccirrus.schemaloader.translateEnumValue(
                                    'i18n',
                                    value,
                                    Y.doccirrus.schemas.document.types.DocType_E.list,
                                    'Unsupported'
                                );

                                if( 'Unsupported' === display ) {
                                    display = value;
                                }

                                return display;
                            },
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.document.types.DocType_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'caption',
                            label: i18n( 'InCaseMojit.patient_detailJS.columns.DESCRIPTION' ),
                            title: i18n( 'InCaseMojit.patient_detailJS.columns.DESCRIPTION' ),
                            width: '70%',
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    value = meta.value,
                                    contentType = data.contentType,
                                    mediaId = data.mediaId,
                                    caption = Y.Escape.html( value );

                                if( !caption ) {
                                    caption = Y.Lang.sub( i18n( 'InCaseMojit.patient_detailJS.columns.caption.renderer.untitled_entry' ), data );
                                }

                                if( mediaId && (
                                    ('application/pdf' === contentType) ||
                                    ('image/jpeg' === contentType) ||
                                    ('image/png' === contentType) ||
                                    ('image/gif' === contentType) ) ) {
                                    caption = '<a href="javascript:;">' + caption + ' </a>';
                                }

                                return caption;
                            },
                            isSortable: true,
                            isFilterable: true,
                            onCellClick: function( meta ) {
                                var
                                    isLink = meta.isLink,
                                    data = meta.row,
                                    document;

                                if( isLink ) {

                                    document = new KoViewModel.createViewModel( {
                                        NAME: 'DocumentModel',
                                        config: { data: data }
                                    } );


                                    if ('application/json' === document.contentType()) {
                                        if ('FORM' === document.type()) {
                                            document.type('dc/questionnaire');
                                        }
                                    }

                                    switch( document.contentType() ) {

                                        case 'image/jpeg':
                                        case 'image/png':
                                        case 'application/pdf':
                                            window.open( document.fullUrl(), 'media' + data._id );
                                            break;

                                        case 'dc/questionnaire':
                                        case 'dc/frompatient':
                                        case 'application/json':
                                        case 'dc/form':
                                            self.openQuestionnaireInModal( document );
                                            break;

                                        default:
                                            if( Y.config.debug ) {
                                                Y.log('Could not open document ' + data._id + ' of unknown type: ' + data.type() + ' - ' + data.contentType());
                                            }

                                    }

                                    return false;
                                }

                                return false;
                            }
                        },
                        {
                            forPropertyName: 'publisher',
                            label: i18n( 'InCaseMojit.patient_detailJS.columns.USER' ),
                            title: i18n( 'InCaseMojit.patient_detailJS.columns.USER' ),
                            width: '30%',
                            isSortable: true,
                            isFilterable: true
                        }
                    ]
                }
            } );
        },

        /**
         *  Pop a modal to display saved form, currently unimplemented
         *
         *  @//param  document    {Object}    A KO DocumentModel
         */

        openQuestionnaireInModal: function( /* document */ ) {
            //  dc/form documents are currently excluded from the Patient Documents table, no need to display them
            Y.log( 'Questionnaire modal unimplemented', 'warn', NAME );
        }

    }, {
        NAME: 'PatientSectionDocumentsViewModel'
    } );

    KoViewModel.registerConstructor( PatientSectionDocumentsViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'KoUI-all',
        'KoViewModel',
        'PatientSectionViewModel',

        'dcauth',
        'dcquery',
        'dcschemaloader',
        'document-schema',
        'dcdocumentmodel' // TODO: [Task] MOJ-5593: remove usage of "uam.DocumentModel" in "PatientSectionDocumentsViewModel"
    ]
} );
