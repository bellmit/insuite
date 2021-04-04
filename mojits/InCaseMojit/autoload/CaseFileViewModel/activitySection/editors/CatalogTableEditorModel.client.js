/**
 * User: do
 * Date: 11/02/16  14:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, $, moment, Promise */

'use strict';

YUI.add( 'CatalogTableEditorModel', function( Y, NAME ) {
        /**
         * @module CatalogTableEditorModel
         */

        var
            i18n = Y.doccirrus.i18n,
            CODE = i18n( 'InCaseMojit.tableform-modelJS.label.CODE' ),
            QUANTITY = i18n( 'InCaseMojit.tableform-modelJS.label.QUANTITY' ),
            FACTOR = i18n( 'InCaseMojit.tableform-modelJS.label.FACTOR' ),
            TEXT = i18n( 'InCaseMojit.tableform-modelJS.label.TEXT' ),
            EXPLANATIONS = i18n( 'InCaseMojit.tableform-modelJS.label.EXPLANATIONS' ),
            ERROR_WRONG_TYPE = i18n( 'InCaseMojit.tableform-modelJS.text.ERROR_WRONG_TYPE' ),
            ERROR_WRONG_TYPE_NUMBER = i18n( 'InCaseMojit.tableform-modelJS.text.ERROR_WRONG_TYPE_NUMBER' ),
            CHANGES_NOT_SAVED = i18n( 'general.message.CHANGES_NOT_SAVED' ),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            KoViewModel = Y.doccirrus.KoViewModel,
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap;

        function isInt( n ) {
            return Number( n ) === n && n % 1 === 0;
        }

        function tableNavigation( el, options ) {
            var $table = $( el );

            function moveRightOrLeft( direction, el ) {
                var $el = $( el ),
                    $td = $el.closest( 'td' ),
                    $found, $nextCell, $input;

                direction = 'right' === direction ? 'next' : 'prev';
                $nextCell = $td[direction]();

                while( $nextCell.length && !$found ) {
                    $input = $nextCell.find( 'input' ).first();
                    if( $input.length ) {
                        $found = $input;
                    }
                    $nextCell = $nextCell[direction]();
                }
                if( $found ) {
                    $found.focus();
                }
            }

            function moveDownOrUp( direction, el ) {
                var $el = $( el ),
                    $td = $el.closest( 'td' ),
                    index = $td.index(),
                    $nextTr;

                direction = 'down' === direction ? 'next' : 'prev';
                $nextTr = $td.closest( 'tr' )[direction]();

                if( $nextTr.length ) {
                    $nextTr.children().eq( index ).find( 'input' ).first().focus();
                } else if( 'prev' === direction ) {
                    options.onReachedTop.call( el );
                }
            }

            $table.on( 'keydown', 'input', function( evt ) {
                switch( evt.which ) {
                    case 39:
                        if( 'text' !== this.type || this.selectionStart === this.value.length ) {
                            moveRightOrLeft( 'right', this );
                        }
                        break;
                    case 37:
                        if( 'text' !== this.type || 0 === this.selectionStart ) {
                            moveRightOrLeft( 'left', this );
                        }
                        break;
                    case 38:
                        moveDownOrUp( 'up', this );
                        break;
                    case 40:
                        moveDownOrUp( 'down', this );
                        break;
                    case 13:
                        if( 'text' === this.type ) {
                            $( this ).change();
                        }
                        options.onEnter.call( el );
                        return false;
                }
            } );
        }

        function getBillingFactorValue( lastSchein ) {
            var scheinBillingFactorValue,
                result = '2.3';
            if( !lastSchein ) {
                return result;
            }

            scheinBillingFactorValue = lastSchein.scheinBillingFactorValue;

            if( !scheinBillingFactorValue && 0 !== scheinBillingFactorValue ) {
                return result;
            }

            return Y.doccirrus.comctl.factorToLocalString( scheinBillingFactorValue );
        }

        /**
         * @class CatalogTableEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function CatalogTableEditorModel( config ) {
            CatalogTableEditorModel.superclass.constructor.call( this, config );
        }

        CatalogTableEditorModel.ATTRS = {
            whiteList: {
                value: ['diagnosisCert', 'diagnosisSite', 'catalogShort'],
                lazyAdd: false
            }
        };

        Y.extend( CatalogTableEditorModel, KoViewModel.getConstructor( 'ActivityEditorModel' ), {
                initializer: function SimpleActivityEditorModel_initializer() {
                    var
                        self = this;
                    self.initSimpleActivityEditorModel();

                },
                destructor: function SimpleActivityEditorModel_destructor() {
                },
                initSimpleActivityEditorModel: function SimpleActivityEditorModel_initSimpleActivityEditorModel() {
                    var
                        self = this,
                        tagsFromLS = Y.doccirrus.utils.localValueGet( 'tags_' ),
                        tagsFromLSParsed,
                        binder = self.get( 'binder' ),
                        incaseConfig = binder.getInitialData( 'incaseconfiguration' ),
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        currentCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                        officialCaseFolder = currentCaseFolder && ( currentCaseFolder.type === 'PUBLIC' || currentCaseFolder.type === 'BG');

                    self.diagnosisSiteI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.DIAGNOSIS_SITE' );

                    self.catalogTextHidden = incaseConfig && incaseConfig.catalogTextHidden || false;

                    if( self.diagnosisCert ) {
                        self.diagnosisCert.hasError = ko.pureComputed(
                            {
                                read: function() {
                                    var
                                        emptyDiagnosisCert = 'NONE' === unwrap( self.diagnosisCert ),
                                        nonUuuCode = 'UUU' !== unwrap( self.code ),
                                        isDiagnosisCertInvalid = ( nonUuuCode && emptyDiagnosisCert && officialCaseFolder );
                                    return isDiagnosisCertInvalid;
                                },
                                write: function() {
                                }
                            } );
                        self.diagnosisCert.validationMessages = ko.observableArray( [ Y.doccirrus.errorTable.getMessage( { code: 18025 } ), i18n('validations.kbv.message.FK6003_ERR' ) ] );
                    }

                    self.initTable();

                    try {
                        tagsFromLSParsed = JSON.parse( tagsFromLS );
                    } catch( err ) {
                        Y.log( 'could not parse tags from localStorage', 'error', NAME );
                    }

                    self._catalogTags = ko.observableArray( tagsFromLSParsed || [] );

                    self.addDisposable( self._catalogTags.subscribe( function( newTags ) {
                        Y.doccirrus.utils.localValueSet( 'tags_', JSON.stringify( newTags ) );
                    } ) );


                    self._select2tags = new Y.doccirrus.uam.utils.CatalogUsageTagList( {
                        dataArray: self._catalogTags,
                        catalogShort: unwrap( binder.currentActivity ).catalogShort,
                        useCache: true,
                        exactMatch: true
                    } );

                    self._isDiagnosis = ko.computed( function() {
                        var currentActivity = unwrap( binder.currentActivity ),
                            actType = currentActivity && currentActivity.actType();

                        return 'DIAGNOSIS' === actType;
                    } );
                    self._isTessKat = ko.computed( function() {
                        var currentActivity = unwrap( binder.currentActivity ),
                            catalogShort = currentActivity && currentActivity.catalogShort();

                        return 'TESS-KAT' === catalogShort;
                    } );

                    self._catalogBase = unwrap( binder.currentActivity ).getCatalogs();

                    self._diagnosisCertList = Y.doccirrus.schemas.activity.types.DiagnosisCert_E.list;
                    self._diagnosisSiteList = Y.doccirrus.schemas.activity.types.DiagnosisSite_E.list;

                    self._diagnosisCertList = self._diagnosisCertList.map( function( el ){
                        el.disabled = ( el.val === 'NONE' ) && officialCaseFolder;
                        return el;
                    } );

                    /**
                     * Always contains up-to-date catalog filename
                     * @method _catalogFile
                     * @type {ko.computed}
                     * @return {String}
                     */
                    self._catalogFile = ko.computed( function() {
                        var catalogShort = unwrap( self.catalogShort ),
                            found = Y.Array.find( self._catalogBase, function( catalog ) {
                                return catalogShort === catalog.short;
                            } );
                        return found ? found.filename : '';
                    } );

                    self.addDisposable( ko.computed( function onTagsChanged() {
                        var
                            params,
                            currentActivity = unwrap( binder.currentActivity ),
                            currentPatient = unwrap( binder.currentPatient ),
                            privateInsurance = null,
                            billingFactorType = null,
                            catalogFile = self._catalogFile.peek(),
                            catalogShort = currentActivity && ko.unwrap( currentActivity.catalogShort ),
                            locationId = currentActivity && ko.unwrap( currentActivity.locationId ), // locationId is only necessary for kv specific EBM catalogs (851)
                            tags = ko.unwrap( self._catalogTags );

                        if( !catalogFile || !catalogShort || !locationId || !tags || !tags.length ) {
                            params = {};
                        } else {
                            if( 'GOÄ' === catalogShort ) {
                                privateInsurance = currentPatient.getPrivateInsurance( currentCaseFolder && currentCaseFolder.type );
                                billingFactorType = privateInsurance && peek( privateInsurance.billingFactor );
                            }
                            params = {
                                query: {
                                    billingFactorType: billingFactorType,
                                    catalog: {filename: catalogFile, short: catalogShort},
                                    locationId: locationId,
                                    tags: tags
                                }
                            };
                        }

                        self.baseParams( params );
                    } ) );

                },
                initTableNavigation: function() {

                    var self = this,
                        tableformKoTableElement = document.querySelector( '#tableformKoTable' ),
                        $tagSelect = $( '#tagSelect' );

                    function tableReachedTop() {
                        $tagSelect.select2( 'open' );
                    }

                    function onEnter() {
                        self.createActivities()
                            .then( function() {
                                var
                                    binder = self.get( 'binder' );
                                binder.navigateToCaseFileBrowser();
                            } )
                            .catch( function() {
                            } );
                    }

                    tableNavigation( tableformKoTableElement, {
                        onReachedTop: tableReachedTop,
                        onEnter: onEnter
                    } );

                },
                initTable: function() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentActivity = unwrap( binder.currentActivity ),
                        catalogShort = unwrap( currentActivity.catalogShort ),
                        currentPatient = unwrap( binder.currentPatient ),
                        patientName = currentPatient._getNameSimple(),
                        columns = [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                label: '',
                                checkMode: 'multi',
                                allToggleVisible: false,
                                uncheckOnFilterChange: false,
                                uncheckOnReload: false
                            },
                            {
                                forPropertyName: 'seq',
                                label: CODE,
                                width: '120px',
                                isSortable: true
                            },
                            {
                                forPropertyName: 'quantity',
                                label: QUANTITY,
                                isEditable: true,
                                editorField: {
                                    defaultValue: '1'
                                },
                                width: '70px',
                                pdfRenderer: function( meta ) {
                                    if ( !meta.row.quantity ) { return ''; }
                                    return meta.row.quantity + '';
                                }
                            }
                        ];

                    self.baseParams = ko.observable( null );

                    if( 'GOÄ' === catalogShort ) {
                        columns.push( {
                            forPropertyName: 'billingFactorValue',
                            label: FACTOR,
                            isEditable: true,
                            editorField: {
                                defaultValue: getBillingFactorValue( currentActivity.get( 'lastSchein' ) )
                            },
                            width: '140px',
                            initialEditableValueRenderer: function( value ) {
                                value = value || '';
                                if( value ) {
                                    value = Y.doccirrus.comctl.factorToLocalString( value );
                                }
                                return value;
                            }
                        } );
                    }

                    columns.push( {
                        forPropertyName: 'title',
                        isEditable: true,
                        label: TEXT,
                        editorField: {
                            buttonsConfig: {
                                propertyName: 'catalogText',
                                textProperty: 'btnText',
                                option: 'DEFAULT',
                                activeCss: { 'btn-primary-disabled': true },
                                click: function( currentBtn, event, meta ) {
                                    var
                                        parent = meta.$parentContext && meta.$parentContext.$parent;
                                    if( parent && !currentBtn.isActive ) {
                                        parent.valueEditable.buttons.forEach( function( button ) {
                                            var
                                                css = button.css();
                                            css[ 'btn-primary-disabled' ] = button === currentBtn;
                                            button.isActive = button === currentBtn;
                                            button.css( css );
                                        } );
                                        if( currentBtn.buttonData.text !== peek( parent.valueEditable ) ) {
                                            parent.valueEditable( currentBtn.buttonData.text );
                                            parent.col.eventEditableChange( parent );
                                        }
                                    }

                                }
                            }
                        }
                    } );

                    columns.push( {
                        forPropertyName: 'explanations',
                        isEditable: true,
                        label: EXPLANATIONS
                    } );

                    self.tableformKoTable = KoComponentManager.createComponent( {
                        componentType: 'KoTable',
                        componentConfig: {

                            //  use patient header when printing
                            formRole: 'casefile-patient-folder',
                            pdfTitle: i18n( 'InCaseMojit.casefile_detailJS.pdfTitle' ),
                            pdfFile: i18n( 'InCaseMojit.casefile_detailJS.pdfTitle' ) + patientName,
                            pdfFields: {
                                'patientName': patientName,
                                'dob': moment( unwrap( currentPatient.dob ) ).format( 'DD.MM.YYYY' ),
                                'insuranceNames': currentPatient.getInsuranceNames()
                            },

                            stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-tableformKoTable',
                            states: ['limit'],
                            striped: false,
                            fillRowsToLimit: false,
                            visibleColumnsConfigurationVisible: false,
                            remote: true,
                            proxy: function( params ) {
                                    return Y.doccirrus.jsonrpc.api.catalog.catalogusageSearch( params )
                                        .then( function( response ) {
                                            var
                                                data = response.data;
                                            if( !self.catalogTextHidden ) {
                                                if( data && Array.isArray( data ) ) {
                                                    data.forEach( function( item ) {
                                                        var
                                                            i = 1;
                                                        if( item.catalogText && item.catalogText.length ) {
                                                            item.catalogText[0].isActive = true;
                                                            item.catalogText = item.catalogText.map( function( textItem ) {
                                                                textItem.btnText = i++;
                                                                return textItem;
                                                            } )
                                                                .filter( function( textItem ) {
                                                                    return textItem.text;
                                                                } );
                                                            item.catalogText.push( {
                                                                text: item.originalCatalogText,
                                                                btnText: i18n( 'InCaseMojit.casefile_detailJS.button.ORIGINAL_CATALOG_TEXT_BTN' )
                                                            } );
                                                        }
                                                    } );
                                                }
                                            }
                                            return response;
                                        } );

                            },
                            limitList: [5, 10, 20, 50, 100],
                            limit: 20,
                            baseParams: self.baseParams,
                            columns: columns,
                            onRowClick: function() {
                                return false;
                            }
                        }
                    } );

                    self.tableformKoTable.rendered.subscribe( function( val ) {
                        if( true === val ) {
                            self.initTableNavigation();
                        }
                    } );

                    self.selectedRows = [];

                    self._checkedModifiedOnPage = function(){
                        var componentColumnCheckbox = self.tableformKoTable.getComponentColumnCheckbox(),
                            checkedRows = ( componentColumnCheckbox.checked() || [] ).map( function( el ){ return el._id; } ),
                            modifiedRows = self.tableformKoTable.dataModifications() || [],
                            selectedRowsOnPage = [],
                            selectedRowsOnPageIds,
                            selectedRowsOnOtherPages;

                        if( checkedRows.length ){
                            selectedRowsOnPage = modifiedRows.filter( function( modified ){
                                return checkedRows.indexOf( modified.origin._id ) !== -1;
                            } );
                            selectedRowsOnPageIds = selectedRowsOnPage.map( function( el ){
                                return el.origin._id;
                            } );

                            selectedRowsOnOtherPages = self.selectedRows.filter( function( el ){
                                return !selectedRowsOnPageIds.includes( el._id );
                            } );

                            self.selectedRows = selectedRowsOnOtherPages.concat( selectedRowsOnPage.map( function( modifcation ){
                                return {
                                    _id: modifcation.state._id,
                                    quantity: modifcation.state.quantity && +modifcation.state.quantity,
                                    billingFactorValue: modifcation.state.billingFactorValue && +(modifcation.state.billingFactorValue.replace( ',', '.' )),
                                    title: modifcation.state.title,
                                    explanations: modifcation.state.explanations
                                };
                            } ) );
                        }

                        return selectedRowsOnPage;
                    };

                    self._isValid = function(){
                        var selectedRows,
                            currentActivity = unwrap( self.get( 'binder' ).currentActivity ),
                            actType = currentActivity && unwrap( currentActivity.actType );

                        self._checkedModifiedOnPage();
                        selectedRows = self.selectedRows;

                        return Boolean( selectedRows.length ) &&
                               ( 'DIAGNOSIS' === actType ? !self.diagnosisCert.hasError() : true);
                    };
                    self._isCountValid = function( selectedRows ){
                        return selectedRows.every( function( modifcation ) {
                            return Y.doccirrus.validations.common.ActivityDataItem_T_count[ 0 ].validator( Number( modifcation.quantity ) );
                        } );
                    };
                    self.isValid = ko.computed( function() {
                        return self._isValid();
                    } );
                },
                createActivities: function() {
                    var self = this,
                        binder = self.get( 'binder' ),
                        currentActivity = unwrap( binder.currentActivity ),
                        catalogShort = unwrap( currentActivity.catalogShort ),
                        catalogUsageIds = [],
                        quantities = {},
                        titles = {},
                        explanations = {},
                        billingFactorValues = {},
                        activityBlueprintData,
                        error, errorbillingFactorValue,
                        selectedRows = self.selectedRows,
                        isValid = self._isValid();

                    if( !self._isCountValid( selectedRows ) ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            message: Y.doccirrus.validations.common.ActivityDataItem_T_count[ 0 ].msg
                        } );
                        return Promise.reject();
                    }
                    if( !selectedRows || !selectedRows.length || !isValid ) {
                        return Promise.reject();
                    }

                    selectedRows.some( function( modifcation ) {
                        var
                            quantity = modifcation.quantity,
                            billingFactorValue = modifcation.billingFactorValue,
                            title = modifcation.title,
                            explanation = modifcation.explanations,
                            id = modifcation._id;

                        if( !isInt( quantity ) ) {
                            error = true;
                            return false;
                        }

                        catalogUsageIds.push( id );
                        quantities[id] = quantity;
                        titles[id] = title;
                        explanations[id] = explanation;

                        if( 'GOÄ' === catalogShort ) {
                            if( isNaN( billingFactorValue ) || Number( billingFactorValue ) !== billingFactorValue || 'number' !== typeof billingFactorValue ) {
                                errorbillingFactorValue = true;
                                return false;
                            }
                            billingFactorValues[id] = billingFactorValue;
                        }
                    } );

                    if( error ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            window: {width: 'small'},
                            message: ERROR_WRONG_TYPE
                        } );
                        return;
                    }

                    if( errorbillingFactorValue ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            window: {width: 'small'},
                            message: ERROR_WRONG_TYPE_NUMBER
                        } );
                        return;
                    }

                    if( !currentActivity ) {
                        throw Error( 'current activity is not set' );
                    }

                    activityBlueprintData = currentActivity.toJSON();
                    activityBlueprintData.status = 'VALID';
                    delete activityBlueprintData._id;

                    return Promise.resolve( Y.doccirrus.jsonrpc.api.activity.createActivitiesFromCatalogusage( {
                        catalogusageIds: catalogUsageIds,
                        oldActivity: activityBlueprintData,
                        quantities: quantities,
                        titles: titles,
                        explanations: explanations,
                        billingFactors: billingFactorValues
                    } ) ).catch( function() {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: CHANGES_NOT_SAVED
                        } );
                    } ).finally( function() {
                        var
                            caseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' );
                        currentActivity.setNotModified();
                        self.selectedRows = [];
                        self.tableformKoTable.getComponentColumnCheckbox().uncheckAll();
                        if( caseFileViewModel && caseFileViewModel.activitiesTable ) {
                            caseFileViewModel.activitiesTable.reload();
                        }
                    } );
                }
            }, {
                NAME: 'CatalogTableEditorModel'
            }
        );
        KoViewModel.registerConstructor( CatalogTableEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel'
        ]
    }
)
;
