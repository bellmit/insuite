/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  Simple YUI module, utilities for working with reduced schema, helper object
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI, $ */

YUI.add(
    /* YUI module name */
    'dcforms-reducedschema',

    /* Module code */
    function( Y, NAME ) {
        'use strict';

        var i18n = Y.doccirrus.i18n;

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if( !Y.dcforms ) {
            Y.dcforms = {};
        }

        function getM2Lang( langCode ) {
            // there are two legacy methods of specifying the
            // lang without using the i18n translators.
            // these variables support the schema/path method with -en -de
            // should be switched to i18n at some point.
            var m2Prefix = '-';

            return m2Prefix + langCode;
        }

        Y.dcforms.reducedschema = {

            //  these are not schema members
            reservedWords: ['version', 'type', 'list', 'enum', '_lib', 'required', 'translate'],

            /**
             *  Load a reduced schema from the server
             *
             *  @param  patientRegId   {String}    Used to proxy requests from other PRCs
             *  @param  schemaName  {String}    eg, 'Person_T'
             *  @param  callback    {Function}  Of the form fn(err, schema)
             */

            load: function( patientRegId, schemaName, callback ) {
                Y.log( 'DEPRECATED: Y.dcforms.reducedschema.load, please use loadSync patientregId: ' + patientRegId, 'warn', NAME );
                callback( null, this.loadSync( schemaName ) );
            },

            loadSync: function( schemaName ) {

                if( (!schemaName) || ('' === schemaName) ) {
                    Y.log( 'loadSync schemaName not given', 'warn', NAME );
                    return null;
                }

                if( !Y.dcforms.schema.hasOwnProperty( schemaName ) ) {
                    return null;
                }

                var
                    schema = Y.dcforms.schema[schemaName],
                    isEnum = ('_E' === schemaName.substr( schemaName.length - 2 ));

                schema = isEnum ? this.expandEnum( schemaName, schema ) : this.expandSchema( schemaName, schema );

                return schema;
            },

            /**
             *  Fill in referenced data from DC schema into a reduced schema
             *
             *  @param  schemaName  {String}    Corresponds to filename eg, Prescription_T
             *  @param  schema      {Object}    Unexpanded schema
             *  @param  callback    {Function}  Of the form fn(err, schema)
             */

            expandSchema: function( schemaName, schema ) {
                Y.log( 'Expanding schema ' + schemaName, 'debug', NAME );

                //console.log( '(XXXX) expand schema, stack trace follows: ', schemaName, Error().stack );

                var
                    schemaloader = Y.doccirrus.schemaloader,

                    //  these may be copied from DC schema into reduced schema, validation may be used in future
                    heritable = ['type', '-en', '-de', 'required', 'list' /* , 'validate' */],

                    //  these members never link to any other schema
                    doNotExpand = ['version', 'mapper'],

                    relatedSchema,

                    //  temp / local
                    //  linkedSchema,
                    linkedMember,
                    currentMember,
                    k,
                    i;

                for( k in schema ) {                                    //  for each member
                    if( schema.hasOwnProperty( k ) ) {                  //  which belongs to the reduced schema
                        if( -1 === doNotExpand.indexOf( k ) ) {         //  and which could be linked to a DC schema

                            //Y.log('Expanding member: ' + k, 'debug', NAME);

                            currentMember = schema[k];

                            if( currentMember.hasOwnProperty( 'schema' ) && currentMember.hasOwnProperty( 'path' ) ) {

                                relatedSchema = schemaloader.getSchemaForSchemaName( currentMember.schema );

                                //Y.log('Expanding schema member: ' + k + ' ==> ' + currentMember.schema + '::' + currentMember.path, 'debug', NAME);
                                linkedMember = schemaloader.getTypeForSchemaPath( relatedSchema, currentMember.path );

                                //  copy all heritable members into the reduced schema
                                if( linkedMember ) {
                                    for( i = 0; i < heritable.length; i++ ) {
                                        if( linkedMember.hasOwnProperty( heritable[i] ) ) {
                                            currentMember[heritable[i]] = linkedMember[heritable[i]];
                                            //Y.log('Inherited ' + schemaName + '::' + k + ' ==> ' + heritable[i] + ': ' + currentMember[heritable[i]], 'debug', NAME);
                                        }
                                    }
                                }

                                //  smoke test for previous convention for translation
                                if( !currentMember.hasOwnProperty( 'label' ) ) {
                                    currentMember.label = {
                                        'en': 'FIXME IN JSON',
                                        'de': 'FIXME IN JSON'
                                    };
                                }

                                //  temporary measure to inject previouds translation format during transition
                                //  as of 2014-02-29 not all FEM reduced schema have been converted

                                if( currentMember.hasOwnProperty( '-en' ) && !currentMember.label.en ) {
                                    currentMember.label.en = currentMember['-en'];
                                }

                                if( currentMember.hasOwnProperty( '-de' ) && !currentMember.label.de ) {
                                    currentMember.label.de = currentMember['-de'];
                                }

                            }

                            schema[k] = currentMember;

                        }
                    }
                }

                return schema;
            },

            /**
             *  Convert an enum from dc-schema format to that used by FEM controls
             *
             *  @param  schemaName  {String}        Root of schema  object
             *  @param  schema      {Object}        Unexpanded schema
             */

            expandEnum: function( schemaName, schema ) {

                if( !schema[schemaName].hasOwnProperty( 'import' ) || !schema[schemaName].import.hasOwnProperty( 'lib' ) ) {
                    Y.log( 'Not expanding enum: ' + schemaName + ' (not linked to a schema)', 'debug', NAME );
                    return schema;
                }

                //Y.log('Expanding enum ' + schemaName + ':' + JSON.stringify(schema, undefined, 2), 'debug', NAME);
                Y.log( 'Expanding enum ' + schemaName, 'debug', NAME );

                var
                    schemaloader = Y.doccirrus.schemaloader,
                    importOpts = schema.import,
                    importType = importOpts.hasOwnProperty( 'type' ) ? importOpts.type : schemaName,
                    linkedSchema = schemaloader.getSchemaForSchemaName( importOpts.lib ),
                    linkedEnum = this.getSchemaMemberByPath( linkedSchema, 'types.' + importType ),
                    listItem,
                    i;

                //Y.log('Loaded linked enum: ' + JSON.stringify(linkedEnum, undefined, 2), 'debug', NAME);
                //Y.log('Loaded linked enum: ' + importOpts.lib + '.types.' + importType, 'warn', NAME);

                //  inherit value type
                if( linkedEnum.hasOwnProperty( 'type' ) ) {
                    //Y.log('Inherited value type: ' + linkedEnum.type, 'debug', NAME);
                    schema.type = linkedEnum.type;
                }

                //  note lib, not sure if this is ever used
                schema._lib = importOpts.lib;

                //  split list into values and translations
                if( linkedEnum.hasOwnProperty( 'list' ) ) {

                    //  add required members
                    if( !schema.hasOwnProperty( 'enum' ) ) {
                        schema.enum = [];
                    }

                    if( !schema.hasOwnProperty( 'translate' ) ) {
                        schema.translate = {};
                    }

                    //  copy all values in new format
                    //Y.log('Inherited list of ' + linkedEnum.list.length + 'values.', 'debug', NAME);
                    schema.list = linkedEnum.list;

                    //  check and copy all values in previous, deprecated format
                    for( i = 0; i < linkedEnum.list.length; i++ ) {
                        listItem = linkedEnum.list[i];

                        //Y.log('Adding listItem: ' + JSON.stringify(listItem), 'warn', NAME);

                        if( listItem.hasOwnProperty( 'val' ) && (-1 === schema.enum.indexOf( listItem.val )) ) {

                            if( !listItem.hasOwnProperty( '-en' ) ) {
                                listItem['-en'] = 'TRANSLATEME IN SCHEMA';
                            }

                            if( !listItem.hasOwnProperty( '-de' ) ) {
                                listItem['-de'] = 'TRANSLATEME IN SCHEMA';
                            }

                            schema.enum.push( listItem.val );

                            schema.translate[listItem.val] = {
                                'en': listItem['-en'],
                                'de': listItem['-de']
                            };

                        }
                    }
                }

                return schema;
            },

            /**
             *  Look up a nested member of a DC schema
             *
             *  @param  dcSchema    {Object}    For example, a person obejct
             *  @param  path        {String}    eg, 'address.street'
             *  @return             {Object}    Schema member addressed by path
             */

            getSchemaMemberByPath: function( dcSchema, path ) {
                var
                    //  use German translation at present

                    label = i18n( dcSchema + '.' + path ),
                    member = {
                        'type': 'String',
                        'label': {
                            'en': label,
                            'de': label
                        },
                        '-en': label,
                        '-de': label
                    };

                return member;
            },

            /**
             *  DEPRECATED - List set of available reduced schema
             *
             *  @param callback {function}  Of the form fn(err, data)
             */

            list: function( callback ) {
                Y.log( 'DEPRECATED: please use Y.dcforms.reducedschema.listSync', 'warn', NAME );
                callback( null, this.listSync() );
            },

            /**
             *  List set of available reduced schema
             */

            listSync: function() {
                var k, schemaNames = [];

                for( k in Y.dcforms.schema ) {
                    if( Y.dcforms.schema.hasOwnProperty( k ) ) {
                        if( 'string' === typeof k && -1 !== k.indexOf( '_T' ) ) {
                            schemaNames.push( k );
                        }
                    }
                }

                schemaNames.sort( function( a, b ) {
                    var
                        aLower = a.toLowerCase(),
                        bLower = b.toLowerCase();

                    return ( aLower > bLower? 1 : (aLower < bLower? -1 : 0) );
                } );

                return schemaNames;
            },

            /**
             *  Render an HTML select element for choosing a reduced schema into the div specified
             *
             *  @param  elementName     {string}    Name for the new select element
             *  @param  elementId       {string}    DOM ID for the new select element
             */

            renderSelectBoxSync: function( elementName, elementId ) {

                if( Y.dcforms.isOnServer ) {
                    Y.log( 'UNIMPLEMENTED: renderSelectBoxSync is not used by server', 'warn', NAME );
                    return '';
                }

                var
                    schemaNames = this.listSync(),
                    html = '',
                    i;

                html = html + '<select name="' + elementName + '" id="' + elementId + '">';
                html = html + '<option value=""></option>';

                for( i = 0; i < schemaNames.length; i++ ) {
                    if( schemaNames[i].indexOf( '_T' ) > 0 ) {
                        html = html + '<option value="' + schemaNames[i] + '">' + schemaNames[i] + '</option>';
                    }
                }
                html = html + '</select>';
                return html;
            },

            /**
             *  Format a schema as array for binding to a KO dropdown element
             *
             *  @param  {Object}    schema      A reduced schema object
             *  @return {Object}                Array of objects like { id: schemaMember, label: translated }
             */

            schemaToKoDropdown: function( schema ) {
                var
                    userLang = Y.dcforms.getUserLang(),
                    m2Lang = getM2Lang( userLang ),

                    MODULE_CARDIO = Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO,
                    MODULE_DOQUVIDE = Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE,
                    MODULE_DQS = Y.doccirrus.schemas.settings.specialModuleKinds.DQS,
                    SERVICE_INSPECTORAPO = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORAPO,
                    SERVICE_INSPECTORDOC = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOC,
                    SERVICE_INSPECTORDOCSOLUI = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOCSOLUI,
                    AUTH_CARDIO = Y.doccirrus.auth.hasSpecialModule( MODULE_CARDIO ),
                    AUTH_DOQUVIDE = Y.doccirrus.auth.hasSpecialModule( MODULE_DOQUVIDE ),
                    AUTH_DQS = Y.doccirrus.auth.hasSpecialModule( MODULE_DQS ),
                    AUTH_AMTS = Y.doccirrus.auth.hasAdditionalService( SERVICE_INSPECTORAPO ) || Y.doccirrus.auth.hasAdditionalService( SERVICE_INSPECTORDOC ) || Y.doccirrus.auth.hasAdditionalService(SERVICE_INSPECTORDOCSOLUI),

                    memberName,
                    memberType,
                    memberTrans,

                    options = [ { id: '', label: '', type: '' } ],

                    k;

                for( k in schema ) {
                    if( schema.hasOwnProperty( k ) && ('object' === typeof schema[k]) ) {
                        if( schema[k].hasOwnProperty( 'cardioXML' ) && !( AUTH_CARDIO || AUTH_DOQUVIDE || AUTH_DQS ) ) {
                            continue;
                        }

                        if( k.startsWith('AMTS') && !AUTH_AMTS ) {
                            continue;
                        }

                        if( -1 === this.reservedWords.indexOf( k ) ) {

                            if( !schema[k].hasOwnProperty( 'label' ) || ('undefined' === typeof (schema[k])) ) {
                                Y.log( 'Missing translations in schema for ' + k + ': ' + JSON.stringify( schema[k] ), 'warn', NAME );
                                schema[k].label = {};
                            }

                            if( !schema[k].label.hasOwnProperty( userLang ) ) {
                                Y.log( 'Missing translation for ' + userLang + ': ' + JSON.stringify( schema[k] ), 'warn', NAME );
                                schema[k].label[userLang] = 'FIXME: MISSING';
                            }

                            if( schema[k].hasOwnProperty( m2Lang ) ) {
                                schema[k].label[userLang] = schema[k][m2Lang];
                            }

                            memberName = k;
                            memberType = schema[k].type;
                            memberTrans = ( schema[k].label && schema[k].label[userLang] ) ? schema[k].label[userLang] : 'UNTRANSLATED ' + userLang;

                            options.push( {
                                'id': memberName,
                                'label': memberTrans,
                                'type': memberType
                            } );

                        }
                    }
                }

                function sortOptionsAlphabetically( a, b ) {
                    var
                        aLower = a.label.toLowerCase(),
                        bLower = b.label.toLowerCase();

                    if( aLower < bLower ) {
                        return -1;
                    }
                    if( aLower > bLower ) {
                        return 1;
                    }
                    return 0;
                }

                options.sort( sortOptionsAlphabetically );

                return options;
            },

            /**
             *  Render an HTML select element for choosing a member of a reduced schema
             *
             *  TODO: reimplement as a view
             *  TODO: deduplicate with schemaToKoDropdown above
             *
             *  @param  schemaName      {string}    Name of a reduced schema
             *  @param  divId           {string}    ID of an extant DOM element
             *  @param  elementName     {string}    Name for the new select element
             *  @param  elementId       {string}    DOM ID for the new select element
             */

            renderSelectMemberBoxSync: function( schemaName, divId, elementName, elementId ) {

                if( Y.dcforms.isOnServer ) {
                    Y.log( 'UNIMPLEMENTED: renderSelectMemberBoxSync is not used by server', 'warn', NAME );
                    return '';
                }

                var
                    MODULE_CARDIO = Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO,
                    MODULE_DOQUVIDE = Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE,
                    MODULE_DQS = Y.doccirrus.schemas.settings.specialModuleKinds.DQS,
                    SERVICE_INSPECTORAPO = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORAPO,
                    SERVICE_INSPECTORDOC = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOC,
                    SERVICE_INSPECTORDOCSOLUI = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOCSOLUI,
                    AUTH_CARDIO = Y.doccirrus.auth.hasSpecialModule( MODULE_CARDIO ),
                    AUTH_DOQUVIDE = Y.doccirrus.auth.hasSpecialModule( MODULE_DOQUVIDE ),
                    AUTH_DQS = Y.doccirrus.auth.hasSpecialModule( MODULE_DQS ),
                    AUTH_AMTS = Y.doccirrus.auth.hasAdditionalService( SERVICE_INSPECTORAPO ) || Y.doccirrus.auth.hasAdditionalService( SERVICE_INSPECTORDOC ) || Y.doccirrus.auth.hasAdditionalService(SERVICE_INSPECTORDOCSOLUI),

                    jqMyDiv = $( '#' + divId ),
                    userLang = Y.dcforms.getUserLang(),
                    m2Lang = getM2Lang( userLang ),
                    html = '',
                    memberName,
                    memberType,
                    memberTrans,
                    schema = this.loadSync( schemaName ),
                    options = [],
                    k, i;

                //Y.log('Raw schema: ' + JSON.stringify(schema, undefined, 2), 'debug', NAME);

                if( !schema ) {
                    Y.log( 'Could not load schema ' + schemaName + ' from static set.', 'warn', NAME );
                    //TODO: translateme
                    jqMyDiv.html( 'konnte nicht Schema nicht laden.' );
                    return html;
                }

                html = html + '<select class="form-control" name="' + elementName + '" id="' + elementId + '">';
                html = html + '<option value=""></option>';

                //console.log((new Error().stack));

                for( k in schema ) {
                    if( schema.hasOwnProperty( k ) && ('object' === typeof schema[k]) ) {
                        if( schema[k].hasOwnProperty( 'cardioXML' ) && !( AUTH_CARDIO || AUTH_DOQUVIDE || AUTH_DQS ) ) {
                            continue;
                        }

                        if( k.startsWith('AMTS') && !AUTH_AMTS ) {
                            continue;
                        }

                        if( -1 === this.reservedWords.indexOf( k ) ) {

                            if( !schema[k].hasOwnProperty( 'label' ) || ('undefined' === typeof (schema[k])) ) {
                                Y.log( 'Missing translations in schema for ' + k + ': ' + JSON.stringify( schema[k] ), 'warn', NAME );
                                schema[k].label = {};
                            }

                            if( !schema[k].label.hasOwnProperty( userLang ) ) {
                                Y.log( 'Missing translation for ' + userLang + ': ' + JSON.stringify( schema[k] ), 'warn', NAME );
                                schema[k].label[userLang] = 'FIXME: MISSING';
                            }

                            if( schema[k].hasOwnProperty( m2Lang ) ) {
                                schema[k].label[userLang] = schema[k][m2Lang];
                            }

                            memberName = k;
                            memberType = schema[k].type;
                            memberTrans = ( schema[k].label && schema[k].label[userLang] ) ? schema[k].label[userLang] : 'UNTRANSLATED ' + userLang;

                            options.push( {
                                'html': '<option value="' + memberName + '/' + memberType + '">' + memberTrans + '</option>',
                                'memberTrans': memberTrans
                            } );

                        }
                    }
                }

                function sortOptionsAlphabetically( a, b ) {
                    var
                        aLower = a.memberTrans.toLowerCase(),
                        bLower = b.memberTrans.toLowerCase();

                    if( aLower < bLower ) {
                        return -1;
                    }
                    if( aLower > bLower ) {
                        return 1;
                    }
                    return 0;
                }

                options.sort( sortOptionsAlphabetically );

                for( i = 0; i < options.length; i++ ) {
                    html = html + options[i].html;
                }

                html = html + '</select>';
                jqMyDiv.html( html );
            },

            getM2Lang: function() { return getM2Lang(); }

        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: ['dcschemaloader']
    }
);
