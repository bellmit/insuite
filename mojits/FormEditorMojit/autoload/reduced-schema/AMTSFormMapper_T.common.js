/**
 * User: michael.kleinert
 * Date: 7/7/20  8:22 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add(
    /* YUI module name */
    'dcforms-schema-AMTSFormMapper-T',

    /* Module code */
    function( Y/*, NAME*/ ) {

        /**
         * Class to encapsule AMTS form mapping properties
         * @class
         * @constructor
         */
        function AMTSFormMapper() {
            Y.dcforms.mapper.genericUtils.FormMapper.call( this, {
                name: "AMTSFormMapper",
                group: Object.keys( AMTSFormMapper.getFormBindings() ),
                allowedActTypes: [],
                fn: function( formData, config ) {
                    var
                        unwrap = Y.doccirrus.commonutils.unwrap,
                        medDataItems = config.context.activity.medData ? unwrap( config.context.activity.medData ) : [],
                        activity = config.context.activity || {},
                        actType = unwrap( activity.actType ),
                        i, l,
                        j, k, multipleChoiceKey,
                        itemKey,
                        itemTextValue,
                        keyRootDictionary = AMTSFormMapper.getRootToFieldsDictionary(),
                        keyDictionary;

                    // another type should not be the case, as we filter allowedActTypes.... but one never knows
                    if( actType === 'MEDDATA' ) {
                        // possible bindings
                        for( i = 0, l = medDataItems.length; i < l; i++ ) {
                            itemKey = unwrap( medDataItems[i].type );
                            itemTextValue = unwrap( medDataItems[i].textValue );

                            // look up the medDataItem's key in the keyRoot dictionary
                            if( Object.prototype.hasOwnProperty.call( keyRootDictionary, itemKey ) ) {
                                keyDictionary = keyRootDictionary[itemKey];

                                // the dictionary contains all keys belonging to that key-root as array of strings
                                if( Array.isArray( keyDictionary ) ) {
                                    if( keyDictionary.length === 1 ) {
                                        // a single choice entry has only a single array entry

                                        // transform the default value to an empty string
                                        if ( itemTextValue.toLowerCase() === AMTSFormMapper.NOVALUEDEFAULT.toLowerCase() ) {
                                            formData[keyDictionary[0]] = "";
                                        }
                                    } else {
                                        // a multiple choice entry => find the selected value, and set it to true, all others to false
                                        for( j = 0, k = keyDictionary.length; j < k; j++ ) {
                                            multipleChoiceKey = AMTSFormMapper.getMultipleChoiceKey( keyDictionary[j] );
                                            if( multipleChoiceKey ) {
                                                // do the value match, set the value to "true", else to "false" for each key
                                                formData[keyDictionary[j]] = (multipleChoiceKey.value.toUpperCase() === itemTextValue.toUpperCase());
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } );
        }

        AMTSFormMapper.prototype = Object.create( Y.dcforms.mapper.genericUtils.FormMapper.prototype );
        AMTSFormMapper.prototype.constructor = AMTSFormMapper;
        AMTSFormMapper.prototype.super = Y.dcforms.mapper.genericUtils.FormMapper;

        /**
         * Returns all AMTS related form bindings.
         * @returns {object}
         */
        AMTSFormMapper.getFormBindings = function getFormBindings() {
            var
                amtsFormBinderKeys = Object.keys( Y.dcforms.schema.InCase_T ).filter( function filterAMTSKey( key ) {
                    return key.indexOf( "AMTS" ) === 0;
                } ),
                amtsFormBindings = {};

            amtsFormBinderKeys.forEach( function forEachBinderKey( key ) {
                amtsFormBindings[key] = Y.dcforms.schema.InCase_T[key];
            } );

            return amtsFormBindings;
        };

        /**
         * Returns all AMTS related mapper fields. Multiple choice entries are returned as single entries.
         * E.g. AMTS_Follow_Up_Symptom_BLURRED_VISION_WORSE/BETTER/SAME => AMTS_Follow_Up_Symptom_BLURRED_VISION
         * @param {string|undefined} rootKey
         * @return {object|string[]}
         *              if not rootKey is given, returns a dictionary object {string (root) => string[] (children)},
         *              if a rootKey is given, just returns an array of string listed under that root
         */
        AMTSFormMapper.getRootToFieldsDictionary = function getRootToFieldsDictionary( rootKey ) {
            var
                rootKeyFilterActive = (typeof rootKey === "string"),
                bindingKeys = Object.keys( AMTSFormMapper.getFormBindings() ),
                // use an object to take advantage of object-key hashing
                uniqueBindingsKeys = {},
                multipleChoiceKey,
                i, l,
                root, key;

            for( i = 0, l = bindingKeys.length; i < l; i++ ) {
                if( AMTSFormMapper.isAMTSKey( bindingKeys[i] ) ) {

                    // check if the key is a multiple choice key (has children)
                    multipleChoiceKey = AMTSFormMapper.getMultipleChoiceKey( bindingKeys[i] );

                    // rewrite the root, if the key is a multiple choice key
                    root = (multipleChoiceKey) ? multipleChoiceKey.root : bindingKeys[i];
                    key = bindingKeys[i];

                    // if required, filter for the root key
                    if( rootKeyFilterActive && rootKey !== root ) {
                        continue;
                    }

                    // push the key to the root tree array
                    if( !Object.prototype.hasOwnProperty.call( uniqueBindingsKeys, root ) ) {
                        uniqueBindingsKeys[root] = [key];
                    } else {
                        uniqueBindingsKeys[root].push( key );
                    }
                }
            }

            if( rootKeyFilterActive ) {
                return Array.isArray( uniqueBindingsKeys[rootKey] ) ? uniqueBindingsKeys[rootKey] : [];
            }
            return uniqueBindingsKeys;
        };

        /**
         * @param {object} input
         * @param {object} input.remap
         * @param {object} input.unmap
         * @param {object} input.template
         * @param {object} input.element
         * @returns {void}
         */
        AMTSFormMapper.remapFormData = function remapFormData( input ) {
            var
                template = (typeof input.template === "object" && input.template !== null) ? input.template : {},
                element = (typeof input.element === "object" && input.element !== null) ? input.element : {},
                schemaMember = element.schemaMember || "",
                key,
                multipleChoiceKey,
                keysTransformedToMultipleChoice = [],
                i, l;

            if( schemaMember && AMTSFormMapper.isAMTSKey( schemaMember ) ) {

                // create objects on the input object, if they don't exist yet.
                if( typeof input.remap !== "object" || input.remap === null ) {
                    input.remap = {};
                }
                if( typeof input.unmap !== "object" || input.unmap === null || Object.keys( input.unmap ).length === 0 ) {
                    input.unmap = template.unmap();
                }

                //  document.mapData may have been lost, recreate
                for( key in input.unmap ) {
                    if( input.unmap.hasOwnProperty( key ) ) {
                        if( AMTSFormMapper.isAMTSKey( key ) ) {
                            multipleChoiceKey = AMTSFormMapper.getMultipleChoiceKey( key );
                            if( !multipleChoiceKey ) {
                                //  simple values => just copy
                                input.remap[key] = input.unmap[key];
                            } else {
                                // multiple choice key => condense value to root key
                                if( input.unmap[key] ) {
                                    // if selected, remap the value of the root the to value
                                    input.remap[multipleChoiceKey.root] = multipleChoiceKey.value;
                                } else if( !Object.prototype.hasOwnProperty.call( input.remap, multipleChoiceKey.root ) ) {
                                    // set an empty value, if no value has been set for that multiple choice entry yet
                                    input.remap[multipleChoiceKey.root] = "";
                                }
                                keysTransformedToMultipleChoice.push( key );
                            }
                        }
                    }
                }

                // delete multiple choice keys
                for( i = 0, l = keysTransformedToMultipleChoice.length; i < l; i++ ) {
                    if( Object.prototype.hasOwnProperty.call( template.mapData, keysTransformedToMultipleChoice[i] ) ) {
                        delete template.mapData[keysTransformedToMultipleChoice[i]];
                    }
                }
            }
        };

        /**
         * Returns MedDataItems from the template's mapData.
         * @param {object} input
         * @param {object} input.template
         * @param {object} input.element
         * @param {string|undefined} input.category (default: AMTSFormMapper.MEDDATACATEGORYDEFAULT)
         * @returns {MedDataItemSchema[]}
         */
        AMTSFormMapper.mapToMedDataItems = function getMedDataItems( input ) {
            var
                template = (typeof input.template === "object" && input.template !== null) ? input.template : {},
                element = (typeof input.element === "object" && input.element !== null) ? input.element : {},
                category = (typeof input.category === "string") ? input.category : AMTSFormMapper.MEDDATACATEGORYDEFAULT,
                schemaMember = element.schemaMember || "",
                key, mapDataKey,
                multipleChoiceKey,
                keyValuePairs = {},
                unmap,
                medDataItem,
                medDataItems = [],
                numericValue,
                textValue,
                boolValue;

            if( schemaMember && AMTSFormMapper.isAMTSKey( schemaMember ) ) {
                // unmap any template data, and work with this set of data
                unmap = template.unmap();

                //  mix in stored mapData from the formDoc
                for( key in template.mapData ) {
                    if( Object.prototype.hasOwnProperty.call( template.mapData, key ) ) {
                        //  prefer value from form element if it exists
                        if( !Object.prototype.hasOwnProperty.call( unmap, key ) ) {
                            unmap[key] = template.mapData[key];
                        }
                    }
                }

                // update formDocument.mapData for given keys
                for( key in unmap ) {
                    if( Object.prototype.hasOwnProperty.call( unmap, key ) ) {
                        if( AMTSFormMapper.isAMTSKey( key ) ) {
                            multipleChoiceKey = AMTSFormMapper.getMultipleChoiceKey( key );
                            if( !multipleChoiceKey ) {
                                //  simple values => just copy to a new entry (treat text value === "" as empty)
                                keyValuePairs[key] = unmap[key];
                            } else {
                                // multiple choice key => condense value to root key
                                if( unmap[key] === true ) {
                                    // if multiple choice key is selected (true), add a new key value pair
                                    keyValuePairs[multipleChoiceKey.root] = multipleChoiceKey.value;

                                    /**
                                     * Set all other items belonging to that root key to false.
                                     * If we don't do so over here, multiple keys with true agglomerate.
                                     */
                                    for( mapDataKey in template.mapData ) {
                                        if( Object.prototype.hasOwnProperty.call( template.mapData, mapDataKey ) &&
                                            mapDataKey.indexOf( multipleChoiceKey.root ) === 0 &&
                                            mapDataKey !== key &&
                                            template.mapData[mapDataKey] !== false ) {
                                            template.mapData[mapDataKey] = false;
                                        }
                                    }

                                } else if( !Object.prototype.hasOwnProperty.call( keyValuePairs, multipleChoiceKey.root ) ) {
                                    // if not selected, and the item has not been set in a previous key, set an empty value as placeholder
                                    keyValuePairs[multipleChoiceKey.root] = AMTSFormMapper.NOVALUEDEFAULT;
                                }
                            }
                        }
                    }
                }

                // create MedDataItems from KeyValues
                for( key in keyValuePairs ) {
                    if( Object.prototype.hasOwnProperty.call( keyValuePairs, key ) ) {
                        // reset values for this key, as these are filled depending on their data type
                        numericValue = null;
                        textValue = null;
                        boolValue = null;

                        // create a new MedDataItem with the given category and current key
                        medDataItem = new Y.doccirrus.schemas.v_meddata.MedDataItemSchema( {
                            category: category,
                            type: key
                        } );

                        switch( typeof keyValuePairs[key] ) {
                            case "string":
                                textValue = String( keyValuePairs[key] );

                                // check if an additional numeric value may be set
                                /** MAY BE TREATED DIFFERENT IN THE FUTURE, for now, we only use text values
                                 numericValue = parseFloat( keyValuePairs[key] );
                                 if( isNaN( numericValue ) ) {
                                    numericValue = null;
                                }*/
                                break;
                            case "number":
                                numericValue = keyValuePairs[key];
                                break;
                            case "boolean":
                                boolValue = keyValuePairs[key];
                                break;
                            default:
                                textValue = String( keyValuePairs[key] );
                        }

                        // set the numeric and test values accordingly if they are defined
                        if( typeof numericValue === "number" && !isNaN( numericValue ) ) {
                            medDataItem.value = numericValue;
                        }
                        if( typeof textValue === "string" ) {
                            medDataItem.textValue = (textValue.length > 0) ? textValue : AMTSFormMapper.NOVALUEDEFAULT;
                        }
                        if( typeof boolValue === "boolean" ) {
                            medDataItem.boolValue = boolValue;
                        }

                        medDataItems.push( medDataItem );
                    }
                }
            }

            return medDataItems;
        };

        /**
         *  When the form is changed, values in the activity may need to be updated.
         *  CALL IN THE CONTEXT OF THE ACTIVITY MODEL (setting this)
         *  @param  {Object}    template    Form template (current activiy's form)
         *  @param  {Object}    element     Form element which has changed
         *  @private
         */
        AMTSFormMapper.medDataWriteBack = function medData_writeBack( template, element ) {
            var
                self = this,
                unwrap = Y.doccirrus.commonutils.unwrap,
                mergedMedData = unwrap( self.medData ),
                medDataItems = [],
                medDataItemsToPush = [],
                itemsChanges = false;

            // AMTS form bindings writeback to MedDataItemSchema[]
            medDataItems = medDataItems.concat( AMTSFormMapper.mapToMedDataItems( {
                template: template,
                element: element
            } ) );

            // merge new medDataItems with existing ones
            medDataItems.forEach( function forEachNewMedDataItem( medDataItem ) {
                var
                    i, l,
                    existingType, existingCategory,
                    existingValue, existingTextValue,
                    existingBoolValue;

                // search for existing items, and replace their values, if required
                for( i = 0, l = mergedMedData.length; i < l; i++ ) {
                    existingType = unwrap( mergedMedData[i].type );
                    existingCategory = unwrap( mergedMedData[i].category );
                    existingValue = unwrap( mergedMedData[i].value );
                    existingTextValue = unwrap( mergedMedData[i].textValue );
                    existingBoolValue = unwrap( mergedMedData[i].boolValue );

                    // same type and category
                    if( existingType === medDataItem.type && existingCategory === medDataItem.category ) {
                        // to prevent loops, only update values if they have changed
                        if( existingValue !== medDataItem.value ) {
                            mergedMedData[i].value( medDataItem.value );
                            itemsChanges = true;
                        }
                        // to prevent loops, only update values if they have changed
                        if( existingTextValue !== medDataItem.textValue ) {
                            mergedMedData[i].textValue( medDataItem.textValue );
                            itemsChanges = true;
                        }
                        if( existingBoolValue !== medDataItem.boolValue ) {
                            mergedMedData[i].boolValue( medDataItem.boolValue );
                            itemsChanges = true;
                        }

                        // Return from the forEach loop, as the item has been found.
                        // If we would not return, we would add the item as new element
                        return;
                    }
                }

                // add as new element, if not found in the existing items
                medDataItemsToPush.push( medDataItem );
            } );

            if( itemsChanges || medDataItemsToPush.length > 0 ) {
                self.medData( mergedMedData.concat( medDataItemsToPush ) );
            }
        };

        /**
         * checks if a property key is an AMTS key
         * @param {string} key
         * @return {boolean}
         */
        AMTSFormMapper.isAMTSKey = function isAMTSKey( key ) {
            if( typeof key === "string" ) {
                return key.substr( 0, 4 ) === AMTSFormMapper.AMTSPREFIX;
            }
            return false;
        };

        /**
         * checks if a property is an AMTS multiple choice key.
         *  => these end with a number
         *  e.g. AMTS_Anamnesis_Wellbeing_Questionnaire_InterestingDay_01 - 05
         *  => or with SAME/BETTER/WORSE
         *  e.g. AMTS_Follow_Up_Symptom_BLURRED_VISION_WORSE
         *
         *  => these should be remapped to the root with the text value of that number
         *
         * If so, returns an object containing the root and the subkey of the multiple choice entry.
         * Else, returns false.
         *  e.g. AMTS_Follow_Up_Symptom_BLURRED_VISION_WORSE => {
         *      root: "AMTS_Follow_Up_Symptom_BLURRED_VISION",
         *      value: "WORSE"
         *  }
         *
         * @param {string} key
         * @return {boolean | {root: string, value: string}}
         */
        AMTSFormMapper.getMultipleChoiceKey = function isMultipleChoiceKey( key ) {
            var match, i, l;
            if( typeof key === "string" ) {

                // match with all defined multiple choice suffices
                for( i = 0, l = AMTSFormMapper.MULTIPLECHOICE_MATCHES.length; i < l; i++ ) {
                    match = key.match( AMTSFormMapper.MULTIPLECHOICE_MATCHES[i] );

                    // only proceed, if there are root and value capture groups
                    if( Array.isArray( match ) && match.length === 3 ) {
                        return {
                            root: match[1],
                            value: match[2]
                        };
                    }

                }
            }
            return false;
        };

        /**
         * prefix set in front of all AMTS bindings
         * @type {string}
         */
        AMTSFormMapper.AMTSPREFIX = 'AMTS';

        /**
         * MedDataItem category set in transformation to medDataItems (default, may be overridden)
         * @type {string}
         */
        AMTSFormMapper.MEDDATACATEGORYDEFAULT = 'AMTS_FORM';

        /**
         * Value set for elements which are not yet filled out.
         * @type {string}
         */
        AMTSFormMapper.NOVALUEDEFAULT = 'n/a';

        /**
         * Array of RegExp to extract the value of multiple choice elements.
         * Root and value should each be included in a capture group.
         * E.g. /^(.*?)_(\d\d)$/
         * @type {RegExp[]}
         */
        AMTSFormMapper.MULTIPLECHOICE_MATCHES = [
            /^(.+)_(\d\d)$/, // numeric multiple choices
            /^(.+)_(BETTER|SAME|WORSE|YES|NO|Partial)$/i // literal multiple choices
        ];

        // export module
        if( !Y.dcforms ) {
            Y.dcforms = {};
        }
        if( !Y.dcforms.schema ) {
            Y.dcforms.schema = {};
        }

        Y.dcforms.schema.AMTSFormMapper_T = AMTSFormMapper;
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [
            'v_meddata-schema',
            'dccommonutils',
            'dcgenericmapper-util',
            'dcforms-schema-InCase-T'
        ]
    }
);