/**
 * User: rrrw
 * Date: 15.08.13  16:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/

'use strict';

/**
 *
 *  Generate documentation directly out of the Schema files.
 *
 *  The following types of documentation arise:
 *
 *  0) Sample data generated from the test data.
 *
 *  1) Activity-Schema sub types for the wiki - these show which fields are available in
 *  which model in the UI
 *
 *  2) RAML documentation for API v.2. (and others in the future)
 *
 */

YUI.add( 'raml-generator', function( Y, NAME ) {

        const VIRTUAL_PREFIX = 'v_',

            RAML_API2_VERSION = '11.0.4',

            RAML_BUILD_PATH = process.cwd() + '/src/raml/',

            RAML_SAMPLE_SUFFIX = '-sample.json',

            SCHEMA_FILE_NAME_DE = 'dc-schema-2-de.raml',
            SCHEMA_FILE_NAME_CH = 'dc-schema-2-ch.raml',

            RAML_SCHEMA_DE_PATH = RAML_BUILD_PATH + SCHEMA_FILE_NAME_DE,
            RAML_SCHEMA_CH_PATH = RAML_BUILD_PATH + SCHEMA_FILE_NAME_CH,

            API_FILE_NAME_DE = 'dc-api-2-de.raml',
            API_FILE_NAME_CH = 'dc-api-2-ch.raml',

            RAML_API_DE_PATH = RAML_BUILD_PATH + API_FILE_NAME_DE,
            RAML_API_CH_PATH = RAML_BUILD_PATH + API_FILE_NAME_CH,

            API2_TEST_PATH = process.cwd() + '/test/api2/';

        function createHeaderStr(args) {
            const {country, schemaFileName, apiFileName} = args;
            return `#%RAML 0.8
title: DC REST ${country}
baseUri: https://&lt;tenantId&gt;.&lt;partner-domain-name&gt;/2
version: ${RAML_API2_VERSION}
documentation:
  - title: Doc Cirrus REST API /2, /3
    content: |
      This file documents all releases of the externally available Doc Cirrus inSuite REST API.  It provides a complete set of allowed resources and the
      methods to access them.
      <hr/>
      <h2>Useful resources</h2>
      <h4><a href="./changelog.txt">Changelog</a></h4>
      <h4><a href="./${apiFileName}">RAML Doc</a></h4>
      <h4><a href="./${schemaFileName}">JS Schema</a></h4>
      <hr/>

      <h2>Endpoint versions</h2>

      <h3>/2 Low-level API</h3>
      Here fine grained control of many resources in Doc Cirrus are made available.

      <h3>/3 Public API</h3>
      Here the resources do not need any authentication. Currently only for VoIP / PBX integration.

      <h2>Introduction</h2>

      <h4>_Types_</h4>

      Types are Javascript Types.
      *  “Date”  (also written “date”)  is always a “datetime” - "2019-05-28T12:26:00.000Z" as known from other languages like Java.
      *  Number is a double float, but can be denoted as an integer.

      The other structures are standard Javascript Object Notation (JSON) structures:
      *  String
      *  Array
      *  Object

      <h4>_Notes_:</h4>
      * For multi-tenant systems, the REST server determines which tenant is being addressed by the tenantId in the hostname that the request is sent to.
      * Regular Expression operators are available for all "string" type parameters. Use
      * &lt;paramname&gt;_regex  (matches /^val/) OR &lt;paramname&gt;_iregex (matches  /val/, "i")

      <h4>_API "Activity" Endpoints_:</h4>
      * The Doc Cirrus workflow requires that a valid contract be created, before another activity can be created. The contract and activities are related by their location, case folder and patient references.
      * When creating a '0102' type PUBLIC contract, the system will create a DIAGNOSIS of type 'UUU' automatically.  This is because specialists such as radiologists, or laboratories only analyse without diagnosing the patient in some situations.
      * Different kinds of utility are specified through the subType field, which can be used in the other Activity endpoints for user specified categorisation.
      * Contract type activities have restrictions on where they can be moved (e.g. changing case folder, or changing the time of the activity).  Illegal changes are cancelled by the system and an error is returned.

      Activity endpoints are the following:
      *   labdata
      *   complexprescription
      *   contract
      *   assistive
      *   meddata
      *   medication
      *   treatment
      *   diagnosis
      *   invoice
      *   utility


      <h4>_API "Simple Activity" Endpoints_:</h4>
      * Simple activities all have a common Schema.
      * You can POST, or PUT them in the usual manner( as mentioned below ).
      * If requesting only simple activities of a specific type, the caller must always add a query parameter to the REST interface in the following manner: /2/simple_activity?actType=THERAPY

      Simple activity endpoints are always up to date in the RAML Schema, and currently the following:
      *   THERAPY
      *   CAVE
      *   HISTORY
      *   EXTERNAL
      *   FINDING
      *   PREVENTION
      *   PROCEDERE
      *   REMINDER
      *   CREDITNOTE
      *   WARNING1
      *   WARNING2
      *   COMMUNICATION
      *   PROCESS
      *   CONTACT
      *   FROMPATIENT
      *   FROMPATIENTMEDIA
      *   TELECONSULT
      *   MEDICATIONPLAN
      *   GRAVIDOGRAMM
      *   DOCLETTERDIAGNOSIS
      *   DOCLETTER
      *   PRIVPRESCR
      *   PUBPRESCR
      *   FORM
      *   THERAPYSTEP

      <h4>_Operators_</h4>
      Search parameters also allows operators.
      *   DCQuery.GT_OPERATOR = 'gt'
      *   DCQuery.LT_OPERATOR = 'lt'
      *   DCQuery.EQ_OPERATOR = 'eq'
      *   DCQuery.EQ_OPERATOR_FOR_NUMBER = 'eqNumber'
      *   DCQuery.EQ_BOOL_OPERATOR = 'bool_eq'
      *   DCQuery.EQDATE_OPERATOR = 'eqDate'
      *   DCQuery.GTE_OPERATOR = 'gte'
      *   DCQuery.LTE_OPERATOR = 'lte'
      *   DCQuery.IREGEX_OPERATOR = 'iregex'
      *   DCQuery.REGEX_OPERATOR = 'regex'
      *   DCQuery.IN_OPERATOR = 'in'
      *   DCQuery.ENUM_OPERATOR = 'enum'
      *   DCQuery.NOT_IREGEX_OPERATOR = 'notiregex'
      *   DCQuery.NIN_OPERATOR = 'nin'

      <h4>_Testing the API_:</h4>
      * Create a user for REST access in your tenant or appliance. (e.g. "user", "password")
      * Create a testfile for an endpoint, by copying a response JSON from this documentation and saving it (name it e.g. "test_data.json").
      * Then make the REST call. The following example uses the command line utility "curl".
      *  curl -k -X POST -H "Content-Type:application/json"  --user user:"password" https://&lt;host_address&gt;/2/diagnosis -d @test_data.json
      * The Doc Cirrus test cases demonstrate on a high level the kind of algorithm you need to implement to add activities to the system: <br/><img src='TestSuiteAlgorithm.png'/>


securitySchemes:
  - basic:
       type: Basic Authentication
  - JWT:
        description: Solutions have the possibility of using a JWT based authentication mechanism to interact with /2.  A token is issued by DC and has to be activated by each individual datasafe.
        type: x-{other}
        describedBy:
          headers:
            Authorization:
                description: X-DC-App-Name
                type: string
                required: true
          responses:
            401:
              description: |
                        Bad or expired token. This can happen if the user revokes
                        the solution's access. The user
  - oauth2:
        description: |
            Doc Cirrus supports OAuth 2.0 for authenticating all API requests. Authorisation service is provided by partner.
        type: OAuth 2.0
        describedBy:
            headers:
                Authorization:
                    description: |
                       Used to send a valid OAuth 2 access token. Do not use
                       with the "access_token" query string parameter.
                    type: string
            queryParameters:
                access_token:
                    description: |
                       Used to send a valid OAuth 2 access token. Do not use together with
                       the "Authorization" header
                    type: string
            responses:
                401:
                    description: |
                        Bad or expired token. This can happen if the user or Doc Cirrus
                        revoked or expired an access token. To fix, you should re-
                        authenticate the user.
                403:
                    description: |
                        Bad OAuth request (wrong consumer key, bad nonce, expired
                        timestamp...). Unfortunately, re-authenticating the user won\'t help here.
        settings:
            authorizationUri: https://www.<partner-domain-name>/2/oauth2/authorize
            accessTokenUri: https://api.<partner-domain-name>/2/oauth2/token
            authorizationGrants: [ code, token ]
schemas: !include ${schemaFileName}

#
#
# these are default actions for the REST interface...
#
#
resourceTypes:
  - custom-function:
      get:
        securedBy: [basic, oauth2]
        responses:
          200:
            description: either of the following
            body:
              application/json:
                example: <<exampleData>>
          400:
            body:
              application/json:
                example: |

          404:
            body:
              application/json:
                example: |


  - subdocument-collection-item:
      description: Access an individual <<resourcePathName|!singularize>>
            within a parent document. The parent document must be specified by Id before using the sub-document (collection).

             Use this to either update the individual sub-document, or to delete it.
      put:
        description: Update a specific <<resourcePathName|!singularize>>. You must use the ID of the record.
        securedBy: [basic, oauth2]
        responses:
          200:
            body:
              application/json:
                example: |
                  Similar response as for <<parentName>> PUT, with additonal metadata.
          400:
            body:
              application/json:
                example: |

          404:
            body:
              application/json:
                example: |

      delete:
        description: Delete a specific <<resourcePathName|!singularize>>.
        securedBy: [basic, oauth2]
        responses:
          200:
            body:
              application/json:
                example: |
                  [{
                      "meta": {
                          "errors": [],
                          "warnings": [],
                          "model": <<parentName>>,
                          "query": {
                               "_id": <mongo_id_of_parent>,
                               "<<resourcePathName>>._id": <mongo_id_of subdoc>
                          }
                          "itemsPerPage": null,
                          "totalItems": 1,
                          "page": null,
                          "replyCode": 200
                    },
                    "data": <<exampleSub>>
                  ]
          400:
            body:
              application/json:
                example: |

          404:
            body:
              application/json:
                example: |


  - subdocument-collection:
      description: Sub-documents description.  <b>Note that you cannot actually make calls to this model.</b> Collection of available <<resourcePathName>> which are sub-documents within a <<parentName>> document in a collection. The parent document must be specified before using the sub-document (collection).
      post:
        description: Update a specific <<resourcePathName|!singularize>>. You should use the ID of the record. If you use a query and several records match, only the first will be updated (default mongoDB behaviour).
        securedBy: [basic, oauth2]
        responses:
          200:
            body:
              application/json:
                example: |
                  {
                      "meta": {
                          "errors": [],
                          "warnings": [],
                          "model": <<parentName>>,
                          "query": {
                              "_id": "54be764fc404c1d77a286d4d"    },
                          "itemsPerPage": null,
                          "totalItems": 1,
                          "page": null,
                          "replyCode": 200
                    }
          400:
            body:
              application/json:
                example: |

          404:
            body:
              application/json:
                example: |

  - collection:
      description: Collection of available <<resourcePathName|!pluralize>> via REST /2.
      get:
        description: Get a list of <<resourcePathName|!pluralize>>.
        securedBy: [basic, oauth2, JWT]
        responses:
          200:
            body:
              application/json:
                schema: <<resourcePathName>>
                example: <<exampleCollection>>
          400:
            body:
              application/json:
                example: |

      post:
        description: |
          Add a new <<resourcePathName|!singularize>>.
        securedBy: [basic, oauth2]
        body:
          application/json:
            schema: <<resourcePathName>>
        responses:
          200:
            body:
              application/json:
                example: |
                  {
                      "meta": {
                          "errors": [],
                          "warnings": [],
                          "model": <<resourcePathName>>,
                          "query": null,
                          "itemsPerPage": null,
                          "totalItems": 1,
                          "page": null,
                          "replyCode": 200
                    },
                    "data": [
                       "54be764fc404c1d77a286d4d"
                     ]
                   }

          400:
            body:
              application/json:
                example: |

  - collection-item:
      description: Entity representing a <<resourcePathName|!singularize>>
      get:
        description: |
          Get the <<resourcePathName|!singularize>>
          with <<resourcePathName|!singularize>>Id =
          {<<resourcePathName|!singularize>>Id}
        securedBy: [basic, oauth2]
        responses:
          200:
            body:
              application/json:
                example: |
                  <<exampleItem>>
          400:
            body:
              application/json:
                example: |

          404:
            body:
              application/json:
                example: |

      put:
        description: Update a specific <<resourcePathName|!singularize>> using the ID of the record.


          _Notes_


                * The entire resource must always be submitted with a put.


                * For parts of the resource which are lists (JSON arrays) of information (e.g. addresses, communications, or opening times), you can remove members from the list by putting the entire new list.
        securedBy: [basic, oauth2]
        responses:
          200:
            body:
              application/json:
                example: |
                   <<exampleItem>>
          400:
            body:
              application/json:
                example: |

          404:
            body:
              application/json:
                example: |

      delete:
        description: Delete a specific <<resourcePathName|!singularize>>.
        securedBy: [basic, oauth2]
        responses:
          200:
            body:
              application/json:
                example: |
                  <<exampleItem>>
          400:
            body:
              application/json:
                example: |

          403:
            body:
              application/json:
                example: |

          404:
            body:
              application/json:
                example: |

traits:
  - sortable:
      queryParameters:
        sort:
          description: |
            Sort the result list by field: <<fieldsList>>. Fields are comma-separated and can accept a value if followed by a colon mark (see example).
          required: false
          example: |
            'field1,field2:1'
  - pageable:
      queryParameters:
        page:
          description: Skip over a number of pages by specifying an offset value for the query
          type: integer
          required: false
          example: 20
          default: 0
        itemsPerPage:
          description: Limit the number of elements on the response
          type: integer
          required: false
          example: 80
          default: 1000
        noCountLimit:
          description: Pageable results return the totalItems field which is the count of collection which is limited to 2001. If this parameter is set to 'true', then the total count is returned.
          type: string
          required: false
          example: 'true'
          default: 'false'



#
#
# these are actual paths allowed in the REST interface...
#
#
\n`;
        }

        const RAML_HEADER_STR_DE = createHeaderStr({country: 'German', schemaFileName: SCHEMA_FILE_NAME_DE, apiFileName: API_FILE_NAME_DE } );
        const RAML_HEADER_STR_CH = createHeaderStr( {country: 'Swiss', schemaFileName: SCHEMA_FILE_NAME_CH, apiFileName: API_FILE_NAME_CH } );


        var
            publisher = {};

        Y.mix( publisher, {

            /**
             * Display table of     Activity: Type <-> Field
             *
             * This table is the basis of the improved observable boilerplate function in the
             * client.
             *
             * You can cut and paste the output into the wiki at:
             * https://confluence.dc/pages/viewpage.action?pageId=14385261
             *
             * @method displayActTypeMap
             * @param callback
             */
            displayActTypeMap: function( callback ) {
                callback = callback || function() {
                    process.exit();
                };
                // Diagnostics for actTypes
                var
                    schema = Y.doccirrus.schemas.activity,
                    at = schema.activityTypes,
                    atf = schema.actTypeDefns,
                    result = {},
                    t1 = Date.now(),
                    header = new Array( at.length + 1 );

                Y.log( 'Displaying activity mapping.', 'info', NAME );

                //console.warn( 'at', Object.keys( at ) )
                //console.warn( 'atf', Object.keys( atf ) )

                result.header = header;
                header[0] = ' ';

                at.forEach( function( type, i ) {
                    var t;
                    header[i + 1] = type;

                    // get _T defns for the type
                    t = atf[type] || [];

                    t.unshift( 'Activity_T' );

                    t.forEach( function( item ) {
                        var
                            f,
                            fields = schema.types[item];

                        for( f in fields ) {
                            if( fields.hasOwnProperty( f ) &&
                                0 !== f.indexOf( 'base_' ) ) {
                                if( result[f] ) {
                                    result[f][i + 1] = 'X';
                                } else {
                                    result[f] = new Array( at.length + 1 );
                                    result[f][0] = f;
                                    result[f][i + 1] = 'X';
                                }

                            }
                        }

                    } );

                } );

                function printResultCSV() {
                    var hdr = 0,
                        resultStr = '',
                        fs = require( 'fs' );

                    Y.Object.each( result, function( l ) {
                        var t, line = [], i;
                        for( i = l.length; i > 0; i-- ) {
                            line[i - 1] = l[i - 1] ? l[i - 1] : ' ';
                        }
                        if( 0 === hdr ) {
                            t = line.join( '|' );
                            t = '|' + t + '|';
                            hdr = 1;
                        } else {
                            t = line.join( '|' );
                            t = '\n|' + t + '|';
                        }
                        resultStr += t;
                    } );
                    resultStr += '\n\n';

                    fs.writeFile( process.cwd() + '/activity-table.txt', resultStr, {flags: 'w'}, function done() {
                        console.log( 'Printed Activity Diagnostics:  in ms: ' + (Date.now() - t1) ); // eslint-disable-line
                        callback( null, 'Printed Activity Diagnostics:  in ms: ' + (Date.now() - t1) );
                    } );
                }

                printResultCSV();

            },

            /**
             * @method convertSchemasToRAML
             *
             * - converts the DC Schema files to JSON-Schema v.4.
             * - reads ramlConfig in each schema to embed these JSON schemas in RAML collections
             *
             * The output is currently output directly to the console / stdout. It is
             * divided into two clearly marked sections.  These should each be placed in
             * a file as named in the marking, in the same folder.
             *
             */
            convertSchemasToRAML: function() {
                const
                    spc6 = '      ',
                    spc8 = '        ',

                    fs = require( 'fs' ),
                    schema_DE_RAMLWriteStream = fs.createWriteStream( RAML_SCHEMA_DE_PATH ),
                    api_DE_RAMLWriteStream = fs.createWriteStream( RAML_API_DE_PATH ),

                    schema_CH_RAMLWriteStream = fs.createWriteStream( RAML_SCHEMA_CH_PATH ),
                    api_CH_RAMLWriteStream = fs.createWriteStream( RAML_API_CH_PATH ),

                    schemaProperties = {},

                    collectedResources = {},
                    collectedDescr = {},
                    // add allowed subschemas here
                    subSchemasPerSchema = {
                        'employee': ['addresses', 'communications'],
                        'patient': ['addresses', 'communications', 'insuranceStatus', 'partnerIds'],
                        'dispatchrequest': ['dispatchActivities', 'activities']
                    },
                    // a list of all subschemas
                    subSchemas = ['addresses', 'communications', 'insuranceStatus', 'partnerIds', 'dispatchActivities', 'dispatchActivities.activities', 'rules', 'medData'],
                    readonlySchemas = ['printer', 'cardreader', 'intouch', 'import'], // todo determine from action list, and embed with own types,
                    omitMeta = ['complexprescription'],

                    schemas = Y.doccirrus.schemas,
                    publishList2 = Y.doccirrus.RESTController_2.WHITELISTED_SCHEMAS,
                    publishList3 = Y.doccirrus.RESTController_3.WHITELISTED_SCHEMAS,

                /**
                 * When subSchemas are referenced within a schema, some of its fields may not apply to the parent schema
                 * To fix this issue, the following object is used to override or add specified fields to the subSchema
                 * The hierarchy in this object is schema->subschema->field->value
                 */
                    customSubSchemaForSchema = {
                        patient: {
                            addresses: {
                                kind: {
                                    "enum": [
                                        "OFFICIAL",
                                        "POSTBOX",
                                        "POSTAL",
                                        "BILLING",
                                        "VISIT",
                                        "EMPLOYER"
                                    ],
                                    "required": true
                                }
                            }
                        }
                    };


                    let
                        doneSS = [],
                        apiComplete = false,
                        sampleComplete = false,
                        schemaComplete = false;

                // BLACKLISTED/Undocumented apis. do not publish the test interface.
                delete publishList2.test;
                delete publishList2.rule;
                delete publishList2.jira;
                delete publishList2.medicationscatalog;
                delete publishList2.drug;
                delete publishList2.formportal;
                delete publishList2.reportingjob;
                delete publishList2.catalog;

                readonlySchemas.forEach( i => {
                    delete publishList2[i];
                    delete publishList3[i];
                } );

                console.log( publishList2 );  // eslint-disable-line
                Y.log( 'Generating German RAML API: ' + RAML_API_DE_PATH, 'info', NAME );
                Y.log( 'Generating German RAML SCHEMA: ' + RAML_SCHEMA_DE_PATH, 'info', NAME );
                Y.log( 'Generating Swiss RAML API: ' + RAML_API_CH_PATH, 'info', NAME );
                Y.log( 'Generating Swiss RAML SCHEMA: ' + RAML_SCHEMA_CH_PATH, 'info', NAME );

                //
                // Documentation Type 0), samples
                //

                function finished() {
                    setImmediate( function() {
                        process.exit();
                    } );
                }

                function getSamplesFromTest(prefix) {
                    var
                        Promise = require( 'bluebird' ),
                        testUtils = require( API2_TEST_PATH + 'testUtils' );

                    Promise.reduce( Object.keys( publishList2 ), function( total, item ) {
                        var
                            filename = RAML_BUILD_PATH + item + RAML_SAMPLE_SUFFIX,
                            query = {},
                            len = 1,
                            mod,
                            content;

                        mod = testUtils.loadTestModule( prefix + '/' + item );
                        if( !mod ) {
                            Y.log( 'RAML Missing sample data: ' + filename, 'error', NAME );
                            // no promise is returned
                            return total;
                        } else {
                            content = mod.getData();
                            if( Array.isArray( content ) ) {
                                len = content.length;
                            } else {
                                if( content._id ) {
                                    query = {_id: content._id};
                                }
                                content = [content];
                            }

                            //filter content
                            content.forEach( contentElement => {
                                if( 'object' === typeof contentElement ) {
                                    Object.keys( contentElement ).forEach( elementKey => {
                                        //filter special comment value
                                        if( "comment" === elementKey && "API2TestingActivity" === contentElement[elementKey] ) {
                                            contentElement[elementKey] = "Any comment";
                                        }
                                    } );
                                }
                            } );

                            Y.log( 'Generating RAML sample data: ' + filename, 'info', NAME );

                            let data = omitMeta.includes( item ) ? JSON.stringify( content[0], null, 2 ) :
                                `{
  "meta": {
    "errors": [],
    "warnings": [],
    "query": ${JSON.stringify( query )},
    "itemsPerPage": null,
    "totalItems": ${len},
    "page": null,
    "replyCode": 200
  },
  "data": ${JSON.stringify( content, null, 2 )}
 }
`;
                            Promise.promisify( fs.writeFile )( filename, data );
                            return total + 1;
                        }
                    }, 0 ).then( function( total ) {
                        Y.log( 'RAML Done converting sample data, converted ' + total + ' files.', 'info', NAME );
                        sampleComplete = true;
                        if( apiComplete && schemaComplete ) {
                            finished();
                        }
                    } ).catch( function( err ) {
                        Y.log( 'RAML Error: ' + err.stack, 'error', NAME );
                    } );
                }

                getSamplesFromTest(countryMode);

                //
                // Documentation Type 1) Schemas
                //

                function getRAMLForSchema( schemaName, destStr ) {
                    return ` - ${schemaName}: |
    {
${spc6}"type": "object",
${spc6}"$schema": "http://json-schema.org/draft-04/schema",
${spc6}"id": "http://doccirrus.com/schema/${schemaName}",
${spc6}"required": true,
${spc6}"properties": {
${spc8}${spc8}${destStr}
${spc8}}
${spc8}${spc6}    }\n`;
                }

                function resourceIsValid( args ) {
                    const {property, description, isDeepNested} = args;
                    if( isDeepNested ) {
                        return false;
                    }
                    if( !property.apiv || !property.apiv.queryParam ) {
                        return false;
                    }
                    if( typeof description === 'object' ) {
                        return !Y.doccirrus.commonutils.isObjectEmpty( description );
                    }
                    return true;
                }

                function shouldCustomiseSubSchema( schemaName, prop ) {
                    return customSubSchemaForSchema[schemaName] && customSubSchemaForSchema[schemaName][prop];
                }

                function customiseSubSchema( args ) {
                    const {schemaName, prop, items} = args;
                    let key;
                    for( key in customSubSchemaForSchema[schemaName][prop] ) {
                        if( !customSubSchemaForSchema[schemaName][prop].hasOwnProperty( key ) ) {
                            continue;
                        }
                        items.properties[key] = customSubSchemaForSchema[schemaName][prop][key];
                    }
                    return items;
                }

                function outputSchema( schemaName, sch, arrayDeep ) {
                    var
                        fileStr = '',
                        destDE = {},
                        destCH = {},
                        destStr;
                    arrayDeep = arrayDeep || false;

                    Object.keys( sch ).forEach(
                        function( prop ) {
                            var resDescr = {},
                                propObj = sch[prop];
                            if( !arrayDeep && Array.isArray( propObj ) && -1 < subSchemas.indexOf( prop ) ) {

                                let items = Object.assign( {
                                        //$ref: "http://doccirrus.com/schema/" + prop
                                    },
                                    schemaProperties[prop] || {}
                                );

                                if( shouldCustomiseSubSchema( schemaName, prop ) ) {
                                    items = customiseSubSchema( {schemaName, prop, items} );
                                }

                                if( !schemaProperties[prop] ) {
                                    console.warn( 'Not found schema reference ', prop ); // eslint-disable-line
                                }

                                destDE[prop] = {
                                    type: 'array',
                                    items: items
                                };
                                destCH[prop] = {
                                    type: 'array',
                                    items: items
                                };
                                //dest[prop].type = 'array';

                                if( propObj.length ) {
                                    outputSchema( schemaName, propObj[0], true );
                                }
                            }
                            if (countryMode === 'de' ){
                                if ( propObj.apiv && 2 === propObj.apiv.v ){
                                    if( propObj.apiv.countryMode && propObj.apiv.countryMode[0].includes('D') ) {
                                        return createEntry(destDE);
                                    }
                                    else if ( !propObj.apiv.countryMode ){
                                        return createEntry(destDE);
                                    }
                                    return;
                                }
                            } else if (countryMode === 'ch'){
                                if ( propObj.apiv && 2 === propObj.apiv.v ){
                                    if( propObj.apiv.countryMode && propObj.apiv.countryMode[0].includes('CH') ) {
                                        return createEntry(destCH);
                                    }
                                    else if ( !propObj.apiv.countryMode ){
                                        return createEntry(destCH);
                                    }
                                    return;
                                }
                            }

                            function createEntry(nameOfDest){
                                nameOfDest[prop] = Object.keys( propObj ).reduce( function( subSchema, name ) {
                                    if( name === 'type' ||
                                        name === 'description'
                                    ) {
                                        // check if we have a simple array type
                                        // e.g. ['string']
                                        if( Array.isArray( propObj[name] ) ) {
                                            subSchema[name] = {
                                                "type": "array",
                                                "items": {
                                                    "type": "string"
                                                }
                                            };
                                        } else if ( name === 'description' && 'string' === typeof propObj[name] ) {
                                            // add description as is
                                            subSchema[name] = propObj[name];
                                            resDescr[name] = propObj[name];
                                            resDescr.__n = prop;
                                        } else {
                                            // otherwise handle basic properties of the schema type
                                            // and description, just copy.
                                            subSchema[name] = 'string' === typeof propObj[name] ? propObj[name].toLowerCase() : propObj[name];
                                            resDescr[name] = 'string' === typeof propObj[name] ? propObj[name].toLowerCase() : propObj[name];
                                            resDescr.__n = prop;
                                        }
                                    } else if(
                                        name === 'required' ||
                                        name === 'validate'
                                    ) {
                                        // handle basic properties of the schema type
                                        subSchema[name] = 'string' === typeof propObj[name] ? propObj[name].toLowerCase() : propObj[name];
                                    } else if(
                                        name === 'enum'
                                    ) {
                                        delete subSchema.type;
                                        subSchema.enum = propObj.enum;
                                    } else if(
                                        name === '-en' && propObj['-en'].toLowerCase() !== prop.toLowerCase()
                                    ) {
                                        subSchema.description = propObj['-en'];
                                    }

                                    if( propObj.apiv && propObj.apiv.readOnly === true ) {
                                        subSchema.readOnly = true;
                                    }

                                    return subSchema;
                                }, {} );
                                if( !collectedResources[schemaName] ) {
                                    collectedResources[schemaName] = [];
                                }
                                if( resourceIsValid( {
                                    property: propObj,
                                    description: resDescr,
                                    isDeepNested: arrayDeep
                                } ) ) {
                                    // collect info on the resources
                                    collectedResources[schemaName].push( resDescr );
                                } // else it is not in the api.
                            }
                        }
                    );

                    if ( countryMode === 'de' ){
                        if( Object.keys( destDE ).length && !arrayDeep ) {
                            destStr = JSON.stringify( destDE, null, 10 );
                            destStr = destStr.substr( 2, destStr.length - 4 );

                            schemaProperties[schemaName] = {
                                "type": "object",
                                "$schema": "http://json-schema.org/draft-04/schema",
                                "id": "http://doccirrus.com/schema/schemaName",
                                "properties": destDE
                            };

                            // finally stringify and write away
                            fileStr = getRAMLForSchema( schemaName, destStr );
                            //if(schemaName==='dispatchrequest')
                            schema_DE_RAMLWriteStream.write(fileStr);
                        }
                    }

                    if ( countryMode === 'ch' ){
                        if( Object.keys( destCH ).length && !arrayDeep ) {
                            destStr = JSON.stringify( destCH, null, 10 );
                            destStr = destStr.substr( 2, destStr.length - 4 );
                            schemaProperties[schemaName] = {
                                "type": "object",
                                "$schema": "http://json-schema.org/draft-04/schema",
                                "id": "http://doccirrus.com/schema/schemaName",
                                "properties": destCH
                            };
                            fileStr = getRAMLForSchema( schemaName, destStr );
                            schema_CH_RAMLWriteStream.write(fileStr);
                        }
                    }
                }

                //
                // 1. go through all the schemas we are publishing
                function generatePublishList( schemaName ) {
                    var
                        proceed = false,
                        dbOrVirtualSchema;

                    if( schemas[VIRTUAL_PREFIX + schemaName] && schemas[VIRTUAL_PREFIX + schemaName].schema ) {
                        dbOrVirtualSchema = schemas[VIRTUAL_PREFIX + schemaName];
                        proceed = true;
                    } else if( schemas[schemaName] && schemas[schemaName].schema ) {
                        dbOrVirtualSchema = schemas[schemaName];
                        proceed = true;
                    }

                    if( proceed ) {
                        // 2. output some specific subdocs, but only once
                        subSchemas.forEach( function( ssName ) {
                            var sssName,
                                sssi = ssName.indexOf( '.' );
                            if( -1 < sssi &&
                                -1 === doneSS.indexOf( ssName ) ) {
                                // allow only one level of sub-subschemas for now
                                sssName = ssName.substr( sssi + 1 );
                                let ssNameParent = ssName.substr( 0, sssi );
                                //console.log( "ssName ssNameParent sssName", ssName, ssNameParent, sssName);

                                if( dbOrVirtualSchema.schema[ssNameParent] ) {
                                    //console.dir( dbOrVirtualSchema.schema.dispatchActivities );
                                    //console.log( "ssName, dbOrVirtualSchema.schema[ssName][0][sssName][0]", ssName, sssName, dbOrVirtualSchema.schema[ssNameParent][0][sssName][0] );
                                    outputSchema( ssName, dbOrVirtualSchema.schema[ssNameParent][0][sssName][0] );

                                    // b. remove the value
                                    doneSS.push( ssName );
                                }
                            } else if(
                                dbOrVirtualSchema.schema[ssName] &&
                                -1 === doneSS.indexOf( ssName ) ) {

                                // a. output it
                                //console.dir( dbOrVirtualSchema.schema.addresses );
                                outputSchema( ssName, dbOrVirtualSchema.schema[ssName][0] );

                                // b. remove the value
                                doneSS.push( ssName );
                            }
                        } );

                        // 3. output the schema
                        //console.log( 'outputSchema( schemaName, dbOrVirtualSchema.schema );', schemaName, dbOrVirtualSchema.schema );
                        outputSchema( schemaName, dbOrVirtualSchema.schema );

                        // 4. add custom description
                        collectedDescr[schemaName] = {};
                        //console.log("collectedDescr[schemaName]",collectedDescr[schemaName],"dbOrVirtualSchema.ramlConfig",dbOrVirtualSchema.ramlConfig);
                        if( dbOrVirtualSchema.ramlConfig && dbOrVirtualSchema.ramlConfig["2"] && dbOrVirtualSchema.ramlConfig["2"].description ) {
                            //console.log('added!');
                            collectedDescr[schemaName]._description = dbOrVirtualSchema.ramlConfig["2"].description;
                        }
                    }
                }

                Object.keys( publishList2 ).forEach( generatePublishList );

                doneSS = [];

                //Object.keys( publishList3 ).forEach( generatePublishList );

                // finalize writing to schema here.
                if ( countryMode === 'de' ){
                    schema_DE_RAMLWriteStream.on( 'finish', function() {
                        if( apiComplete && sampleComplete ) {
                            Y.log( 'Done generating Swiss RAML Schema. ', 'info', NAME );
                            finished();
                        }
                    } );
                    schema_DE_RAMLWriteStream.end();
                    api_DE_RAMLWriteStream.write( RAML_HEADER_STR_DE );
                }
                if (countryMode === 'ch' ){
                    schema_CH_RAMLWriteStream.on( 'finish', function() {
                        if( apiComplete && sampleComplete ) {
                            Y.log( 'Done generating Swiss RAML Schema. ', 'info', NAME );
                            finished();
                        }
                    } );
                    schema_CH_RAMLWriteStream.end();
                    api_CH_RAMLWriteStream.write( RAML_HEADER_STR_CH );
                }
                //
                // Documentation Type 2) API
                //

                // this is the master RAML heading and definition. Not very readable, but it should not
                // be changed too often.  Changing this means you want a new kind of REST version

                function getQP( qParamArr ) {
                    var
                        queryParams = '';

                    qParamArr.forEach( function( item ) {
                        queryParams += spc6 + item.__n + ':\n';
                        delete item.__n;
                        Object.keys( item ).forEach( function( p ) {
                            var s;
                            if( 'function' === typeof item[p] ) {
                                s = '"string"';
                            } else if( Array.isArray( item[p] ) ) {
                                s = '"array"';
                            } else if( 'objectid' === item[p] ) {
                                s = '"string"';
                            } else {
                                s = JSON.stringify( item[p] );
                            }

                            queryParams += spc8 + p + ': ' + s + '\n';
                        } );
                    } );
                    //console.log( queryParams )
                    return queryParams;
                }

                function getSubDoc( subDocName, schemaName ) {
                    var subDoc;
                    subDoc = `    /${subDocName}/{_id}:
${spc6}type:
${spc6}  subdocument-collection-item:
${spc6}    parentName: "${schemaName}"
${spc6}    exampleSub: !include ${subDocName}-sample.json
`;
                    //console.log( subDoc )
                    return subDoc;
                }

                function outputCollectedResources() {
                    Object.keys( collectedResources ).sort().forEach( function( itemName ) {
                        if( subSchemas.indexOf( itemName ) > -1 ) {
                            // don't output individual infos for the subschemas
                            return;
                        }
                        /*jshint multistr:true*/
                        var
                            str,
                            resList = collectedResources[itemName],
                            resNameList = resList.map( function( item ) {
                                return item.__n;
                            } ),
                            filteredResNameList = resNameList.filter( Boolean ),
                            sortableStr = filteredResNameList.join( ', ' );

                        // finally stringify
                        let apiV = (Object.keys( publishList3 ).some( i => {
                            return i === itemName;
                        } ) ? '3' : '2');
                        str = `/${apiV}/${itemName}:
  type:
    collection:
      exampleCollection: !include ${itemName}-sample.json`;

                        if( collectedDescr[itemName] && collectedDescr[itemName]._description ) {
                            str += '\n  description: ' + collectedDescr[itemName]._description;
                        }
                        str += `\n  get:
    is: [
${spc8}sortable: { fieldsList: '${sortableStr}' },
${spc8}pageable
${spc6}]
    queryParameters:
${getQP( resList )}
  /{_id}:
    type:
${spc6}collection-item:
${spc8}exampleItem: !include ${itemName}-sample.json\n`;

                        if( subSchemasPerSchema[itemName] ) {
                            subSchemasPerSchema[itemName].forEach(
                                function( subSchema ) {
                                    str += getSubDoc( subSchema, itemName );
                                }
                            );
                        }
                        api_DE_RAMLWriteStream.write( str );
                        api_CH_RAMLWriteStream.write( str );

                    } );
                }

                outputCollectedResources();

                if ( countryMode === 'de'){
                    api_DE_RAMLWriteStream.on( 'finish', function() {
                        if( schemaComplete && sampleComplete ) {
                            Y.log( 'Done generating German RAML API. ', 'info', NAME );
                            finished();
                        }
                    } );
                    api_DE_RAMLWriteStream.end();
                }

                if ( countryMode === 'ch' ){
                    api_CH_RAMLWriteStream.on( 'finish', function() {
                        if( schemaComplete && sampleComplete ) {
                            Y.log( 'Done generating Swiss RAML API. ', 'info', NAME );
                            finished();
                        }
                    } );
                    api_CH_RAMLWriteStream.end();
                }
                apiComplete = true;
            }

        } );

        let countryMode;
        let i = process.argv.indexOf( '--countryMode' );
        if( i > -1 && process.argv[i + 1] ) {
            countryMode = process.argv[i + 1];
        }

        // run the RAML generation code if required.
        if( -1 < process.argv.indexOf( '--raml-doc' ) ) {
            if( -1 < process.argv.indexOf( '--inspect' ) ) {
                Y.log( 'Providing 10 seconds to open debugger', 'info', NAME );
                setTimeout(
                    publisher.convertSchemasToRAML,
                    10000
                );
            } else {
                publisher.convertSchemasToRAML();
            }

        } else if( -1 < process.argv.indexOf( '--activity-doc' ) ) {
            setTimeout(
                publisher.displayActTypeMap,
                5000
            );
        }

    },
    '0.0.1', {requires: ['dcmongodb', 'commonutils']}
);
