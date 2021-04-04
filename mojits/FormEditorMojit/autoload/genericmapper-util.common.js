/**
 * User: rrrw
 * Date: 26.01.15  13:08
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */


/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'dcgenericmapper-util', function( Y, NAME ) {

        var
            formMappers = [],
            linkedActivityMappers = [],
            _k = Y.dcforms.mapper.koUtils.getKo();

        /**
         * FormMappers define fields(group), dependant FormMappers and the logic to construct the specified fields.
         *
         * @param {object} params
         * @param {string} params.name
         * @param {string[]} params.group
         * @param {string[]|undefined} params.deps
         * @param {function} params.fn
         * @param {string|string[]|undefined} params.allowedActTypes
         * @param {string[]|undefined} params.linkedGroup
         * @constructor
         */
        function FormMapper( params ) {
            if( !params || 'string' !== typeof params.name || !Array.isArray( params.group ) || 'function' !== typeof params.fn ) {
                throw Error( 'insufficient arguments' );
            }

            this.name = params.name;
            this.group = params.group;
            this.linkedGroup = params.linkedGroup || [];
            this.deps = Array.isArray( params.deps ) ? params.deps : [];
            this.allowedActTypes = Array.isArray( params.allowedActTypes ) ? params.allowedActTypes : ('string' === typeof params.allowedActTypes ? [params.allowedActTypes] : []);
            this.fn = params.fn;
        }

        /**
         * FormMapper is considered as async if third argument is specified
         * @returns {boolean}
         */
        FormMapper.prototype.isAsync = function() {
            return Boolean( this.fn.toString().replace( /((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg, '' )
                .match( /^function\s*[^\(]*\(\s*([^\)]*)\)/m )[1]
                .split( /,/ )[2] );
        };

        /**
         * Manipulates formData by calling formMapper.fn(), which should add all fields declared in group.
         * .map() is always async, but .fn() could be either sync or async, depending on how fn is defined.
         *
         * @param formData
         * @param config
         * @param callback
         */
        FormMapper.prototype.map = function( formData, config, callback ) {
            var isAsync = this.isAsync();
            //Y.log( 'FormMapper fn is ' + (isAsync ? 'async' : 'sync'), 'info', NAME );
            this.fn.call( this, formData, config, isAsync ? callback : undefined );
            if( !isAsync ) {
                setTimeout( callback, 0 );
            }
        };

        /**
         * Checks if a FormMapper must be executed in order to map one or more of the specified fields.
         *
         * @param fields
         * @param actType
         * @returns {boolean}
         */
        FormMapper.prototype.match = function( fields, actType ) {
            if( !Array.isArray( fields ) ) {
                return false;
            }

            if( this.allowedActTypes.length && -1 === this.allowedActTypes.indexOf( actType ) ) {
                return false;
            }

            return fields.some( function( field ) {
                //  return true if field is in group OR linkedGroup
                return ( -1 !== this.group.indexOf( field.name ) );
            }.bind( this ) );

        };

        /**
         * Checks if a FormMapper must be executed in order to map one or more of the specified linked activity fields.
         *
         * @param fields
         * @param actType
         * @returns {boolean}
         */
        FormMapper.prototype.matchLinked = function( fields, actType ) {

            if( !Array.isArray( fields ) ) {
                return false;
            }

            if( this.allowedActTypes.length && -1 === this.allowedActTypes.indexOf( actType ) ) {
                return false;
            }

            return fields.some( function( field ) {
                //  return true if field is in group OR linkedGroup
                return ( -1 !== this.linkedGroup.indexOf( field.name ) );
            }.bind( this ) );

        };

        /**
         * Stores context of a single FormMapper sequence that can be executed to construct formData.
         *
         * @param mappedFields
         * @param context
         * @param context.activity
         * @param context.patient
         * @param context.template
         * @param context.locations
         * @constructor
         */
        function FormMapperSequence( mappedFields, context ) {
            this.mappedFields = mappedFields; // contains format options for mapper
            this.context = context; // contains activity, patient data, locations, etc
            this.sequence = [];
        }

        /**
         * Add a mapper to a FormMapperSequence.
         *
         * @param {FormMapper} mapper
         * @param {Boolean} isDep       - If dependency than add at the beginning of sequence
         */
        FormMapperSequence.prototype.add = function( mapper, isDep ) {
            var exists = this.sequence.some( function( seqMapper ) {
                return seqMapper.name === mapper.name;
            } );
            if( !exists ) {
                if( isDep ) {
                    this.sequence.unshift( mapper );
                } else {
                    this.sequence.push( mapper );
                }
            }// else {  //  used in debugging mapper dependencies
            //    Y.log( 'sequence already has this form mapper ' + mapper.name, 'debug', NAME );
            //}
        };

        /**
         * Executes the FormMapperSequence in series.
         * If any mapper return an error then callback will be called with this error and execution is stopped.
         *
         * @param callback
         */
        FormMapperSequence.prototype.execute = function( callback ) {
            var formData = {},
                mappedFields = this.mappedFields,
                context = this.context;

            function iterator( mapper, cb ) {

                try {
                    mapper.map( formData, { mappedFields: mappedFields, context: context }, onMapperRun );
                } catch ( mapperError ) {
                    Y.log( 'FormMapperSequence.execute: (1) Problem running form mapper ' + mapper.name + ': ' + JSON.stringify( mapperError ) + '\n' + mapperError.stack, 'error', NAME );
                    //  continue with other mappers despite error, best effort to prevent missing reporting entries, MOJ-12129
                    cb( null );
                }

                function onMapperRun( err ) {
                    if ( err ) {
                        Y.log( 'FormMapperSequence.execute: (2) Problem running form mapper ' + mapper.name + ': ' + JSON.stringify( err ) + '\n' + err.stack, 'error', NAME );
                        //  continue with other mappers despite error, best effort to prevent missing reporting entries, MOJ-12129
                    }
                    cb( null );
                }
            }

            function finalCb( err ) {
                if( err ) {
                    return callback( err );
                }
                callback( null, formData );
            }

            Y.doccirrus.commonutils.getAsync().eachSeries( this.sequence, iterator, finalCb );
        };

        /**
         * Executes the FormMapperSequence in series.
         * This is a debugging version of this used to find slow mappers and run tests of cache / state.
         *
         * @param callback
         */
        FormMapperSequence.prototype.executeTimed = function( callback ) {
            var formData = {},
                mappedFields = this.mappedFields,
                context = this.context,
                timing = [];

            function iterator( mapper, cb ) {
                var
                    mapperName = mapper.name || 'untitled',
                    startTime = ( new Date() ).getTime();

                mapper.map( formData, { mappedFields: mappedFields, context: context }, onMapperRun );
                function onMapperRun( err ) {

                    if ( err ) { return cb( err ); }
                    var endTime = ( new Date() ).getTime();
                    timing.push( { 'mapperName': mapperName, 'time': (endTime - startTime ) } );

                    cb();
                }
            }

            function finalCb( err ) {

                //  print mapper timing
                var i, totalTime = 0;
                for ( i = 0; i < timing.length; i++ ) { totalTime = totalTime + timing[i].time; }
                for ( i = 0; i < timing.length; i++ ) { timing[i].fraction = ( timing[i].time / totalTime ); }

                if( err ) {
                    return callback( err );
                }

                callback( null, formData );
            }

            Y.doccirrus.commonutils.getAsync().eachSeries( this.sequence, iterator, finalCb );
        };

        /**
         * Returns FormMapper with specified name.
         * (useful for unit tests, should not be called in production)
         * @param name
         * @returns {FormMapper}
         */
        function getFormMapperByName( name ) {
            var result = null;
            formMappers.some( function( mapper ) {
                if( mapper.name === name ) {
                    result = mapper;
                    return true;
                }
            } );
            return result;
        }

        /**
         * Checks which FormMappers must be executed in order to construct formData.
         * Adds the matching FormMappers to new instance of FormMapperSequence.
         * Checks for duplicates and circular dependencies.
         * Return compiled function, that will execute the FormMapperSequence instance.
         *
         * @param mappedFields      {Array} From template
         * @param context
         * @param mapperSet         {Array} May use the full set of form mappers, or only those which affect linked activities
         * @returns {Function}
         */
        function compileFormDataRequest( mappedFields, context, mapperSet ) {
            var mapperSequence = new FormMapperSequence( mappedFields, context );
            mapperSet.forEach( function( mapper ) {
                if( mapper.match( mappedFields, _k.unwrap( context && context.activity && context.activity.actType ) ) ) {
                    // first add dependant mappers
                    mapper.deps.forEach( function( depName ) {
                        var depMapper = getFormMapperByName( depName );
                        if( !depMapper ) {
                            Y.log( 'could not find form mapper', 'warn', NAME );
                            return;
                        }
                        if( -1 === depMapper.deps.indexOf( mapper.name ) ) {
                            mapperSequence.add( depMapper, true );
                        } else {
                            Y.log( 'form mapper compiler detected circular dependency', 'error', NAME );
                            throw Error( 'FormMapper compiler detected circular dependency' );
                        }

                    } );
                    mapperSequence.add( mapper, false );
                }
            } );

            return function( callback ) {
                mapperSequence.execute( callback );
            };

        }

        function compileFormDataRequestLinked( mappedFields, context, mapperSet ) {
            var mapperSequence = new FormMapperSequence( mappedFields, context );
            mapperSet.forEach( function( mapper ) {
                if( mapper.matchLinked( mappedFields, _k.unwrap( context && context.activity && context.activity.actType ) ) ) {
                    // first add dependant mappers
                    mapper.deps.forEach( function( depName ) {
                        var depMapper = getFormMapperByName( depName );
                        if( !depMapper ) {
                            Y.log( 'could not find form mapper', 'warn', NAME );
                            return;
                        }
                        if( -1 === depMapper.deps.indexOf( mapper.name ) ) {
                            mapperSequence.add( depMapper, true );
                        } else {
                            Y.log( 'form mapper compiler detected circular dependency', 'error', NAME );
                            throw Error( 'FormMapper compiler detected circular dependency' );
                        }

                    } );
                    mapperSequence.add( mapper, false );
                }
            } );

            return function( callback ) {
                mapperSequence.execute( callback );
            };

        }

        /**
         * Constructs formData object depending on fields bound in template.
         *
         * @param template
         * @param context
         * @param context.activity
         * @param context.patient
         * @param callback
         */
        function getFormDataByTemplate( template, context, callback ) {
            var mappedFields = template.getSchemaReferences(),
                compiledRequest;

            context.template = template;
            try {
                compiledRequest = compileFormDataRequest( mappedFields, context, formMappers );
            } catch( err ) {
                callback( err );
                return;
            }

            // could return compiledRequest fn so mapper can reuse it?
            compiledRequest( callback, context );
        }

        function getMappingNames( mapperName ) {
            var reducedSchema = Y.dcforms.schema[mapperName];

            if( reducedSchema ) {
                return Object.keys( reducedSchema ).filter( function( k ) {
                    return -1 === ['mapper', 'version'].indexOf( k );
                } );
            }
        }

        /**
         * Constructs formData object for all incase fields.
         *
         * @param context
         * @param context.activity
         * @param context.patient
         * @param callback
         */

        function getFormDataIncase( context, callback ) {
            var mappedFields = [{ name: "insight2", format: "tbd" }],
                compiledRequest;

            context.template = {};
            try {
                compiledRequest = compileFormDataRequest( mappedFields, context, formMappers );
            } catch( err ) {
                callback( err );
                return;
            }

            // could return compiledRequest fn so mapper can reuse it?
            compiledRequest( callback, context );
        }

        /**
         * Constructs formData object with location fields.
         *
         * @param context
         * @param context.location
         * @param callback
         */

        function getFormDataLocation( context, callback ) {
            var mappedFields = [{ name: "setLocationData", format: "tbd" }],
                compiledRequest;

            context.template = {};
            try {
                compiledRequest = compileFormDataRequest( mappedFields, context, formMappers );
            } catch( err ) {
                callback( err );
                return;
            }

            compiledRequest( callback, context );
        }

        /**
         * Constructs formData object with location fields.
         *
         * @param context
         * @param context.location
         * @param callback
         */

        function getFormDataTask( context, callback ) {
            var mappedFields = [
                    { name: "setTaskData", format: "tbd" }
                ],
                compiledRequest;

            context.template = {};
            try {
                compiledRequest = compileFormDataRequest( mappedFields, context, formMappers );
            } catch( err ) {
                callback( err );
                return;
            }

            compiledRequest( callback, context );
        }

        function getWorkListData( context, callback ) {
            var
                mappedFields = [
                    { name: "setWorkListData", format: "tbd" }
                ],
                compiledRequest;

            context.template = {};
            try {
                compiledRequest = compileFormDataRequest( mappedFields, context, formMappers );
            } catch( err ) {
                callback( err );
                return;
            }
            compiledRequest( callback, context );
        }

        function getFormDataSchedule( context, callback ) {
            var
                mappedFields = [
                    { name: "setScheduleData", format: "tbd" },
                    { name: "setPatientData", format: "tbd" },
                    { name: "setEmployeeData", format: "tbd" }
                ],
                compiledRequest;

            context.template = {};
            try {
                compiledRequest = compileFormDataRequest( mappedFields, context, formMappers );
            } catch( err ) {
                callback( err );
                return;
            }

            compiledRequest( callback, context );
        }

        /**
         * Constructs formData object with employee fields.
         *
         * @param context
         * @param context.employee
         * @param callback
         */

        function getFormDataEmployee( context, callback ) {
            var mappedFields = [{ name: "setEmployeeData", format: "tbd" }],
                compiledRequest;

            context.template = {};
            try {
                compiledRequest = compileFormDataRequest( mappedFields, context, formMappers );
            } catch( err ) {
                callback( err );
                return;
            }

            compiledRequest( callback, context );
        }

        /**
         * Constructs formData object with patient fields.
         *
         * @param context
         * @param context.patient
         * @param callback
         */

        function getFormDataPatient( context, callback ) {
            var mappedFields = [{ name: "setPatientData", format: "tbd" }],
                compiledRequest;

            context.template = {};
            try {
                compiledRequest = compileFormDataRequest( mappedFields, context, formMappers );
            } catch( err ) {
                callback( err );
                return;
            }

            compiledRequest( callback, context );
        }

        /**
         * Constructs formData object with basecontact fields.
         *
         * @param context
         * @param context.patient
         * @param callback
         */

        function getFormDataBasecontact( context, callback ) {
            var mappedFields = [{ name: "setPhysicianData", format: "tbd" }],
                compiledRequest;

            context.template = {};
            try {
                compiledRequest = compileFormDataRequest( mappedFields, context, formMappers );
            } catch( err ) {
                callback( err );
                return;
            }

            compiledRequest( callback, context );
        }

        /**
         * Constructs formData object with caseFolder fields.
         *
         * @param context
         * @param context.patient
         * @param callback
         */

        function getFormDataCaseFolder( context, callback ) {
            var mappedFields = [{ name: "setCaseFolderData", format: "tbd" }],
                compiledRequest;

            context.template = {};
            try {
                compiledRequest = compileFormDataRequest( mappedFields, context, formMappers );
            } catch( err ) {
                callback( err );
                return;
            }

            compiledRequest( callback, context );
        }

        /**
         * Constructs formData object with document fields.
         *
         * @param context
         * @param context.patient
         * @param callback
         */

        function getFormDataDocument( context, callback ) {
            var mappedFields = [{ name: "setDocumentData", format: "tbd" }],
                compiledRequest;

            context.template = {};
            try {
                compiledRequest = compileFormDataRequest( mappedFields, context, formMappers );
            } catch( err ) {
                callback( err );
                return;
            }

            compiledRequest( callback, context );
        }

        /**
         * Constructs formData object with catalog usages fields.
         *
         * @param context
         * @param context.catalogUsage
         * @param callback
         */

        function getFormDataCatalogUsage( context, callback ) {
            var mappedFields = [{ name: "setCatalogUsage", format: "tbd" }],
                compiledRequest;

            context.template = {};
            try {
                compiledRequest = compileFormDataRequest( mappedFields, context, formMappers );
            } catch( err ) {
                callback( err );
                return;
            }

            compiledRequest( callback, context );
        }

        /**
         * Constructs formData object with patient fields.
         *
         * @param context
         * @param context.patient
         * @param callback
         */

        function inSight2Patient( context, callback ) {
            var mappedFields = [
                    { name: "setPatientData", format: "tbd" },
                    { name: "markerText", format: "tbd" },
                    { name: "markerArray", format: "tbd" },
                    { name: "removePatientAddresses", format: "tbd" },
                    { name: "castReportingDates", format: "tbd" }
                ],
                compiledRequest;

            context.template = {};
            try {
                compiledRequest = compileFormDataRequest( mappedFields, context, formMappers );
            } catch( err ) {
                callback( err );
                return;
            }

            compiledRequest( callback, context );
        }

        function formMapperExists( newMapper ) {
            return formMappers.some( function( mapper ) {
                return newMapper.name === mapper.name;
            } );
        }

        /**
         * Adds a new FormMapper instance.
         * FormMapper constructor must not be called explicitly.
         *
         * @param {object|FormMapper} params
         * @param {string} params.name
         * @param {string[]} params.group
         * @param {string[]|undefined} params.deps
         * @param {string|string[]|undefined} params.allowedActTypes
         * @param {function} params.fn
         * @param {string[]|undefined} params.linkedGroup
         */
        function addFormMapper( params ) {
            var mapper;
            if( params instanceof FormMapper ) {
                mapper = params;
            } else {
                mapper = new FormMapper( params );
            }
            if( formMapperExists( mapper ) ) {
                Y.log( 'form mapper does already exist', 'debug', NAME );
                return;
            }
            formMappers.push( mapper );

            //  we sometimes need to partially update a form when linked activities change
            if( params.hasOwnProperty( 'linkedGroup' ) ) {
                linkedActivityMappers.push( mapper );
            }
        }

        /**
         * Flushes all FormMapper instances.
         * (useful for unit tests, should not be called in production)
         */
        function removeAllFormMappers() {
            formMappers = [];
            linkedActivityMappers = [];
        }

        /**
         * Return all instantiated FormMappers.
         * (useful for unit tests, should not be called in production)
         * @returns {Array}
         */
        function getAllFormMappers() {
            return formMappers;
        }

        /**
         * Get only the subset of fields with values which which depend on linked activities
         * @returns {Array}
         */

        function getLinkedActivityFields() {
            var linkedActivityFields = [];
            linkedActivityMappers.forEach( function( mapper ) {
                mapper.linkedGroup.forEach( function( fieldName ) {
                    linkedActivityFields.push( fieldName );
                } );
            } );
            return linkedActivityFields;
        }

        /**
         * Forms need to be partially remapped when linked activities change (update totals, tables, etc)
         * This will call back partial formData which depends on linked activities
         *
         *  @param template             {Object}    A dcforms template
         *  @param context              {Object}    Produced by the binder and passed to the mapper
         *  @param context.activity     {Object}    Current activity KO model or plain object
         *  @param context.patient      {Object}    Current patient KO model or plain object
         *  @param callback             {Function}  Of the form fn( err, linkedFormData )
         */

        function getFormDataForLinkedActivities( template, context, callback ) {
            var
                mappedFields = template.getSchemaReferences(),
                compiledRequestLinked;

            context.template = template;

            try {
                compiledRequestLinked = compileFormDataRequestLinked( mappedFields, context, linkedActivityMappers );
            } catch( err ) {
                callback( err );
                return;
            }

            // could return compiledRequest fn so mapper can reuse it?
            compiledRequestLinked( onRequestCompiled, context );

            function onRequestCompiled( err, formData ) {
                if( err ) {
                    callback( err );
                    return;
                }

                var
                    linkedActivityFields = getLinkedActivityFields(),
                    linkedFormData = {},
                    k;

                //  discard mapped fields which do not depend on linked activities
                //  this is to prevent overwriting user changes to forms (MOJ-5439)

                for( k in formData ) {
                    if( formData.hasOwnProperty( k ) ) {
                        if( -1 !== linkedActivityFields.indexOf( k ) ) {
                            linkedFormData[k] = formData[k];
                        }
                    }
                }

                callback( null, linkedFormData );
            }
        }

        /**
         *  Collect all form elements which depend on lined activities and make them read-only
         *
         *  This is to prevent user edit of linked activity fields if configured for this act type (MOJ-6052)
         *
         *  @param template             {Object}    A dcforms template
         */

        function lockLinkedActivityElements( template ) {
            var linkedActivityFields = getLinkedActivityFields();

            //Y.log( 'linkedActivityFields: ' + JSON.stringify( linkedActivityFields ), 'debug', NAME );

            if( Array.isArray( template.pages ) ) {
                template.pages.forEach( function( page ) {
                    if( Array.isArray( page.elements ) ) {
                        page.elements.forEach( function( element ) {
                            var templateFields;
                            if( element.schemaMember ) {
                                // if element is bound to a linked activity field then lock it
                                if( -1 !== linkedActivityFields.indexOf( element.schemaMember ) ) {
                                    Y.log( 'Locking element with linked activity binding: ' + element.elemId + ' / ' + element.schemaMember, 'debug', NAME );
                                    element.readonly = true;
                                }
                            } else if( element.defaultValue ) {
                                /**
                                 * extract template values from defaultValue
                                 * @type {{fieldName: string, field: string, fieldSequence: string[]}[]}
                                 */
                                templateFields = template.extractTemplateFields( element.defaultValue[element.getBestLang()] );

                                // if element is embeds one or more linked activity fields then lock it
                                if( templateFields && templateFields.length && templateFields.length > 0 ) {
                                    Y.log( 'element ' + element.elemId + ' embeds ' + JSON.stringify( templateFields ), 'debug', NAME );
                                    templateFields.forEach( function( fieldConfig ) {
                                        var templateField = fieldConfig.name;
                                        if( -1 !== linkedActivityFields.indexOf( templateField ) ) {
                                            Y.log( 'Locking element with linked activity embed: ' + element.elemId + ' / {{*.' + templateField + '}}', 'debug', NAME );
                                            element.readonly = true;
                                        }
                                    } );
                                }
                            }
                        } );
                    }
                } );
            }
        }

        /*
         *  Record API
         */

        Y.namespace( 'dcforms.mapper' ).genericUtils = {
            getFormDataIncase: getFormDataIncase,
            getFormDataLocation: getFormDataLocation,
            getFormDataEmployee: getFormDataEmployee,
            getFormDataPatient: getFormDataPatient,
            getFormDataBasecontact: getFormDataBasecontact,
            getFormDataCaseFolder: getFormDataCaseFolder,
            getFormDataDocument: getFormDataDocument,
            getFormDataTask: getFormDataTask,
            getFormDataSchedule: getFormDataSchedule,
            getFormDataByTemplate: getFormDataByTemplate,
            getFormDataForLinkedActivities: getFormDataForLinkedActivities,
            inSight2Patient: inSight2Patient,
            addFormMapper: addFormMapper,
            getFormMapperByName: getFormMapperByName,
            getAllFormMappers: getAllFormMappers,
            removeAllFormMappers: removeAllFormMappers,
            getMappingNames: getMappingNames,
            lockLinkedActivityElements: lockLinkedActivityElements,
            getWorkListData: getWorkListData,
            getFormDataCatalogUsage: getFormDataCatalogUsage,
            FormMapper: FormMapper
        };

    },
    '0.0.1',
    {
        requires: ['dcformmap-ko-util', 'dccommonutils']
    }
);