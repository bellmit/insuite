/**
 * User: do
 * Date: 13/07/16  09:00
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment, $, _ */

'use strict';

YUI.add( 'KBVUtility2EditorModel', function( Y, NAME ) {
        /**
         * @module KBVUtility2EditorModel
         */

        var
            i18n = Y.doccirrus.i18n,
            ICD2_SELECTED_INFO = i18n( 'InCaseMojit.kbvutility-search-modalJS.ICD2_SELECTED_INFO' ),
            MISSING_CONDUCTION_SYMPTOMS = i18n( 'InCaseMojit.KBVUtility2EditorModelJS.MISSING_CONDUCTION_SYMPTOMS' ),
            MAX_UNITS_AGREEMENT = i18n( 'InCaseMojit.KBVUtility2EditorModelJS.MAX_UNITS_AGREEMENT' ),
            MAX_UNITS_EXCEEDED = i18n( 'InCaseMojit.KBVUtility2EditorModelJS.MAX_UNITS_EXCEEDED' ),
            MAX_CASE_UNITS_EXCEEDED = i18n( 'InCaseMojit.KBVUtility2EditorModelJS.MAX_CASE_UNITS_EXCEEDED' ),
            MAX_STD_MASSAGE_CASE_UNITS_EXCEEDED = i18n( 'InCaseMojit.KBVUtility2EditorModelJS.MAX_STD_MASSAGE_CASE_UNITS_EXCEEDED' ),
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            KoViewModel = Y.doccirrus.KoViewModel,
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' ),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager;

        /**
         * @class KBVUtility2EditorModel
         * @constructor
         * @extends SimpleActivityEditorModel
         */
        function KBVUtility2EditorModel( config ) {
            KBVUtility2EditorModel.superclass.constructor.call( this, config );
        }

        KBVUtility2EditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( [
                    'status',
                    'timestamp',
                    'patientId',
                    'employeeId',
                    'locationId',
                    'ut2Chapter',
                    'utIcdCode',
                    'utIcdText',
                    'utIcdRef',
                    'utSecondIcdCode',
                    'utSecondIcdText',
                    'utSecondIcdRef',
                    'ut2TreatmentRelevantDiagnosisText',
                    'ut2DiagnosisGroupCode',
                    'ut2DiagnosisGroupName',
                    'ut2AgreementType',
                    'ut2Agreement',
                    'ut2ApprovalRefs',
                    'ut2PatientSpecificConductionSymptoms',
                    'ut2PatientSpecificConductionSymptomsFreeText',
                    'ut2ConductionSymptoms',
                    'ut2BlankRegulation',
                    'ut2BlankRegulationIgnored',
                    'ut2BlankRegulationNeedsConfirmationAfterCopy',
                    'ut2PrescriptionCaseId',
                    'ut2PrescriptionCaseUnitsSum',
                    'ut2PrescriptionCaseMassageUnitsSum',
                    'ut2PrescriptionCaseStandardizedCombinationUnitsSum',
                    'ut2Remedy1List',
                    'ut2Remedy2List',
                    'ut2UrgentNeedForAction',
                    'ut2TherapyFrequencyMin',
                    'ut2TherapyFrequencyMax',
                    'ut2TherapyFrequencyType',
                    'utUnfall',
                    'utBvg',
                    'utHomeVisit',
                    'utTherapyReport',
                    'paidFreeStatus',
                    'utTherapyGoals',
                    'u_extra'
                ] ),
                lazyAdd: false
            }
        };

        function createUtilityIcdCodeAutoComplete( config ) {
            var
                field = config.field,
                fieldText = config.fieldText,
                fieldRef = config.fieldRef,
                getCatalogCodeSearchParams = config.getCatalogCodeSearchParams;

            return {
                data: ko.computed( {
                    read: function() {
                        var
                            code = field();

                        if( code ) {
                            return {id: code, text: code, _type: 'read'};
                        } else {
                            return null;
                        }
                    },
                    write: function( $event ) {
                        var text = $event.added && $event.added.text,
                            data = $event.added && $event.added._data,
                            isFromCaseFolder = data && data.fromCaseFolders,
                            ref = data && data._id;

                        fieldText( text ? text : null );
                        fieldRef( isFromCaseFolder ? ref : null );
                        field( $event.val );
                    }
                } ),
                select2: {
                    allowClear: true,
                    placeholder: 'Diagnose',
                    dropdownAutoWidth: true,
                    dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                    formatResult: function( result, container, query, escapeMarkup ) {
                        var
                            term = query.term,
                            code = result.id,
                            text = result.text,
                            select2formatCode = [],
                            select2formatText = [];

                        window.Select2.util.markMatch( code, term, select2formatCode, escapeMarkup );
                        select2formatCode = select2formatCode.join( '' );
                        window.Select2.util.markMatch( text, term, select2formatText, escapeMarkup );
                        select2formatText = select2formatText.join( '' );

                        if( result._data && result._data.sdhm2aInfo ) {
                            if( result._data.sdhm2aInfo.anlage_heilmittelvereinbarung_value ) {
                                select2formatCode = result._data.sdhm2aInfo.anlage_heilmittelvereinbarung_value + ': ' + select2formatCode;
                            }
                            if( result._data.sdhm2aInfo.anlage_heilmittelvereinbarung_name ) {
                                code = code + ' (' + result._data.sdhm2aInfo.anlage_heilmittelvereinbarung_name + ')';
                            }
                        }

                        return Y.Lang.sub( [
                            '<div class="dc-select2-createActivityCodeAutoComplete-formatResult" title="{code}">',
                            '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-code">{select2formatCode}</span>',
                            '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-text">({select2formatText})</span>',
                            '</div>'
                        ].join( '' ), {
                            code: Y.Escape.html( code ),
                            select2formatCode: select2formatCode,
                            select2formatText: select2formatText
                        } );
                    },
                    formatSelection: function( query ) {
                        return query.id;
                    },
                    formatResultCssClass: function( result ) {
                        var
                            type = 'textform-homecatalog';

                        if( result._data && true === result._data.fromCatalog ) {
                            type = 'textform-originalcatalog';
                        }
                        if( result._data && true === result._data.fromSdhma ) {
                            type = 'textform-sdhm2acatalog';
                        }

                        return type;
                    },
                    query: function( query ) {
                        config.queryFn( query, getCatalogCodeSearchParams );
                    }
                }
            };
        }

        function select2Mapper( val ) {
            var disabled = false;

            if( true === val.fromCatalog || true === val.fromSdhma ) {
                return {id: val.seq, text: val.title || '', _type: 'mapped', _data: val, disabled: disabled};
            } else {
                return {
                    id: val.code,
                    text: val.userContent,
                    _type: 'mapped',
                    _data: val,
                    disabled: disabled
                };
            }
        }

        function byCatalogQueryFn( query, getCatalogCodeSearchParams ) {
            var
                params = getCatalogCodeSearchParams();

            if( params && params.query ) {
                params.query.term = query.term;
                Y.doccirrus.jsonrpc.api.kbvutility2.searchDiagnoses( params )
                    .done( function( response ) {
                        var
                            results = response.data;
                        results = results.map( select2Mapper );
                        query.callback( {results: results} );
                    } )
                    .fail( function( err ) {
                        Y.log( 'createUtilityIcdCodeAutoComplete: Catalog code search is failed, error: ' + err, 'debug', NAME );
                        query.callback( {results: []} );
                    } );
            } else {
                query.callback( {results: []} );
            }
        }

        function createDiagnosisAndFindingTable( self, name ) {
            return KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'InCaseMojit-KBVUTILITY2Editor-diagnosisAndFindingTable-' + name,
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.activity.read,
                    baseParams: self.addDisposable( ko.computed( function() {
                        return {
                            query: {
                                status: {$nin: ['CANCELED', 'LOCKED']},
                                patientId: peek( self.patientId ),
                                actType: {$in: ['DIAGNOSIS', 'FINDING']}
                            },
                            fields: {
                                timestamp: 1,
                                actType: 1,
                                code: 1,
                                userContent: 1
                            }
                        };
                    } ) ),
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            visible: true,
                            allToggleVisible: true
                        },
                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                            width: '85px',
                            isSortable: true,
                            direction: 'DESC',
                            sortInitialIndex: 0,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                    autoCompleteDateRange: true
                                }
                            },
                            renderer: function( meta ) {
                                var
                                    timestamp = meta.value;

                                if( timestamp && !moment( timestamp ).isAfter( new Date() ) ) {
                                    return moment( timestamp ).format( TIMESTAMP_FORMAT );
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'actType',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                            width: '120px',
                            isSortable: false,
                            isFilterable: false,
                            interceptRenderOutput: function( output, meta, isTitle ) {
                                arguments[0] = output && isTitle ? Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', output, 'i18n', 'k.A.' ) : output;
                                var intercepted = meta.col.__proto__.interceptRenderOutput.apply( this, arguments );
                                if( !intercepted ) {
                                    return '';
                                }
                                if( 'string' !== typeof intercepted ) {
                                    intercepted = intercepted.toString();
                                }
                                // remove non-breaking spaces from the tooltip, MOJ-12611
                                intercepted = intercepted.replace( new RegExp( '&nbsp;', 'g' ), ' ' );
                                return intercepted;
                            },
                            renderer: function( meta ) {
                                var
                                    actType = meta.value;

                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', actType, 'i18n', 'k.A.' );
                            }
                        },
                        {
                            forPropertyName: 'code',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                            width: '110px',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row;

                                return Y.doccirrus.schemas.activity.displayCode( data );
                            }
                        },
                        {
                            forPropertyName: 'userContent',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                            width: "70%",
                            isSortable: true,
                            isFilterable: true
                        }
                    ]
                }
            } );
        }

        function getChapterCodeByTitle( chapterTitle ) {
            const chapterListEntry = Y.doccirrus.schemas.activity.types.KBVUtility2Chapter_E.list.find( function( entry ) {
                return entry.i18n === chapterTitle;
            } );
            return chapterListEntry && chapterListEntry.val;
        }

        Y.extend( KBVUtility2EditorModel, SimpleActivityEditorModel, {
                initializer: function KBVUtility2EditorModel_initializer() {
                    var
                        self = this;
                    self.initKBVUtility2EditorModel();
                },
                destructor: function KBVUtility2EditorModel_destructor() {
                    var self = this;
                    $( window ).click( self.windowClickHandler );
                },
                addTableSelect: function( tableSelect ) {

                    var self = this;

                    self.tableSelectsStatus.push( {
                        component: tableSelect,
                        active: false
                    } );

                    return tableSelect;
                },
                initKBVUtility2EditorModel: function KBVUtility2EditorModel_initKBVUtility2EditorModel() {
                    var self = this,
                        binder = self.get( 'binder' ),
                        currentPatient = peek( binder.currentPatient ),
                        incaseconfiguration = binder.getInitialData( 'incaseconfiguration' );

                    self.tableSelectsStatus = ko.observableArray();

                    self.windowClickHandler = function( evt ) {
                        var tableSelectsStatus = unwrap( self.tableSelectsStatus );
                        var $tableSelect = $( evt.target ).closest( '.KoTableSelect-table' );
                        var $editButton = $( evt.target ).closest( '.KoTableSelectEditButton' );
                        var tableSelectEl = $tableSelect && $tableSelect[0];
                        var tableSelect = tableSelectEl && ko.dataFor( tableSelectEl );
                        var oldActiveTableSelectStatus = self.tableSelectsStatus().find( function( tableSelectStatus ) {
                            return tableSelectStatus.active;
                        } );
                        var oldActiveTableSelect = oldActiveTableSelectStatus && oldActiveTableSelectStatus.component;
                        var newActiveTableSelect;
                        var editButtonOptionName;
                        var editButtonName;
                        var editButtonTableSelectStatus;
                        if( !tableSelect && $editButton.length ) {
                            editButtonName = $editButton.attr( 'name' );
                            editButtonOptionName = editButtonName && editButtonName.replace( '-edit-element', '' );
                            editButtonTableSelectStatus = tableSelectsStatus.find( function( tableSelectStatus ) {
                                return tableSelectStatus.component.optionsName === editButtonOptionName;
                            } );
                            tableSelect = editButtonTableSelectStatus && editButtonTableSelectStatus.component;
                        }

                        if( tableSelect && oldActiveTableSelect && tableSelect === oldActiveTableSelect ) {
                            return;
                        } else if( tableSelect ) {
                            tableSelectsStatus.forEach( function( tableSelectStatus ) {
                                if( tableSelectStatus.component === tableSelect ) {
                                    tableSelectStatus.active = true;
                                    newActiveTableSelect = tableSelectStatus.component;
                                } else {
                                    tableSelectStatus.active = false;
                                }
                            } );
                        }

                        if( oldActiveTableSelect && newActiveTableSelect !== oldActiveTableSelect ) {
                            if( $editButton && $editButton.attr( 'name' ) === oldActiveTableSelect.optionsName + '-edit-element' ) {
                                return;
                            }
                            oldActiveTableSelect.leaveEditMode();
                        }
                    };

                    $( window ).click( self.windowClickHandler );

                    self.showPrices = !incaseconfiguration || !incaseconfiguration.kbvutility2DeactivatePriceDisplay;

                    self.patientAge = ko.computed( function() {
                        return currentPatient && Y.doccirrus.schemas.v_kbvutility2.getPatientAgeAt( peek( currentPatient.kbvDob ), unwrap( self.timestamp ) );
                    } );

                    self.locationKV = ko.computed( function() {
                        var locationId = unwrap( self.locationId );
                        var location = (binder.getInitialData( 'location' ) || []).find( function( location ) {
                            return location._id === locationId;
                        } );
                        return location && location.kv;
                    } );

                    self.paidFreeStatusI18n = i18n( 'activity-schema.PaidFreeStatus_E.i18n' );
                    self.placeholderDiagnosisI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.PLACEHOLDER.DIAGNOSIS' );
                    self.diagnosisByIndicationI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.PLACEHOLDER.DIAGNOSIS_BY_INDICATION' );
                    self.secondaryDiagnosisI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.PLACEHOLDER.SECONDARY_DIAGNOSIS' );

                    self.initApprovalPanel();
                    self.initAgreementPanel();
                    self.initChapter();
                    self.initDiagnosisCodes();
                    self.initDiagnosisGroup();
                    self.initPrescriptionCase();
                    self.initConductionSymptomsSelect();
                    self.initBlankRegulation();
                    self.initRemedies();
                    self.initTherapyFrequency();
                    self.initTherapyGoal();

                },
                initApprovalPanel: function() {
                    var self = this;
                    var binder = self.get( 'binder' );
                    var currentActivity = unwrap( binder.currentActivity );
                    self.possibleApprovals = ko.observableArray();

                    self.hasApproval = ko.computed( function() {
                        return unwrap( self.ut2ApprovalRefs ).length > 0;
                    } );

                    self.addDisposable( ko.computed( function() {
                        var possibleApprovals = unwrap( self.possibleApprovals );
                        var ut2ApprovalRefs = unwrap( self.ut2ApprovalRefs );
                        possibleApprovals.forEach( function( possibleApproval ) {
                            possibleApproval.matches( ut2ApprovalRefs.indexOf( possibleApproval._id ) !== -1 );
                        } );
                    } ) );

                    self.showCreateApprovalButton = KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'showCreateApprovalButton',
                            text: 'Genehmigung erstellen',
                            click: function() {
                                var KBVUtility2ApprovalEditorModel = KoViewModel.getConstructor( 'KBVUtility2ApprovalEditorModel' );
                                var data = currentActivity.toJSON();
                                delete data._id;
                                data.actType = 'KBVUTILITY2APPROVAL';
                                data.status = 'VALID';
                                data.insuranceId = self.insuranceId;
                                data.content = '';
                                data.userContent = '';
                                data.formId = '';
                                KBVUtility2ApprovalEditorModel.showModal( {
                                    data: data
                                } ).then( function() {
                                    self.invalidateValidApprovals();
                                } ).catch( function( err ) {
                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                    Y.log( 'showCreateApprovalButton: could not create approval ' + err, 'warn', NAME );
                                } );
                            },
                            option: 'PRIMARY',
                            visible: self.addDisposable( ko.computed( function() {
                                var icdCode = unwrap( self.utIcdCode ),
                                    icdCode2 = unwrap( self.utSecondIcdCode ),
                                    diagnosisGroup = unwrap( self.ut2DiagnosisGroupCode ),
                                    ut2Remedy1List = unwrap( self.ut2Remedy1List ),
                                    ut2Remedy2List = unwrap( self.ut2Remedy2List ),
                                    readOnly = unwrap( self.utIcdCode.readOnly );
                                return !readOnly && (icdCode || icdCode2) && diagnosisGroup && (ut2Remedy1List.length || ut2Remedy2List.length);
                            } ) )
                        }
                    } );

                    self.addDisposable( ko.computed( function() {
                        var possibleApprovals = unwrap( self.possibleApprovals );
                        var ut2DiagnosisGroupCode = unwrap( self.ut2DiagnosisGroupCode );
                        var utIcdCode = unwrap( self.utIcdCode );
                        var utSecondIcdCode = unwrap( self.utSecondIcdCode );

                        if( ko.computedContext.isInitial() ) {
                            return;
                        }

                        var matchingApprovals = possibleApprovals.filter( function( possibleApproval ) {
                            var icdCodes = [utIcdCode, utSecondIcdCode].filter( Boolean );
                            var approvalIcdCodes = [possibleApproval.utIcdCode, possibleApproval.utSecondIcdCode].filter( Boolean );
                            var diagnosisGroupMatches = ut2DiagnosisGroupCode === possibleApproval.ut2DiagnosisGroupCode;
                            var icd1Matches = approvalIcdCodes.indexOf( utIcdCode ) !== -1;
                            var icd2Matches = approvalIcdCodes.indexOf( utSecondIcdCode ) !== -1;
                            var icdMatches = false;
                            var ut2Remedy1List = unwrap( self.ut2Remedy1List );
                            var ut2Remedy2List = unwrap( self.ut2Remedy2List );
                            var approvalRemedy1Names, approvalRemedy2Names, remedy1Names, remedy2Names;
                            var remediesMatch = true;

                            if( icdCodes.length === 2 && icdCodes.length === approvalIcdCodes.length ) {
                                icdMatches = icd1Matches && icd2Matches;
                            } else if( icdCodes.length === 1 && approvalIcdCodes.length === 1 ) {
                                icdMatches = icd1Matches || icd2Matches;
                            }

                            if( possibleApproval.ut2Remedy1List.length || possibleApproval.ut2Remedy2List.length ) {
                                approvalRemedy1Names = possibleApproval.ut2Remedy1List.map( function( entry ) {
                                    return entry.name;
                                } );
                                approvalRemedy2Names = possibleApproval.ut2Remedy2List.map( function( entry ) {
                                    return entry.name;
                                } );
                                remedy1Names = ut2Remedy1List.map( function( entry ) {
                                    return unwrap( entry.name );
                                } );
                                remedy2Names = ut2Remedy2List.map( function( entry ) {
                                    return unwrap( entry.name );
                                } );

                                remediesMatch = remedy1Names.length === approvalRemedy1Names.length &&
                                                remedy2Names.length === approvalRemedy2Names.length &&
                                                _.intersection( approvalRemedy1Names, remedy1Names ).length === remedy1Names.length &&
                                                _.intersection( approvalRemedy2Names, remedy2Names ).length === remedy2Names.length;
                            }

                            return icdMatches && diagnosisGroupMatches && remediesMatch;
                        } );

                        self.ut2ApprovalRefs( matchingApprovals.map( function( matchingApproval ) {
                            return matchingApproval._id;
                        } ) );
                    } ).extend( {
                        rateLimit: {
                            timeout: 500,
                            method: "notifyWhenChangesStop"
                        }
                    } ) );

                    self.addDisposable( ko.computed( self.invalidateValidApprovals.bind( self ) ).extend( {
                        rateLimit: {
                            timeout: 500,
                            method: "notifyWhenChangesStop"
                        }
                    } ) );
                },
                invalidateValidApprovals: function() {
                    var self = this;
                    var binder = self.get( 'binder' );
                    var currentPatient = unwrap( binder.currentPatient );
                    var currentCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab();
                    var currentCaseFolderType = currentCaseFolder && currentCaseFolder.type;
                    var patientId = unwrap( self.patientId );
                    var timestamp = unwrap( self.timestamp );
                    var insurance, insuranceId;

                    if( currentPatient ) {
                        insurance = unwrap( currentPatient.insuranceStatus ).find( function( _insurance ) {
                            return unwrap( _insurance.type ) === currentCaseFolderType;
                        } );

                        insuranceId = insurance && unwrap( insurance.insuranceId );
                        if( !insuranceId ) {
                            return;
                        }

                        self.insuranceId = insuranceId;

                        Promise.resolve( Y.doccirrus.jsonrpc.api.kbvutility2.getValidApprovals( {
                            patientId: patientId,
                            timestamp: timestamp,
                            insuranceId: insuranceId
                        } ) )
                            .then( function( response ) {
                                if( response && response.data && response.data ) {
                                    self.possibleApprovals( response.data.map( function( entry ) {
                                        entry.matches = ko.observable( false );
                                        return entry;
                                    } ) );
                                } else {
                                    self.possibleApprovals( [] );
                                }
                            } )
                            .catch( function( err ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                Y.log( 'getValidApprovals: error: ' + err, 'debug', NAME );
                            } );

                    }
                },
                initAgreementPanel: function() {

                    var self = this;

                    self.agreementStatus = ko.observable();

                    self.hasAcuteEvent = ko.computed( function() {
                        var ut2Agreement = unwrap( self.ut2Agreement )[0];
                        return ut2Agreement && _.isFinite( unwrap( ut2Agreement.acuteEvent ) );
                    } );

                    self.hasAcuteEventWarning = ko.computed( function() {
                        var ut2Agreement = unwrap( self.ut2Agreement )[0];
                        var acuteEvent = ut2Agreement && unwrap( ut2Agreement.acuteEvent );
                        var timestamp = unwrap( self.timestamp );
                        var acuteEventDate;

                        var momentAcuteEventDate, momentTimestamp, diff;

                        if( unwrap( self.hasAcuteEvent ) && ut2Agreement ) {
                            acuteEventDate = unwrap( ut2Agreement.acuteEventDate );
                            momentAcuteEventDate = acuteEventDate && moment( acuteEventDate );
                            momentTimestamp = moment( timestamp );
                            diff = momentAcuteEventDate && momentTimestamp.diff( momentAcuteEventDate, 'month' );
                            return !acuteEventDate || diff > acuteEvent;
                        }
                        return false;
                    } );

                    self.hasAgreement = ko.computed( function() {
                        var agreement = unwrap( self.ut2Agreement )[0];
                        var type = agreement && unwrap( agreement.type ) || null;
                        var acuteIsValid = !unwrap( self.hasAcuteEventWarning );
                        var isValid = acuteIsValid && type;
                        if( !ko.computedContext.isInitial() ) {
                            self.ut2AgreementType( isValid ? type : null );
                        }
                        return isValid;
                    } );

                    /**
                     * Determine if we check the max value of units by catalog value or calculated by frequence
                     */
                    self.checkPrescriptionMaxUnits = ko.computed( function() {
                        var agreement = unwrap( self.ut2Agreement )[0]; // here acute event can be ignored
                        return !agreement && !unwrap( self.hasApproval );
                    } );

                    self.hasAcuteEventWarningMessages = ['Bitte geben Sie das Datum des Akutereignisses ein, um den besonderen Verordnungsbedarf gelten zu machen!'];

                    self.addDisposable( ko.computed( function() {

                        var status = unwrap( self.status ),
                            chapter = unwrap( self.ut2Chapter ),
                            icdCode = unwrap( self.utIcdCode ),
                            icdCode2 = unwrap( self.utSecondIcdCode ),
                            diagnosisGroup = unwrap( self.ut2DiagnosisGroupCode ),
                            patientAge = unwrap( self.patientAge ),
                            kv = unwrap( self.locationKV );

                        if( !_.isFinite( patientAge ) || !kv || ['CREATED', 'VALID'].indexOf( status ) < 0 ) {
                            return;
                        }

                        Promise.resolve( Y.doccirrus.jsonrpc.api.kbvutility2.checkAgreement( {
                            chapter: chapter,
                            icdCode: icdCode,
                            icdCode2: icdCode2,
                            diagnosisGroup: diagnosisGroup,
                            patientAge: patientAge,
                            kv: kv
                        } ) )
                            .then( function( response ) {
                                var
                                    results = response.data,
                                    agreements = results && results.agreements || [],
                                    agreementTypes = agreements.map( function( entry ) {
                                        return entry.type;
                                    } ),
                                    ut2Agreement = peek( self.ut2Agreement ),
                                    ut2AgreementTypes = ut2Agreement.map( function( item ) {
                                        return unwrap( item.type );
                                    } ),
                                    intersectionLength = _.intersection( ut2AgreementTypes, agreementTypes ).length;

                                self.agreementStatus( results );

                                if( ut2Agreement.length && agreements.length &&
                                    intersectionLength === ut2Agreement.length && intersectionLength === agreements.length ) {
                                    return;
                                }

                                self.ut2Agreement( agreements );

                            } )
                            .catch( function( err ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                Y.log( 'checkAgreement: error: ' + err, 'debug', NAME );
                            } );
                    } ).extend( {rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}} ) );

                },
                initChapter: function() {
                    var self = this;

                    self.displayChapter = ko.computed( function() {
                        var ut2Chapter = unwrap( self.ut2Chapter );
                        if( !ut2Chapter ) {
                            return i18n( 'activity-schema.KBVUtility2_T.ut2Chapter.i18n' );
                        }
                        return ut2Chapter && self.getChapterTitleByCode( ut2Chapter );
                    } );

                    self.chapterEditSelect = self.addTableSelect( KoComponentManager.createComponent( {
                        componentType: 'KoTableSelect',
                        componentConfig: {
                            options: Y.doccirrus.schemas.activity.types.KBVUtility2Chapter_E.list,
                            multi: false,
                            val: ko.computed( {
                                read: function() {
                                    return self.ut2Chapter();
                                },
                                write: function( entry ) {
                                    self.ut2Chapter( entry && entry.val );
                                }
                            } ),
                            displayComponent: false,
                            editMode: !peek( self.ut2Chapter ),
                            optionsName: 'kbvutility-chapter',
                            optionsValue: 'val',
                            optionsColumns: [
                                {title: 'Name', propertyName: 'i18n'}
                            ]
                        }
                    } ) );

                    self.ut2Chapter.subscribe( function( oldValue ) {
                        if( oldValue ) {
                            self.ut2DiagnosisGroupCode( null );
                            self.ut2DiagnosisGroupName( null );
                            self.u_extra( null );
                            self.diagnosisGroupSelect.enterEditMode();
                        }
                    }, null, "beforeChange" );
                },
                initDiagnosisCodes: function() {
                    var self = this;

                    function gethasTypeFn( type ) {
                        return function() {
                            var agreementStatus = unwrap( self.agreementStatus ),
                                candidates = agreementStatus && agreementStatus.candidates || [];
                            return candidates.some( function( candidate ) {
                                return (candidate.needs || []).some( function( needObj ) {
                                    return needObj.type === type;
                                } );
                            } );
                        };
                    }

                    self.utSecondIcdCode.subscribe( function( oldValue ) {
                        var messageId;
                        if( !oldValue ) {
                            messageId = 'kbvutility2_icd2_selected_info';
                            Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: messageId,
                                content: ICD2_SELECTED_INFO,
                                level: 'INFO'
                            } );
                        }
                    }, null, 'beforeChange' );

                    self.hasIcd2Need = ko.computed( gethasTypeFn( 'ICD2' ) );
                    self.hasDiagnosisGroupNeed = ko.computed( gethasTypeFn( 'DIAGNOSIS_GROUP' ) );

                    self.agreementCandidatesDisplay = ko.computed( function() {
                        var agreementStatus = unwrap( self.agreementStatus ),
                            candidates = agreementStatus && agreementStatus.candidates;

                        if( !Array.isArray( candidates ) ) {
                            return;
                        }

                        return candidates.map( function( candidate ) {
                            var result = '';
                            if( Array.isArray( candidate.needs ) ) {
                                result = candidate.needs.map( function( needObj ) {
                                    var renderedNeedObj = needObj.values.join( ', ' );
                                    if( renderedNeedObj.length ) {
                                        switch( needObj.type ) {
                                            case 'ICD2':
                                                renderedNeedObj = '2. ICD-10-Code: ' + renderedNeedObj;
                                                break;
                                            case 'DIAGNOSIS_GROUP':
                                                renderedNeedObj = 'Diagnosegruppe: ' + renderedNeedObj;
                                                break;
                                        }
                                    }
                                    return renderedNeedObj;
                                } ).join( '\n' );
                            }
                            if( result.length ) {
                                return [candidate.type, ':\n', result].join( '' );
                            }
                        } ).join( '\n' );
                    } );

                    self.diagnosisAndFindingTable = createDiagnosisAndFindingTable( self, 'diagnosisCodes' );

                    self.addTreatmentRelevantDiagnosisTextsButton = KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'ok',
                            text: i18n( 'general.button.ADD' ),
                            option: 'PRIMARY',
                            click: function() {
                                self.addTreatmentRelevantDiagnosisTexts();
                            },
                            disabled: self.addDisposable( ko.computed( function() {
                                var checked = self.diagnosisAndFindingTable.getComponentColumnCheckbox().checked();
                                return checked.length === 0;
                            } ) )
                        }
                    } );

                    self.overrideTreatmentRelevantDiagnosisTextsButton = KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'ok',
                            text: 'Überschreiben', // TODO: i18n
                            option: 'PRIMARY',
                            click: function() {
                                self.overrideTreatmentRelevantDiagnosisTexts();
                            },
                            disabled: self.addDisposable( ko.computed( function() {
                                var checked = self.diagnosisAndFindingTable.getComponentColumnCheckbox().checked();
                                return checked.length === 0;
                            } ) )
                        }
                    } );

                    self.diagnosisAndFindingTableVisible = ko.observable( false );

                    self.utIcdCodeIsNew = ko.computed( function() {
                        return self.utIcdCode() && !self.utIcdRef();
                    } );

                    self.utSecondIcdCodeIsNew = ko.computed( function() {
                        return self.utSecondIcdCode() && !self.utSecondIcdRef();
                    } );

                    self.icdCode1CatalogSelect2 = createUtilityIcdCodeAutoComplete( {
                        activity: self,
                        field: self.utIcdCode,
                        fieldText: self.utIcdText,
                        fieldRef: self.utIcdRef,
                        queryFn: byCatalogQueryFn,
                        getCatalogCodeSearchParams: function() {
                            return {
                                itemsPerPage: 20,
                                query: {
                                    patientId: peek( self.patientId ),
                                    term: ''
                                }
                            };
                        }
                    } );

                    self.icdCode2CatalogSelect2 = createUtilityIcdCodeAutoComplete( {
                        activity: self,
                        field: self.utSecondIcdCode,
                        fieldText: self.utSecondIcdText,
                        fieldRef: self.utSecondIcdRef,
                        queryFn: byCatalogQueryFn,
                        getCatalogCodeSearchParams: function() {
                            return {
                                itemsPerPage: 20,
                                query: {
                                    patientAge: peek( self.patientAge ),
                                    diagnosisGroupCode: peek( self.ut2DiagnosisGroupCode ),
                                    kv: peek( self.locationKV ),
                                    patientId: peek( self.patientId ),
                                    icdCode: peek( self.utIcdCode ),
                                    term: ''
                                }
                            };
                        }
                    } );

                },
                initDiagnosisGroup: function() {
                    var self = this,
                        binder = self.get( 'binder' ),
                        currentActivity = unwrap( binder.currentActivity ),
                        sdhm = currentActivity.get( 'sdhm' ) || [];

                    self.ut2DiagnosisGroupCode.subscribe( function() {
                        currentActivity.ut2ConductionSymptoms( [] );
                        currentActivity.ut2PatientSpecificConductionSymptoms( false );
                        currentActivity.ut2PatientSpecificConductionSymptomsFreeText( '' );
                        currentActivity.ut2Remedy1List( [] );
                        currentActivity.ut2Remedy2List( [] );
                    } );

                    self.displayDiagnosisGroup = ko.computed( function() {
                        var elements = [self.ut2DiagnosisGroupCode(), self.ut2DiagnosisGroupName()].filter( Boolean );
                        if( !elements.length ) {
                            return unwrap( self.ut2DiagnosisGroupName.i18n );
                        }
                        return elements.filter( Boolean ).join( ' ' );
                    } );
                    self.diagnosisGroupSelect = self.addTableSelect( KoComponentManager.createComponent( {
                        componentType: 'KoTableSelect',
                        componentConfig: {
                            options: ko.computed( function() {
                                var ut2Chapter = unwrap( self.ut2Chapter ),
                                    chapterTitle = ut2Chapter && self.getChapterTitleByCode( ut2Chapter ),
                                    utIcdCode = peek( self.utIcdCode ),
                                    utSecondIcdCode = peek( self.utSecondIcdCode ),
                                    possibleApprovals = unwrap( self.possibleApprovals ),
                                    agreementStatus = unwrap( self.agreementStatus ),
                                    alternatives = agreementStatus && agreementStatus.alternatives,
                                    candidatesMap = {},
                                    approvalCandidatesMap = {};

                                if( Array.isArray( alternatives ) ) {
                                    alternatives.forEach( function( candidate ) {
                                        (candidate.needs || []).forEach( function( needObj ) {
                                            if( needObj.type === 'DIAGNOSIS_GROUP' ) {
                                                needObj.values.forEach( function( value ) {
                                                    candidatesMap[value] = candidate.type;
                                                } );
                                            }
                                        } );
                                    } );
                                }

                                possibleApprovals.forEach( function( possibleApproval, index ) {
                                    var icdCodes = [utIcdCode, utSecondIcdCode].filter( Boolean );
                                    var approvalIcdCodes = [possibleApproval.utIcdCode, possibleApproval.utSecondIcdCode].filter( Boolean );
                                    var icd1Matches = approvalIcdCodes.indexOf( utIcdCode ) !== -1;
                                    var icd2Matches = approvalIcdCodes.indexOf( utSecondIcdCode ) !== -1;
                                    var icdMatches = false;

                                    if( icdCodes.length === 2 && icdCodes.length === approvalIcdCodes.length ) {
                                        icdMatches = icd1Matches && icd2Matches;
                                    } else if( icdCodes.length === 1 && approvalIcdCodes.length === 1 ) {
                                        icdMatches = icd1Matches || icd2Matches;
                                    }

                                    if( icdMatches ) {
                                        if( !approvalCandidatesMap[possibleApproval.ut2DiagnosisGroupCode] ) {
                                            approvalCandidatesMap[possibleApproval.ut2DiagnosisGroupCode] = '';
                                        }
                                        if( approvalCandidatesMap[possibleApproval.ut2DiagnosisGroupCode].length ) {
                                            approvalCandidatesMap[possibleApproval.ut2DiagnosisGroupCode] += ', ';
                                        }
                                        approvalCandidatesMap[possibleApproval.ut2DiagnosisGroupCode] += ['(', index + 1, ')'].join( '' );
                                    }
                                } );

                                return sdhm.filter( function( entry ) {
                                    if( chapterTitle ) {
                                        return entry.kapitel === chapterTitle;
                                    }
                                    return true;
                                } ).map( function( entry ) {
                                    return JSON.parse( JSON.stringify( entry ) );
                                } ).map( function( entry ) {
                                    entry.agreementColumnValue = candidatesMap[entry.diagnosegruppe_value] || '';
                                    entry.approvalColumnValue = approvalCandidatesMap[entry.diagnosegruppe_value] || '';
                                    return entry;
                                } );
                            } ),
                            multi: false,
                            val: ko.computed( {
                                read: function() {
                                    return self.ut2DiagnosisGroupCode();
                                },
                                write: function( entry ) {
                                    var ut2Chapter = peek( self.ut2Chapter ),
                                        ut2DiagnosisGroupCode = peek( self.ut2DiagnosisGroupCode ),
                                        diagnosegruppe_value = entry && entry.diagnosegruppe_value,
                                        diagnosegruppe_name = entry && entry.diagnosegruppe_name,
                                        chapterCode = !ut2Chapter && entry && entry.kapitel && getChapterCodeByTitle( entry.kapitel );

                                    if( chapterCode ) {
                                        self.ut2Chapter( chapterCode );
                                    }
                                    if( ut2DiagnosisGroupCode === diagnosegruppe_value ) {
                                        return;
                                    }
                                    self.ut2DiagnosisGroupCode( diagnosegruppe_value );
                                    self.ut2DiagnosisGroupName( diagnosegruppe_name );
                                    self.u_extra( entry );
                                }
                            } ),
                            optionsName: 'kbvutility-diagnosisgroup',
                            optionsValue: 'diagnosegruppe_value',
                            displayComponent: false,
                            editMode: !peek( self.ut2DiagnosisGroupCode ),
                            optionsColumns: [
                                {title: 'Code', propertyName: 'diagnosegruppe_value'},
                                {title: 'Name', propertyName: 'diagnosegruppe_name'},
                                {title: 'BVB/LHM', propertyName: 'agreementColumnValue'},
                                {title: 'Genehmigung', propertyName: 'approvalColumnValue'},
                                {title: 'Hinweise', propertyName: 'hinweis_liste'}
                            ]
                        }
                    } ) );

                },
                initPrescriptionCase: function() {
                    var self = this;
                    self.prescriptionCaseLink = ko.computed( function() {
                        var ut2PrescriptionCaseId = unwrap( self.ut2PrescriptionCaseId );
                        if( !ut2PrescriptionCaseId ) {
                            return;
                        }
                        return 'incase#/activity/' + ut2PrescriptionCaseId;
                    } );

                    self.addDisposable( ko.computed( function() {
                        var activityId = unwrap( self._id ),
                            patientId = unwrap( self.patientId ),
                            employeeId = unwrap( self.employeeId ),
                            timestamp = unwrap( self.timestamp ),
                            hasBlankRegulation = unwrap( self.hasBlankRegulation ),
                            icdCode = unwrap( self.utIcdCode ),
                            icdCode2 = unwrap( self.utSecondIcdCode ),
                            diagnosisGroup = unwrap( self.ut2DiagnosisGroupCode );

                        if( ko.computedContext.isInitial() ||
                            ['CREATED', 'VALID'].indexOf( self.status() ) < 0 ) {
                            return;
                        }

                        Promise.resolve( Y.doccirrus.jsonrpc.api.kbvutility2.getPrescriptionCase( {
                            activityId: activityId,
                            patientId: patientId,
                            employeeId: employeeId,
                            timestamp: timestamp,
                            hasBlankRegulation: hasBlankRegulation,
                            icdCode: icdCode,
                            icdCode2: icdCode2,
                            diagnosisGroup: diagnosisGroup
                        } ) )
                            .then( function( response ) {
                                if( response && response.data && response.data.hasCase ) {
                                    self.ut2PrescriptionCaseId( response.data.kbvutility2Id );
                                } else {
                                    self.ut2PrescriptionCaseId( null );
                                    self.ut2PrescriptionCaseUnitsSum( null );
                                    self.ut2PrescriptionCaseMassageUnitsSum( null );
                                    self.ut2PrescriptionCaseStandardizedCombinationUnitsSum( null );
                                }
                            } )
                            .catch( function( err ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                Y.log( 'getPrescriptionCase: error: ' + err, 'debug', NAME );
                            } );
                    } ).extend( {rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}} ) );

                },
                initConductionSymptomsSelect: function() {
                    var self = this,
                        binder = self.get( 'binder' ),
                        currentActivity = unwrap( binder.currentActivity );

                    self.enablePatientSpecificConductionSymptomsCheckbox = ko.computed( function() {
                        var u_extra = unwrap( self.u_extra ),
                            patientenindividuelle_leitsymptomatik = u_extra && u_extra.patientenindividuelle_leitsymptomatik;

                        return patientenindividuelle_leitsymptomatik && !self.ut2PatientSpecificConductionSymptoms.readOnly();
                    } );

                    self.addDisposable( ko.computed( function() {
                            unwrap( self.ut2PatientSpecificConductionSymptoms );
                            self.ut2PatientSpecificConductionSymptomsFreeText.validate();
                        }
                    ) );

                    self.ut2ConductionSymptomsHasWarning = ko.computed( function() {
                        var ut2ConductionSymptoms = unwrap( self.ut2ConductionSymptoms );
                        var ut2PatientSpecificConductionSymptoms = unwrap( self.ut2PatientSpecificConductionSymptoms );
                        if( !ut2PatientSpecificConductionSymptoms ) {
                            return ut2ConductionSymptoms.length <= 0;
                        }
                    } );

                    self.ut2ConductionSymptomsHasWarningMessages = [MISSING_CONDUCTION_SYMPTOMS];

                    self.conductionSymptomsSelect = self.addTableSelect( KoComponentManager.createComponent( {
                        componentType: 'KoTableSelect',
                        componentConfig: {
                            options: ko.computed( function() {
                                var u_extra = unwrap( self.u_extra );
                                return u_extra && u_extra.leitsymptomatik || [];
                            } ),
                            multi: true,
                            val: ko.computed( {
                                read: function() {
                                    return self.ut2ConductionSymptoms().map( function( ut2ConductionSymptom ) {
                                        return unwrap( ut2ConductionSymptom.code );
                                    } );
                                },
                                write: function( selectedEntries ) {
                                    var ut2ConductionSymptoms = unwrap( self.ut2ConductionSymptoms ),
                                        newUt2ConductionSymptoms = [];

                                    selectedEntries.forEach( function( entry ) {
                                        var alreadySelected = ut2ConductionSymptoms.find( function( ut2ConductionSymptom ) {
                                            return unwrap( ut2ConductionSymptom.code ) === entry.leitsymptomatik_value;
                                        } );

                                        if( alreadySelected ) {
                                            newUt2ConductionSymptoms.push( alreadySelected );
                                        } else {
                                            newUt2ConductionSymptoms.push( {
                                                code: entry.leitsymptomatik_value,
                                                name: entry.leitsymptomatik_name
                                            } );
                                        }
                                    } );

                                    currentActivity.ut2ConductionSymptoms( newUt2ConductionSymptoms );
                                }
                            } ),
                            editMode: false,
                            optionsName: 'kbvutility-leitsymptomatik',
                            optionsValue: 'leitsymptomatik_value',
                            displayComponent: false,
                            optionsColumns: [
                                {title: 'Code', propertyName: 'leitsymptomatik_value'},
                                {title: 'Name', propertyName: 'leitsymptomatik_name'},
                                {title: 'Erläuterung', propertyName: 'erlaeuterung_liste'}
                            ]
                        }
                    } ) );

                },
                getChapterTitleByCode: function( chapterCode ) {
                    const chapterListEntry = Y.doccirrus.schemas.activity.types.KBVUtility2Chapter_E.list.find( function( entry ) {
                        return entry.val === chapterCode;
                    } );
                    return chapterListEntry && chapterListEntry.i18n;
                },
                toggleShowTreatmentRelevantDiagnosisTexts: function() {
                    var self = this;
                    self.diagnosisAndFindingTableVisible( !peek( self.diagnosisAndFindingTableVisible ) );
                },
                removeTreatmentRelevantDiagnosisTexts: function() {
                    var self = this;
                    self.ut2TreatmentRelevantDiagnosisText( '' );
                },
                getJoinedTreatmentRelevantDiagnosisTableTexts: function() {
                    var self = this;

                    return self.diagnosisAndFindingTable.getComponentColumnCheckbox().checked()
                        .map( function getUserContent( activities ) {
                            return activities.userContent;
                        } )
                        .filter( Boolean )
                        .join( '; ' );
                },
                addTreatmentRelevantDiagnosisTexts: function() {
                    var self = this;

                    self.ut2TreatmentRelevantDiagnosisText( [peek( self.ut2TreatmentRelevantDiagnosisText )]
                        .concat( self.getJoinedTreatmentRelevantDiagnosisTableTexts() )
                        .filter( Boolean )
                        .join( '; ' ) );
                    self.diagnosisAndFindingTableVisible( false );
                    self.diagnosisAndFindingTable.getComponentColumnCheckbox().checked( [] );
                },
                overrideTreatmentRelevantDiagnosisTexts: function() {
                    var self = this;

                    self.ut2TreatmentRelevantDiagnosisText( self.getJoinedTreatmentRelevantDiagnosisTableTexts() );
                    self.diagnosisAndFindingTableVisible( false );
                    self.diagnosisAndFindingTable.getComponentColumnCheckbox().checked( [] );
                },
                onMouseOutDiagnosisAndFindingTable: function( model, event ) {
                    var self = this,
                        insideEditPanel = $( event.relatedTarget ).closest( '.diagnosisAndFindingTable' ).length > 0;

                    if( insideEditPanel ) {
                        return;
                    }
                    self.diagnosisAndFindingTableVisible( false );
                },
                initBlankRegulation: function() {
                    var self = this;

                    self.hasBlankRegulation = ko.computed( function() {
                        var ut2BlankRegulation = unwrap( self.ut2BlankRegulation );
                        var ut2BlankRegulationIgnored = unwrap( self.ut2BlankRegulationIgnored );
                        return ut2BlankRegulation && !ut2BlankRegulationIgnored;
                    } );

                    self.addDisposable( ko.computed( function() {
                        var icdCode = unwrap( self.utIcdCode ),
                            icdCode2 = unwrap( self.utSecondIcdCode ),
                            diagnosisGroup = unwrap( self.ut2DiagnosisGroupCode ),
                            ut2BlankRegulationNeedsConfirmationAfterCopy = peek( self.ut2BlankRegulationNeedsConfirmationAfterCopy ),
                            patientAge = unwrap( self.patientAge );

                        if( ko.computedContext.isInitial() && ut2BlankRegulationNeedsConfirmationAfterCopy ) {
                            self.showBlankRegulationConfirmationModal();
                        }

                        if( ko.computedContext.isInitial() ||
                            (!icdCode && !icdCode2 && !diagnosisGroup) ||
                            !_.isFinite( patientAge ) || ['CREATED', 'VALID'].indexOf( self.status() ) < 0 ) {
                            return;
                        }

                        Promise.resolve( Y.doccirrus.jsonrpc.api.kbvutility2.checkBlankRegulation( {
                            icdCode: icdCode,
                            icdCode2: icdCode2,
                            diagnosisGroup: diagnosisGroup,
                            patientAge: patientAge
                        } ) )
                            .then( function( response ) {
                                var
                                    results = response.data,
                                    oldValue = peek( self.ut2BlankRegulation ),
                                    sdhm2bEntry = results && results[0];

                                // check if entry already exists
                                if( sdhm2bEntry && oldValue &&
                                    sdhm2bEntry.erster_icd_code === oldValue.erster_icd_code &&
                                    sdhm2bEntry.zweiter_icd_code === oldValue.zweiter_icd_code &&
                                    sdhm2bEntry.diagnosegruppe_value === oldValue.diagnosegruppe_value
                                ) {
                                    return;
                                }

                                self.ut2BlankRegulation( null );
                                self.ut2BlankRegulationIgnored( false );

                                if( !sdhm2bEntry ) {
                                    return;
                                }

                                self.showBlankRegulationConfirmationModal( sdhm2bEntry );
                            } )
                            .catch( function( err ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                Y.log( 'checkBlankRegulation: error: ' + err, 'debug', NAME );
                            } );
                    } ).extend( {rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}} ) );
                },
                showBlankRegulationConfirmationModal: function( sdhm2bEntry ) {
                    var self = this,
                        ut2BlankRegulationNeedsConfirmationAfterCopy = peek( self.ut2BlankRegulationNeedsConfirmationAfterCopy );
                    if( ut2BlankRegulationNeedsConfirmationAfterCopy ) {
                        sdhm2bEntry = peek( self.ut2BlankRegulation );
                    }

                    if( !sdhm2bEntry ) {
                        return;
                    }

                    var modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Create-BlankRegulation',
                            bodyContent: 'Die Diagnose in Verbindung mit der Diagnosegruppe entspricht den Kriterien einer Blankoverordnung. Soll eine Blankoverordnung ausgestellt werden?<br><br><strong>Ja,</strong> Heilmittel, Behandlungseinheiten und Therapiefrequenz werden vom Therapeuten festlegt. Die Verordnung unterliegt nicht der Wirtschaftlichkeitsprüfung.<br><br><strong>Nein,</strong> auf eine Blankoverordnung wird aus medizinischen Gründen verzichtet. Angaben zu Heilmittel(n), Behandlungseinheiten und Therapiefrequenz sind vom Arzt festzulegen.',
                            title: i18n( 'DCWindow.confirm.title' ),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_LARGE,
                            minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            centered: true,
                            modal: true,
                            dragable: true,
                            maximizable: true,
                            resizeable: true,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'NO', {
                                        action: function() {
                                            self.ut2BlankRegulation( sdhm2bEntry );
                                            self.ut2BlankRegulationIgnored( true );
                                            if( ut2BlankRegulationNeedsConfirmationAfterCopy ) {
                                                self.ut2BlankRegulationNeedsConfirmationAfterCopy( false );
                                            }
                                            modal.close();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'YES', {
                                        isDefault: true,
                                        action: function() {
                                            self.ut2BlankRegulation( sdhm2bEntry );
                                            self.ut2BlankRegulationIgnored( false );
                                            if( ut2BlankRegulationNeedsConfirmationAfterCopy ) {
                                                self.ut2BlankRegulationNeedsConfirmationAfterCopy( false );
                                            }
                                            modal.close();
                                        }
                                    } )
                                ]
                            }
                        }
                    );
                },
                initRemedies: function() {
                    var self = this,
                        binder = self.get( 'binder' ),
                        patientAge = peek( self.patientAge ),
                        hasAge = _.isFinite( patientAge ),
                        currentActivity = unwrap( binder.currentActivity );

                    function sumUnits( sum, entry ) {
                        var units = +unwrap( entry.units );
                        if( _.isFinite( units ) ) {
                            sum = sum + units;
                        }
                        return sum;
                    }

                    function sumMassageUnits( sum, entry ) {
                        if( unwrap( entry.massage ) ) {
                            return sumUnits( sum, entry );
                        }
                        return sum;
                    }

                    self.remediesHaveMaxUnitError = ko.observable( false );
                    self.remediesHaveMaxCaseUnitError = ko.observable( false );
                    self.remediesHaveMaxUnitAgreementError = ko.observable( false );
                    self.remediesHaveMaxCaseUnitErrorMessages = ko.observableArray();
                    self.remediesHaveUnitError = ko.computed( function() {
                        return unwrap( self.remediesHaveMaxCaseUnitError ) || unwrap( self.remediesHaveMaxUnitAgreementError ) || unwrap( self.remediesHaveMaxUnitError );
                    } );

                    self.relevantRemediesForPrescriptionAmount = ko.computed( function() {
                        var ut2Remedy1List = unwrap( self.ut2Remedy1List );
                        var ut2Remedy2List = unwrap( self.ut2Remedy2List );
                        return ut2Remedy1List
                            .concat( !ut2Remedy1List.length ? ut2Remedy2List : [] );
                    } );

                    self.prescriptionAmount = ko.computed( function() {
                        var relevantRemediesForPrescriptionAmount = unwrap( self.relevantRemediesForPrescriptionAmount );
                        var prescriptionAmount = relevantRemediesForPrescriptionAmount.reduce( sumUnits, 0 );
                        return prescriptionAmount;
                    } );

                    self.prescriptionAmountMassage = ko.computed( function() {
                        var relevantRemediesForPrescriptionAmount = unwrap( self.relevantRemediesForPrescriptionAmount );
                        return relevantRemediesForPrescriptionAmount.reduce( sumMassageUnits, 0 );
                    } );
                    self.prescriptionAmountMassage = ko.computed( function() {
                        var relevantRemediesForPrescriptionAmount = unwrap( self.relevantRemediesForPrescriptionAmount );
                        return relevantRemediesForPrescriptionAmount.reduce( sumMassageUnits, 0 );
                    } );

                    self.sumRemedyList1Units = ko.computed( function() {
                        var ut2Remedy1List = unwrap( self.ut2Remedy1List );
                        return ut2Remedy1List.reduce( sumUnits, 0 );
                    } );

                    self.sumRemedyList2Units = ko.computed( function() {
                        var ut2Remedy2List = unwrap( self.ut2Remedy2List );
                        return ut2Remedy2List.reduce( sumUnits, 0 );
                    } );

                    // get standardizedCombination if selected for alternate view
                    self.standardizedCombination = ko.computed( function() {
                        return unwrap( self.ut2Remedy1List ).find( function( entry ) {
                            return peek( entry.type ) === 'STANDARDIZED_COMBINATIONS_OF_REMEDIES';
                        } );
                    } );

                    self.prescriptionAmountStandardizedCombination = ko.computed( function() {
                        var standardizedCombination = unwrap( self.standardizedCombination );
                        return standardizedCombination && unwrap( standardizedCombination.units );
                    } );

                    self.catalogMaxRemedyUnits = ko.computed( function() {
                        var u_extra = unwrap( self.u_extra );
                        return Y.doccirrus.schemas.v_kbvutility2.getCatalogMaxRemedyUnits( u_extra );
                    } );

                    self.catalogMaxCaseRemedyUnits = ko.computed( function() {
                        var icd1 = unwrap( self.utIcdCode );
                        var icd2 = unwrap( self.utSecondIcdCode );
                        var icds = [icd1, icd2].filter( Boolean );
                        var u_extra = unwrap( self.u_extra );
                        var binder = self.get( 'binder' );
                        var currentPatient = peek( binder.currentPatient );
                        return Y.doccirrus.schemas.v_kbvutility2.getCatalogMaxCaseRemedyUnits( u_extra, icds, 'orientierende_behandlungsmenge', peek( currentPatient.age ) );
                    } );

                    self.catalogMaxCaseStandardizedCombinationUnits = ko.computed( function() {
                        var icd1 = unwrap( self.utIcdCode );
                        var icd2 = unwrap( self.utSecondIcdCode );
                        var u_extra = unwrap( self.u_extra );
                        return Y.doccirrus.schemas.v_kbvutility2.getCatalogMaxCaseRemedyUnits( u_extra, [icd1, icd2].filter( Boolean ), 'orientierende_behandlungsmenge_standardisiert' );
                    } );

                    self.catalogMaxCaseMassageRemedyUnits = ko.computed( function() {
                        var icd1 = unwrap( self.utIcdCode );
                        var icd2 = unwrap( self.utSecondIcdCode );
                        var u_extra = unwrap( self.u_extra );
                        return Y.doccirrus.schemas.v_kbvutility2.getCatalogMaxCaseRemedyUnits( u_extra, [icd1, icd2].filter( Boolean ), 'orientierende_behandlungsmenge_massage' );
                    } );

                    self.maxUnitsByFrequence = ko.computed( function() {
                        var ut2TherapyFrequencyMin = unwrap( self.ut2TherapyFrequencyMin );
                        var ut2TherapyFrequencyMax = unwrap( self.ut2TherapyFrequencyMax );
                        var ut2TherapyFrequencyType = unwrap( self.ut2TherapyFrequencyType );
                        var frequence = ut2TherapyFrequencyMax || ut2TherapyFrequencyMin;
                        return ut2TherapyFrequencyType === 'UNITS_PER_WEEK' ? 12 * frequence : null;
                    } );

                    self.displayRemedy1UnitStats = ko.computed( function() {
                        var sumRemedyList1Units = unwrap( self.sumRemedyList1Units );
                        var catalogMaxRemedyUnits = unwrap( self.catalogMaxRemedyUnits );
                        var maxUnitsByFrequence = unwrap( self.maxUnitsByFrequence );

                        if( !unwrap( self.checkPrescriptionMaxUnits ) && maxUnitsByFrequence ) {
                            return [sumRemedyList1Units || '-', maxUnitsByFrequence || '-'].join( '/' );
                        }
                        if( !unwrap( self.checkPrescriptionMaxUnits ) ) {
                            return sumRemedyList1Units;
                        }
                        return [sumRemedyList1Units || '-', catalogMaxRemedyUnits || '-'].join( '/' );
                    } );

                    self.displayRemedy2UnitStats = ko.computed( function() {
                        var sumRemedyList1Units = unwrap( self.sumRemedyList1Units );
                        var sumRemedyList2Units = unwrap( self.sumRemedyList2Units );
                        var catalogMaxRemedyUnits = unwrap( self.catalogMaxRemedyUnits );

                        if( !unwrap( self.checkPrescriptionMaxUnits ) ) {
                            return sumRemedyList2Units;
                        }
                        return [sumRemedyList2Units || '-', (sumRemedyList1Units || catalogMaxRemedyUnits) || '-'].join( '/' );
                    } );

                    self.displayRemedyUnitStatsTooltip = ko.computed( function() {
                        var maxUnitsByFrequence = unwrap( self.maxUnitsByFrequence );
                        var checkPrescriptionMaxUnits = unwrap( self.checkPrescriptionMaxUnits );

                        if( checkPrescriptionMaxUnits ) {
                            return 'Gesamteinheiten/Höchstmenge Katalog';
                        } else if( maxUnitsByFrequence ) {
                            return 'Gesamteinheiten/Höchstmenge in Abhängigkeit von der Therapiefrequenz';
                        }
                        return 'Gesamteinheiten';
                    } );

                    self.displayCaseRemedyUnitStats = ko.computed( function() {
                        var prescriptionAmount = unwrap( self.prescriptionAmount ) || 0;
                        var ut2PrescriptionCaseUnitsSum = unwrap( self.ut2PrescriptionCaseUnitsSum ) || 0;
                        var catalogMaxCaseRemedyUnits = unwrap( self.catalogMaxCaseRemedyUnits ) || 0;
                        var total = prescriptionAmount + ut2PrescriptionCaseUnitsSum;

                        if( !unwrap( self.checkPrescriptionMaxUnits ) ) {
                            return total;
                        }
                        return [total || '-', catalogMaxCaseRemedyUnits || '-'].join( '/' );
                    } );

                    self.displayCaseMassageRemedyUnitStats = ko.computed( function() {
                        var prescriptionAmountMassage = unwrap( self.prescriptionAmountMassage ) || 0;
                        var ut2PrescriptionCaseMassageUnitsSum = unwrap( self.ut2PrescriptionCaseMassageUnitsSum ) || 0;
                        var catalogMaxCaseMassageRemedyUnits = unwrap( self.catalogMaxCaseMassageRemedyUnits ) || 0;
                        var total = prescriptionAmountMassage + ut2PrescriptionCaseMassageUnitsSum;

                        if( !unwrap( self.checkPrescriptionMaxUnits ) ) {
                            return prescriptionAmountMassage;
                        }
                        return [total || '-', catalogMaxCaseMassageRemedyUnits || '-'].join( '/' );
                    } );

                    self.displayCaseStandardizedCombinationUnitsStats = ko.computed( function() {
                        var prescriptionAmountStandardizedCombination = unwrap( self.prescriptionAmountStandardizedCombination ) || 0;
                        var ut2PrescriptionCaseStandardizedCombinationUnitsSum = unwrap( self.ut2PrescriptionCaseStandardizedCombinationUnitsSum ) || 0;
                        var catalogMaxCaseStandardizedCombinationUnits = unwrap( self.catalogMaxCaseStandardizedCombinationUnits ) || 0;
                        var total = +prescriptionAmountStandardizedCombination + ut2PrescriptionCaseStandardizedCombinationUnitsSum;

                        if( !unwrap( self.checkPrescriptionMaxUnits ) ) {
                            return total;
                        }

                        return [total || '-', catalogMaxCaseStandardizedCombinationUnits || '-'].join( '/' );
                    } );

                    // validate max amount of units, show alert and reset to valid number if too high
                    self.addDisposable( ko.computed( function() {
                        var binder = self.get( 'binder' );
                        var currentActivity = unwrap( binder.currentActivity );
                        var currentActivityIsValid = currentActivity.isValid();
                        var standardizedCombination = unwrap( self.standardizedCombination );
                        var standardizedCombinationUnits = standardizedCombination && unwrap( standardizedCombination.units );
                        var ut2Remedy1ListLength = unwrap( self.ut2Remedy1List ).length;
                        var ut2Remedy2ListLength = unwrap( self.ut2Remedy2List ).length;
                        var sumRemedyList1Units = unwrap( self.sumRemedyList1Units );
                        var sumRemedyList2Units = unwrap( self.sumRemedyList2Units );
                        var catalogMaxRemedyUnits = unwrap( self.catalogMaxRemedyUnits );
                        var isValid = true;
                        var diffRemedy1Units, diffRemedy2Units, diffRemedy1and2Units, messageId;

                        self.remediesHaveMaxCaseUnitError( false );
                        self.remediesHaveMaxCaseUnitErrorMessages.remove( MAX_UNITS_EXCEEDED );
                        currentActivity.warnings.remove( MAX_UNITS_EXCEEDED );

                        if( currentActivityIsValid && _.isFinite( catalogMaxRemedyUnits ) &&
                            (ut2Remedy1ListLength || ut2Remedy2ListLength) &&
                            unwrap( self.checkPrescriptionMaxUnits ) ) {

                            if( standardizedCombination && _.isFinite( standardizedCombinationUnits ) ) {
                                diffRemedy1Units = catalogMaxRemedyUnits - standardizedCombinationUnits;
                                isValid = diffRemedy1Units >= 0;
                            } else if( ut2Remedy1ListLength ) {
                                diffRemedy1Units = catalogMaxRemedyUnits - sumRemedyList1Units;
                                diffRemedy1and2Units = sumRemedyList1Units - sumRemedyList2Units;
                                isValid = diffRemedy1Units >= 0 && diffRemedy1and2Units >= 0;
                            } else {
                                diffRemedy2Units = catalogMaxRemedyUnits - sumRemedyList2Units;
                                isValid = ut2Remedy2ListLength && diffRemedy2Units >= 0;
                            }

                            if( !isValid ) {
                                // show warning that max amount of units exceeded
                                messageId = 'kbvutility2_max_catalog_units_exceeded';
                                Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: messageId,
                                    content: MAX_UNITS_EXCEEDED,
                                    level: 'WARNING'
                                } );
                                currentActivity.warnings.push( MAX_UNITS_EXCEEDED );
                                self.remediesHaveMaxCaseUnitErrorMessages.push( MAX_UNITS_EXCEEDED );

                                setTimeout( function() {
                                    function decreaseUnits( unitsDiff, remedyList ) {
                                        function decreaseItem( item ) {
                                            if( unitsDiff >= 0 ) {
                                                return;
                                            }
                                            var itemUnits = +unwrap( item.units );
                                            if( _.isFinite( itemUnits ) && itemUnits > 1 ) {
                                                item.units( --itemUnits );
                                                unitsDiff += 1;
                                            }
                                        }

                                        while( unitsDiff < 0 ) {
                                            remedyList.forEach( decreaseItem );
                                        }
                                    }

                                    decreaseUnits( diffRemedy1Units, unwrap( self.ut2Remedy1List ) );
                                    decreaseUnits( diffRemedy1and2Units, unwrap( self.ut2Remedy2List ) );
                                    decreaseUnits( diffRemedy2Units, unwrap( self.ut2Remedy2List ) );
                                }, 100 );
                            }
                        }

                        unwrap( binder.currentActivity ).invalidate( isValid, 'has-max-units-exceeded-error' );
                        self.remediesHaveMaxUnitError( !isValid );
                    } ).extend( {rateLimit: {timeout: 1000, method: "notifyWhenChangesStop"}} ) );

                    // validate max amount of units per case
                    self.addDisposable( ko.computed( function() {
                        var binder = self.get( 'binder' );
                        var currentActivity = unwrap( binder.currentActivity );
                        var currentActivityIsValid = currentActivity.isValid();
                        var ut2PrescriptionCaseId = unwrap( self.ut2PrescriptionCaseId );
                        var messageId;
                        var maxCaseUnitsExceeded = false;
                        var maxCaseMassageUnitsExceeded = false;
                        var maxCaseStandardizedCombinationUnitsExceeded = false;
                        var isValid = true;
                        var ut2Chapter = unwrap( self.ut2Chapter );
                        var prescriptionAmount = unwrap( self.prescriptionAmount ) || 0;
                        var prescriptionAmountMassage = unwrap( self.prescriptionAmountMassage ) || 0;
                        var prescriptionAmountStandardizedCombination = unwrap( self.prescriptionAmountStandardizedCombination );
                        var ut2PrescriptionCaseUnitsSum = self.ut2PrescriptionCaseUnitsSum();
                        var ut2PrescriptionCaseMassageUnitsSum = self.ut2PrescriptionCaseMassageUnitsSum();
                        var ut2PrescriptionCaseStandardizedCombinationUnitsSum = self.ut2PrescriptionCaseStandardizedCombinationUnitsSum();
                        var catalogMaxCaseRemedyUnits = unwrap( self.catalogMaxCaseRemedyUnits );
                        var catalogMaxCaseMassageRemedyUnits = unwrap( self.catalogMaxCaseMassageRemedyUnits );
                        var catalogMaxCaseStandardizedCombinationUnits = unwrap( self.catalogMaxCaseStandardizedCombinationUnits );

                        if( ko.computedContext.isInitial() ) {
                            return;
                        }

                        self.remediesHaveMaxCaseUnitError( false );
                        self.remediesHaveMaxCaseUnitErrorMessages.remove( MAX_STD_MASSAGE_CASE_UNITS_EXCEEDED );
                        currentActivity.warnings.remove( MAX_CASE_UNITS_EXCEEDED );


                        if( currentActivityIsValid && ['PODO', 'ET'].indexOf( ut2Chapter ) === -1 && unwrap( self.checkPrescriptionMaxUnits ) && ut2PrescriptionCaseId ) {

                            maxCaseUnitsExceeded = _.isFinite( ut2PrescriptionCaseUnitsSum ) &&
                                                   _.isFinite( catalogMaxCaseRemedyUnits ) &&
                                                   (ut2PrescriptionCaseUnitsSum + prescriptionAmount) > catalogMaxCaseRemedyUnits;

                            maxCaseMassageUnitsExceeded = _.isFinite( ut2PrescriptionCaseMassageUnitsSum ) &&
                                                          _.isFinite( catalogMaxCaseMassageRemedyUnits ) &&
                                                          (ut2PrescriptionCaseMassageUnitsSum + prescriptionAmountMassage) > catalogMaxCaseMassageRemedyUnits;

                            maxCaseStandardizedCombinationUnitsExceeded = _.isFinite( ut2PrescriptionCaseStandardizedCombinationUnitsSum ) &&
                                                                          _.isFinite( catalogMaxCaseStandardizedCombinationUnits ) &&
                                                                          (ut2PrescriptionCaseStandardizedCombinationUnitsSum + +prescriptionAmountStandardizedCombination) > catalogMaxCaseStandardizedCombinationUnits;

                            if( maxCaseUnitsExceeded ) {
                                messageId = 'kbvutility2_max_case_catalog_units_exceeded';
                                Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: messageId,
                                    content: MAX_CASE_UNITS_EXCEEDED,
                                    level: 'WARNING'
                                } );
                                currentActivity.warnings.push( MAX_CASE_UNITS_EXCEEDED );
                            }

                            if( maxCaseMassageUnitsExceeded || maxCaseStandardizedCombinationUnitsExceeded ) {
                                messageId = 'kbvutility2_max_case_std_massage_catalog_units_exceeded';
                                Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: messageId,
                                    content: MAX_STD_MASSAGE_CASE_UNITS_EXCEEDED,
                                    level: 'ERROR'
                                } );
                                isValid = false;
                                self.remediesHaveMaxCaseUnitErrorMessages.push( MAX_STD_MASSAGE_CASE_UNITS_EXCEEDED );
                            }
                        }

                        currentActivity.invalidate( isValid, 'has-max-case-exceeded-error' );
                        self.remediesHaveMaxCaseUnitError( !isValid );
                    } ).extend( {rateLimit: {timeout: 1000, method: "notifyWhenChangesStop"}} ) );

                    self.addDisposable( ko.computed( function() {
                        var binder = self.get( 'binder' );
                        var currentActivity = unwrap( binder.currentActivity );
                        var currentActivityIsValid = currentActivity.isValid();
                        var excludedDiagnosisGroups = ['ST3', 'DF', 'NF', 'QF'];
                        var ut2DiagnosisGroupCode = unwrap( self.ut2DiagnosisGroupCode );
                        var isExcludedDiagnosisGroup = excludedDiagnosisGroups.indexOf( ut2DiagnosisGroupCode ) !== -1;
                        var prescriptionAmount = unwrap( self.prescriptionAmount ) || 0;
                        var ut2TherapyFrequencyMin = unwrap( self.ut2TherapyFrequencyMin );
                        var ut2TherapyFrequencyMax = unwrap( self.ut2TherapyFrequencyMax );
                        var ut2TherapyFrequencyType = unwrap( self.ut2TherapyFrequencyType );
                        var frequence = ut2TherapyFrequencyMax || ut2TherapyFrequencyMin;
                        var isValid = true, messageId;

                        self.remediesHaveMaxUnitAgreementError( false );
                        self.remediesHaveMaxCaseUnitErrorMessages.remove( MAX_UNITS_AGREEMENT );

                        if( ko.computedContext.isInitial() || unwrap( self.checkPrescriptionMaxUnits ) || isExcludedDiagnosisGroup ||
                            !_.isFinite( frequence ) || !_.isFinite( prescriptionAmount ) || ut2TherapyFrequencyType !== 'UNITS_PER_WEEK' ) {
                            return;
                        }

                        isValid = prescriptionAmount / frequence <= 12;

                        if( currentActivityIsValid && !isValid ) {
                            messageId = 'kbvutility2_max_case_std_massage_catalog_units_exceeded';
                            Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: messageId,
                                content: MAX_UNITS_AGREEMENT,
                                level: 'ERROR'
                            } );
                            self.remediesHaveMaxCaseUnitErrorMessages.push( MAX_UNITS_AGREEMENT );
                        }

                        unwrap( binder.currentActivity ).invalidate( isValid, 'has-max-agreement-units-exceeded-error' );
                        self.remediesHaveMaxUnitAgreementError( !isValid );

                    } ).extend( {rateLimit: {timeout: 1000, method: "notifyWhenChangesStop"}} ) );

                    self.addDisposable( ko.computed( function() {
                        var ut2PrescriptionCaseId = unwrap( self.ut2PrescriptionCaseId );

                        if( !ut2PrescriptionCaseId || ko.computedContext.isInitial() ) {
                            return;
                        }

                        Promise.resolve( Y.doccirrus.jsonrpc.api.kbvutility2.calculatePrescriptionCaseUnits( {
                            prescriptionCaseId: ut2PrescriptionCaseId
                        } ) )
                            .then( function( response ) {
                                var
                                    results = response.data;
                                self.ut2PrescriptionCaseUnitsSum( results.unitsSum );
                                self.ut2PrescriptionCaseMassageUnitsSum( results.massageUnitsSum );
                                self.ut2PrescriptionCaseStandardizedCombinationUnitsSum( results.standardizedCombinationUnitsSum );
                            } )
                            .catch( function( err ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                Y.log( 'checkAgreement: error: ' + err, 'debug', NAME );
                            } );

                    } ).extend( {rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}} ) );

                    // revalidate remedy lists
                    self.addDisposable( ko.computed( function() {
                        unwrap( self.ut2Remedy1List );
                        unwrap( self.ut2Remedy2List );
                        unwrap( self.ut2Remedy2List );
                        unwrap( self.ut2BlankRegulation );
                        unwrap( self.ut2BlankRegulationIgnored );
                        self.ut2Remedy1List.validate();
                        self.ut2Remedy2List.validate();
                    } ) );

                    // reset units that were set before changing to standardized combination
                    self.addDisposable( ko.computed( function() {
                        var standardizedCombination = unwrap( self.standardizedCombination );
                        var remedies = unwrap( self.ut2Remedy1List ).concat( unwrap( self.ut2Remedy2List ) );
                        if( !standardizedCombination ) {
                            return;
                        }
                        remedies.forEach( function( entry ) {
                            if( peek( entry.type ) !== 'STANDARDIZED_COMBINATIONS_OF_REMEDIES' ) {
                                entry.units( 0 );
                            }
                        } );
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var standardizedCombination = self.standardizedCombination(),
                            ut2Remedy1List = unwrap( self.ut2Remedy1List ),
                            ut2Remedy2List = unwrap( self.ut2Remedy2List ),
                            remedyNames;
                        if( standardizedCombination ) {
                            remedyNames = ut2Remedy1List.concat( ut2Remedy2List ).map( function( entry ) {
                                if( peek( entry.type ) === 'STANDARDIZED_COMBINATIONS_OF_REMEDIES' ) {
                                    return;
                                }
                                return peek( entry.name );
                            } ).filter( Boolean );

                            standardizedCombination.text( remedyNames.join( ';' ) );
                        }
                    } ) );

                    self.remedySelect = self.addTableSelect( KoComponentManager.createComponent( {
                        componentType: 'KoTableSelect',
                        componentConfig: {
                            options: ko.computed( function() {
                                var u_extra = unwrap( self.u_extra ),
                                    ut2ConductionSymptomCodes = unwrap( self.ut2ConductionSymptoms ).map( function( entry ) {
                                        return peek( entry.code );
                                    } ),
                                    options = [],
                                    heilmittelverordnung = u_extra && u_extra.heilmittelverordnung,
                                    vorrangiges_heilmittel_liste = heilmittelverordnung && heilmittelverordnung.vorrangiges_heilmittel_liste || [],
                                    ergaenzendes_heilmittel_liste = heilmittelverordnung && heilmittelverordnung.ergaenzendes_heilmittel_liste || [],
                                    standardisierte_heilmittel_kombination = heilmittelverordnung && heilmittelverordnung.standardisierte_heilmittel_kombination || [];

                                if( vorrangiges_heilmittel_liste.length ) {
                                    options.push( {type: 'heading', text: 'Vorrangiges Heilmittel'} );
                                }

                                vorrangiges_heilmittel_liste.filter( function( entry ) {
                                    var validConductionSymptomCode = true,
                                        validPatientAge = true;

                                    if( entry.erforderliche_leitsymptomatik && ut2ConductionSymptomCodes.length ) {
                                        validConductionSymptomCode = ut2ConductionSymptomCodes.indexOf( entry.erforderliche_leitsymptomatik ) > -1;
                                    }

                                    if( hasAge && entry.mindestalter_jahre ) {
                                        validPatientAge = patientAge > entry.mindestalter_jahre;
                                    }

                                    if( hasAge && validPatientAge && entry.hoechstalter_jahre ) {
                                        validPatientAge = patientAge < entry.hoechstalter_jahre;
                                    }

                                    return validPatientAge && validConductionSymptomCode;
                                } ).forEach( function( entry ) {
                                    entry.remedyType = 'PRIMARY_REMEDY';
                                    options.push( entry );
                                } );

                                if( ergaenzendes_heilmittel_liste.length ) {
                                    options.push( {type: 'heading', text: 'Ergänzendes Heilmittel'} );
                                }

                                ergaenzendes_heilmittel_liste.forEach( function( entry ) {
                                    entry.remedyType = 'COMPLEMENTARY_REMEDY';
                                    options.push( entry );
                                } );

                                if( standardisierte_heilmittel_kombination.length ) {
                                    options.push( {type: 'heading', text: 'Standardisierte Heilmittelkombinationen'} );
                                }

                                standardisierte_heilmittel_kombination.forEach( function( entry ) {
                                    entry.remedyType = 'STANDARDIZED_COMBINATIONS_OF_REMEDIES';
                                    options.push( entry );
                                } );

                                return options;
                            } ),
                            multi: true,
                            val: ko.computed( {
                                read: function() {
                                    var remedyList = self.ut2Remedy1List().concat( self.ut2Remedy2List() );
                                    return remedyList.map( function( utRemedy ) {
                                        return unwrap( utRemedy.name );
                                    } );
                                },
                                write: function( selectedEntries ) {
                                    var ut2Remedy1List = unwrap( self.ut2Remedy1List ),
                                        ut2Remedy2List = unwrap( self.ut2Remedy2List ),
                                        newUt2Remedy1List = [],
                                        newUt2Remedy2List = [];

                                    selectedEntries.filter( Boolean ).forEach( function( entry ) {
                                        var alreadySelected;
                                        switch( entry.remedyType ) {
                                            case 'PRIMARY_REMEDY':
                                            case 'STANDARDIZED_COMBINATIONS_OF_REMEDIES':
                                                alreadySelected = ut2Remedy1List.find( function( utRemedyEntry ) {
                                                    return unwrap( utRemedyEntry.name ) === entry.name;
                                                } );
                                                if( alreadySelected ) {
                                                    newUt2Remedy1List.push( alreadySelected );
                                                } else {
                                                    newUt2Remedy1List.push( {
                                                        name: entry.name,
                                                        type: entry.remedyType,
                                                        requiredConductionSymptom: entry.erforderliche_leitsymptomatik,
                                                        massage: entry.massagetechnik
                                                    } );
                                                }
                                                break;
                                            case 'COMPLEMENTARY_REMEDY':
                                                alreadySelected = ut2Remedy2List.find( function( utRemedyEntry ) {
                                                    return unwrap( utRemedyEntry.name ) === entry.name;
                                                } );
                                                if( alreadySelected ) {
                                                    newUt2Remedy2List.push( alreadySelected );
                                                } else {
                                                    newUt2Remedy2List.push( {
                                                        name: entry.name,
                                                        type: entry.remedyType,
                                                        requiredConductionSymptom: entry.erforderliche_leitsymptomatik,
                                                        massage: entry.massagetechnik
                                                    } );
                                                }
                                                break;
                                            default:
                                                Y.log( 'could not map selected remedy entry of type: ' + entry.remedyType, 'warn', NAME );
                                                return;
                                        }

                                    } );

                                    currentActivity.ut2Remedy1List( newUt2Remedy1List );
                                    currentActivity.ut2Remedy2List( newUt2Remedy2List );
                                    self.invalidatePrices();
                                }
                            } ),
                            editMode: false,
                            optionsName: 'kbvutility-heilmittel',
                            optionsValue: 'name',
                            displayComponent: false,
                            optionsColumns: [
                                {title: 'Name', propertyName: 'name'},
                                {title: 'Erforderliche Leitsymptomatik', propertyName: 'erforderliche_leitsymptomatik'}
                            ]
                        }
                    } ) );

                    // clean remedies not present in options due to leitsymtomatik change
                    self.addDisposable( ko.computed( function() {
                        var ut2ConductionSymptomCodes = unwrap( self.ut2ConductionSymptoms ).map( function( entry ) {
                            return peek( entry.code );
                        } );
                        currentActivity.ut2Remedy1List.remove( function( entry ) {
                            var requiredConductionSymptom = peek( entry.requiredConductionSymptom );
                            return requiredConductionSymptom && ut2ConductionSymptomCodes.indexOf( requiredConductionSymptom ) === -1;
                        } );
                    } ) );

                },
                initTherapyFrequency: function() {
                    var self = this;

                    // set "Richtlinienwert"
                    self.addDisposable( ko.computed( function() {
                        var u_extra = unwrap( self.u_extra ),
                            heilmittelverordnung = u_extra && u_extra.heilmittelverordnung,
                            frequenzempfehlungstyp = heilmittelverordnung && heilmittelverordnung.frequenzempfehlungstyp || [],
                            frequenzempfehlung_liste = heilmittelverordnung && heilmittelverordnung.frequenzempfehlung_liste || [],
                            richtlinien_eintrag = frequenzempfehlung_liste.find( function( entry ) {
                                return entry.richtlinie === 'true';
                            } );

                        if( ko.computedContext.isInitial() ) {
                            return;
                        }

                        var type = frequenzempfehlungstyp && Y.doccirrus.schemas.v_kbvutility2.mapTherapyFrequenceTypeFromCatalogType( frequenzempfehlungstyp ) || null;
                        self.ut2TherapyFrequencyMin( richtlinien_eintrag && richtlinien_eintrag.minimale_anzahl || null );
                        self.ut2TherapyFrequencyMax( richtlinien_eintrag && richtlinien_eintrag.maximale_anzahl || null );
                        self.ut2TherapyFrequencyType( type );
                    } ) );

                    self.renderTherapyFrequence = ko.computed( function() {
                        var ut2TherapyFrequencyType = self.ut2TherapyFrequencyType();
                        var frequenzempfehlungstyp = ut2TherapyFrequencyType && Y.doccirrus.schemas.v_kbvutility2.mapTherapyFrequenceTypeToCatalogType( ut2TherapyFrequencyType );
                        return frequenzempfehlungstyp ? Y.doccirrus.schemas.v_kbvutility2.renderTherapyFrequencyCatalogEntry( frequenzempfehlungstyp, {
                            minimale_anzahl: self.ut2TherapyFrequencyMin(),
                            maximale_anzahl: self.ut2TherapyFrequencyMax()
                        } ) : '';
                    } );

                    self.therapyFrequencySelect = self.addTableSelect( KoComponentManager.createComponent( {
                        componentType: 'KoTableSelect',
                        componentConfig: {
                            options: ko.computed( function() {
                                var u_extra = unwrap( self.u_extra ),
                                    heilmittelverordnung = u_extra && u_extra.heilmittelverordnung,
                                    frequenzempfehlungstyp = heilmittelverordnung && heilmittelverordnung.frequenzempfehlungstyp || [],
                                    frequenzempfehlung_liste = heilmittelverordnung && heilmittelverordnung.frequenzempfehlung_liste || [];

                                return frequenzempfehlung_liste.map( function( entry ) {
                                    entry.val = [entry.minimale_anzahl, entry.maximale_anzahl, frequenzempfehlungstyp].join( '-' );
                                    entry.text = Y.doccirrus.schemas.v_kbvutility2.renderTherapyFrequencyCatalogEntry( frequenzempfehlungstyp, entry );
                                    entry.directive = entry.richtlinie === 'true' ? 'Ja' : 'Nein';
                                    entry.frequenzempfehlungstyp = frequenzempfehlungstyp;
                                    return entry;
                                } );
                            } ),
                            multi: false,
                            val: ko.computed( {
                                read: function() {
                                    var ut2TherapyFrequencyType = self.ut2TherapyFrequencyType();
                                    var catalogType = ut2TherapyFrequencyType && Y.doccirrus.schemas.v_kbvutility2.mapTherapyFrequenceTypeToCatalogType( ut2TherapyFrequencyType );
                                    var val = catalogType && [self.ut2TherapyFrequencyMin(), self.ut2TherapyFrequencyMax(), catalogType].join( '-' ) || null;
                                    return val;
                                },
                                write: function( selectedEntry ) {
                                    if( !selectedEntry ) {
                                        return;
                                    }
                                    var minimale_anzahl = selectedEntry && selectedEntry.minimale_anzahl || null;
                                    var maximale_anzahl = selectedEntry && selectedEntry.maximale_anzahl || null;
                                    var frequenzempfehlungstyp = selectedEntry && selectedEntry.frequenzempfehlungstyp || null;
                                    var type = frequenzempfehlungstyp && Y.doccirrus.schemas.v_kbvutility2.mapTherapyFrequenceTypeFromCatalogType( frequenzempfehlungstyp ) || null;
                                    self.ut2TherapyFrequencyMin( minimale_anzahl );
                                    self.ut2TherapyFrequencyMax( maximale_anzahl );
                                    self.ut2TherapyFrequencyType( type );
                                }
                            } ),
                            editMode: false,
                            optionsName: 'kbvutility-therapy-frequence',
                            optionsValue: 'val',
                            displayComponent: false,
                            optionsColumns: [
                                {title: 'Therapiefrequenz', propertyName: 'text'},
                                {title: 'Nach Richtlinie?', propertyName: 'directive'}
                            ]
                        }
                    } ) );

                    self.therapyFrequenceDirectiveIconColor = ko.observable();
                    self.therapyFrequenceDirectiveIconTooltip = ko.observable();

                    self.addDisposable( ko.computed( function() {
                        var
                            matchingEntry,
                            ut2TherapyFrequencyType = self.ut2TherapyFrequencyType(),
                            ut2TherapyFrequencyMin = self.ut2TherapyFrequencyMin(),
                            ut2TherapyFrequencyMax = self.ut2TherapyFrequencyMax(),
                            ut2TherapyFrequencyType_frequenzempfehlungstyp = ut2TherapyFrequencyType && Y.doccirrus.schemas.v_kbvutility2.mapTherapyFrequenceTypeToCatalogType( ut2TherapyFrequencyType ),

                            u_extra = unwrap( self.u_extra ),
                            heilmittelverordnung = u_extra && u_extra.heilmittelverordnung,
                            frequenzempfehlungstyp = heilmittelverordnung && heilmittelverordnung.frequenzempfehlungstyp || [],
                            frequenzempfehlung_liste = heilmittelverordnung && heilmittelverordnung.frequenzempfehlung_liste || [];

                        if( !frequenzempfehlung_liste || !frequenzempfehlung_liste.length ||
                            !ut2TherapyFrequencyType || !frequenzempfehlungstyp ||
                            ut2TherapyFrequencyType_frequenzempfehlungstyp !== frequenzempfehlungstyp ||
                            (!ut2TherapyFrequencyMin && !ut2TherapyFrequencyMax) ) {

                            self.therapyFrequenceDirectiveIconColor( '' );
                            self.therapyFrequenceDirectiveIconTooltip( '' );

                            return false;
                        }
                        matchingEntry = frequenzempfehlung_liste.find( function( entry ) {
                            return entry.minimale_anzahl === ut2TherapyFrequencyMin &&
                                   (!entry.maximale_anzahl && !ut2TherapyFrequencyMax || entry.maximale_anzahl === ut2TherapyFrequencyMax);
                        } );

                        if( !matchingEntry ) {
                            self.therapyFrequenceDirectiveIconColor( 'red' );
                            self.therapyFrequenceDirectiveIconTooltip( 'Eigene Frequenz' );
                        } else if( matchingEntry.richtlinie === 'true' ) {
                            self.therapyFrequenceDirectiveIconColor( 'green' );
                            self.therapyFrequenceDirectiveIconTooltip( 'Frequenz nach Richtlinie' );
                        } else {
                            self.therapyFrequenceDirectiveIconColor( 'yellow' );
                            self.therapyFrequenceDirectiveIconTooltip( 'Frequenz nach Katalog' );
                        }

                    } ) );

                    self.hasTherapyFrequenciesInCatalog = ko.computed( function() {
                        var u_extra = unwrap( self.u_extra ),
                            heilmittelverordnung = u_extra && u_extra.heilmittelverordnung,
                            frequenzempfehlung_liste = heilmittelverordnung && heilmittelverordnung.frequenzempfehlung_liste || [];
                        return Boolean( frequenzempfehlung_liste.length );
                    } );

                    self.showTherapyFrequenciesDirectiveIcon = ko.computed( function() {
                        var ut2TherapyFrequencyMin = self.ut2TherapyFrequencyMin();
                        return self.hasTherapyFrequenciesInCatalog() && ut2TherapyFrequencyMin;
                    } );

                },

                // TODO: generals with icd table?

                toggleTherapyGoalsShowTreatmentRelevantDiagnosisTexts: function() {
                    var self = this;
                    self.therapyGoaldiagnosisAndFindingTableVisible( !peek( self.therapyGoaldiagnosisAndFindingTableVisible ) );
                },
                removeTherapyGoalsTreatmentRelevantDiagnosisTexts: function() {
                    var self = this;
                    self.utTherapyGoals( '' );
                },
                getJoinedTherapyGoalsTreatmentRelevantDiagnosisTableTexts: function() {
                    var self = this;

                    return self.therapyGoaldiagnosisAndFindingTable.getComponentColumnCheckbox().checked()
                        .map( function getUserContent( activities ) {
                            return activities.userContent;
                        } )
                        .filter( Boolean )
                        .join( '; ' );
                },
                addTherapyGoalTreatmentRelevantDiagnosisTexts: function() {
                    var self = this;

                    self.utTherapyGoals( [peek( self.utTherapyGoals )]
                        .concat( self.getJoinedTherapyGoalsTreatmentRelevantDiagnosisTableTexts() )
                        .filter( Boolean )
                        .join( '; ' ) );
                    self.therapyGoaldiagnosisAndFindingTableVisible( false );
                    self.therapyGoaldiagnosisAndFindingTable.getComponentColumnCheckbox().checked( [] );
                },
                overrideTherapyGoalTreatmentRelevantDiagnosisTexts: function() {
                    var self = this;

                    self.utTherapyGoals( self.getJoinedTherapyGoalsTreatmentRelevantDiagnosisTableTexts() );
                    self.therapyGoaldiagnosisAndFindingTableVisible( false );
                    self.therapyGoaldiagnosisAndFindingTable.getComponentColumnCheckbox().checked( [] );
                },
                onMouseOutTherapyGoalDiagnosisAndFindingTable: function( model, event ) {
                    var self = this,
                        insideEditPanel = $( event.relatedTarget ).closest( '.diagnosisAndFindingTable' ).length > 0;

                    if( insideEditPanel ) {
                        return;
                    }
                    self.therapyGoaldiagnosisAndFindingTableVisible( false );
                },
                initTherapyGoal: function() {
                    var self = this;

                    self.therapyGoaldiagnosisAndFindingTable = createDiagnosisAndFindingTable( self, 'TherapyGoal' );
                    self.therapyGoaldiagnosisAndFindingTableVisible = ko.observable( false );

                    self.addTherapyGoalTreatmentRelevantDiagnosisTextsButton = KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'ok',
                            text: i18n( 'general.button.ADD' ),
                            option: 'PRIMARY',
                            click: function() {
                                self.addTherapyGoalTreatmentRelevantDiagnosisTexts();
                            },
                            disabled: self.addDisposable( ko.computed( function() {
                                var checked = self.therapyGoaldiagnosisAndFindingTable.getComponentColumnCheckbox().checked();
                                return checked.length === 0;
                            } ) )
                        }
                    } );

                    self.overrideTherapyGoalTreatmentRelevantDiagnosisTextsButton = KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'ok',
                            text: 'Überschreiben', // TODO: i18n
                            option: 'PRIMARY',
                            click: function() {
                                self.overrideTherapyGoalTreatmentRelevantDiagnosisTexts();
                            },
                            disabled: self.addDisposable( ko.computed( function() {
                                var checked = self.therapyGoaldiagnosisAndFindingTable.getComponentColumnCheckbox().checked();
                                return checked.length === 0;
                            } ) )
                        }
                    } );

                },
                getInsurance: function() {
                    var self = this,
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        caseFolder = peek( self.get( 'caseFolder' ) ),
                        insuranceStatus = peek( currentPatient.insuranceStatus ),
                        result = null;
                    if( caseFolder && insuranceStatus.length ) {
                        insuranceStatus.some( function( insurance ) {
                            if( caseFolder.type === peek( insurance.type ) ) {
                                result = insurance;
                                return true;
                            }
                        } );
                    }
                    return result;
                },
                invalidatePrices: function() {
                    var
                        self = this,
                        locationId = peek( self.locationId ),
                        insurance = self.getInsurance(),
                        utilityNames = peek( self.ut2Remedy1List ).concat( peek( self.ut2Remedy2List ) ).map( function( utility ) {
                            return peek( utility.name );
                        } ),
                        vknrSerialNo = null;

                    function find( name, utPrices ) {
                        var result;
                        utPrices.some( function( utPrice ) {
                            if( name === utPrice.utilityName ) {
                                result = utPrice;
                                return true;
                            }
                        } );
                        return result;
                    }

                    if( ['CREATED', 'VALID'].indexOf( self.status() ) < 0 ) {
                        return;
                    }

                    if( !insurance ) {
                        Y.log( 'invalidatePrices: could not get prices without insurance matching casefolder', 'debug', NAME );
                        return;
                    }

                    if( !utilityNames.length ) {
                        return;
                    }

                    if( 'PUBLIC' === peek( insurance.type ) ) {
                        try {
                            vknrSerialNo = Y.doccirrus.kbvcommonutils.getVknrSerialNo( peek( insurance.insuranceGrpId ) );
                        } catch( error ) {
                            Y.log( 'invalidatePrices: could not get vknr serial no. ' + error, 'warn', NAME );
                            return;
                        }
                    }

                    Promise.resolve( Y.doccirrus.jsonrpc.api.kbvutilityprice.getPrices( {
                        insuranceType: unwrap( insurance.type ),
                        utilityNames: utilityNames,
                        locationId: locationId,
                        serialNo: vknrSerialNo
                    } ) ).then( function( response ) {
                        var data = response.data;
                        if( !data || !data.length ) {
                            return;
                        }
                        peek( self.ut2Remedy1List ).concat( peek( self.ut2Remedy2List ) ).forEach( function( utility ) {
                            var utPrice = find( peek( utility.name ), data );
                            if( utPrice && utPrice.price !== peek( utility.price ) ) {
                                utility.price( utPrice.price );
                            }
                        } );
                    } ).catch( function( err ) {
                        Y.log( 'could not get kbv utility prices ' + err, 'error', NAME );
                    } );

                },
                displayPrice: function( price ) {
                    if( !price ) {
                        return '';
                    }
                    return Y.doccirrus.comctl.numberToLocalString( price );
                }
            }, {
                NAME: 'KBVUtility2EditorModel'
            }
        );

        KBVUtility2EditorModel.createUtilityIcdCodeAutoComplete = createUtilityIcdCodeAutoComplete;
        KBVUtility2EditorModel.byCatalogQueryFn = byCatalogQueryFn;
        KBVUtility2EditorModel.getChapterCodeByTitle = getChapterCodeByTitle;

        KoViewModel.registerConstructor( KBVUtility2EditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'dc-comctl',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'inCaseUtils',
            'DCSystemMessages',
            'KoTableSelect',
            'v_kbvutility2-schema'
        ]
    }
);
