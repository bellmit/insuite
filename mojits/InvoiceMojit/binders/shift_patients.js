/**
 * User: do
 * Date: 20.03.19  12:07
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*exported _fn */

/*global ko, moment, _*/

function _fn( Y, NAME ) {
    'use strict';

    var i18n = Y.doccirrus.i18n,
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        SHIFT_PATIENT_BTN = i18n( 'InvoiceMojit.shiftpatients.shift_patientsJS.button.SHIFT_PATIENT_BTN' ),
        PATIENT_LABEL = i18n( 'InvoiceMojit.shiftpatients.shift_patientsJS.label.PATIENT' ),
        TREATMENTS_LABEL = i18n( 'InvoiceMojit.shiftpatients.shift_patientsJS.label.TREATMENTS' ),
        DIAGNOSES_LABEL = i18n( 'InvoiceMojit.shiftpatients.shift_patientsJS.label.DIAGNOSES' ),
        SUM_LABEL = i18n( 'InvoiceMojit.shiftpatients.shift_patientsJS.label.SUM' ),
        DOCTOR_LABEL = i18n( 'InvoiceMojit.shiftpatients.shift_patientsJS.label.DOCTOR' ),
        KoUI = Y.doccirrus.KoUI,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoComponentManager = KoUI.KoComponentManager;

    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            Y.Array.invoke( errors, 'display' );
        }

    }

    function catalogCodeMapper( entry ) {
        if( entry.messages && !entry.title ) {
            entry.title = Y.doccirrus.schemas.catalog.getMessageInLanguage( entry.messages, Y.config.lang );
        }

        return {id: entry.seq, text: entry.title, _data: entry};
    }

    function createSearchChoice( term ) {
        return {id: term, text: term};
    }

    function formatResult( result, container, query, escapeMarkup ) {
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

    }

    function formatResultCssClass( result ) {
        var
            type = 'textform-homecatalog';

        if( result._data && !result._data.count && 0 !== result._data.count ) { //catalogEntry
            type = 'textform-originalcatalog';
        }

        return type;
    }

    /**
     * @constructor
     * @class ShiftPatientsViewModel
     */
    function ShiftPatientsViewModel() {
        ShiftPatientsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ShiftPatientsViewModel, KoViewModel.getBase(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.i18n = {
                REASSIGN_TREATMENTS: i18n( 'InvoiceMojit.shiftpatients.shift_patientsJS.headlines.REASSIGN_TREATMENTS' ),
                TAB_DESCRIPTION: i18n( 'InvoiceMojit.shiftpatients.shift_patientsJS.texts.TAB_DESCRIPTION' ),
                ALERT: i18n( 'InvoiceMojit.shiftpatients.shift_patientsJS.texts.ALERT' ),
                SELECT_LOCATION_EMPLOYEE: i18n( 'InvoiceMojit.shiftpatients.shift_patientsJS.headlines.SELECT_LOCATION_EMPLOYEE' ),
                FILTER_BY_TREATMENTS_AND_DIAGNOSES: i18n( 'InvoiceMojit.shiftpatients.shift_patientsJS.headlines.FILTER_BY_TREATMENTS_AND_DIAGNOSES' ),
                SELECT_SCHEINS_FOR_REASSIGNMENT: i18n( 'InvoiceMojit.shiftpatients.shift_patientsJS.headlines.SELECT_SCHEINS_FOR_REASSIGNMENT' )
            };

            self.locationList = [];

            self.addDisposable( ko.computed( function() {
                self.sourceEmployeeIds();
                self.targetEmployeeId.validate();
            } ) );

            self.initDateRange();
            self.initInvoiceSelect();
            self.initEmployeeLocationSelect();
            self.initFilter();
            self.initResultTable();
            self.initActionButtons();
        },

        destructor: function() {
        },
        initDateRange: function() {
            // TODO: try to keep ranges in range defined from selected invoice or at least highlight error if out of range
            // TODO: according to pm date range selector component behaves different on reportings page
            // TODO: quarter is set to current quarter change to invoice quarter (GKV)
            var self = this;
            self.dateRange = KoComponentManager.createComponent( {
                componentType: 'KoDateRangeSelector',
                componentConfig: {
                    switchMode: self.dateSelectorSwitchMode || 'quarter'
                }
            } );
        },
        initInvoiceSelect: function() {
            var self = this;

            self.select2InvoiceLogTypeConfig = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return self.invoiceLogType();
                    },
                    write: function( $event ) {
                        self.invoiceLogType( $event.val );
                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: false,
                    data: function() {
                        return {
                            results: self.invoiceLogType.list().map( function( entry ) {
                                return {id: entry.val, text: entry.i18n};
                            } )
                        };
                    }
                }
            };

            self.select2InvoiceLogConfig = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var invoiceLogId = self.invoiceLogId(),
                            invoiceLogText = self.invoiceLogText();
                        if( !invoiceLogId ) {
                            return null;
                        }
                        return {id: invoiceLogId, text: invoiceLogText};
                    },
                    write: function( $event ) {
                        var data = $event.added && $event.added._data;
                        // var startDate, endDate;
                        self.invoiceLogId( $event.val );
                        self.invoiceLogText( $event.added && $event.added.text );
                        self.locationList = data && data.invoiceEntryHeader && data.invoiceEntryHeader.data && data.invoiceEntryHeader.data.locations || [];
                        self.sourceEmployeeIds( [] );
                        self.targetEmployeeId( null );

                        // TODO: does not work at the moment
                        if( data && data._type === 'KBV' ) {
                            // TODO: set end of quarter as max and 3 month ago as min
                            // self.dateRange.endDate();
                            // self.dateRange.startDate();
                        } else {
                            if( data && data.useStartDate ) {
                                self.dateRange.setMinDate( data.startDate );
                            }
                            if( data && data.useEndDate ) {
                                self.dateRange.setMaxDate( data.endDate );
                            }
                        }
                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    query: function( query ) {
                        var invoiceLogType = self.invoiceLogType();
                        if( !invoiceLogType ) {
                            query.callback( {results: []} );
                        }
                        Y.doccirrus.jsonrpc.api.invoicelog.searchInvoiceLog( {
                            query: {term: query.term, invoiceLogType: invoiceLogType},
                            includeInvoiceEntryHeader: true
                        } ).done( function( response ) {
                            self.inactivePhysicianIds = response.data && response.data.inactivePhysicianIds;
                            query.callback( {
                                results: (response.data && response.data.result || []).map( function( invoiceLog ) {
                                    var text = [
                                        invoiceLog.locname,
                                        invoiceLog.commercialNo,
                                        invoiceLog.totalItems,
                                        invoiceLog.insuranceTypes && invoiceLog.insuranceTypes.map( function( insuranceType ) {
                                            return Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', insuranceType, 'i18n', '' );
                                        } ).join( ', ' ),
                                        invoiceLog.minTotal,
                                        invoiceLog.doNotcheckCatalog && i18n( 'FilterInvoiceItemsDialog.doNotcheckCatalog.pill' ),
                                        [invoiceLog.useStartDate && invoiceLog.startDate, invoiceLog.useEndDate && invoiceLog.endDate].filter( Boolean ).map( function( date ) {
                                            return moment( date ).format( TIMESTAMP_FORMAT );
                                        } ).join( ' - ' ),
                                        invoiceLog.employeeFilterEnabled && invoiceLog.employees && invoiceLog.employees.length && invoiceLog.employees.map( function( employee ) {
                                            return employee.firstname + ' ' + employee.lastname;
                                        } ),
                                        invoiceLog.padnextSettingTitle
                                    ]
                                        .filter( Boolean )
                                        .join( ' | ' );
                                    invoiceLog._type = invoiceLogType;
                                    return {id: invoiceLog._id, text: text, _data: invoiceLog};
                                } )
                            } );

                        } ).fail( fail );
                    }
                }
            };

            // reset invoiceLogId and invoiceLogText
            self.addDisposable( ko.computed( function() {
                self.invoiceLogType();
                self.invoiceLogId( null );
                self.invoiceLogText( null );
            } ) );

            // reset invoiceLogId and invoiceLogText
            self.addDisposable( ko.computed( function() {
                self.invoiceLogId();
                self.sourceLocationId( null );
                self.sourceEmployeeIds( [] );
                self.targetEmployeeId( null );
            } ) );

        },
        initEmployeeLocationSelect: function() {
            var self = this;

            self.select2LocationConfig = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return self.sourceLocationId();
                    },
                    write: function( $event ) {
                        self.sourceLocationId( $event.val );
                    }
                } ) ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'InCaseMojit.casefile_nav.tab_apkInProgress.locations.label' ),
                    multiple: false,
                    allowClear: true,
                    data: function() {

                        return {
                            results: self.locationList
                                .map( function( location ) {
                                    return {id: location._id, text: location.locname};
                                } )
                        };
                    }
                }
            };

            function getEmployeeList( onlyActive ) {
                return function() {
                    var selectedLocationId = self.sourceLocationId();
                    var selectedLocation = self.locationList.find( function( location ) {
                        if( selectedLocationId && location._id === selectedLocationId ) {
                            return true;
                        }
                    } );
                    var employeeList = selectedLocation && selectedLocation.physicians || [];

                    return {
                        results: employeeList.filter( function( employee ) {
                            if( !onlyActive ) {
                                return true;
                            }
                            return (self.inactivePhysicianIds || []).every( function( inactivePhysicianId ) {
                                return inactivePhysicianId !== employee._id;
                            } );
                        } ).map( function( employee ) {
                            return {
                                id: employee._id,
                                text: Y.doccirrus.schemas.person.personDisplay( employee )
                            };
                        } )
                    };

                };
            }

            self.select2EmployeeConfig = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return self.sourceEmployeeIds();
                    },
                    write: function( $event ) {
                        self.sourceEmployeeIds( $event.val );
                    }
                } ) ),
                select2: {
                    width: '100%',
                    placeholder: 'Arzt',
                    multiple: true,
                    allowClear: true,
                    data: getEmployeeList( false )
                }
            };
            self.select2TargetEmployeeConfig = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return self.targetEmployeeId();
                    },
                    write: function( $event ) {
                        self.targetEmployeeId( $event.val );
                    }
                } ) ),
                select2: {
                    width: '100%',
                    placeholder: 'Arzt',
                    multiple: false,
                    allowClear: true,
                    data: getEmployeeList( true )
                }
            };

        },
        initFilter: function() {
            var self = this;

            self.treatmentCatalogShort = ko.computed( function() {
                var invoiceLogType = self.invoiceLogType();
                if( invoiceLogType ) {
                    return invoiceLogType === 'KBV' ? ['EBM'] : ['GOÄ', 'UVGOÄ', 'GebüH'];
                }
            } );

            self.select2TreatmentCodesConfig = {
                val: ko.computed( {
                    read: function() {
                        return self.treatmentCodes();
                    },
                    write: function( $event ) {
                        self.treatmentCodes( $event.val );
                    }
                } ),
                select2: {
                    width: '100%',
                    multiple: true,
                    placeholder: 'Code/Text',
                    allowClear: true,
                    dropdownAutoWidth: true,
                    minimumInputLength: 1,
                    dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                    createSearchChoice: createSearchChoice,
                    formatResult: formatResult,
                    formatResultCssClass: formatResultCssClass,
                    query: function( query ) {
                        var actType = 'TREATMENT',
                            catalogShort = self.treatmentCatalogShort(),
                            catalogs,
                            criteria = {},
                            catalogQuery;

                        if( catalogShort ) {
                            criteria.short = catalogShort;
                        }
                        if( actType ) {
                            criteria.actType = actType;
                        }

                        catalogs = Y.doccirrus.catalogmap.getCatalogs( criteria );

                        catalogQuery = {
                            term: query.term,
                            catalogs: catalogs && catalogs.map( function( catalog ) {
                                return {
                                    filename: catalog.filename,
                                    short: catalog.short
                                };
                            } ),
                            locationId: {$exists: true},
                            tags: []
                        };

                        Y.doccirrus.jsonrpc.api.catalog.catalogCodeSearch( {
                            itemsPerPage: 10,
                            query: catalogQuery,
                            data: {
                                _includeCatalogText: true
                            }
                        } ).done( function( response ) {
                            var resultData = _.uniq( response.data || [], 'seq' );
                            query.callback( {results: resultData.map( catalogCodeMapper )} );
                        } ).fail( fail );
                    },
                    initSelection: function( element, callback ) {
                        var codes = self.treatmentCodes();
                        callback( codes.map( function( code ) {
                            return {id: code, text: code};
                        } ) );
                    }

                }

            };

            self.select2DiagnosisCodesConfig = {
                val: ko.computed( {
                    read: function() {
                        return self.diagnosisCodes();
                    },
                    write: function( $event ) {
                        self.diagnosisCodes( $event.val );
                    }
                } ),
                select2: {
                    width: '100%',
                    multiple: true,
                    placeholder: 'Code/Text',
                    allowClear: true,
                    dropdownAutoWidth: true,
                    minimumInputLength: 1,
                    dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                    createSearchChoice: createSearchChoice,
                    formatResult: formatResult,
                    formatResultCssClass: formatResultCssClass,
                    query: function( query ) {
                        var actType = 'DIAGNOSIS',
                            catalogShort = 'ICD-10',
                            catalogs,
                            criteria = {},
                            catalogQuery;

                        if( catalogShort ) {
                            criteria.short = catalogShort;
                        }
                        if( actType ) {
                            criteria.actType = actType;
                        }

                        catalogs = Y.doccirrus.catalogmap.getCatalogs( criteria );

                        catalogQuery = {
                            term: query.term,
                            catalogs: catalogs && catalogs.map( function( catalog ) {
                                return {
                                    filename: catalog.filename,
                                    short: catalog.short
                                };
                            } ),
                            locationId: {$exists: true},
                            tags: []
                        };

                        Y.doccirrus.jsonrpc.api.catalog.catalogCodeSearch( {
                            itemsPerPage: 10,
                            query: catalogQuery,
                            data: {
                                _includeCatalogText: true
                            }
                        } ).done( function( response ) {
                            var resultData = _.uniq( response.data || [], 'seq' );
                            query.callback( {results: resultData.map( catalogCodeMapper )} );
                        } ).fail( fail );
                    },
                    initSelection: function( element, callback ) {
                        var codes = self.diagnosisCodes();
                        callback( codes.map( function( code ) {
                            return {id: code, text: code};
                        } ) );
                    }

                }

            };

        },
        initResultTable: function() {
            var self = this;

            function wrapLink( str, url ) {
                return ['<a href="', url, '" target="_blank">', str, '</a>'].join( '' );
            }

            function renderPatient( meta ) {
                var url = Y.doccirrus.commonutils.getUrl( 'inCaseMojit' ) + '#/patient/' + meta.row.patientId + '/tab/casefile_browser';
                return wrapLink( meta.value, url );
            }

            function renderActivities( meta ) {
                return meta.value.map( function( activity ) {
                    var url = Y.doccirrus.commonutils.getUrl( 'inCaseMojit' ) + '#/activity/' + activity._id;
                    return wrapLink( activity.text, url );
                } ).join( ', ' );
            }

            self.tableBaseParams = ko.computed( function() {
                var invoiceLogType = self.invoiceLogType();
                var invoiceLogId = self.invoiceLogId();
                var sourceEmployeeIds = self.sourceEmployeeIds();
                var sourceLocationId = self.sourceLocationId();
                var treatmentCodes = self.treatmentCodes();
                var diagnosisCodes = self.diagnosisCodes();
                var treatmentCodesExcludeInclude = self.treatmentCodesExcludeInclude();
                var diagnosisCodesExcludeInclude = self.diagnosisCodesExcludeInclude();
                var baseParams;

                if( !self.isValid() ) {
                    return null;
                }

                baseParams = {
                    query: {
                        invoiceLogType: invoiceLogType,
                        invoiceLogId: invoiceLogId,
                        locationId: sourceLocationId,
                        employeeId: {$in: sourceEmployeeIds},
                        timestamp: {
                            $lte: self.dateRange.endDate(),
                            $gte: self.dateRange.startDate()
                        }
                    }
                };

                if( treatmentCodes.length && treatmentCodesExcludeInclude ) {
                    baseParams.query['data.treatments.code'] = {};
                    if( ['include', 'exact'].indexOf( treatmentCodesExcludeInclude ) !== -1 ) {
                        baseParams.query['data.treatments.code'].$in = treatmentCodes;
                    } else if( treatmentCodesExcludeInclude === 'exclude' ) {
                        baseParams.query['data.treatments.code'].$nin = treatmentCodes;
                    }
                    if( treatmentCodesExcludeInclude === 'exact' ) {
                        baseParams.exactSearch = treatmentCodes;
                    }
                }
                if( diagnosisCodes.length && diagnosisCodesExcludeInclude ) {
                    if( diagnosisCodesExcludeInclude === 'include' ) {
                        baseParams.query.$or = [
                            {'data.diagnoses.code': {$in: diagnosisCodes}},
                            {'data.continuousDiagnoses.code': {$in: diagnosisCodes}}
                        ];
                    } else if( diagnosisCodesExcludeInclude === 'include' ) {
                        baseParams.query.$and = [
                            {'data.diagnoses.code': {$nin: diagnosisCodes}},
                            {'data.continuousDiagnoses.code': {$nin: diagnosisCodes}}
                        ];
                    }
                }

                return baseParams;
            } );

            self.shiftPatientTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'shiftPatientTable',
                    states: ['limit'],
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.shiftpatients.read,
                    baseParams: self.tableBaseParams,
                    limit: 100,
                    limitList: [10, 20, 30, 40, 50, 100],
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            checkMode: 'multi',
                            allToggleVisible: true
                        },
                        {
                            forPropertyName: 'patientName',
                            label: PATIENT_LABEL,
                            title: PATIENT_LABEL,
                            renderer: renderPatient
                        },
                        {
                            forPropertyName: 'treatments',
                            label: TREATMENTS_LABEL,
                            title: TREATMENTS_LABEL,
                            renderer: renderActivities
                        },
                        {
                            forPropertyName: 'diagnoses',
                            label: DIAGNOSES_LABEL,
                            title: DIAGNOSES_LABEL,
                            renderer: renderActivities
                        },
                        {
                            forPropertyName: 'sum',
                            label: SUM_LABEL,
                            title: SUM_LABEL,
                            renderer: function( meta ) {
                                return Y.doccirrus.comctl.numberToLocalString( meta.value, {decimals: 2} );
                            }
                        },
                        {
                            forPropertyName: 'physicianName',
                            label: DOCTOR_LABEL,
                            title: DOCTOR_LABEL
                        }]
                }
            } );

        },
        initActionButtons: function() {
            var self = this;
            self.shiftPatientBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'shiftPatientBtn',
                    text: SHIFT_PATIENT_BTN,
                    option: 'PRIMARY',
                    disabled: ko.computed( function() {
                        return 0 === self.shiftPatientTable.getComponentColumnCheckbox().checked().length;
                    } ),
                    click: function() {
                        function renderEmployee( employee ) {
                            return Y.doccirrus.schemas.person.personDisplay( employee );
                        }

                        var
                            data = {
                                invoiceLogType: self.invoiceLogType.peek(),
                                invoiceLogText: self.invoiceLogText.peek(),
                                targetEmployeeId: self.targetEmployeeId.peek(),
                                changes: []
                            },
                            sourceEmployeeIds = self.sourceEmployeeIds.peek(),
                            targetEmployeeId = self.targetEmployeeId.peek(),
                            selected = self.shiftPatientTable.getComponentColumnCheckbox().checked(),
                            selectedLocationId = self.sourceLocationId(),
                            selectedLocation, employeeList, targetEmployeeNames, sourceEmployeeNames;

                        if( !selected.length ) {
                            Y.log( 'no data passed to shiftPatientsBtn', 'debug', NAME );
                            return;
                        }

                        selectedLocation = self.locationList.find( function( location ) {
                            if( selectedLocationId && location._id === selectedLocationId ) {
                                return true;
                            }
                        } );
                        employeeList = selectedLocation && selectedLocation.physicians || [];

                        targetEmployeeNames = employeeList && employeeList.filter( function( employee ) {
                            return employee._id === targetEmployeeId;
                        } ).map( renderEmployee );
                        sourceEmployeeNames = employeeList && employeeList.filter( function( employee ) {
                            // TODO: filter if employee has treatment to be moved?
                            return sourceEmployeeIds.indexOf( employee._id ) !== -1;
                        } ).map( renderEmployee );

                        data.targetEmployeeNames = targetEmployeeNames;
                        data.sourceEmployeeNames = sourceEmployeeNames;

                        selected.forEach( function( row ) {
                            row.treatments.forEach( function( treatment ) {
                                data.changes.push( {treatmentId: treatment._id, invoiceEntryId: row.invoiceEntryId} );
                            } );
                        } );

                        Y.log( 'shift patients: ' + JSON.stringify( data ), 'info', NAME );
                        Y.doccirrus.jsonrpc.api.shiftpatients.shift( data ).done( function( response ) {
                            Y.log( 'done response of shiftpatients.shift: ' + response, 'debug', NAME );
                            var warnings = response && response.data && response.data.warnings;
                            if( Array.isArray( warnings ) && warnings.length ) {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'warning',
                                    window: {width: 'small'},
                                    message: warnings.join( '<br>' )
                                } );
                            }
                        } ).fail( fail ).always( function() {
                            self.shiftPatientTable.getComponentColumnCheckbox().uncheckAll();
                            self.shiftPatientTable.reload();
                        } );
                    }
                }
            } );
        }
    }, {
        NAME: 'ShiftPatientsViewModel',
        schemaName: 'v_shiftpatients',
        ATTRS: {
            validatable: {
                value: true,
                lazyAdd: false
            }

        }
    } );

    return {
        registerNode: function( node ) {
            Y.use( ['KoViewModel', 'KoEditableTable', 'v_shiftpatients-schema', 'dckbvutils'], function() {
                ko.applyBindings( new ShiftPatientsViewModel(), node.getDOMNode() );
            } );
        }
    };
}