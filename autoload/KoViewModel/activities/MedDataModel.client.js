/**
 * User: pi
 * Date: 20/12/16  17:05
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'MedDataModel', function( Y ) {
        /**
         * @module MedDataModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,

            // linker functions to other modules
            medDataCategories = Y.doccirrus.schemas.v_meddata.medDataCategories,
            MedDataConfigClient = Y.doccirrus.api.meddata.MedDataConfigClient,

            // class linkers, will become ES6 imports later on
            MedDataItemTemplateCollection = Y.doccirrus.schemas.tag.MedDataItemTemplateCollection,
            IngredientStrengthSchema = Y.doccirrus.schemas.v_ingredientplan.IngredientStrengthSchema,
            ActiveIngredientForIngredientPlanSchema = Y.doccirrus.schemas.v_ingredientplan.ActiveIngredientForIngredientPlanSchema,
            IngredientPlanSchema = Y.doccirrus.schemas.v_ingredientplan.IngredientPlanSchema,
            defaultIngredientPlanConfig = Y.doccirrus.schemas.v_ingredientplan.defaultIngredientPlanConfig,
            medDataItemDataTypes = Y.doccirrus.schemas.v_meddata.medDataItemDataTypes,
            MedDataItemConfigSchema = Y.doccirrus.schemas.v_meddata.MedDataItemConfigSchema;

        /**
         * @class MedDataItemModel
         * @constructor
         * @param {Object} config
         * @extends KoViewModel
         */
        function MedDataItemModel( config ) {
            MedDataItemModel.superclass.constructor.call( this, config );
        }

        MedDataItemModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };
        Y.extend( MedDataItemModel, KoViewModel.getBase(), {

                initializer: function MedDataItemModel_initializer() {
                    var
                        self = this;

                    self.initMedDataItemModel();
                },
                destructor: function MedDataItemModel_destructor() {
                },
                initMedDataItemModel: function MedDataItemModel_initMedDataItemModel() {
                    var
                        self = this;

                    self.addDisposable( ko.computed( function () {
                        // install additionalData access proxies (flattens the object to the root)
                        self.installAdditionalDataProxies();
                    }));

                    self.addDisposable( ko.computed( function() {
                        var
                            parent = self.get( 'parent' ),
                            inTransition = peek( parent.inTransition ),
                            type = unwrap( self.type ),
                            additionalData = peek( self.additionalData ),
                            medDataConfig = unwrap( parent && parent.medDataConfig ),
                            medDataItemTemplateCollection = new MedDataItemTemplateCollection( {
                                medDataItemTemplatesByCategory: parent.get( 'medDataItemTemplatesByCategory' )
                            } ),
                            medDataItemTemplate,
                            additionalDataToBeSet;

                        if ( inTransition ) {
                            return;
                        }

                        // try to find the MedDataItemTemplate
                        medDataItemTemplate = medDataItemTemplateCollection.findTemplateByType( type );

                        // set the unit from MedDataItemTemplate
                        if( medDataItemTemplate && medDataItemTemplate.unit ) {
                            self.unit( medDataItemTemplate.unit );
                        }

                        // set the sample normal value tags
                        if( medDataItemTemplate && medDataItemTemplate.sampleNormalValueText ) {
                            self.sampleNormalValueText( medDataItemTemplate.sampleNormalValueText );
                        }

                        // add existing additional data from the Tag_T to the MedDataItem
                        if( medDataItemTemplate &&
                            medDataItemTemplate.additionalData &&
                            Object.keys( medDataItemTemplate.additionalData ).length > 0 &&
                            medDataConfig
                        ) {
                            additionalDataToBeSet = Object.assign( {}, additionalData );

                            Object
                                .keys( medDataItemTemplate.additionalData )
                                .forEach( function( key ) {
                                    var isDynamicColumn = medDataConfig.dynamicColumns.some(
                                        /**
                                         * @param {MedDataColumnClient} column
                                         * @return {boolean}
                                         */
                                        function( column ) {
                                            return column.key === key;
                                        } );
                                    /**
                                     * prevent additional data from being overridden,
                                     * if it belongs to a dynamic column that is individual for each entry
                                     */
                                    if( !isDynamicColumn ) {
                                        additionalDataToBeSet[key] = medDataItemTemplate.additionalData[key];
                                    }
                                } );

                            self.additionalData( additionalDataToBeSet );
                        }

                    } ) );

                    // activate automatic re-calculation of the numeric value, if it was calculated by a additionalData
                    self.addDisposable( ko.computed( function() {
                        var
                            isInitialContext = ko.computedContext.isInitial(),
                            valuesChanged = self.calculateValueFromAdditionalData(),
                            value = unwrap( self.value ),
                            textValue = unwrap( self.textValue );

                        // if the values have not been set yet, apply the defaults
                        if( !valuesChanged && !isInitialContext ) {
                            if( typeof value === "undefined" ) {
                                self.value( self.get( 'defaults.value' ) );
                            }
                            if( typeof textValue === "undefined" ) {
                                self.textValue( self.get( 'defaults.textValue' ) );
                            }
                        }

                        // self.textValue.validate();
                        // self.value.validate();
                    }) );

                    self.onChange = null;

                    //  additionalData (ingredientplan fields) must be remapped into form on change
                    self.listenAdditionalData = self.additionalData.subscribe( function( /* newVal */ ) {
                        if ( self.onChange ) {
                            self.onChange();
                        }
                    } );

                    self.dataType = ko.observable( null );

                    self.medDataItemTemplate = ko.computed( function () {
                        var
                            binder = self.get('parent').get('binder'),
                            currentActivity = unwrap( binder.currentActivity ),
                            type = unwrap( self.type ),
                            templateCollection = (currentActivity && currentActivity.templateCollection) ? currentActivity.templateCollection : new MedDataItemTemplateCollection( {} );

                        return templateCollection.findTemplateByType( type );
                    } );

                    self.medDataItemConfig = ko.computed( function () {
                        var
                            binder = self.get('parent').get('binder'),
                            currentActivity = unwrap( binder.currentActivity ),
                            activityDate = currentActivity ? unwrap( currentActivity.timestamp ) : new Date().toISOString(),
                            medDataConfig = unwrap( currentActivity && currentActivity.medDataConfig ),
                            templateCollection = currentActivity ? currentActivity.templateCollection : new MedDataItemTemplateCollection( {} );

                        // Listen to changes in following properties
                        unwrap( self.category );
                        unwrap( self.type );
                        unwrap( self.unit );

                        // If the activity completely loaded, there should be a templateCollection available.
                        // This, however, may not be the case in other circumstances (i.e. while switching activities).
                        // In this case, be fall back to the default config.
                        if( templateCollection ) {
                            return templateCollection.getMedDataItemConfigSchemaForMedDataItem( {
                                medDataItem: self.toJSON(),
                                timestamp: activityDate,
                                fallback: medDataConfig && medDataConfig.defaultItemConfig || MedDataItemConfigSchema.getDefaultConfig()
                            } );
                        }
                        return MedDataItemConfigSchema.getDefaultConfig();
                    } );

                    self.addDisposable( ko.computed( function () {
                        self.dataType( unwrap( self.medDataItemConfig ).dataType ) ;
                    } ) );

                    self.smartValue = ko.computed( {
                        read: function () {
                            // Listen to changes in following properties
                            unwrap( self.dataType );
                            unwrap( self.value );
                            unwrap( self.textValue );
                            unwrap( self.dateValue );
                            unwrap( self.boolValue );

                            return self.medDataItemConfig().readMedDataItem( self.toJSON() );
                        },
                        write: function( value ) {
                            self.medDataItemConfig().writeMedDataItem( self, value );
                        }
                    } );

                    self.smartValue.readOnly = ko.computed( function() {
                        var
                            readOnlyDataTypes = [
                                medDataItemDataTypes.NUMBER_FORMULA,
                                medDataItemDataTypes.ANY
                            ],
                            medDataItemTemplate = unwrap( self.medDataItemTemplate );

                        if( medDataItemTemplate ) {
                            return (
                                readOnlyDataTypes.indexOf( unwrap( self.dataType ) ) !== -1 ||
                                medDataItemTemplate.isReadOnly
                            );
                        }
                        return false;
                    } );

                    // Todo: define dynamic disabled computed
                    self.smartValue.disabled = ko.computed( function () {
                        return false;
                    });

                    self.smartValue.validationMessages =  ko.observable( [] );

                    self.smartValue.hasError = ko.observable( false );

                    /**
                     * Override the KoViewModel isValid to check for error
                     * in the dynamic validation of the smartValue
                     */
                    self.isValid = ko.computed( function () {
                        return unwrap( self._isValid ) && !unwrap( self.smartValue.hasError );
                    } );
                },
                installAdditionalDataProxies: function( additionalData ) {
                    var self = this;

                    // take the data handed over, or use the one currently stored in the current model
                    if( typeof additionalData !== "object" || additionalData === null ) {
                        additionalData = unwrap( self.additionalData );
                    }

                    // map data stored in the nested object "additionalData" to root-level keys using proxy functions
                    if( typeof additionalData === "object" && additionalData !== null ) {
                        Object.keys( additionalData ).forEach( function( key ) {
                            // just add a proxy-function once
                            if( typeof self[key] === "undefined" ) {
                                self[key] = ko.pureComputed( {
                                        read: function() {
                                            var additionalData = unwrap( self.additionalData );
                                            return additionalData[key];
                                        },
                                        write: function( value ) {
                                            var additionalData = unwrap( self.additionalData );
                                            additionalData[key] = value;
                                            self.additionalData( additionalData );
                                        }
                                    }
                                );
                            }
                        } );
                    }
                },
                /**
                 * Changes the value and textValue based on calculations from data stored in other columns.
                 * Returns false by default, if the values have not been changed.
                 * Returns true, if the values have been changed by this function.
                 * @return {boolean}
                 */
                calculateValueFromAdditionalData: function() {
                    var
                        self = this,
                        category = unwrap( self.category ),
                        unit = unwrap( self.unit ),
                        additionalData = unwrap( self.additionalData ),
                        parent = self.get( 'parent' ),
                        medDataConfig = unwrap( parent && parent.medDataConfig ),
                        columns,
                        ingredient;

                    // ToDo: outsource the whole calculation function into the MedDataConfig definition
                    //  => i.e. this block moves into the MedDataConfig schema and becomes dynamic
                    if( medDataConfig && category === medDataCategories.ACTIVEINGREDIENTS ) {
                        columns = defaultIngredientPlanConfig.columns;

                        if( typeof additionalData === "object" && additionalData !== null &&
                            additionalData.hasOwnProperty( columns.dosis.key ) &&
                            additionalData.hasOwnProperty( columns.strength.key ) ) {

                            ingredient = new ActiveIngredientForIngredientPlanSchema( {
                                dosis: additionalData[columns.dosis.key],
                                strength: new IngredientStrengthSchema( additionalData[columns.strength.key], unit )
                            } );

                            self.textValue( ingredient.textValue );
                            self.value( ingredient.strength.totalValue );
                            return true;
                        }
                    }
                    return false;
                }
            },
            {
                schemaName: 'v_meddata.medData',
                NAME: 'MedDataItemModel'
            }
        );
        KoViewModel.registerConstructor( MedDataItemModel );

        /**
         * @class MedDataModel
         * @constructor
         * @param {Object} config
         * @extends SimpleActivityModel
         */
        function MedDataModel( config ) {
            MedDataModel.superclass.constructor.call( this, config );
        }

        Y.extend( MedDataModel, KoViewModel.getConstructor( 'FormBasedActivityModel' ), {

                initializer: function MedDataModel_initializer() {
                    var
                        self = this;
                    self.initMedDataModel();
                },
                destructor: function MedDataModel_destructor() {
                },
                initMedDataModel: function MedDataModel_initMedDataModel() {
                    var
                        self = this,
                        medDataConfig = new MedDataConfigClient( {} );

                    /**
                     * As medData item data values are not validated from the schema anymore,
                     * (only the type is required, not any value)
                     * but based on the dynamic validation carried on in the smartValue,
                     * we need to override the isValid computed to check
                     * for each isValid (also overridden to check for the smartValue) computed in each medDataItem
                     */
                    self.isValid = ko.computed( function () {
                        var isSomeMedDataInValid = unwrap( self.medData ).some( function (item) {
                            return !unwrap( item.isValid );
                        });

                        return unwrap( self._isValid ) && !isSomeMedDataInValid;
                    } );

                    /**
                     * As medData items data values are not validated from the schema anymore,
                     * (only the type is required, not any value)
                     * but based on the dynamic validation carried on in the smartValue,
                     * we need to setup an isCreatable computed to check
                     * that each item has at least a medDataItem.type defined,
                     * before being able to store the activity in the state CREATED.
                     * This must be done, because if a type is not set on any item, the whole MedData activity model
                     * is invalid, which would allow to save the activity in the state CREATED.
                     * However, the database schema requires a type to be set => error while storing the activity
                     * in the database.
                     */
                    self.isCreatable = ko.computed( function() {
                        var
                            isValid = unwrap( self.isValid ),
                            hasInvalidType = unwrap( self.medData ).some( function( item ) {
                                return !unwrap( item.type );
                            } );

                        return isValid || !hasInvalidType;
                    } );

                    //  If this is a new GRAVIDOGRAMM-PROCESS / Untersuchung model then we must prefill the pregnancy
                    //  checkup rows

                    /**
                     * Load the MedDataConfigSchema object, which is, by now, hard coded,
                     * but should become dynamic in the future.
                     * I.e., it should be configured in Administration->InCase->CaseFileEntries
                     */
                    switch( self.actType() ) {
                        case IngredientPlanSchema.actType():
                            medDataConfig = new MedDataConfigClient( IngredientPlanSchema.getMedDataConfigObject() );
                            break;
                    }

                    self.templateCollection = new MedDataItemTemplateCollection( {
                        medDataItemTemplatesByCategory: self.get( 'medDataItemTemplatesByCategory' )
                    } );

                    self.medDataConfig = ko.observable( medDataConfig );

                    //  a single observable to subscribe to additional data of all meddata items, use to remap form on change
                    self.changeCounter = ko.observable( 0 );
                    self.changeCounter.extend( { rateLimit: { timeout: 500, method: "notifyWhenChangesStop" } } );
                    self.setMedDataChangeListener();
                },

                /**
                 *  Listen for changes to meddata items additionalData, to remap form on change
                 */

                setMedDataChangeListener: function() {
                    var
                        self = this,
                        medDataItems = self.medData(),
                        i;

                    for ( i = 0; i < medDataItems.length; i++ ) {
                        medDataItems[i].onChange = function() { self.onAdditionalDataChange(); };
                    }
                },

                onAdditionalDataChange: function() {
                    var self = this;
                    self.changeCounter( self.changeCounter() + 1 );
                },

                addMedDataItem: function( data ) {
                    var self = this;
                    self.medData.push( data || {} );
                    self.setMedDataChangeListener();
                },
                removeMedDataItem: function( data ) {
                    var self = this;
                    self.medData.remove( data );
                },
                getTypeListDictionary: function() {
                    var
                        caseFolder = this.get( 'caseFolder' ),
                        caseFolderType = caseFolder && caseFolder.type || undefined,
                        medDataItemTemplateCollection = new MedDataItemTemplateCollection( {
                            medDataItemTemplatesByCategory: this.get( 'medDataItemTemplatesByCategory' )
                        } );

                    return medDataItemTemplateCollection.getMedDataTypeListByCategoryForSelect2( {
                        justForCaseFolderType: caseFolderType,
                        justForCountryMode: Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolderType || 'ANY']
                    } );
                },
                /**
                 *  When the form is changed, values in the activity may need to be updated
                 *
                 *  @param  {Object}    template    Form template (current activiy's form)
                 *  @param  {Object}    element     Form element which has changed
                 *  @private
                 */
                _writeBack: function( template, element ) {
                    // call AMTS medDataWriteBack
                    Y.dcforms.schema.AMTSFormMapper_T.medDataWriteBack.call(this, template, element);
                }
            },
            {
                schemaName: 'v_meddata',
                NAME: 'MedDataModel',
                ATTRS: {
                    validatable: {
                        value: true,
                        lazyAdd: false
                    },
                    medDataItemTemplatesByCategory: {
                        value: {},
                        lazyAdd: false
                    }
                }
            }
        );
        KoViewModel.registerConstructor( MedDataModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'tag-schema',
            'v_meddata-schema',
            'v_ingredientplan-schema',
            'meddata-api',
            'activity-schema',
            'dcforms-schema-AMTSFormMapper-T'
        ]
    }
);