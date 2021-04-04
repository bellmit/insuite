/**
 * User: abhijit.baldawa
 * Date: 09.05.18  13:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, _, moment, math, math, MathJax */
YUI.add( 'DcEditMedDataTag', function( Y, NAME ) {
    var
        i18n = Y.doccirrus.i18n,
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        KoComponentManager = KoUI.KoComponentManager,
        lodash = _,
        SAVE_FAIL = i18n( 'IncaseAdminMojit.incase_tab_tags.messages.SAVE_FAIL' ),
        medDataTypes =  Y.doccirrus.schemas.v_meddata.medDataItemDataTypes,

        // class linkers, will become ES6 imports later on
        TagSchema = Y.doccirrus.schemas.tag.TagSchema,
        TagErrors = Y.doccirrus.schemas.tag.tagErrors,
        MedDataCategories = Y.doccirrus.schemas.v_meddata.medDataCategories,
        MedDataItemDataTypes = Y.doccirrus.schemas.v_meddata.MedDataItemDataTypes,
        MedDataItemConfigSchema = Y.doccirrus.schemas.v_meddata.MedDataItemConfigSchema,
        MedDataItemTemplateCollection = Y.doccirrus.schemas.tag.MedDataItemTemplateCollection,
        scopeNameOptions = 'abcdefghijklmnopqrstuvwxyz';

    function showConfirmBox( type, message, method ) {
        Y.doccirrus.DCWindow.notice( {
            type: type,
            message: message,
            window: {
                width: 'medium',
                buttons: {
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'YES', {
                            action: function() {
                                this.close();
                                method();
                            }
                        } ),
                        Y.doccirrus.DCWindow.getButton( 'NO', {
                            isDefault: true,
                            action: function() {
                                this.close();
                            }
                        } )
                    ]
                }
            }
        } );
    }

    function onFail( error, isInfo ) {
        if(error && typeof error === "string") {
            error = {message:error};
        } else if( typeof error === "object" && !error.message ) {
            if( error.data ) {
                error.message = error.data;
            }
        }

        Y.doccirrus.DCWindow.notice( {
            type: isInfo ? 'info' : 'error',
            message: error && error.message || 'Undefined error',
            window: {
                width: Y.doccirrus.DCWindow.SIZE_SMALL
            }
        } );
    }

    // -------------------------- Initialize ViewModel for EditableTable ---------------------------------
    /**
     * MedDataTagViewModel for KoEditableTable
     * @param config
     * @constructor
     */
    function MedDataTagViewModel( config ) {
        MedDataTagViewModel.superclass.constructor.call( this, config );
    }

    MedDataTagViewModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        },
        medDataItemTemplatesByCategory: {
            value: {},
            lazyAdd: false
        }
    };

    Y.extend( MedDataTagViewModel, KoViewModel.getBase(), {

            initializer: function () {
                var
                    self = this;

                self.type.readOnly = true;

                self.displayTitle = ko.computed({
                    read: function() {
                        return unwrap( self.title );
                    },

                    write: function( value ) {
                        self.title(value);
                    }
                });

                self.displayTitle.hasError = ko.computed(function( ) {
                    var
                        titleHasError = unwrap( self.title.hasError ),
                        title = unwrap( self.title ),
                        isValid;

                    isValid = Y.doccirrus.validations.common.LabTest_T_head[0].validator(title);

                    return !isValid || titleHasError;
                });

                self.displayTitle.validationMessages = self.title.validationMessages;
                self.displayTitle.i18n = self.title.i18n;

                self.addDisposable( self.displayTitle.subscribe( function( newValue ) {
                    if( newValue && self.get( 'customMedDataTypeObjKeyVal' ) && self.get( 'customMedDataTypeObjKeyVal' )[ newValue ] ) {
                        self.unit( self.get( 'customMedDataTypeObjKeyVal' )[ newValue ] );
                    }
                } ) );

                self.displaySampleNormalValueText = ko.computed( {
                    read: function() {
                        var
                            sampleNormalValueText = unwrap( self.sampleNormalValueText );
                        if( !Array.isArray( sampleNormalValueText ) ) {
                            sampleNormalValueText = [];
                        }
                        var
                            result = sampleNormalValueText.join( ', \n' ),
                            minMax = result.split( '-' ),
                            min,
                            max;
                        if( 1 === sampleNormalValueText.length && minMax && 1 < minMax.length ) {
                            min = parseFloat( (minMax[0] || '').trim() ) || '';
                            max = parseFloat( (minMax[1] || '').trim() ) || '';
                            return Y.doccirrus.comctl.numberToLocalString( min, {intWithoutDec: true} ) + '-' + Y.doccirrus.comctl.numberToLocalString( max, {intWithoutDec: true} );
                        } else {
                            return result;
                        }
                    },
                    write: function( value ) {
                        var
                            minMax = value.split( '-' ),
                            min,
                            max,
                            result = value;
                        if( minMax && 1 < minMax.length ) {
                            min = Y.doccirrus.comctl.stringToNumber( minMax[0] );
                            max = Y.doccirrus.comctl.stringToNumber( minMax[1] );
                            result = min + '-' + max;
                        }
                        self.sampleNormalValueText( [result] );
                    }
                } );
            },

            isValid: function() {
                var
                    self = this,
                    isValid = MedDataTagViewModel.superclass.isValid.apply(self);

                return isValid && !unwrap(self.displayTitle.hasError);
            },

            destructor: function () {
            }
        },
        {
            schemaName: 'tag',
            NAME: 'MedDataTagViewModel'
        }
    );
    KoViewModel.registerConstructor( MedDataTagViewModel );
    // -------------------------- END. Initialize ViewModel for EditableTable ---------------------------------

    // -------------------------- Initialize ViewModel for AdditionalData ---------------------------------
    /**
     * AdditionalDataViewModel for KoEditableTable
     * @param config
     * @constructor
     */
    function AdditionalDataViewModel( config ) {
        AdditionalDataViewModel.superclass.constructor.call( this, config );
    }

    AdditionalDataViewModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };

    Y.extend( AdditionalDataViewModel, KoViewModel.getBase(), {

            initializer: function ( config ) {
                var
                    self = this;

                self.key = ko.observable( config.key );
                self.value = ko.observable( config.value );
            },

            destructor: function () {
            }
        },
        {
            NAME: 'AdditionalDataViewModel'
        }
    );
    KoViewModel.registerConstructor( AdditionalDataViewModel );
    // -------------------------- END. Initialize ViewModel for AdditionalData ---------------------------------

    // ---------------------------------------- Initialize EditMedDataTagModal --------------------------------
    function EditMedDataTagModal( config ) {
        EditMedDataTagModal.superclass.constructor.call( this, config );
    }

    Y.extend( EditMedDataTagModal, KoViewModel.getDisposable(), {
        tagsEditorTableData: null,
        tagsEditableTable: null,

        categoriesSelect2Config: null,
        categoriesSelect2Data: null,

        tagsToUpdateTable: null,
        tagsToUpdateData: null,

        tagsEditableTableTitle: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.edit_entry' ),
        tagsValidationAndFormattingTitle: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.validationAndFormatting' ),
        tagsAdditionalDataEditableTableTitle: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.additionalData' ),
        tagsDataTypeHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.dataType' ),
        tagsLengthHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.length' ),
        tagsValueRangeHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.valueRange' ),
        tagsDateRangeHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.dateRange' ),
        tagsMinLengthHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.minLength' ),
        tagsMaxLengthHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.maxLength' ),
        tagsMinValueHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.minValue' ),
        tagsMaxValueHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.maxValue' ),
        tagsMinDateHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.minDate' ),
        tagsMaxDateHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.maxDate' ),
        tagDecimalsHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.decimals' ),
        tagLeadingZerosHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.leadingZeros' ),
        tagsFormatHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.format' ),
        tagsDateFormatHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.dateFormat' ),
        tagsExtendedValidationHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.extendedValidation' ),
        tagsExtendedValidationTooltip: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.extendedValidationTooltip', {
            data: {
                url: 'https://regex101.com/',
                name: 'regex101.com'
            }
        } ),
        tagsEnumValuesHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.enumValues' ),
        tagsCategorySelectionTitle: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.category' ),
        tagsToUpdateTableTitle: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.select_records' ),
        tagsValueFormulaHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.formula.title' ),
        tagsValueFormulaExpressionHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.formula.expression' ),
        tagsValueFormulaResultHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.formula.result' ),
        tagsValueFormulaPrintoutHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.formula.printout' ),
        tagsValueFormulaScopeLinkedDataHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.formula.linkedData' ),
        tagsValueFormulaScopeVariableNameHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.formula.variableName' ),
        tagsValueFormulaScopeTestValueHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.formula.testValue' ),
        tagsValueFormulaManualCalculationHeader: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.formula.manualCalculation' ),
        tagsOptionalValueTitle: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.optionalValue' ),
        lengthHeader: '',

        initializer: function ( config ) {
            var
                self = this;

            self.isNotNew = Boolean( config.tag );
            if( !config.tag ) {
                config.tag = new TagSchema( {
                    category: MedDataCategories.BIOMETRICS,
                    type: 'MEDDATA',
                    title: '',
                    medDataItemConfig: [new MedDataItemConfigSchema.getDefaultConfig().toObject()],
                    additionalData: {}
                } ).toObject();
            }
            self.tagsToUpdateData = ko.observableArray([]);

            self.tagsEditorTableData = ko.observableArray( [] );
            self.tagsEditorTableData( [{data: lodash.assign( {}, config.tag )}] );

            self.tagsAdditionalDataEditorTableData = ko.observableArray( [] );

            // create table entries for the additionalData, probably stored within the tag
            var additionalDataTableEntries = [],
                tagAdditionalData = ( config.tag && config.tag.additionalData ) || [];
            if( typeof tagAdditionalData === "object" ) {
                Object.keys( tagAdditionalData ).forEach(
                    function( key ) {
                        additionalDataTableEntries.push( new AdditionalDataViewModel( {key: key, value: tagAdditionalData[key]} ) );
                    }
                );
            }
            self.tagsAdditionalDataEditorTableData( additionalDataTableEntries );

            self.categoriesSelect2Data = ko.observableArray( [] );
            self.categoriesSelect2Data( (Array.isArray( config.tag.category ) ? config.tag.category : []) );

            // medDataItemTemplateCollection
            self.medDataItemTemplateCollection = config.medDataItemTemplateCollection;

            // MedDataItemConfig:
            self.medDataItemConfig = Array.isArray( config.tag.medDataItemConfig ) && config.tag.medDataItemConfig.length > 0 ? new MedDataItemConfigSchema( config.tag.medDataItemConfig[config.tag.medDataItemConfig.length - 1] ) : undefined;
            if( self.medDataItemConfig ) {
                self.dataType = ko.observable( self.medDataItemConfig.dataType );
            } else {
                self.dataType = ko.observable( MedDataItemConfigSchema.getDefaultConfig().dataType );
            }

            // enumValueCollectionOptions
            if ( self.medDataItemConfig && self.medDataItemConfig.enumValueCollectionOptions ) {
                self.enumValueCollectionOptions = ko.observableArray( self.medDataItemConfig.enumValueCollectionOptions );
            } else {
                self.enumValueCollectionOptions = ko.observableArray( [] );
            }

            self.enumValueCollectionOptions.visible = ko.observable( false );

            // validationRegeExp
            if ( self.medDataItemConfig && self.medDataItemConfig.textValueValidationRegExp ) {
                self.validationRegeExp = ko.observable( (self.medDataItemConfig.textValueValidationRegExp instanceof RegExp) ? self.medDataItemConfig.textValueValidationRegExp.source : self.medDataItemConfig.textValueValidationRegExp );
            } else {
                self.validationRegeExp = ko.observable( '' );

            }

            self.validationRegeExp.visible = ko.observable( false );

            // valueDigits
            if ( self.medDataItemConfig && self.medDataItemConfig.valueDigits ) {
                self.valueDigits = ko.observable( self.medDataItemConfig.valueDigits );
            } else {
                self.valueDigits = ko.observable( 0 );
            }

            self.valueDigits.visible = ko.observable( false );

            // leadingZeros
            if ( self.medDataItemConfig && self.medDataItemConfig.valueLeadingZeros ) {
                self.leadingZeros = ko.observable( self.medDataItemConfig.valueLeadingZeros );
            } else {
                self.leadingZeros = ko.observable( 0 );
            }

            self.leadingZeros.visible = ko.observable( false );

            // dateValueFormat
            if ( self.medDataItemConfig && self.medDataItemConfig.dateValueFormat ) {
                self.dateValueFormat = ko.observable( self.medDataItemConfig.dateValueFormat );
            } else {
                self.dateValueFormat = ko.observable( '' );
            }

            self.dateValueFormat.visible = ko.observable( false );

            // dateValueMinDate
            if ( self.medDataItemConfig && self.medDataItemConfig.dateValueMinDate ) {
                self.dateValueMinDate = ko.observable( self.medDataItemConfig.dateValueMinDate );
            } else {
                self.dateValueMinDate = ko.observable( new Date().toISOString() );
            }

            self.dateValueMinDate.visible = ko.observable( false );

            // dateValueMaxDate
            if ( self.medDataItemConfig && self.medDataItemConfig.dateValueMaxDate ) {
                self.dateValueMaxDate = ko.observable( self.medDataItemConfig.dateValueMaxDate );
            } else {
                self.dateValueMaxDate = ko.observable( new Date().toISOString() );
            }

            self.dateValueMaxDate.visible = ko.observable( false );

            // valueRoundingMethod
            if ( self.medDataItemConfig && !isNaN( self.medDataItemConfig.valueRoundingMethod ) ) {
                self.valueRoundingMethod = ko.observable( self.medDataItemConfig.valueRoundingMethod );
            } else {
                self.valueRoundingMethod = ko.observable( null );
            }

            self.valueRoundingMethod.visible = ko.observable( false );

            // valueFormulaExpression
            if ( self.medDataItemConfig && self.medDataItemConfig.valueFormulaExpression ) {
                self.valueFormulaExpression = ko.observable( self.medDataItemConfig.valueFormulaExpression );
            } else {
                self.valueFormulaExpression = ko.observable( '' );
            }

            // valueFormulaScope
            if ( self.medDataItemConfig && Array.isArray( self.medDataItemConfig.valueFormulaScope ) ) {
                self.valueFormulaScope = ko.observableArray( self.medDataItemConfig.valueFormulaScope.map( function ( scope ) {
                    var
                        newScope = _.cloneDeep( scope ),
                        template = self.medDataItemTemplateCollection
                        .findTemplateByType( newScope.id );

                    newScope.text = template && template.i18n ? template.i18n : template.type;

                    newScope.testValue = ko.observable( newScope.testValue || 0 );

                    newScope.unit = template.unit;

                    return newScope;
                } ) );
            } else {
                self.valueFormulaScope = ko.observableArray( [] );
            }

            // valueFormulaResult
            self.valueFormulaResult = ko.observable( '' );

            self.valueFormulaResult.hasError = ko.observable( false );

            // manualCalculation
            if ( self.medDataItemConfig && typeof self.medDataItemConfig.manualCalculation === "boolean") {
                self.manualCalculation = ko.observable( self.medDataItemConfig.manualCalculation );
            } else {
                self.manualCalculation = ko.observable( false );
            }

            // isOptional
            if ( self.medDataItemConfig && typeof self.medDataItemConfig.isOptional === "boolean") {
                self.isOptional = ko.observable( self.medDataItemConfig.isOptional );
            } else {
                self.isOptional = ko.observable( false );
            }

            self.initTagsEditableTable();
            self.initTagsAdditionalDataEditableTable();
            self.initTagsToUpdateTable();
            self.initCategoriesSelect2();
            self.initDataTypeSelect2();
            self.initEnumValueCollectionSelect2();
            self.initValueRoundingMethodSelect2();
            self.initDataTypeFormatters();
            self.initValueFormulaScopeSelect2();

            if( self.isNotNew ) {
                self.getDistinctMedDataTags( config.tag.title );
            }
        },

        /**
         * Returns the old config (if nothing has changed)
         * or the new config, if something has changed,
         * and needs to be pushed to the config array of the tag.
         * @return {MedDataItemConfigSchema}
         */
        getUpdatedMedDataItemConfig: function () {
            var
                self = this,
                dataType = unwrap( self.dataType ),
                enumValueCollectionOptions = unwrap( self.enumValueCollectionOptions ),
                validationRegeExp = unwrap( self.validationRegeExp ),
                valueDigits = unwrap( self.valueDigits ),
                valueRoundingMethod = unwrap( self.valueRoundingMethod ),
                leadingZeros = unwrap( self.leadingZeros ),
                dateValueFormat = unwrap( self.dateValueFormat ),
                dateValueMinDate = unwrap( self.dateValueMinDate ),
                dateValueMaxDate = unwrap( self.dateValueMaxDate ),
                dataTypeMinLength = unwrap( self.dataTypeMinLength ),
                dataTypeMaxLength = unwrap( self.dataTypeMaxLength ),
                valueFormulaExpression = unwrap( self.valueFormulaExpression ),
                valueFormulaScope = unwrap( self.valueFormulaScope ),
                manualCalculation = unwrap( self.manualCalculation ),
                isOptional = unwrap( self.isOptional ),
                selectedConfig = new MedDataItemConfigSchema( {
                    validFromIncl: new Date().toISOString(),
                    dataType: dataType
                } );

            switch ( dataType ) {
                case medDataTypes.STRING:
                    selectedConfig.textValueValidationRegExp = validationRegeExp;
                    selectedConfig.textValueMinLength = dataTypeMinLength;
                    selectedConfig.textValueMaxLength = dataTypeMaxLength;
                    break;
                case medDataTypes.NUMBER_FLOAT:
                case medDataTypes.NUMBER_FORMULA:
                    selectedConfig.valueDigits = parseInt( valueDigits, 10 );
                    selectedConfig.valueRoundingMethod = valueRoundingMethod === null ? null : parseInt( valueRoundingMethod, 10 );
                    selectedConfig.valueLeadingZeros = parseInt( leadingZeros, 10 );
                    selectedConfig.valueMinValue = dataTypeMinLength;
                    selectedConfig.valueMaxValue = dataTypeMaxLength;

                    if ( dataType === medDataTypes.NUMBER_FORMULA ) {
                        selectedConfig.valueFormulaExpression = valueFormulaExpression;
                        selectedConfig.valueFormulaScope = valueFormulaScope;
                        selectedConfig.manualCalculation = manualCalculation;

                    }
                    break;
                case medDataTypes.NUMBER_INT:
                    selectedConfig.valueMinValue = dataTypeMinLength;
                    selectedConfig.valueMaxValue = dataTypeMaxLength;

                    break;
                case medDataTypes.STRING_ENUM:
                    selectedConfig.enumValueCollectionOptions = enumValueCollectionOptions;
                    break;
                case medDataTypes.DATE:
                    selectedConfig.dateValueFormat = dateValueFormat;
                    selectedConfig.dateValueMinDate = moment( dateValueMinDate ).startOf('day').toISOString();
                    selectedConfig.dateValueMaxDate = moment( dateValueMaxDate ).endOf('day').toISOString();
                    break;
                case medDataTypes.DATE_TIME:
                    selectedConfig.dateValueFormat = dateValueFormat;
                    selectedConfig.dateValueMinDate = moment( dateValueMinDate ).toISOString();
                    selectedConfig.dateValueMaxDate = moment( dateValueMaxDate ).toISOString();
                    break;
            }

            selectedConfig.isOptional = isOptional;

            return selectedConfig;
        },

        /**
         * Returns, if the medDataItemConfig has changed.
         * @return {boolean}
         */
        hasUpdatedMedDataItemConfig: function () {
            var
                self = this,
                newMedDataItemConfig = self.getUpdatedMedDataItemConfig(),
                oldMedDataItemConfig = self.medDataItemConfig;

            if ( !oldMedDataItemConfig ) {
                return true;
            }

            oldMedDataItemConfig = oldMedDataItemConfig.toJSON();
            newMedDataItemConfig = newMedDataItemConfig.toJSON();

            // delete the time fields, as there both configs will always differ
            delete oldMedDataItemConfig.validFromIncl;
            delete newMedDataItemConfig.validFromIncl;

            return !_.isEqual( oldMedDataItemConfig, newMedDataItemConfig );
        },

        destructor: function () {
        },

        getDistinctMedDataTags: function ( title ) {
            var
                self = this;

            self.tagsToUpdateTable.masked(true);

            Y.doccirrus.jsonrpc.api.tag.getDistinctMedDataTags({
                data: {
                    title: title
                }
            })
            .done( function( result ) {
                self.tagsToUpdateData( result.data.map( function( tag ) {
                    return tag;
                } ) );
                self.tagsToUpdateTable.masked(false);
            } )
            .fail( function( err ) {
                self.tagsToUpdateTable.masked(false);
                onFail(err);
            } );
        },

        initTagsToUpdateTable: function () {
            var
                self = this;

            self.tagsToUpdateTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'IncaseAdminMojit-tagsToUpdateTableMedData',
                    fillRowsToLimit: false,
                    states: ['limit'],
                    remote: false,
                    data: self.tagsToUpdateData,
                    // selectMode: 'multi',
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: ''
                            // checkAllOnToggle: true // can comment this as well
                            // checkMode: 'single',
                            // allToggleVisible: false
                        },
                        {
                            forPropertyName: 'title',
                            isSortable: true,
                            isFilterable: true,
                            label: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.tagTitle' ),
                            title: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.tagTitle' )
                        },
                        {
                            forPropertyName: 'unit',
                            isSortable: true,
                            isFilterable: true,
                            label: i18n( 'activity-schema.MedData_T.unit.i18n' ),
                            title: i18n( 'activity-schema.MedData_T.unit.i18n' ),
                            renderer: function ( meta ) {
                                return meta.value || '';
                            }
                        },
                        {
                            forPropertyName: 'sampleNormalValueText',
                            isSortable: true,
                            isFilterable: true,
                            label: i18n('activity-schema.MedData_T.sampleNormalValueText.i18n'),
                            title: i18n('activity-schema.MedData_T.sampleNormalValueText.i18n'),
                            renderer: function ( meta ) {
                                return meta.value || '';
                            }
                        }
                    ]
                }
            } );
        },

        initTagsEditableTable: function () {
            var
                self = this;

            self.tagsEditableTable = KoComponentManager.createComponent( {
                componentType: 'KoEditableTable',
                stateId: 'EditMedDataTagModal-tagsEditableTable',
                componentConfig: {
                    ViewModel: MedDataTagViewModel,
                    sharedViewModelData: {
                        medDataItemTemplatesByCategory: self.medDataItemTemplateCollection.medDataItemTemplatesByCategory
                    },
                    data: self.tagsEditorTableData,
                    columns: [
                        {
                            forPropertyName: 'type',
                            label: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.typeOfTag' ),
                            title: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.typeOfTag' ),
                            renderer: function( meta ) {
                                var
                                    type = meta.row.type();
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'tag', 'Type_E', type, 'i18n', 'k.A.' );
                            }
                        },
                        {
                            forPropertyName: 'displayTitle',
                            label: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.tagTitle' ),
                            title: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.tagTitle' ),
                            renderer: function( meta ) {
                                var medDataTypeMatch = self.medDataItemTemplateCollection.getMedDataTypeListForSelect2().find(function (medDatatype) {
                                    return medDatatype.id === meta.row.title();
                                });

                                return medDataTypeMatch && medDataTypeMatch.i18n ? medDataTypeMatch.i18n : meta.row.title();
                            },
                            inputField: {
                                componentType: 'KoFieldSelect2',
                                componentConfig: {
                                    useSelect2Data: true,
                                    select2Read: function( item ) {
                                        var
                                            text = item,
                                            match = self.medDataItemTemplateCollection.getMedDataTypeListForSelect2().find(function (medDatatype) {
                                                return medDatatype.id === item;
                                            });

                                        if( !item ) {
                                            return null;
                                        }

                                        if (match && match.i18n) {
                                            text = match.i18n;
                                        }


                                        return { id: item, text: text };
                                    },
                                    select2Write: function( $event, observable ) {
                                        var
                                            title = $event.added.id.toLowerCase(),
                                            existing = self.medDataItemTemplateCollection.getMedDataTypeListForSelect2().find(function( tag ) {
                                                return (
                                                    tag.id.toLowerCase() === title ||
                                                    tag.text.toLowerCase() === title ||
                                                    tag.i18n.toLowerCase() === title
                                                );
                                            }),
                                            isStaticTag;

                                        if ( existing ) {
                                            isStaticTag = Y.doccirrus.schemas.tag.isStaticTag( title );

                                            if ( isStaticTag ) {
                                                onFail( i18n( 'IncaseAdminMojit.incase_tab_tags.messages.DEFAULT_MED_TAG', { data: { title: title } } ), true );
                                            } else {
                                                onFail( i18n( 'IncaseAdminMojit.incase_tab_tags.messages.TAG_ALREADY_EXISTS', { data: { title: title } } ) );
                                            }
                                        } else {
                                            observable($event.added.id);
                                        }
                                    },
                                    select2Config: {
                                        query: undefined,
                                        initSelection: undefined,
                                        data: self.medDataItemTemplateCollection.getMedDataTypeListForSelect2(),
                                        createSearchChoice: function( item ) {
                                            return {
                                                id: item,
                                                text: item
                                            };
                                        },
                                        multiple: false
                                    }
                                }
                            }
                        },
                        {
                            forPropertyName: 'unit'
                        },
                        {
                            forPropertyName: 'displaySampleNormalValueText',
                            label: i18n('activity-schema.MedData_T.sampleNormalValueText.i18n'),
                            title: i18n('activity-schema.MedData_T.sampleNormalValueText.i18n')
                        }
                    ],
                    isAddRowButtonDisabled: function() {
                        return true;
                    },
                    isAddRowButtonVisible: function() {
                        return false;
                    }
                }
            } );

            self.addDisposable( ko.computed( function() {
                var
                    rows = unwrap( self.tagsEditableTable.rows );

                rows.every( function( rowModel ) {
                    return rowModel.isValid();
                } ) ;
            } ) );
        },

        initTagsAdditionalDataEditableTable: function () {
            var
                self = this;

            self.tagsAdditionalDataEditableTable = KoComponentManager.createComponent( {
                componentType: 'KoEditableTable',
                stateId: 'EditMedDataTagModal-tagsAdditionalDataEditableTable',
                componentConfig: {
                    ViewModel: AdditionalDataViewModel,
                    data: self.tagsAdditionalDataEditorTableData,
                    remote: false,
                    columns: [
                        {
                            forPropertyName: 'key',
                            label: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.additionalDataKey' ),
                            title: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.additionalDataKey' )
                        },
                        {
                            forPropertyName: 'value',
                            label: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.additionalDataValue' ),
                            title: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.additionalDataValue' )
                        },
                        {
                            forPropertyName: 'deleteButton',
                            utilityColumn: true,
                            width: '60px',
                            css: {
                                'text-center': 1
                            },
                            inputField: {
                                componentType: 'KoButton',
                                componentConfig: {
                                    name: 'delete',
                                    title: i18n( 'general.button.DELETE' ),
                                    icon: 'TRASH_O',
                                    click: function( button, $event, $context ) {
                                        var
                                            rowModel = $context.$parent.row;

                                        self.tagsAdditionalDataEditorTableData.remove( rowModel );
                                    }
                                }
                            }
                        }
                    ],
                    exportCsvConfiguration: {
                        columns: [
                            {
                                forPropertyName: 'key',
                                stripHtml: true
                            },
                            {
                                forPropertyName: 'value',
                                stripHtml: true
                            }
                        ]
                    },
                    onAddButtonClick: function() {
                       self.tagsAdditionalDataEditorTableData.push( new AdditionalDataViewModel( {} ) );
                       return false;
                    }
                }
            } );
        },

        initCategoriesSelect2: function ( ) {
            var
                self = this;

            self.categoriesSelect2Config = {
                query: undefined,
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var category = unwrap( self.categoriesSelect2Data );

                        return category.map( function( value ) {
                            return {
                                id: value,
                                text: Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'MedDataCategory_E', value, 'i18n', value )
                            };
                        } );
                    },
                    write: function( $event ) {
                        var
                            index,
                            category = self.categoriesSelect2Data;

                        if( $event.added ) {
                            category.push( $event.added.id );
                        }
                        if( $event.removed ) {
                            index = category.indexOf( $event.removed.id );
                            if( -1 !== index ) {
                                category.splice( index, 1 );
                            }
                        }
                    }
                } ) ),
                placeholder: "",
                select2: {
                    allowClear: true,
                    multiple: true,
                    width: '100%',
                    data: function  __category_select2getData () {
                        return {
                            results: Y.doccirrus.schemas.activity.types.MedDataCategory_E.list.map( function( value ) {
                                return {
                                    id: value.val,
                                    text: value.i18n
                                };
                            } )
                        };
                    },
                    createSearchChoice: function __category_select2createSearchChoice( value ) {
                        return {
                            id: value,
                            text: Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'MedDataCategory_E', value, 'i18n', value )
                        };
                    }
                }
            };
        },

        initDataTypeSelect2: function ( ) {
            var
                self = this;

            self.dataTypeSelect2Config = {
                query: undefined,
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var value = unwrap( self.dataType );
                        return {
                            id: value,
                            text: Y.doccirrus.schemaloader.getEnumListTranslation( 'tag', 'MedDataItemDataType_E', value, 'i18n', value )
                        };
                    },
                    write: function( $event ) {
                        self.dataType( $event.val );
                    }
                } ) ),
                placeholder: "",
                select2: {
                    allowClear: false,
                    multiple: false,
                    data: function() {
                        return {
                            results: Y.doccirrus.schemas.tag.types.MedDataItemDataType_E.list.map( function( value ) {
                                return {
                                    id: value.val,
                                    text: value.i18n
                                };
                            } )
                        };
                    }
                }
            };
        },

        initEnumValueCollectionSelect2: function () {
            var
                self = this;

            self.enumValueCollectionSelect2Config = {
                query: undefined,
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return unwrap( self.enumValueCollectionOptions );
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.enumValueCollectionOptions.push( $event.added );
                        }
                        if( $event.removed ) {
                            self.enumValueCollectionOptions.remove( $event.removed );
                        }
                    }
                } ) ),
                placeholder: "",
                select2: {
                    allowClear: false,
                    multiple: true,
                    data: function() {
                        return {
                            results: unwrap( self.enumValueCollectionOptions )
                        };
                    },
                    createSearchChoice: function( value ) {
                        return {
                            id: value,
                            text: value
                        };
                    }
                }
            };
        },

        initValueRoundingMethodSelect2: function () {
            var self = this;

            function getValueRoundingMethod ( value ) {
                if( value > 0 ) {
                    return 'ceil';
                } else if( value < 0 ) {
                    return 'floor';
                } else if( value === 0 ) {
                    return 'round';
                } else {
                    return 'truncate';
                }
            }

            self.valueRoundingMethodSelect2 = {
                query: undefined,
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var value = unwrap( self.valueRoundingMethod );
                        return {
                            id: value,
                            text: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.valueRoundingMethod.' + getValueRoundingMethod( parseInt( value, 10 ) ) )
                        };
                    },
                    write: function( $event ) {
                        self.valueRoundingMethod( $event.val );
                    }
                } ) ),
                placeholder: "",
                select2: {
                    allowClear: false,
                    multiple: false,
                    data: function() {
                        return {
                            results: [
                                {
                                    id: null,
                                    text: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.valueRoundingMethod.' + getValueRoundingMethod( null ) )
                                },
                                {
                                    id: -1,
                                    text: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.valueRoundingMethod.' + getValueRoundingMethod( -1 ) )
                                },
                                {
                                    id: 0,
                                    text: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.valueRoundingMethod.' + getValueRoundingMethod( 0 ) )
                                },
                                {
                                    id: 1,
                                    text: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.valueRoundingMethod.' + getValueRoundingMethod( 1 ) )
                                }
                            ]
                        };
                    }
                }
            };
        },

        initValueFormulaScopeSelect2: function () {
            var self = this;

            self.valueFormulaScopeSelect2 = {
                query: undefined,
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var value = unwrap( self.valueFormulaScope );

                        return value.map( function (scope) {
                            var template = self.medDataItemTemplateCollection
                                .findTemplateByType( scope.id );

                            return {
                                id: scope.id,
                                text: template && template.i18n ? template.i18n : template.type
                            };
                        } );
                    },
                    write: function( $event ) {
                        var
                            valueFormulaScope = peek( self.valueFormulaScope ),
                            currentlyUsedScopeNames = valueFormulaScope.map( function ( scope ) {
                                return scope.scopeName;
                            } );

                        if ( $event.added ) {
                            $event.added.testValue = ko.observable( 0 );

                            // Get the first letter out of the scopeNameOptions that has not been assigned
                            $event.added.scopeName = scopeNameOptions.split('').find( function (scopeNameOption) {
                                if ( valueFormulaScope.length === 0 ) {
                                    return true;
                                }

                                return currentlyUsedScopeNames.indexOf( scopeNameOption ) === -1;
                            });

                            self.valueFormulaScope.push( $event.added );
                        }

                        if ( $event.removed ) {
                            self.valueFormulaScope.remove( function (item) {
                                return item.id === $event.removed.id;
                            } );
                        }

                        self.valueFormulaScope.sort(function( a, b ) {
                            if ( a.scopeName > b.scopeName ) {
                                return 1;
                            }

                            if ( b.scopeName > a.scopeName ) {
                                return -1;
                            }

                            return 0;
                        });
                    }
                } ) ),
                placeholder: "",
                select2: {
                    allowClear: true,
                    multiple: true,
                    data: function() {
                        var existingTags = self.medDataItemTemplateCollection
                            .findTemplatesByLatestDataType(
                                [
                                    medDataTypes.NUMBER_INT,
                                    medDataTypes.NUMBER_FLOAT,
                                    medDataTypes.DATE,
                                    medDataTypes.DATE_TIME,
                                    medDataTypes.NUMBER_FORMULA
                                ]
                            )
                            .map( function ( template ) {
                                return {
                                    id: template.type,
                                    text: template.i18n,
                                    unit: template.unit
                                };
                            } );

                        return {
                            results: existingTags
                        };
                    }
                }
            };
        },

        dateValueMinDateStart: function (picker) {
            var
                self = this;

            self.dateValueMinDatePicker = picker;
        },

        dateValueMaxDateStart: function (picker) {
            var
                self = this;

            self.dateValueMaxDatePicker = picker;
        },

        initDataTypeFormatters: function () {
            var
                self = this,
                dataType = unwrap( self.dataType );

            // MinLength
            self.dataTypeMinLength = ko.observable( null );
            self.dataTypeMinLength.displayValue = ko.observable( null );

            if (
                self.medDataItemConfig &&
                (
                    !isNaN( self.medDataItemConfig.valueMinValue ) ||
                    !isNaN( self.medDataItemConfig.textValueMinLength )
                )

            ) {
                switch ( dataType ) {
                    case medDataTypes.STRING:
                        self.dataTypeMinLength( self.medDataItemConfig.textValueMinLength );
                        self.dataTypeMinLength.displayValue( self.medDataItemConfig.textValueMinLength );
                        break;
                    case medDataTypes.NUMBER_FLOAT:
                    case medDataTypes.NUMBER_FORMULA:
                    case medDataTypes.NUMBER_INT:
                        self.dataTypeMinLength( self.medDataItemConfig.valueMinValue );
                        self.dataTypeMinLength.displayValue( self.medDataItemConfig.valueMinValue );
                        break;
                }
            }

            self.dataTypeMinLength.visible = ko.observable( false );

            self.dataTypeMinLength.displayValue.subscribe(function (newValue) {
                var
                    num = newValue === null ? null : parseFloat( newValue ),
                    newNum;

                // If user enter number number with decimals, round it to the next Integer
                if ( !isNaN(num) && num !== 0 && num % 1 !== 0 && self.dataType() === MedDataItemDataTypes.NUMBER_INT ) {
                    newNum = Math.round( num );
                    self.dataTypeMinLength( newNum );
                    self.dataTypeMinLength.displayValue( newNum );
                } else if ( isNaN(num) ) {
                    self.dataTypeMinLength( null );
                    self.dataTypeMinLength.displayValue( null );
                } else if ( newValue !== num ) {
                    self.dataTypeMinLength( num );
                    self.dataTypeMinLength.displayValue( num );
                }
            });

            // Max Length
            self.dataTypeMaxLength = ko.observable( null );
            self.dataTypeMaxLength.displayValue = ko.observable( null );

            if (
                self.medDataItemConfig &&
                (
                    !isNaN( self.medDataItemConfig.valueMaxValue ) ||
                    !isNaN( self.medDataItemConfig.textValueMaxLength )
                )

            ) {
                switch ( dataType ) {
                    case medDataTypes.STRING:
                        self.dataTypeMaxLength( self.medDataItemConfig.textValueMaxLength );
                        self.dataTypeMaxLength.displayValue( self.medDataItemConfig.textValueMaxLength );
                        break;
                    case medDataTypes.NUMBER_FLOAT:
                    case medDataTypes.NUMBER_FORMULA:
                    case medDataTypes.NUMBER_INT:
                        self.dataTypeMaxLength( self.medDataItemConfig.valueMaxValue );
                        self.dataTypeMaxLength.displayValue( self.medDataItemConfig.valueMaxValue );
                        break;
                }
            }

            self.dataTypeMaxLength.visible = ko.observable( false );

            self.dataTypeMaxLength.displayValue.subscribe(function (newValue) {
                var
                    num = newValue === null ? null : parseFloat( newValue ),
                    newNum;

                // If user enter number number with decimals, round it to the next Integer
                if ( !isNaN(num) && num !== 0 &&  num % 1 !== 0 && self.dataType() === MedDataItemDataTypes.NUMBER_INT ) {
                    newNum = Math.round( num );
                    self.dataTypeMaxLength( newNum );
                    self.dataTypeMaxLength.displayValue( newNum );
                } else if ( isNaN(num) ) {
                    self.dataTypeMaxLength( null );
                    self.dataTypeMaxLength.displayValue( null );
                } else if ( newValue !== num ) {
                    self.dataTypeMaxLength( num );
                    self.dataTypeMaxLength.displayValue( num );
                }
            });

            self.isFormattingColumnVisible = ko.observable( false );
            self.isFormulaConfigVisible = ko.observable( false );

            self.isOptionalVisible = ko.observable( true );

            self.datepickerOptions = {
                    format: self.dataType() === medDataTypes.DATE ? TIMESTAMP_FORMAT : TIMESTAMP_FORMAT_LONG ,
                    widgetPositioning: {
                        horizontal: 'right',
                        vertical: 'top'
                    }
            };

            self.lengthHeader = ko.observable( '' );

            self.addDisposable( ko.computed( function() {
                var
                    dataType = unwrap( self.dataType );

                // Reset All
                self.dataTypeMinLength.visible( false );
                self.dataTypeMaxLength.visible( false );
                self.dateValueMinDate.visible( false );
                self.dateValueMaxDate.visible( false );
                self.enumValueCollectionOptions.visible( false );
                self.validationRegeExp.visible( false );
                self.isFormattingColumnVisible( false );
                self.valueDigits.visible( false );
                self.valueRoundingMethod.visible( false );
                self.leadingZeros.visible( false );
                self.dateValueFormat.visible( false );
                self.isFormulaConfigVisible( false );
                self.isOptionalVisible( true );

                switch ( dataType ) {
                    case medDataTypes.STRING:
                        self.dataTypeMinLength.visible( true );
                        self.dataTypeMaxLength.visible( true );
                        self.validationRegeExp.visible( true );
                        self.lengthHeader( self.tagsLengthHeader );
                        break;
                    case medDataTypes.NUMBER_FLOAT:
                    case medDataTypes.NUMBER_FORMULA:
                        self.isFormattingColumnVisible( true );
                        self.valueDigits.visible( true );
                        self.valueRoundingMethod.visible( true );
                        self.leadingZeros.visible( true );
                        self.lengthHeader( self.tagsValueRangeHeader );

                        if ( dataType === medDataTypes.NUMBER_FORMULA ) {
                            self.isFormulaConfigVisible( true );
                            self.isOptionalVisible( false );
                            self.isOptional( false );
                        } else {
                            self.dataTypeMinLength.visible( true );
                            self.dataTypeMaxLength.visible( true );
                        }

                        break;
                    case medDataTypes.NUMBER_INT:
                        self.dataTypeMinLength.visible( true );
                        self.dataTypeMaxLength.visible( true );
                        self.lengthHeader( self.tagsValueRangeHeader );
                        break;
                    case medDataTypes.STRING_ENUM:
                        self.enumValueCollectionOptions.visible( true );
                        break;
                    case medDataTypes.DATE:
                    case medDataTypes.DATE_TIME:
                        self.isFormattingColumnVisible( true );
                        self.dateValueFormat.visible( true );
                        self.dateValueMinDate.visible( true );
                        self.dateValueMaxDate.visible( true );

                        if (self.dateValueMinDatePicker && self.dateValueMinDatePicker.format) {
                            self.dateValueMinDatePicker.format( dataType === medDataTypes.DATE ? TIMESTAMP_FORMAT : TIMESTAMP_FORMAT_LONG );
                        }

                        if (self.dateValueMaxDatePicker && self.dateValueMaxDatePicker.format) {
                            self.dateValueMaxDatePicker.format( dataType === medDataTypes.DATE ? TIMESTAMP_FORMAT : TIMESTAMP_FORMAT_LONG );
                        }

                        break;
                }
            } ) );
        },

        notifyBindValueFormulaPrintout: function ( element ) {
            var self = this;

            self.valueFormulaPrintoutElement = element;

            self.initMathAndMathJaxComputeds();
        },

        initMathAndMathJaxComputeds: function () {
            var self = this;

            self.addDisposable( ko.computed( function() {
                var
                    parenthesis = 'keep',
                    implicit = 'hide',
                    valueFormulaExpression = unwrap( self.valueFormulaExpression ),
                    mathNode,
                    latex,
                    mathJaxOptions,
                    scope = MedDataItemConfigSchema.getStaticScope();

                unwrap( self.valueFormulaScope ).forEach( function ( scopeItem ) {
                    scope[scopeItem.scopeName] = unwrap( scopeItem.testValue );
                } );

                try {
                    mathNode = math.parse( valueFormulaExpression );

                    self.valueFormulaResult( math.format( mathNode.compile().evaluate(scope) ) );

                    self.valueFormulaResult.hasError( false );
                } catch (error) {
                    Y.log( 'initMathAndMathJaxComputeds: Could not parse valueFormulaExpression' + error.toString(), 'warn', NAME );

                    self.valueFormulaResult( error.toString() );
                    self.valueFormulaResult.hasError( true );
                }

                try {
                    // export the expression to LaTeX
                    latex = mathNode ? mathNode.toTex({ parenthesis: parenthesis, implicit: implicit }) : '';

                    if ( latex !== 'undefined' ) {

                        MathJax.texReset();

                        mathJaxOptions = MathJax.getMetricsFor(self.valueFormulaPrintoutElement);

                        MathJax
                            .tex2chtmlPromise(latex, mathJaxOptions)
                            .then(function (html) {
                                self.valueFormulaPrintoutElement.innerHTML = '';

                                self.valueFormulaPrintoutElement.appendChild( html );

                                MathJax.startup.document.clear();
                                MathJax.startup.document.updateDocument();
                            });
                    }
                }
                catch (err) {
                    Y.log( 'initMathAndMathJaxComputeds: Could not printout valueFormulaExpression' + err, 'info', NAME );
                }

            } ) );
        }
    }, {
        NAME: 'EditMedDataTagModal',
        ATTRS: {}
    } );

    // ---------------------------------------- END. Initialize EditMedDataTagModal --------------------------------


    // --------------------------------------- Initialize EditMedDataTagSelectModal function whose instance will be exported ----------
    function EditMedDataTagSelectModal() {}

    EditMedDataTagSelectModal.prototype.showDialog = function( data, callback ) {
        Promise.resolve(
            Y.doccirrus.jsonrpc.api.jade.renderFile( { path: 'IncaseAdminMojit/views/editMedDataTagDialog' } )
        )
        .then( function( response ) {
            return response && response.data;
        } )
        .then( function( template ) {
            return Y.doccirrus.jsonrpc.api.meddata.getMedDataItemTemplateCollection()
                .then( function( response ) {
                    var medDataItemTemplateCollection = new MedDataItemTemplateCollection( response && response.data || {} );
                    return {
                        template: template,
                        medDataItemTemplateCollection: medDataItemTemplateCollection
                    };
                } );
        } )
        .then( function( params ) {
            var
                modal,
                bodyContent = Y.Node.create( params.template ),
                editMedDataTagModal = new EditMedDataTagModal({
                    tag: data,
                    medDataItemTemplateCollection: params.medDataItemTemplateCollection
                }),
                loadingMaskNode = bodyContent.getDOMNode();

            modal = new Y.doccirrus.DCWindow( {
                bodyContent: bodyContent,
                title: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.title' ),
                icon: Y.doccirrus.DCWindow.ICON_LIST,
                centered: true,
                modal: true,
                maximizable: true,
                width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                render: document.body,
                buttons: {
                    header: ['close', 'maximize'],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                            action: function() {
                                modal.close();
                            }
                        } ),
                        Y.doccirrus.DCWindow.getButton( 'SAVE', {
                            isDefault: true,
                            action: function( e ) {
                                var
                                    updatedData = unwrap( editMedDataTagModal.tagsEditableTable.rows ),
                                    oldData,
                                    hasUnitChanged = false,
                                    medDataItemConfig = editMedDataTagModal.getUpdatedMedDataItemConfig(),
                                    hasUpdatedMedDataItemConfig = editMedDataTagModal.hasUpdatedMedDataItemConfig(),
                                    additionalDataArr = unwrap( editMedDataTagModal.tagsAdditionalDataEditableTable.rows ),
                                    isNotNew = editMedDataTagModal.isNotNew,
                                    tagValuesToUpdate = editMedDataTagModal.tagsToUpdateTable.getComponentColumnCheckbox().checked(),
                                    additionalData = {};

                                // there SHOULD be just a single object, as the table will ALWAYS just show a single entry
                                if( updatedData && updatedData[0] ) {
                                    oldData = updatedData[0].get( 'dataUnModified' );
                                    updatedData = updatedData[0].toJSON();

                                    // if the unit has changed, a warning modal is shown
                                    hasUnitChanged = (updatedData.unit !== oldData.unit);

                                    //transforming additionalData rows key:value to object
                                    additionalDataArr.forEach( function (data) {
                                        additionalData[data.key()] = data.value();
                                    });

                                    updatedData.additionalData = additionalData;
                                    if( hasUpdatedMedDataItemConfig ) {
                                        if( !Array.isArray( updatedData.medDataItemConfig ) ) {
                                            updatedData.medDataItemConfig = [];
                                        }
                                        updatedData.medDataItemConfig.push( medDataItemConfig.toObject() );
                                    }

                                    if( Y.doccirrus.schemas.v_meddata.medDataTypes[updatedData.title] ) {
                                        return onFail( i18n( 'IncaseAdminMojit.incase_tab_tags.messages.DEFAULT_MED_TAG', { data: { title: updatedData.title } } ), true );
                                    }
                                } else {
                                    updatedData = null;
                                }

                                var
                                    isNew = !isNotNew,
                                    isOldButHasChangedData = isNotNew && (
                                        // updatedData is an array and has multiple entries
                                        (updatedData && Array.isArray( updatedData ) && updatedData.length > 0) ||
                                        // updated data is an object
                                        !!updatedData
                                    ),
                                    anyExistingItemsShouldBeUpdated = (updatedData && tagValuesToUpdate.length),

                                    /**
                                     * The function changeMedDataTag may have a
                                     * warning modal shown before being executed.
                                     * This is why it is encapsuled into a separate function.
                                     */
                                    changeMedDataTag = function changeMedDataTag() {
                                        Y.doccirrus.utils.showLoadingMask( loadingMaskNode );

                                        //Make a websocket call in case the operation takes long time
                                        Y.doccirrus.communication.apiCall( {
                                            method: 'tag.updateMedData',
                                            data: {
                                                data: updatedData,
                                                tagValuesToUpdate: tagValuesToUpdate,
                                                isNew: isNew,
                                                isManually: isNew
                                            }
                                        }, function( err ) {
                                            Y.doccirrus.utils.hideLoadingMask( loadingMaskNode );

                                            if( err ) {
                                                if( err.data && Array.isArray( err.data ) ) {
                                                    err = err.data[0];
                                                }

                                                switch (err && err.message) {
                                                    case TagErrors.DEFAULT_MED_TAG:
                                                        return onFail( i18n( 'IncaseAdminMojit.incase_tab_tags.messages.DEFAULT_MED_TAG', { data: { title: updatedData.title } } ), true );
                                                    case TagErrors.TAG_ALREADY_EXISTS:
                                                        return onFail( i18n( 'IncaseAdminMojit.incase_tab_tags.messages.TAG_ALREADY_EXISTS', { data: { title: updatedData.title } } ) );
                                                    case TagErrors.TAG_NOT_FOUND:
                                                        return onFail( i18n( 'IncaseAdminMojit.incase_tab_tags.messages.TAG_NOT_FOUND' ) );
                                                    default:
                                                        return onFail( SAVE_FAIL );

                                                }
                                            } else {
                                                modal.close( e );
                                                return callback( { success: true } );
                                            }
                                        } );
                                    };

                                if( isNew || isOldButHasChangedData || anyExistingItemsShouldBeUpdated ) {
                                    if( !isNew && hasUnitChanged ) {
                                        showConfirmBox( "warn", i18n( 'IncaseAdminMojit.incase_tab_tags.messages.TAG_CHANGE_WARNING_MEDDATA' ), changeMedDataTag );
                                    } else {
                                        changeMedDataTag();
                                    }
                                }
                            }
                        } )
                    ]
                }
            } );

            modal.set( 'focusOn', [] );

            if( loadingMaskNode.parentNode && loadingMaskNode.parentNode.parentNode ) { //To disable the entire popup
                loadingMaskNode = loadingMaskNode.parentNode.parentNode;
            }

            editMedDataTagModal.addDisposable( ko.computed(function() {
                var
                    editableTableRows = unwrap( editMedDataTagModal.tagsEditableTable.rows ),
                    isValid = editableTableRows[0].isValid(),
                    isNotNew = editMedDataTagModal.isNotNew,
                    tagsToUpdate = editMedDataTagModal.tagsToUpdateTable.getComponentColumnCheckbox().checked(),
                    data = editMedDataTagModal.tagsToUpdateTable.rows(),
                    categories = unwrap( editMedDataTagModal.categoriesSelect2Data ),
                    dataType = unwrap( editMedDataTagModal.dataType );

                if( isValid && ( ( !isNotNew || ( isNotNew && !data.length ) ) || tagsToUpdate.length && categories.length && dataType ) ) {
                    modal.getButton( 'SAVE' ).button.enable();
                } else {
                    modal.getButton( 'SAVE' ).button.disable();
                }
            }) );
            ko.applyBindings( editMedDataTagModal, bodyContent.getDOMNode() );
        } )
        .catch( onFail );
    };

    // ---------------------------------------END. Initialize EditMedDataTagSelectModal function whose instance will be exported ----------

    Y.namespace( 'doccirrus.modals' ).editMedDataTagSelectModal = new EditMedDataTagSelectModal();

}, '0.0.1', {
    requires: [
        'oop',
        'DCWindow',
        'promise',
        'tag-schema',
        'v_meddata-schema'
    ]
} );