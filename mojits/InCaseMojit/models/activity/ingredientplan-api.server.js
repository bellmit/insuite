/**
 * User: rrrw
 * Date: 29/01/2016  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'ingredientplan-api', function( Y, NAME ) {


        const
            {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils,
            util = require( 'util' ),

            // class linkers, will become ES6 imports later on
            TagTypes = Y.doccirrus.schemas.tag.tagTypes,
            MedDataCategories = Y.doccirrus.schemas.v_meddata.medDataCategories,
            MedDataConfigSchema = Y.doccirrus.schemas.v_meddata.MedDataConfigSchema,
            IngredientPlanSchema = Y.doccirrus.schemas.v_ingredientplan.IngredientPlanSchema,
            defaultIngredientPlanConfig = Y.doccirrus.schemas.v_ingredientplan.defaultIngredientPlanConfig;

        /**
         * Server-side ingredientplan extensions.
         */
        class IngredientPlan extends IngredientPlanSchema {

            /**
             * Fetches the custom data from the Tag collection for that version of the ingredientPlan,
             * and adds that data to the active ingredients. Otherwise, searches for default values within the
             * config, and applies these default values for the plan. If the default version is larger than the
             * customData version, the default values dominate.
             * @param {object} args
             * @param {object} args.user
             * @return {Promise<void>}
             */
            async loadCustomDataForIngredients( args ) {

                // fetch the additionalData currently stored in the tag-collection
                let
                    {user} = args,
                    ACTIVEINGREDIENTS = MedDataCategories.ACTIVEINGREDIENTS,
                    [err, medDataItemTemplateCollection] = await formatPromiseResult(
                        Y.doccirrus.api.meddata.getMedDataItemTemplateCollection( {
                            'user': user,
                            'category': [ACTIVEINGREDIENTS]
                        } )
                    );

                if( err ) {
                    Y.log( `Error fetching existing data for ingredients in "INGREDIENTPLAN" activity`, 'error', NAME );
                    throw err;
                }

                // get the current plan version configured within the MedDataConfig, and the default values
                if( this.planConfig instanceof MedDataConfigSchema ) {
                    let
                        planVersion = this.planConfig.version,
                        defaultValues = this.planConfig.defaultValues;

                    /**
                     * Up to here, the created ActiveIngredients should have empty additionalData (such as initialDosis, etc.).
                     * Here, we apply either the additionalData created by the customer and stored in the tag collection,
                     * OR the data preconfigured in the config.
                     * NOTE: A newer version of the config will always overwrite the data in the tags.
                     */
                    if( typeof medDataItemTemplateCollection === "object" && medDataItemTemplateCollection !== null ) {
                        this.medData.forEach(
                            /**
                             * @param {ActiveIngredientForIngredientPlanSchema} activeIngredient
                             */
                            function( activeIngredient ) {
                                let
                                    // get the default values for the active ingredient
                                    defaultsForIngredient = (defaultValues.hasOwnProperty( activeIngredient.name )) ? defaultValues[activeIngredient.name] : null,

                                    // get the custom MedDataItemTemplate stored in the tag collection, if available
                                    medDataItemTemplate = medDataItemTemplateCollection.findTemplateByType( activeIngredient.type, ACTIVEINGREDIENTS ),

                                    // storage for the version of the custom data stored in the tags
                                    customPlanVersion = -1;

                                // reduce the default values stored for each ingredient in the MedDataConfig of type {key: X, value: Y} into a single object of type {X1: Y1, X2: Y2}
                                if( defaultsForIngredient !== null ) {
                                    defaultsForIngredient = defaultsForIngredient.reduce( ( total, item ) => {
                                        if( typeof item === "object" && item !== null && item.hasOwnProperty( "key" ) && item.hasOwnProperty( "value" ) ) {
                                            total[item.key] = item.value;
                                        }
                                        return total;
                                    }, {} );
                                }

                                if( medDataItemTemplate ) {
                                    // THIS MUST BE FIRST: extract the customDataVersion from the additionalData
                                    if( Object.prototype.hasOwnProperty.call( medDataItemTemplate.additionalData, defaultIngredientPlanConfig.columns.planVersion.key ) ) {
                                        customPlanVersion = medDataItemTemplate.additionalData[defaultIngredientPlanConfig.columns.planVersion.key];
                                    }
                                    const isTemplateOutdated = (customPlanVersion < planVersion);

                                    // ------- apply additionalData from config or template --------
                                    // overwrite template values, if these are not given or outdated
                                    if( isTemplateOutdated && defaultsForIngredient !== null ) {
                                        medDataItemTemplate.additionalData = Object.assign( medDataItemTemplate.additionalData, defaultsForIngredient );
                                    }

                                    // extract and set the custom additionalData for the existing ingredient, if found,
                                    // or apply the defaults from the current plan
                                    activeIngredient.setFromAdditionalData( medDataItemTemplate.additionalData );

                                    // ------- apply sampleNormalValue from config or template -------
                                    // overwrite template values, if these are not given or outdated
                                    if( (defaultsForIngredient !== null && Object.prototype.hasOwnProperty.call( defaultsForIngredient, "sampleNormalValueText" )) ) {
                                        if( (isTemplateOutdated || (medDataItemTemplate.sampleNormalValueText === null)) ) {
                                            medDataItemTemplate.sampleNormalValueText = defaultsForIngredient.sampleNormalValueText;
                                        }
                                    }

                                    if( medDataItemTemplate.sampleNormalValueText !== null ) {
                                        activeIngredient.sampleNormalValueText = medDataItemTemplate.sampleNormalValueText;
                                    }
                                }
                            } );
                    }
                }

                return Promise.resolve();
            }

            /**
             * posts a new IngredientPlan to the API
             * @param {object} args
             * @param {object} args.user
             * @param {object} args.data
             * @param {object} args.data.activity
             * @return {Promise<string>}
             */
            async post( args ) {
                Y.log( 'Entering Y.doccirrus.api.ingredientplan.post', 'info', NAME );

                const
                    initializeFormForActivityP = util.promisify(  Y.doccirrus.forms.mappinghelper.initializeFormForActivity );

                let
                    {
                        user,
                        data: {
                            activity
                        } = {}
                    } = args,
                    ingredientPlanId, err, result;

                // create tags (if not existing) for each activeIngredient's name
                [err, result] = await formatPromiseResult( this._createTagsFromIngredients( args ) );
                if( err ) {
                    Y.log( `Error creating name tags for each active ingredient: ${JSON.stringify( this.medData )}`, 'error', NAME );
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'Error creating name tags for each active ingredient.'} );
                }

                // create tags (if not existing) for each activeIngredient's dosage
                [err, result] = await formatPromiseResult( this._createTagsFromDosages( args ) );
                if( err ) {
                    Y.log( `Error creating dosage tags for each active ingredient: ${JSON.stringify( this.medData )}`, 'error', NAME );
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'Error creating dosage tags for each active ingredient.'} );
                }

                // create a new activity "INGREDIENTPLAN"
                let ingredientPlanActivity = Object.assign( this.toObject(), activity );
                Y.log( `Creating "INGREDIENTPLAN" activity: ${JSON.stringify( ingredientPlanActivity )}`, 'info', NAME );
                [err, result] = await formatPromiseResult( promisifyArgsCallback( Y.doccirrus.api.activity.post )( {
                    user,
                    data: ingredientPlanActivity
                } ) );

                if( err ) {
                    Y.log( `Error creating "INGREDIENTPLAN" activity: ${JSON.stringify( ingredientPlanActivity )}`, 'error', NAME );
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'Error creating the "INGREDIENTPLAN" activity.'} );
                }
                ingredientPlanId = result[0];

                //  Initialize the form
                [ err, result ] = await formatPromiseResult( initializeFormForActivityP( user, ingredientPlanId, null, null ) );

                if ( err ) {
                    //  Not necessarily serious, user can pick / set up a form later
                    Y.log( `Could not initialize form for INGREDIENTPLAN: ${err.stack||err}`, 'warn', NAME );
                }

                Y.log( 'Exiting Y.doccirrus.api.ingredientplan.post', 'info', NAME );
                return ingredientPlanId;
            }

            /**
             * Create new MEDDATA tags (if not existing) for each active ingredient of a prepared medication activity.
             * @param {object} args
             * @param {object} args.user
             * @returns {Promise<Array>}
             * @private
             */
            async _createTagsFromIngredients( args ) {
                Y.log( 'Entering Y.doccirrus.api.ingredientplan._createTagsFromIngredients (no exit; look for exit of Y.doccirrus.api.tag.updateTags)', 'info', NAME );

                let {user} = args,

                    // get unique ingredients
                    uniqueIngredients = this.getUniqueMedData(),
                    uniqueTagObjects = uniqueIngredients.map(
                        /**
                         * @param {ActiveIngredientForIngredientPlanSchema} ingredient
                         * @return {object}
                         */
                        ( ingredient ) => {
                            let medDataTag = ingredient.toMedDataTag();
                            return medDataTag.toObject();
                        }
                    );

                return promisifyArgsCallback( Y.doccirrus.api.tag.updateTags )( {
                    user,
                    data: {
                        type: TagTypes.MEDDATA,
                        currentTags: uniqueTagObjects,
                        comparisonKeys: ['title', 'category', 'additionalData', 'sampleNormalValueText'],
                        tagTitleKey: 'title',
                        updateKeys: ['unit', ['category'], {'additionalData': 1}, 'sampleNormalValueText'],
                        overwrite: false
                    }
                } );
            }

            /**
             * Create a new DOSAGE tag (if not existing) for each dosis of a prepared medication activity.
             * @param {object} args
             * @param {object} args.user
             * @returns {Promise<Array>}
             * @private
             */
            async _createTagsFromDosages( args ) {
                Y.log( 'Entering Y.doccirrus.api.ingredientplan._createTagsFromDosages (no exit; look for exit of Y.doccirrus.api.tag.updateTags)', 'info', NAME );

                let {user} = args;

                // an array with unique ingredient names, since each name will become a unique tag.
                let
                    uniqueDosages = [...new Set( this.medData.map( ingredient => ingredient.dosis.value ) )],
                    uniqueTagObjects = uniqueDosages
                        // just keep doses with a length > 0
                        .filter( dosis => typeof dosis === "string" && dosis.length > 0 )
                        // create a dose tag
                        .map( ( dosis ) => {
                            // by now, this is just a string, however, keep this function, to create an object later
                            return dosis;
                        } );

                return promisifyArgsCallback( Y.doccirrus.api.tag.updateTags )( {
                    user,
                    data: {
                        type: TagTypes.DOSE,
                        currentTags: uniqueTagObjects
                    }
                } );
            }
        }

        Y.namespace( 'doccirrus.api' ).ingredientplan = {
            IngredientPlan,
            get: async function( args ) {
                Y.log( 'Entering Y.doccirrus.api.ingredientplan.get', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.ingredientplan.get' );
                }
                const
                    {user, query = {}, options = {}, callback} = args;

                let
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            action: 'get',
                            model: 'activity',
                            user,
                            query: {...query, actType: 'INGREDIENTPLAN'},
                            options
                        } )
                    );
                if( err ) {
                    Y.log( `get. Error getting "INGREDIENTPLAN" activity: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }
                return handleResult( null, result, callback );
            },
            post: async function( args ) {
                const
                    {user, data, callback} = args;
                let ingredientPlan = new IngredientPlan( {
                    medicationPlanCarrierSegments: [],
                    activeIngredients: []
                } );

                let [err, ingredientPlanId] = await formatPromiseResult( ingredientPlan.post( {
                    user,
                    data: {activity: data}
                } ) );
                if( err ) {
                    Y.log( `post. Error creating "INGREDIENTPLAN" activity: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }
                return handleResult( null, ingredientPlanId, callback );
            },
            put: async function( args ) {
                Y.log( 'Entering Y.doccirrus.api.ingredientplan.put', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.ingredientplan.put' );
                }
                const
                    {user, query = {}, fields, data, callback} = args;
                let
                    putData = Y.doccirrus.filters.cleanDbObject( data );
                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'put',
                        model: 'activity',
                        data: putData,
                        user,
                        query,
                        fields
                    } )
                );
                if( err ) {
                    Y.log( `put. Error updating "INGREDIENTPLAN" activity: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }
                return handleResult( null, result, callback );
            },
            'delete': async function( args ) {
                Y.log( 'Entering Y.doccirrus.api.ingredientplan.delete', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.ingredientplan.delete' );
                }

                const {user, query, callback} = args;

                if( !query ) {
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Invalid or missing query'} ), null, callback );
                }

                let
                    [err, result] = await formatPromiseResult(
                        promisifyArgsCallback( Y.doccirrus.api.activity.delete )( {
                            user,
                            query
                        } ) );

                if( err ) {
                    Y.log( `delete. Error deleting "INGREDIENTPLAN" activity: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }
                return handleResult( null, result, callback );
            }
        };
    },
    '0.0.1', {
        requires: [
            'dccommonerrors',
            'dcactivityutils',
            'dcschemaloader',
            'activity-api',
            'tag-schema',
            'v_meddata-schema',
            'v_ingredientplan-schema'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'dcfilters',
            // 'dcforms-mappinghelper',
            // 'dcmongodb',
            // 'meddata-api',
            // 'tag-api'
        ]
    }
);
