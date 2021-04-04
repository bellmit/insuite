/**
 * User: pi
 * Date: 20/12/16  17:05
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'MedDataEditorModel', function( Y, NAME ) {
        /**
         * @module MedDataEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
            SubEditorModel = KoViewModel.getConstructor( 'SubEditorModel' ),
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' ),
            KoEditableTable = KoComponentManager.registeredComponent( 'KoEditableTable' ),
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n,
            // load a helper function to add tags to the collection
            addToCategoryDictionaryObject = Y.doccirrus.commonutils.addToCategoryDictionaryObject,

            // class linkers, will become ES6 imports later on
            MedDataItemModel = KoViewModel.getConstructor( "MedDataItemModel" ),
            MedDataConfigClient = Y.doccirrus.api.meddata.MedDataConfigClient,
            MedDataColumnClient = Y.doccirrus.api.meddata.MedDataColumnClient,
            IngredientPlanSchema = Y.doccirrus.schemas.v_ingredientplan.IngredientPlanSchema,
            MedDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes,
            MedDataCategories = Y.doccirrus.schemas.v_meddata.medDataCategories,
            MedDataCategoriesNonPublic = Y.doccirrus.schemas.v_meddata.medDataCategoriesNonPublic,
            MedDataItemConfigSchema = Y.doccirrus.schemas.v_meddata.MedDataItemConfigSchema,
            MedDataItemTemplateSchema = Y.doccirrus.schemas.v_meddata.MedDataItemTemplateSchema,
            MedDataItemSchema = Y.doccirrus.schemas.v_meddata.MedDataItemSchema,
            MedDataItemDataTypes = Y.doccirrus.schemas.v_meddata.medDataItemDataTypes;

         /**
         * Remaps the current set of MedData back into the form.
         * @param binder
         * @param {string} type
         */
        function remapMedDataInForms( binder, type ) {
            var
                currentActivity = unwrap( binder.currentActivity ),
                currentView = unwrap( binder.currentView ),
                activityDetailsVM = currentView ? unwrap( currentView.activityDetailsViewModel ) : null,
                template = activityDetailsVM && activityDetailsVM.template ? activityDetailsVM.template : null,
                affectedElements = {};

            // check that we have a form and a mapper
            if( !template || !template.map || !currentActivity._isEditable() ||
                !activityDetailsVM.mapper || ! activityDetailsVM.mapper.map ) {
                return;
            }

            // find out the affected elements in the form
            // AMTS
            var rootFieldDictionary = Y.dcforms.schema.AMTSFormMapper_T.getRootToFieldsDictionary( type );
            // should be an array, if type has been properly set, else an object
            if( Array.isArray( rootFieldDictionary ) ) {
                rootFieldDictionary.forEach( function forEachChildElementPerRootKey( childKey ) {
                    var element = template.getBoundElement( childKey );
                    if( element ) {
                        affectedElements[childKey] = element;
                    }
                } );
            }

            // if the type itself has not been added yet, check if it exists and add it
            if( !Object.prototype.hasOwnProperty.call( affectedElements, type ) ) {
                affectedElements[type] = template.getBoundElement( type );
            }

            // now convert to an array of elements from the unique object with all affected elements
            affectedElements = Object.values( affectedElements )
                .filter( function filterAffectedElementsForNonNull( element ) {
                    return !!element;
                } );

            //  check that at least a form element is found
            if( affectedElements.length === 0 ) {
                return;
            }

            activityDetailsVM.mapper.map( onFormRemapped );

            function onFormRemapped() {
                Y.log( 'Updated form with MEDDATA, storing form changes.', 'debug', NAME );

                affectedElements.forEach( function forEachAffectedFormChangeElement( element ) {
                    template.raise( 'valueChanged', element );
                } );
            }
        }

        /**
         * @class MedDataItemEditorModel
         * @constructor
         * @param {Object} config
         * @extends SubEditorModel
         */
        function MedDataItemEditorModel( config ) {
            MedDataItemEditorModel.superclass.constructor.call( this, config );
        }

        MedDataItemEditorModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            whiteList: {
                value: [
                    'category',
                    'type',
                    'value',
                    'unit',
                    'textValue',
                    'boolValue',
                    'dateValue',
                    'sampleNormalValueText',
                    'additionalData',
                    'cchKey',
                    'smartValue'
                ],
                lazyAdd: false
            }
        };

        Y.extend( MedDataItemEditorModel, SubEditorModel, {

                initializer: function MedDataItemEditorModel_initializer() {
                    var
                        self = this;

                    self.initMedDataItemEditorModel();
                },
                destructor: function MedDataItemEditorModel_destructor() {
                },
                initMedDataItemEditorModel: function MedDataItemEditorModel_initMedDataItemEditorModel() {
                    var
                        self = this,
                        binder = self.get('binder'),
                        currentActivity = unwrap( binder.currentActivity ),
                        medDataConfig = unwrap( currentActivity.medDataConfig ),
                        dataModelParent = self.get('dataModelParent');

                    self.notesI18n = i18n( 'InCaseMojit.MedDataEditorModel_clientJS.notes' );

                    /**
                     * import dataType, medDataItemTemplate and medDataItemConfig
                     * to have them easily accesible in the this EditorModel
                     */
                    self.dataType = dataModelParent.dataType;

                    self.medDataItemTemplate = dataModelParent.medDataItemTemplate;

                    self.medDataItemConfig = dataModelParent.medDataItemConfig;

                    self.formulaErrorMessages = ko.observableArray();

                    self.recalculateCounter = ko.observable( 0 );

                    /**
                     * Ensure, that the additionalData properties are set for this MedDataItemEditorModel.
                     * This is the case for preloaded data, but may not be the case for new created items.
                     */
                    self.applyMedDataConfig( medDataConfig );

                    self.initialType = null;

                    self.addDisposable( ko.computed( function () {
                        var type = unwrap( self.type );

                        if ( self.initialType === null ) {
                            self.initialType = type;
                        } else if ( type !== self.initialType ) {
                            self.value( null );
                            self.textValue( null );
                            self.dateValue( null );
                            self.boolValue( null );
                        }
                    } ) );

                    self.addDisposable( ko.computed( function () {
                        var binder = self.get( 'binder' ),
                            currentPatient = unwrap( binder.currentPatient ),
                            currentActivity = unwrap( binder.currentActivity ),
                            medDataItemConfig = unwrap( self.medDataItemConfig ),
                            dataType = unwrap( self.dataType ),
                            value = unwrap( self.value ),
                            formulaErrorMessages = [],
                            getMedData = medDataItemConfig.manualCalculation ? peek : unwrap,
                            medData = currentActivity && currentActivity.medData ? getMedData( currentActivity.medData ) : [],
                            recalculateCounter = unwrap( self.recalculateCounter ),
                            calculatedValue;

                        medData = medData.map( function ( medDataItem ) {
                            /**
                             * listen to the changes in all medData items,
                             * so the formula can be re calculated if some values changed
                             * and are needed to solve the formula
                             */
                            getMedData( medDataItem.smartValue );

                            return medDataItem.toJSON();
                        } );

                        /**
                         * CASE 1
                         * If value has not been defined or is NaN
                         *
                         * CASE 2
                         * if value is already set and
                         * the manualCalculation is enabled and
                         * recalculation has been triggered
                         * e.g. when the user click on the button to re-calculate the formula
                         *
                         * CASE 3
                         *  if value is already set and
                         *  should be calculated automatically
                         */
                        if( dataType === MedDataItemDataTypes.NUMBER_FORMULA ) {
                            switch( true ) {
                                // CASE 1:
                                case isNaN( value ):
                                // CASE 2:
                                case medDataItemConfig.manualCalculation && recalculateCounter > 0:
                                // CASE 3:
                                case !medDataItemConfig.manualCalculation:
                                    calculatedValue = medDataItemConfig.getValueFormulaExpressionValue(
                                        currentPatient.toJSON(),
                                        formulaErrorMessages,
                                        { extendedMedData: medData }
                                    );
                                    self.value( calculatedValue );

                                    self.formulaErrorMessages( formulaErrorMessages.map( function( messageObj ) {
                                        return i18n( 'validations.message.' + messageObj.message, messageObj.options );
                                    } ) );
                            }
                        }
                    } ).extend({ rateLimit: { timeout: 100, method: "notifyWhenChangesStop" } } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            validationMessages = [];

                        // Listen to changes in following properties
                        unwrap( self.dataType );
                        unwrap( self.value );
                        unwrap( self.textValue );
                        unwrap( self.dateValue );
                        unwrap( self.boolValue );

                        unwrap( self.medDataItemConfig )
                            .isMedDataItemValid( self.get( 'dataModelParent' ).toJSON(), validationMessages )
                            .then( function onValidationFinished( isValid ) {
                                self.smartValue.validationMessages( validationMessages.map( function( messageObj ) {
                                    return i18n( 'validations.message.' + messageObj.message, messageObj.options );
                                } ) );

                                self.smartValue.hasError( !isValid );
                            } );
                    } ).extend({ rateLimit: { timeout: 110, method: "notifyWhenChangesStop" } } ) );

                    self.smartValue.i18n = ko.observable( '' );

                    self.smartValue.placeholder = self.addDisposable( ko.computed( function () {
                        return self.medDataItemConfig().getPlaceholderForMedDataItem();
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
                                min = parseFloat( (minMax[ 0 ] || '').trim() ) || '';
                                max = parseFloat( (minMax[ 1 ] || '').trim() ) || '';
                                return Y.doccirrus.comctl.numberToLocalString( min, { intWithoutDec: true } ) + '-' + Y.doccirrus.comctl.numberToLocalString( max, { intWithoutDec: true } );
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
                                min = Y.doccirrus.comctl.stringToNumber( minMax[ 0 ] );
                                max = Y.doccirrus.comctl.stringToNumber( minMax[ 1 ] );
                                result = min + '-' + max;
                            }
                            self.sampleNormalValueText( [ result ] );
                        }
                    } );

                    self.unit.disabled = ko.observable();
                    self.addDisposable( ko.computed( function __meddataitem_unit_disabled() {
                        var
                            medDataItemTemplate = unwrap( self.medDataItemTemplate );

                        self.unit.disabled( (medDataItemTemplate) ? medDataItemTemplate.isUnitDisabled : false );
                    } ) );

                    /**
                     * Handle text value, numeric value and type changes.
                     * I.e. updates the BMI.
                     */
                    self.typeSubscription = self.type.subscribe( function() {
                        var type = peek( self.type );

                        // remap map data in forms
                        remapMedDataInForms( self.get( 'binder' ), type );
                    } );
                    self.valueSubscription = self.value.subscribe( function() {
                        var type = peek( self.type );

                        // remap map data in forms
                        remapMedDataInForms( self.get( 'binder' ), type );
                    } );
                    self.textValueSubscription = self.textValue.subscribe( function() {
                        var type = peek( self.type );

                        // remap map data in forms
                        remapMedDataInForms( self.get( 'binder' ), type );
                    } );
                    self.dateValueSubscription = self.dateValue.subscribe( function() {
                        var type = peek( self.type );

                        // remap map data in forms
                        remapMedDataInForms( self.get( 'binder' ), type );
                    } );
                    self.boolValueSubscription = self.dateValue.subscribe( function() {
                        var type = peek( self.type );

                        // remap map data in forms
                        remapMedDataInForms( self.get( 'binder' ), type );
                    } );

                    //  placeholder
                    self.miniChart = ko.observable();
                },

                recalculateFormula: function recalculateFormula () {
                    this.recalculateCounter( peek( this.recalculateCounter ) + 1 );
                },

                /**
                 * This functions ensures that all medDataItems have the additionalData elements required for this editor.
                 * @param {MedDataConfigClient} medDataConfigInput
                 * @return {MedDataItemEditorModel}
                 */
                applyMedDataConfig: function( medDataConfigInput ) {
                    var self = this,
                        medDataConfig = unwrap( medDataConfigInput ),
                        category = unwrap( self.category ),
                        additionalData = unwrap( self.additionalData ),
                        isAdditionalDataAdded = false;

                    // map column-data stored in a nested object to root-level objects using proxy functions
                    if( medDataConfig instanceof MedDataConfigClient ) {

                        // set the default category, if not selected at all
                        if( typeof category === "undefined" ) {
                            self.category( medDataConfig.defaultCategoryForNewItems || MedDataCategories.BIOMETRICS );
                        }

                        // initialize the data object
                        if( typeof additionalData !== "object" || additionalData === null ) {
                            additionalData = {};
                        }
                        // check, if the columns exists in the additionalData object
                        // => add default value, if the key is not found in additionalData
                        medDataConfig.columns.forEach( function( column ) {
                            if( column.keyRoot === "additionalData" ) {
                                if( !additionalData.hasOwnProperty( column.key ) ) {
                                    additionalData[column.key] = "";
                                    isAdditionalDataAdded = true;
                                }
                            }
                        } );

                        // store the data, if something changed
                        if( isAdditionalDataAdded ) {
                            self.additionalData( additionalData );
                        }

                        // install proxies for nested additionalData types
                        MedDataItemModel.prototype.installAdditionalDataProxies.call( self, additionalData );

                        /**
                         * For the AdditionalData values that were added to the root,
                         * and were marked as required in the defaultIngredientPlanConfig.columns,
                         * the hasError computed should be added and check for the value.
                         *
                         * Note: Needed as all the additionalData values are nested in the object
                         * so is not possible to mark them as required in the schema, as we normally do.
                         */
                        medDataConfig.columns.forEach( function( column ) {
                            var
                                key = column.key,
                                required = column.required;
                            if(
                                required &&
                                (key in additionalData) &&
                                self[key] &&
                                !self[key].hasError
                            ) {
                                self[key].hasError = ko.computed( function() {
                                    var value = unwrap( self[key] );

                                    return !value && 0 !== value;
                                } );
                            }
                        } );
                    }

                    return self;
                }
            },
            {
                schemaName: 'v_meddata.medData',
                NAME: 'MedDataItemEditorModel'
            }
        );
        KoViewModel.registerConstructor( MedDataItemEditorModel );

        /**
         * @class MedDataEditorModel
         * @constructor
         * @param {Object} config
         * @extends ActivityEditorModel
         */
        function MedDataEditorModel( config ) {
            MedDataEditorModel.superclass.constructor.call( this, config );
        }

        MedDataEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( [ 'mdValue', 'mdUnit' ] ),
                lazyAdd: false
            },
            subModelsDesc: {
                value: [
                    {
                        propName: 'medData',
                        editorName: 'MedDataItemEditorModel'
                    } ],
                lazyAdd: false
            }
        };

        Y.extend( MedDataEditorModel, SimpleActivityEditorModel, {
                /**
                 * Enables "caretPosition" for "userContent"
                 * @protected
                 * @property useUserContentCaretPosition
                 * @type {Boolean}
                 * @default true
                 */
                useUserContentCaretPosition: true,
                initializer: function MedDataEditorModel_initializer() {
                    var
                        self = this;

                    self.initMedDataEditorModel();
                },
                destructor: function MedDataEditorModel_destructor() {
                },
                customOptionsMapper: function __customOptionsMapper( item ) {
                    return {
                        id: item,
                        text: item
                    };
                },
                initMedDataEditorModel: function MedDataEditorModel_initMedDataEditorModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentActivity = peek( binder.currentActivity ),
                        currentPatient = peek( binder.currentPatient ),
                        categoryList = Y.doccirrus.schemas.v_meddata.types.medDataCategory_E.list,
                        typeListDictionary = currentActivity.getTypeListDictionary(),
                        medDataItemTemplatesByCategory = currentActivity.get( 'medDataItemTemplatesByCategory' ),
                        /**
                         * Dictionary object to store types added by the user,
                         * and which have not yet been stored in the database.
                         * @type {{CATEGORY: string[]}}
                         */
                        newCustomTypes = {},
                        ACTIVEINGREDIENTS = MedDataCategories.ACTIVEINGREDIENTS,
                        rootProperties = Object.keys( Y.doccirrus.schemas.activity.types.MedDataItem_T ),
                        caseFolder = self.get( 'caseFolder' ) || {},
                        isSwissCaseFolder = Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolder.type || 'ANY'] === "CH",
                        medDataItemTemplatesForCategory,
                        defaultValues,
                        versionKey,
                        medDataConfig = peek( currentActivity.medDataConfig );

                    /**
                     * Load the MedDataConfigSchema object, which is, by now, hard coded,
                     * but should become dynamic in the future.
                     * I.e., it should be configured in Administration->InCase->CaseFileEntries
                     */
                    switch( currentActivity.actType() ) {
                        case IngredientPlanSchema.actType():
                            // initialize some MUST have arrays for this type of activity
                            addToCategoryDictionaryObject( medDataItemTemplatesByCategory, ACTIVEINGREDIENTS );
                            break;
                    }

                    /**
                     * Add default values from current medDataConfig
                     * if the values do not exists yet in tags or have a higher planVersion.
                     * For this, check the medDataItemTemplates loaded from the tag collection
                     * in the database.
                     */
                    if( Object.prototype.hasOwnProperty.call( medDataItemTemplatesByCategory, ACTIVEINGREDIENTS ) ) {
                        medDataItemTemplatesForCategory = medDataItemTemplatesByCategory[ACTIVEINGREDIENTS];
                        defaultValues = medDataConfig.defaultValues;
                        versionKey = Y.doccirrus.schemas.v_ingredientplan.columnKeys.planVersion;

                        /**
                         * Each template has contains pre-filled additionalData for the MedDataItem.
                         * This data may have contain columns which are marked as "static" by the current
                         * MedDataConfig. These columns need to be removed, as they will be set by the
                         * plan or the user in the UI.
                         */
                        Object.values( medDataItemTemplatesForCategory ).forEach( function forEachMedDataItemTemplate( itemTemplate ) {
                            Object
                                .keys( itemTemplate.additionalData )
                                .forEach( function forEachKeyInTemplatesAdditionalData( key ) {
                                    var isDynamicColumn;

                                    // filter all dynamic columns stored in the template's additionalData
                                    if( Object.prototype.hasOwnProperty.call( itemTemplate.additionalData, key ) ) {
                                        isDynamicColumn = medDataConfig.dynamicColumns.some( function( column ) {
                                            return column.key === key;
                                        } );
                                        if( isDynamicColumn ) {
                                            delete itemTemplate.additionalData[key];
                                        }
                                    }
                                } );
                        } );

                        /**
                         * If either the plan or the custom additional data provide some default values
                         * for the MedDataItem's additionalData, store these in the return object.
                         */
                        Object
                            .keys( defaultValues )
                            .forEach( function forEachDefaultValueType( type ) {

                                var
                                    // is there a template found, created by the user in a previous process?
                                    templateForType = medDataItemTemplatesForCategory[type],

                                    // is the version of the template below the version of the current config?
                                    // (i.e. the template is too old / outdated?)
                                    isTemplateOutdated = (
                                        templateForType &&
                                        Object.prototype.hasOwnProperty.call( templateForType.additionalData, versionKey ) &&
                                        templateForType.additionalData[versionKey] < medDataConfig.version
                                    );

                                if( !templateForType || isTemplateOutdated ) {
                                    // create a new MedDataItemTemplate, if it did not exist yet
                                    if( !templateForType ) {
                                        templateForType = new MedDataItemTemplateSchema( {
                                            type: type,
                                            category: ACTIVEINGREDIENTS
                                        } );

                                        // push that item to the dictionary
                                        addToCategoryDictionaryObject( medDataItemTemplatesByCategory, ACTIVEINGREDIENTS, type, templateForType );
                                    }

                                    // look up the default values for this type and set the values
                                    if( Array.isArray( defaultValues[type] ) ) {
                                        defaultValues[type].forEach( function forEachDefaultValue( column ) {

                                            /**
                                             * Add all default values to the template's additionalData.
                                             * Ignore root-properties defined in the schema for additionalData,
                                             * and treat them differently (i.e. only add specific types there).
                                             */
                                            if( rootProperties.indexOf( column.key ) === -1 ) {
                                                // NON-ROOT PROPERTY (not defined in static schema)
                                                // => transform { key,val } => { key: val }
                                                templateForType.additionalData[column.key] = column.value;
                                            } else {
                                                // ROOT PROPERTY (defined in static schema)

                                                switch( column.key ) {
                                                    // overwrite the unit with the default value
                                                    case 'unit':
                                                        if( !templateForType.unit ) {
                                                            templateForType.unit = column.value;
                                                        }
                                                        break;

                                                    // overwrite the sampleNormalValueText with the default value
                                                    case 'sampleNormalValueText':
                                                        if( !templateForType.sampleNormalValueText ) {
                                                            templateForType.sampleNormalValueText = column.value;
                                                        }
                                                        break;
                                                }
                                            }
                                        } );
                                    }
                                }
                            } );

                        // write the updated medDataItemTemplateCollection back to the activity
                        currentActivity.set( 'medDataItemTemplatesByCategory', medDataItemTemplatesByCategory );

                        // update the type dictionary to display all the updated parameters in the UI
                        typeListDictionary = currentActivity.getTypeListDictionary();
                    }

                    /**
                     * Within the GRAVIDOGRAMM UI, a limited set of content is shown.
                     */
                    self.showUserContent = ko.computed( function __meddata_showUserContent() {
                        return ( currentActivity.actType() === 'GRAVIDOGRAMMPROCESS' );
                    } );

                    //  NOTE: copy of medData array before creating observable
                    var initialMedData = peek( self.medData ).concat( [] );

                    // ensure that the current MedDataConfig is applied correctly to all MedDataItems
                    initialMedData.forEach( function (item) {
                        item.applyMedDataConfig( medDataConfig );
                    } );

                    /**
                     * The handling of the MedDataArray needs some special
                     * treatment, to be able to manage larger data sets.
                     */
                    self.initMedDataArrayHandling( initialMedData );

                    // create the column configuration, which is separated in dynamic, and static columns

                    // preconfigured column definitions

                    const preConfiguredColumns = {

                        /**
                         * Static columns will not scroll, and will always be positioned before dynamic columns.
                         */
                        static: {

                            category: {
                                forPropertyName: 'category',
                                width: medDataConfig.getOverriddenWidth( 'category', 'auto' ),
                                inputField: {
                                    componentType: 'KoFieldSelect2',
                                    componentConfig: {
                                        useSelect2Data: true,
                                        select2Read: function __category_select2Read( value ) {
                                            if( !value ) {
                                                return value;
                                            } else {
                                                return {
                                                    id: value,
                                                    text: Y.doccirrus.schemaloader.getEnumListTranslation( 'v_meddata', 'medDataCategory_E', value, 'i18n', value )
                                                };
                                            }
                                        },
                                        select2Write: function __category_select2Write( $event, observable ) {
                                            observable( $event.val );
                                            var
                                                activeRow = unwrap( self.medDataEditableTable.activeRow ),
                                                type = unwrap( activeRow && activeRow.type ),
                                                category = $event.val,
                                                templateCollection = currentActivity.templateCollection,
                                                template = templateCollection && templateCollection.findTemplateByType( type, category );

                                            // reset the active row, if the current type
                                            // cannot be found in types within the selected category
                                            if( template ) {
                                                activeRow.unit( template.unit );
                                                activeRow.sampleNormalValueText( template.sampleNormalValueText );
                                            } else {
                                                activeRow.type( null );
                                                activeRow.unit( '' );
                                                activeRow.sampleNormalValueText( '' );
                                            }
                                        },
                                        select2Config: {
                                            query: undefined,
                                            initSelection: undefined,
                                            data: function __category_select2ConfigData() {
                                                return {
                                                    results: categoryList
                                                        .filter( function filterNonPublicCategories( value ) {
                                                            // filter out categories which are non-public
                                                            return !Object
                                                                .keys( MedDataCategoriesNonPublic )
                                                                .some( function forEachCategory( category ) {
                                                                    return value.val === MedDataCategoriesNonPublic[category];
                                                                } );
                                                        } )
                                                        .map( function mapCategories( value ) {
                                                            return {
                                                                id: value.val,
                                                                text: value.i18n
                                                            };
                                                        } )
                                                };
                                            },
                                            createSearchChoice: function __category_select2createSearchChoice( item ) {
                                                return {
                                                    id: item,
                                                    text: item
                                                };
                                            },
                                            multiple: false
                                        }
                                    }
                                },
                                renderer: function __col_category_renderer( meta ) {
                                    // render the selected category with the translated name
                                    var value = unwrap( meta.value );
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'v_meddata', 'medDataCategory_E', value, 'i18n', value );
                                }
                            },

                            type: {
                                forPropertyName: 'type',
                                wdth: medDataConfig.getOverriddenWidth( 'type', 'auto' ),
                                inputField: {
                                    componentType: 'KoFieldSelect2',
                                    componentConfig: {
                                        useSelect2Data: true,
                                        select2Read: function __type_select2Read( value ) {
                                            var
                                                activeRow = unwrap( self.medDataEditableTable.activeRow ),
                                                medDataItemTemplate = unwrap( activeRow && activeRow.medDataItemTemplate );

                                            // if the template provides a translation, return that one
                                            if( medDataItemTemplate && medDataItemTemplate.i18n ) {
                                                return {
                                                    id: value || medDataItemTemplate.type,
                                                    text: medDataItemTemplate.i18n
                                                };
                                            }

                                            // if no translation is found, fallback to the given value
                                            return (!value) ? value : {
                                                id: value,
                                                text: value
                                            };
                                        },
                                        select2Write: function __type_select2Write( $event, observable ) {
                                            var
                                                activeRow = unwrap( self.medDataEditableTable.activeRow ),
                                                category = unwrap( activeRow && activeRow.category ),
                                                title = $event.added.id.toLowerCase(),
                                                existing = typeListDictionary[category].find(function( tag ) {
                                                    return (
                                                        tag.id.toLowerCase() === title ||
                                                        tag.text.toLowerCase() === title ||
                                                        tag.i18n.toLowerCase() === title
                                                    );
                                                }),
                                                added = existing || $event.added,
                                                type = added.id,
                                                templateCollection = currentActivity.templateCollection,
                                                template = templateCollection && templateCollection.findTemplateByType( type, category ),
                                                isExistingOption = !!existing,
                                                indexInCustomOptions;


                                            // reset the active row, if the current type
                                            // cannot be found in types within the selected category
                                            if( template ) {
                                                activeRow.unit( template.unit );
                                                activeRow.sampleNormalValueText( template.sampleNormalValueText );
                                            } else {
                                                activeRow.unit( '' );
                                                activeRow.sampleNormalValueText( '' );
                                            }

                                            // create the category array, if it does not exist in the custom types
                                            if( !Array.isArray( newCustomTypes[category] ) ) {
                                                newCustomTypes[category] = [];
                                            }

                                            // add the item to newCustomOptions,
                                            // if it has not yet been added, and is not an existing option
                                            if( added && added.id === added.text ) {
                                                indexInCustomOptions = newCustomTypes[category].indexOf( added.id );

                                                if( indexInCustomOptions === -1 && !isExistingOption && !added.cchKey ) {
                                                    newCustomTypes[category].push( added.id );
                                                }
                                                if( isSwissCaseFolder ) {
                                                    activeRow.cchKey( added.cchKey );
                                                }
                                            }

                                            // remove the item from newCustomOptions, if it was previously added
                                            if( $event.removed && $event.removed.id === $event.removed.text ) {
                                                indexInCustomOptions = newCustomTypes[ category ].indexOf( $event.removed.id );
                                                if( indexInCustomOptions !== -1 ) {
                                                    newCustomTypes[ category ].splice( indexInCustomOptions, 1 );
                                                }
                                            }

                                            /**
                                             * Echo a warning message, if the patient is pregnant,
                                             * and the user wants to enter a menstruation date.
                                             */
                                            if( MedDataTypes.LAST_MENSTRUATION === type ) {
                                                if( currentPatient.isPregnant() ) {
                                                    Y.doccirrus.DCWindow.notice( {
                                                        icon: '',
                                                        message: i18n( 'InCaseMojit.MedDataEditorModel_clientJS.title.ALREADY_PREGNANT' ),
                                                        window: {
                                                            width: 'auto',
                                                            buttons: {
                                                                footer: [
                                                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                                                    {
                                                                        label: i18n( 'general.button.CONFIRM' ),
                                                                        isDefault: true,
                                                                        action: function( e ) {
                                                                            e.target.button.disable();
                                                                            this.close( e );
                                                                            observable( type );
                                                                        }
                                                                    }
                                                                ]
                                                            }
                                                        }
                                                    } );
                                                } else {
                                                    observable( type );
                                                }
                                            } else {
                                                observable( type );
                                            }
                                        },
                                        select2Config: {
                                            query: function __type_select2ConfigQuery( query ) {
                                                var activeRow = unwrap( self.medDataEditableTable.activeRow ),
                                                    category = unwrap( activeRow && activeRow.category ),
                                                    currentActivity = unwrap( binder.currentActivity ),
                                                    medDataConfig = unwrap( currentActivity.medDataConfig );

                                                if( isSwissCaseFolder && category === MedDataCategories.ALLERGIES ) {
                                                    // ONLY in Swiss case folders, search allergies dynamically
                                                    Y.doccirrus.jsonrpc.api.meddata.cdsCodesSearch( {
                                                        itemsPerPage: 10,
                                                        query: {
                                                            term: query.term || "",
                                                            cchType: "CHA"
                                                        }
                                                    } ).done( function( response ) {
                                                        var catalogResult = (response.data || []).map( function( item ) {
                                                            return {
                                                                id: item.title,
                                                                text: item.title,
                                                                cchKey: item.cchKey
                                                            };
                                                        } );

                                                        query.callback( { results: catalogResult } );
                                                    } ).fail( function() {
                                                        query.callback( {
                                                            results: []
                                                        } );
                                                    } );
                                                } else {
                                                    // inject preloaded types from inSuite
                                                    return query.callback( {
                                                        results: filterPreloadedMedDataItemTemplates()
                                                    } );
                                                }

                                                /**
                                                 * Get the preloaded types filtered by the current query.
                                                 * @return {{id: string, text: string}[]}
                                                 */
                                                function filterPreloadedMedDataItemTemplates() {
                                                    var
                                                        preloadedTypes = (Object.prototype.hasOwnProperty.call( typeListDictionary, category )) ? typeListDictionary[category] : [],
                                                        customTypes = (Object.prototype.hasOwnProperty.call( newCustomTypes, category )) ? newCustomTypes[category] : [],
                                                        results = preloadedTypes
                                                            // also add the custom options, using the custom mapper
                                                            .concat( customTypes.map( self.customOptionsMapper ) )
                                                            .concat( (medDataConfig && medDataConfig.defaultValues && Object.keys( medDataConfig.defaultValues ) || [])
                                                                .map( function forEachDefaultValue( defaultValue ) {
                                                                    return {
                                                                        id: defaultValue,
                                                                        text: defaultValue
                                                                    };
                                                                } )
                                                            )
                                                            .filter( function filterItems( value ) {
                                                                var term = (query.term || "").toLowerCase();

                                                                // search in the field for the given value
                                                                return (value.i18n || value.text).toLowerCase().indexOf( term ) !== -1;
                                                            } )
                                                            .map( function mapToSelect2( value ) {
                                                                return {
                                                                    id: value.id || value.val,
                                                                    text: value.i18n || value.text
                                                                };
                                                            } );

                                                    return results;
                                                }

                                            },
                                            initSelection: undefined,
                                            data: {results: []},
                                            createSearchChoice: function __type_select2createSearchChoice( item ) {
                                                return {
                                                    id: item,
                                                    text: item
                                                };
                                            },
                                            multiple: false
                                        }
                                    }
                                },
                                renderer: function __col_type_renderer( meta ) {
                                    var
                                        value = unwrap( meta.value ),
                                        medDataItemTemplate = unwrap( meta.row.medDataItemTemplate );

                                    // if the template provides a translation, return that one
                                    if( medDataItemTemplate && medDataItemTemplate.i18n ) {
                                        return medDataItemTemplate.i18n;
                                    }

                                    // if no translation is found, fallback to the given value
                                    return value;
                                }
                            },

                            sampleNormalValueText: {
                                forPropertyName: 'displaySampleNormalValueText',
                                width: medDataConfig.getOverriddenWidth( 'sampleNormalValueText', 'auto' ),
                                label: medDataConfig.getOverriddenLabel( 'sampleNormalValueText', i18n( 'activity-schema.MedData_T.sampleNormalValueText.i18n' ) ),
                                title: medDataConfig.getOverriddenTitle( 'sampleNormalValueText', i18n( 'activity-schema.MedData_T.sampleNormalValueText.i18n' ) ),
                                visible: !self.showUserContent() //  not shown by default for GRAVIDOGRAMMPROCESS
                            }

                        },

                        /**
                         * Dynamic columns will scroll, and will always be positioned AFTER static columns.
                         */
                        dynamic: {
                            smartValue: {
                                forPropertyName: 'smartValue',
                                width: medDataConfig.getOverriddenWidth( 'smartValue', 'auto' ),
                                label: medDataConfig.getOverriddenLabel( 'smartValue', i18n( 'activity-schema.MedData_T.value.i18n' ) ),
                                title: medDataConfig.getOverriddenTitle( 'smartValue', i18n( 'activity-schema.MedData_T.value.i18n' ) ),
                                visible: true,
                                getComponentForCell: function __col_smartValue_getComponentForCell( meta ) {
                                    var medDataItemConfig = peek( meta.row.medDataItemConfig );
                                    if( medDataItemConfig instanceof MedDataItemConfigSchema ) {
                                        return medDataItemConfig.getSmartValueComponentOptions();
                                    }
                                    return undefined;
                                },
                                renderer: function ( meta ) {
                                    var
                                        row = meta.row,
                                        value = unwrap( meta.value ),
                                        dataType = unwrap( row.dataType ),
                                        validationMessages = unwrap( row.smartValue.validationMessages ),
                                        formulaErrorMessages = unwrap( row.formulaErrorMessages ),
                                        formattedValue = row.medDataItemConfig().formatMedDataItem( row.get('dataModelParent').toJSON() ),
                                        rendererItems = [];

                                    // Listen to changes in following properties
                                    unwrap( row.value );
                                    unwrap( row.textValue );
                                    unwrap( row.dateValue );
                                    unwrap( row.boolValue );

                                    switch ( dataType ) {
                                        case MedDataItemDataTypes.STRING_OR_NUMBER:
                                        case MedDataItemDataTypes.NUMBER_INT:
                                        case MedDataItemDataTypes.NUMBER_TIMEDIFF:
                                        case MedDataItemDataTypes.NUMBER_FLOAT:
                                        case MedDataItemDataTypes.NUMBER_FORMULA:
                                            if ( dataType === MedDataItemDataTypes.NUMBER_FORMULA ) {
                                                rendererItems.push(  '<i class="formula-value fa fa-calculator" />' );

                                                if ( peek( row.medDataItemConfig ).manualCalculation ) {
                                                    rendererItems.push(  '<button class="recalculate-formula-btn"><i style="cursor: pointer;" class="fa fa-refresh" /></button>' );
                                                }

                                                if (
                                                    formulaErrorMessages.length ||
                                                    validationMessages.length
                                                ) {
                                                    rendererItems.push( [
                                                        '<i class="fa fa-ban text-danger validation-failed-icon"',
                                                        'title="',
                                                        validationMessages.join('\n\n'),
                                                        validationMessages.length === 1 && formulaErrorMessages.length ? '\n\n' : '',
                                                        formulaErrorMessages.join('\n\n'),
                                                        '" />'
                                                    ].join('') ) ;
                                                }
                                            }

                                            rendererItems.push( [
                                                '<span title="',
                                                i18n( 'InCaseMojit.MedDataEditorModel_clientJS.UNFORMATTED_VALUE', { data: { VALUE: value } } ),
                                                '">',
                                                formattedValue,
                                                '</span>'
                                            ].join( "" ) );

                                            break;
                                        default:
                                            rendererItems.push( formattedValue );
                                            break;

                                    }

                                    return rendererItems.join('');
                                },
                                onCellClick: function( meta ) {
                                    var
                                        row = meta.row,
                                        currentActivity = unwrap( binder.currentActivity ),
                                        dataType = unwrap( row.dataType ),
                                        status = unwrap( currentActivity.status ),
                                        editableStates = ['CREATED', 'VALID'],
                                        isEditable = (-1 < editableStates.indexOf( status )),
                                        dueDateItemIndex, dueDateValue, weekAndDayOfPregnancyItemIndex,
                                        weekAndDayOfPregnancyTextValue, maternityLeaveDateValue,
                                        maternityLeaveDateIndex,
                                        dayOfLastMenorrhoeaIndex, dayOfLastMenorrhoeaDateValue,
                                        medData = currentActivity && currentActivity.medData() && currentActivity.medData().map( function( item ) {
                                            return item.toJSON();
                                        } ),
                                        type = peek( row.type ),
                                        isPregnancyRelevantType = [
                                                                      MedDataTypes.LAST_MENSTRUATION_P,
                                                                      MedDataTypes.WEEK_AND_DAY_CORRECTION,
                                                                      MedDataTypes.DUE_DATE
                                                                  ].indexOf( type ) !== -1;

                                    if ( meta.isButton && isEditable && dataType === MedDataItemDataTypes.NUMBER_FORMULA ) {
                                        row.recalculateFormula();
                                    }

                                    function findMedDataItem( type ) {
                                        return medData.find( function( item ) {
                                            return type === item.type;
                                        } );
                                    }

                                    function findMedDataItemIndex( type ) {
                                        return medData.findIndex( function( item ) {
                                            return type === item.type;
                                        } );
                                    }

                                    if( isEditable && isPregnancyRelevantType ) {
                                        Y.doccirrus.modals.gestationDataModal.show( {
                                            binder: binder,
                                            dueDate: findMedDataItem( MedDataTypes.DUE_DATE ),
                                            dayOfLastMenorrhoea: findMedDataItem( MedDataTypes.LAST_MENSTRUATION_P ),
                                            weekAndDayOfPregnancy: findMedDataItem( MedDataTypes.WEEK_AND_DAY_CORRECTION )
                                        } ).then( function( data ) {
                                            if( !data ) {
                                                return null;
                                            }
                                            if( data.dueDate ) {
                                                dueDateItemIndex = findMedDataItemIndex( MedDataTypes.DUE_DATE );
                                                dueDateValue = moment( data.dueDate ).toDate();
                                                maternityLeaveDateIndex = findMedDataItemIndex( MedDataTypes.MATERNITY_LEAVE_DATE );
                                                maternityLeaveDateValue = moment( data.dueDate ).subtract( 6, 'weeks' ).toDate();

                                                if( -1 < dueDateItemIndex ) {
                                                    currentActivity.medData()[dueDateItemIndex].dateValue( dueDateValue );
                                                } else {
                                                    currentActivity.addMedDataItem( new MedDataItemSchema( {
                                                        category: MedDataCategories.BIOMETRICS,
                                                        dateValue: dueDateValue,
                                                        type: MedDataTypes.DUE_DATE
                                                    } ) );
                                                }
                                                if( -1 < maternityLeaveDateIndex ) {
                                                    currentActivity.medData()[maternityLeaveDateIndex].dateValue( maternityLeaveDateValue );
                                                } else {
                                                    currentActivity.addMedDataItem( new MedDataItemSchema( {
                                                        category: MedDataCategories.BIOMETRICS,
                                                        dateValue: maternityLeaveDateValue,
                                                        type: MedDataTypes.MATERNITY_LEAVE_DATE
                                                    } ) );
                                                }

                                            }
                                            weekAndDayOfPregnancyItemIndex = findMedDataItemIndex( MedDataTypes.WEEK_AND_DAY_CORRECTION );
                                            weekAndDayOfPregnancyTextValue = (data.weekOfPregnancy || 0) + '/' + (data.dayOfPregnancy || 0);
                                            if( -1 < weekAndDayOfPregnancyItemIndex ) {
                                                currentActivity.medData()[weekAndDayOfPregnancyItemIndex].textValue( weekAndDayOfPregnancyTextValue );
                                            } else {
                                                currentActivity.addMedDataItem( new MedDataItemSchema( {
                                                    category: MedDataCategories.BIOMETRICS,
                                                    textValue: weekAndDayOfPregnancyTextValue,
                                                    type: MedDataTypes.WEEK_AND_DAY_CORRECTION
                                                } ) );
                                            }

                                            dayOfLastMenorrhoeaIndex = findMedDataItemIndex( MedDataTypes.LAST_MENSTRUATION_P );
                                            dayOfLastMenorrhoeaDateValue = moment( data.dayOfLastMenorrhoea ).toDate();
                                            if( -1 < dayOfLastMenorrhoeaIndex ) {
                                                currentActivity.medData()[dayOfLastMenorrhoeaIndex].dateValue( dayOfLastMenorrhoeaDateValue );
                                            } else {
                                                currentActivity.addMedDataItem( new MedDataItemSchema( {
                                                    category: MedDataCategories.BIOMETRICS,
                                                    dateValue: dayOfLastMenorrhoeaDateValue,
                                                    type: MedDataTypes.LAST_MENSTRUATION_P
                                                } ) );
                                            }
                                        } );
                                    }
                                    return false;
                                }
                            },

                            miniChart: {
                                forPropertyName: 'miniChart',
                                width: medDataConfig.getOverriddenWidth( 'miniChart', 'auto' ),
                                label: i18n( 'activity-schema.MedData_T.miniChart.i18n' ),
                                title: i18n( 'activity-schema.MedData_T.miniChart.i18n' ),
                                visible: !self.showUserContent(), //  not shown by default for GRAVIDOGRAMMPROCESS
                                renderer: function( meta ) {
                                    var
                                        value = unwrap( meta.row.value ),
                                        doseRange = unwrap( meta.row.sampleNormalValueText ) || '',
                                        minMax = Array.isArray( doseRange ) && doseRange[0] ? doseRange[0].split( '-' ) : [],
                                        isOutsideRange,
                                        miniChart;

                                    //  if we have a min, max and value then make the chart
                                    //  otherwise just show the value
                                    if ( 2 === minMax.length ) {

                                        value = parseFloat( value );
                                        minMax[0] = parseFloat( minMax[0] );
                                        minMax[1] = parseFloat( minMax[1] );

                                        if ( !isNaN( minMax[0] ) && !isNaN( minMax[1] ) && !isNaN( value ) ) {
                                            isOutsideRange = ( ( value < minMax[0] ) || ( value > minMax[1] ) );
                                            miniChart = {
                                                labResultDisplay: 'minmaxval',
                                                labTestResultVal: value,
                                                labMin: minMax[0],
                                                labMax: minMax[1],
                                                isPathological: isOutsideRange
                                            };
                                            return Y.doccirrus.labdata.utils.makeFindingValueCellLdt2( miniChart, true, false, true );
                                        }
                                    }

                                    return value;
                                }
                            },

                            unit: {
                                forPropertyName: 'unit',
                                width: medDataConfig.getOverriddenWidth( 'unit', 'auto' ),
                                visible: !self.showUserContent(), //  not shown by default for GRAVIDOGRAMMPROCESS
                                getComponentForCell: function __col_unit_getComponentForCell( meta ) {
                                    var medDataItemTemplate = peek( meta.row.medDataItemTemplate );

                                    // display a unit selection box, if units have been predefined
                                    if( medDataItemTemplate && Array.isArray( medDataItemTemplate.unitEnumCollection ) ) {
                                        return {
                                            componentType: 'KoFieldSelect2',
                                            componentConfig: {
                                                options: medDataItemTemplate.unitEnumCollection,
                                                optionsText: 'text',
                                                optionsValue: 'id',
                                                select2Config: {
                                                    multiple: false
                                                }
                                            }
                                        };
                                    } else {
                                        return '';
                                    }
                                }
                            },

                            deleteButton: {
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
                                        disabled: ko.computed( function __col_deleteButton_disabled() {
                                            return unwrap( currentActivity._isModelReadOnly );
                                        } ),
                                        click: function __col_deleteButton_click( button, $event, $context ) {
                                            var
                                                rowModel = $context.$parent.row;
                                            self.removeMedDataItem( rowModel );
                                        }
                                    }
                                }
                            }
                        }
                    };

                    self.columnConfig = ko.computed(function __columnConfig() {
                        var
                            binder = self.get( 'binder' ),
                            currentActivity = unwrap( binder.currentActivity ),
                            config = unwrap( currentActivity.medDataConfig );

                        /**
                         * order configured columns according to the given config
                         * 1) static columns,
                         * 2) dynamic columns,
                         * for both, the order as configured
                         */
                        var columnConfigStatic = [],
                            columnConfigDynamic = [];

                        /**
                         * Add columns, if they appear within the config, and divide them into
                         * static columns, which ALWAYS appear in front of dynamic columns.
                         */

                        config.columnOrder.forEach( function( columnName ) {
                            // check, if this is a pre-configured column
                            if (preConfiguredColumns.static.hasOwnProperty(columnName)) {
                                columnConfigStatic.push(preConfiguredColumns.static[columnName]);
                            }
                            else if (preConfiguredColumns.dynamic.hasOwnProperty(columnName)) {
                                columnConfigDynamic.push(preConfiguredColumns.dynamic[columnName]);
                            }
                            else {
                                config.columns.forEach( function( medDataColumn ) {
                                    if( medDataColumn instanceof MedDataColumnClient ) {
                                        if( !medDataColumn.excluded && medDataColumn.key === columnName ) {
                                            if( medDataColumn.static ) {
                                                columnConfigStatic.push( medDataColumn.toKoEditableTableColumnOptions() );
                                            } else {
                                                columnConfigDynamic.push( medDataColumn.toKoEditableTableColumnOptions() );
                                            }
                                        }
                                    }
                                } );
                            }
                        } );

                        // finally, add all configs to the config array
                        return columnConfigStatic.concat(columnConfigDynamic);
                    });

                    // initialize the editable MedDataTable
                    self.medDataEditableTable = KoComponentManager.createComponent( {
                        componentType: 'KoEditableTable',
                        stateId: 'medDataEditorModel-' + ( self.showUserContent() ? 'medData' : 'gravidogramm' ) + 'EditableTable' + medDataConfig.subType,
                        componentConfig: {
                            ViewModel: MedDataItemEditorModel,
                            data: self.medDataArr,
                            columns: self.columnConfig,
                            isAddRowButtonDisabled: function __isAddRowButtonDisabled(){
                                return unwrap( currentActivity._isModelReadOnly );
                            },
                            onAddButtonClick: function() {
                                self.addMedDataItem();
                                return false;
                            }
                        }
                    } );

                    self.medDataEditableTable.rendered.subscribe( function __meddatatable_subscribe_render( val ) {
                        if( true === val ) {
                            KoEditableTable.tableNavigation( document.querySelector( '#medDataEditableTable' ) );
                        }
                    } );

                },

                /**
                 * Whenever changes are made to the medDataArr displayed in the table,
                 * i.e. rows added or deleted, these changes have to be played back
                 * to the underlying model. This is easily done by a subscription,
                 * and works well for small changes and a small dataset.
                 * However, when disposing the whole table with a large dataset
                 * i.e. by pressing the back-button in the UI, then each line
                 * is destroyed one-by-one. This implies that all the computed values
                 * are recalculated after each line. Result: high CPU and memory usage.
                 *
                 * Hence, we collect all changes to the data in an array, and
                 * start to apply the changes to the model all at once, after a short timeout.
                 * This is implemented below.
                 *
                 * @param {Array} initialMedData
                 * @return {this}
                 */
                initMedDataArrayHandling: function MedDataEditorModel_initMedDataArrayHandling( initialMedData ) {
                    var self = this;

                    /**
                     * create an observable with the
                     * initial medData array as initial values
                     */
                    self.medDataArr = ko.observableArray( initialMedData );

                    var
                        medDataChangedTimeout = null,
                        medDataChanges = [],
                        updateMedDataArray = function updateMedDataArray() {
                            /**
                             * Here, speed issues may arise, when adding or removing plenty of rows.
                             * This happens, i.e. when saving the activity, which reloads the whole data set.
                             * With 90+ rows, the browser almost freezes when updating everything
                             * after each row. Therefore, we manually mutate the groups, once all changes have been applied.
                             */
                            var items, i, l, change;
                            if( medDataChanges.length > 0 ) {
                                // get the latest values
                                items = peek( self.medDataArr );

                                // stop listener-updates
                                self.medDataArr.valueWillMutate();

                                // first remove all items
                                for( i = 0, l = medDataChanges.length; i < l; i++ ) {
                                    change = medDataChanges[i];
                                    if( change.status === 'deleted' ) {
                                        ko.utils.arrayRemoveItem( items, change.value );
                                    } else {
                                        items.push( change.value );
                                    }
                                }

                                // reset the change cache
                                medDataChanges = [];

                                // inform all listeners that the array has changed
                                self.medDataArr.valueHasMutated();
                            }

                            // reset the change timeout
                            medDataChangedTimeout = null;
                        };

                    /**
                     * On each reported change, collect the change in the temporary storage,
                     * and fire a timeout, which will push the changes back to the model all at once.
                     * If more than one change appears in a short time, this will protect against
                     * continuous recalculation.
                     */
                    self.addDisposable( self.medData.subscribe( function( changes ) {
                        changes.forEach( function( item ) {
                            medDataChanges.push( item );
                        } );

                        // reset timeout
                        if( medDataChangedTimeout ) {
                            clearTimeout( medDataChangedTimeout );
                        }
                        medDataChangedTimeout = setTimeout( updateMedDataArray, 100 );
                    }, null, 'arrayChange' ) );

                    return self;
                },

                addMedDataItem: function __addMedDataItem( data ) {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );
                    currentActivity.addMedDataItem( data );
                },
                removeMedDataItem: function __removeMedDataItem( data ) {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );
                    currentActivity.removeMedDataItem( data.get( 'dataModelParent' ) );
                }
            }, {
                NAME: 'MedDataEditorModel'
            }
        );
        KoViewModel.registerConstructor( MedDataEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'dccommonutils',
            'KoViewModel',
            'SimpleActivityEditorModel',
            'DcGestationDataModal',
            'SubEditorModel',
            'MedDataModel',
            'activity-schema',
            'meddata-api',
            'v_meddata-schema',
            'tag-schema',
            'v_ingredientplan-schema',
            'dcforms-schema-AMTSFormMapper-T'
        ]
    }
);
