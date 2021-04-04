/*
 *  Reduced schema disk model
 *
 *  This is a helper model for the FormEditorMojit which loads, expands and lists reduced schema stored on disk
 *
 *  SECURITY CONSIDERATIONS
 *
 *  To reduce the risk of code injection via saved schema, the setSchema method is likely to be removed or restricted
 *  in the near future, to remove a potential attach surface.
 *
 *  Copyright (c) 2014 Doc Cirrus GmbH
 *  @author: Ronald Wertlen, Richard Strickland
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */
/*global YUI, __dirname */

YUI.add('schematemplate-flatfile', function(Y, NAME) {
    

    /**
     * Object to read default reduced template set from disk.
     */

    var
        fs = require('fs' ),
        formAssetsBaseDir = __dirname + '/../assets/',
        defaultSchemaDir = formAssetsBaseDir + 'schema/';
    /**
     * Constructor for the FormEditorMojitModelFormsDisk class.
     * @class FormEditorMojitModelFoo
     * @constructor
     */

    Y.namespace('mojito.models')[NAME] = {

        init: function(config) {

            this.config = config;

        },

        /**
         *  Method that will be invoked by the mojit controller to load default schemas.
         *
         *  @param  schemaName  {String}                    Must exist in ../assests/schema/
         *  @param  callback    {function(string,schema)}      The callback function to call when the data has been retrieved.
         */

        getSchema: function(schemaName, callback) {

            var
                schema,
                fileName;

            schemaName = schemaName.replace('.reduced.json', '');

            fileName = schemaName.replace('..', '__ATTEMPTED_DIRECTORY_TRAVERSAL__');     //  crude
            fileName = defaultSchemaDir + fileName + '.reduced.json';

            var that = this;

            fs.exists(fileName, onFileExists);

            function onFileExists( doesExist ){
                Y.log('getSchema ' + schemaName + ' (disk) fileName: ' + fileName);

                if (doesExist) {
                    fs.readFile(fileName, 'utf8', onFileRead);
                } else {
                    return callback ( 'No such file', null );
                }
            }

            function onFileRead(err, rawJSON) {

                if (err)  {
                    callback('Could not read file: ' + fileName, null);
                    return;
                }

                //  allows single-line comments only
                rawJSON = that.cleanJSONComments(rawJSON);

                try {
                    schema = JSON.parse(rawJSON);
                } catch(parseErr) {
                    Y.log('Invalid reduced schema: ' + rawJSON, 'error', NAME);
                    callback('Could not parse reduced schema JSON: ' + parseErr);
                    return;
                }

                if ('_E' === schemaName.substr(schemaName.length - 2)) {
                    that.expandEnum(schemaName, schema, callback);
                } else {
                    that.expandSchema(schemaName, schema, callback);
                }

            }

        },

        /**
         *  Method that will be invoked by the mojit controller to overwrite schema on disk.
         *
         *  WARNING: this method is to be reviewed and may be taken out - since reduced schema may now reference
         *  the DC schema ontology, and be dependant on them, any future version of this method would have to reduce
         *  any expanded form schema which it saves.
         *
         *  @param fileName {String} relative ../assests/schema/, without extention, eg Person_T
         *  @param schema   {Object} Schemas object
         *  @param callback {function(err,data)} The callback function to call when the data has been retrieved.
         */

        setSchema: function(fileName, schema, callback) {

            Y.log('DEPRECATED: to be reviewed setSchema(): ' + JSON.stringify(schema, undefined, 2), 'warn', NAME);

            fileName = fileName.replace('..', '__ATTEMPTED_DIRECTORY_TRAVERSAL__');     //  crude
            fileName = defaultSchemaDir + fileName + '.reduced.json';

            Y.log('setSchema (disk) fileName: ' + fileName);

            //  note: this is utf8
            fs.writeFile(fileName, JSON.stringify(schema, undefined, 2), callback);
        },

        /**
         *  List the default set of reduced schema
         *  @param callback {Function}  Of the form fn(err, data)
         */

        listSchema: function(callback) {
            fs.readdir(defaultSchemaDir, function onDirRead(err, files) {
                if (err) {
                    Y.log('Could not list default reduced schema: ' + err, 'warn', NAME);
                    callback(err);
                    return;
                }

                var
                    i,
                    matching = [];

                for (i = 0; i < files.length; i++) {
                    if (files[i].indexOf('.reduced.json') > 0) {
                        matching.push(files[i].replace('.reduced.json', ''));
                    }
                }

                callback (null, matching);
            });
        },

        /**
         *  Fill in referenced data from DC schema into a reduced schema read from disk
         *
         *  DELETEME - schema are now autoloaded as YUI modules
         *
         *  @param  schemaName  {String}    Corresponds to filename eg, Prescription_T
         *  @param  schema      {Object}    Unexpanded schema
         *  @param  callback    {Function}  Of the form fn(err, schema)
         */

        expandSchema: function(schemaName, schema, callback) {

            //Y.log('Expanding schema ' + schemaName + ':' + JSON.stringify(schema, undefined, 2), 'debug', NAME);
            Y.log('Expanding schema ' + schemaName, 'debug', NAME);

            var
                schemaloader = Y.doccirrus.schemaloader,

            //  these may be copied from DC schema into reduced schema, validation may be used in future
                heritable = ['type', '-en', '-de', 'required' /* , 'validate' */ ],

            //  these members never link to any other schema
                doNotExpand = ['version', 'mapper'],

            //  temp / local
                linkedSchema,
                linkedMember,
                currentMember,
                k,
                i;

            for (k in schema[schemaName]) {                     //  for each member
                if (schema[schemaName].hasOwnProperty(k)) {     //  which belongs to the reduced schema
                    if (-1 === doNotExpand.indexOf(k)) {        //  and which could be linked to a DC schema

                        //Y.log('Expanding member: ' + k, 'debug', NAME);

                        currentMember = schema[schemaName][k];

                        if (currentMember.hasOwnProperty('schema') && currentMember.hasOwnProperty('path')) {

                            //Y.log('Expanding schema member: ' + k + ' ==> ' + currentMember.schema + '::' + currentMember.path, 'debug', NAME);

                            linkedSchema = schemaloader.getSchemaForSchemaName(currentMember.schema);
                            linkedMember = this.getSchemaMemberByPath(linkedSchema, 'schema.' + currentMember.path);

                            //  copy all heritable members into the reduced schema

                            for (i = 0; i < heritable.length; i++) {
                                if (linkedMember.hasOwnProperty(heritable[i])) {
                                    currentMember[heritable[i]] = linkedMember[heritable[i]];

                                    //Y.log('Inherited ' + schemaName + '::' + k + ' ==> ' + heritable[i] + ': ' + currentMember[heritable[i]], 'debug', NAME);
                                }
                            }

                            //  smoke test for previous convention for translation
                            if (!currentMember.hasOwnProperty('label')) {
                                currentMember.label = {
                                    'en': 'FIXME IN JSON',
                                    'de': 'FIXME IN JSON'
                                };
                            }

                            //  temporary measure to inject previouds translation format during transition
                            //  as of 2014-02-29 not all FEM reduced schema have been converted

                            if (currentMember.hasOwnProperty('-en')) {
                                currentMember.label.en = currentMember['-en'];
                            }

                            if (currentMember.hasOwnProperty('-de')) {
                                currentMember.label.de = currentMember['-de'];
                            }

                        }

                        schema[schemaName][k] = currentMember;

                    }
                }
            }

            //Y.log('Expanded schema: ' + JSON.stringify(schema, undefined, 2), 'debug', NAME);

            callback(null, schema);
        },

        /**
         *  Convert an enum from dc-schema format to that used by FEM controls
         *
         *  DELETEME-: schema are now autoloaded as YUI modules
         *
         *  @param  schemaName  {String}        Root of schema  object
         *  @param  schema      {Object}        Unexpanded schema
         *  @param  callback    {Function}      Of the form fn(err, schema)
         */

        expandEnum: function(schemaName, schema, callback) {

            if (!schema[schemaName].hasOwnProperty('import') || !schema[schemaName].import.hasOwnProperty('lib')) {
                Y.log('Not expanding enum: ' + schemaName + ' (not linked to a schema)', 'debug', NAME);
                callback(null, schema);
                return;
            }

            //Y.log('Expanding enum ' + schemaName + ':' + JSON.stringify(schema, undefined, 2), 'debug', NAME);
            Y.log('Expanding enum ' + schemaName, 'debug', NAME);

            var
                schemaloader = Y.doccirrus.schemaloader,
                importOpts = schema[schemaName].import,
                importType = importOpts.hasOwnProperty('type') ? importOpts.type : schemaName,
                linkedSchema = schemaloader.getSchemaForSchemaName(importOpts.lib),
                linkedEnum = this.getSchemaMemberByPath(linkedSchema, 'types.' + importType),
                listItem,
                i;

            //Y.log('Loaded linked enum: ' + JSON.stringify(linkedEnum, undefined, 2), 'debug', NAME);
            //Y.log('Loaded linked enum: ' + importOpts.lib + '.types.' + importType, 'warn', NAME);

            //  inherit value type
            if (linkedEnum.hasOwnProperty('type')) {
                //Y.log('Inherited value type: ' + linkedEnum.type, 'debug', NAME);
                schema[schemaName].type = linkedEnum.type;
            }

            //  note lib, not sure if this is ever used
            schema[schemaName]._lib = importOpts.lib;

            //  split list into values and translations
            if (linkedEnum.hasOwnProperty('list')) {

                //  add required members
                if(!schema[schemaName].hasOwnProperty('enum')) {
                    schema[schemaName].enum = [];
                }

                if(!schema[schemaName].hasOwnProperty('translate')) {
                    schema[schemaName].translate = {};
                }

                //  copy all values in new format
                //Y.log('Inherited list of ' + linkedEnum.list.length + 'values.', 'debug', NAME);
                schema[schemaName].list = linkedEnum.list;

                //  check and copy all values in previous, deprecated format
                for (i = 0; i < linkedEnum.list.length; i++) {
                    listItem = linkedEnum.list[i];

                    //Y.log('Adding listItem: ' + JSON.stringify(listItem), 'warn', NAME);

                    if (listItem.hasOwnProperty('val') && (-1 === schema[schemaName].enum.indexOf(listItem.val))) {

                        if (!listItem.hasOwnProperty('-en')) {
                            listItem['-en'] = 'TRANSLATEME IN SCHEMA';
                        }

                        if (!listItem.hasOwnProperty('-de')) {
                            listItem['-de'] = 'TRANSLATEME IN SCHEMA';
                        }

                        schema[schemaName].enum.push(listItem.val);

                        schema[schemaName].translate[listItem.val] = {
                            'en': listItem['-en'],
                            'de': listItem['-de']
                        };

                    }

                }

            }

            //Y.log('Expanded enum: ' + JSON.stringify(schema, undefined, 2), 'debug', NAME);

            callback(null, schema);
        },

        /**
         *  Look up a nested member of a DC schema
         *
         *  @param  dcSchema    {Object}    For example, a person obejct
         *  @param  path        {String}    eg, 'address.street'
         *  @return             {Object}    Schema member addressed by path
         */

        getSchemaMemberByPath: function(dcSchema, path) {
            var
                //j,
                member = dcSchema,
                currPart = 'schema',
                parts = path.split('.');

            while (parts.length > 0) {

                //  useful for debugging reduced schema, but noisy in use
                //for (j in member) {
                //    Y.log('Expanding: ' + currPart + ': has ' + j, 'debug', NAME);
                //}

                currPart = parts.shift();

                if (member.hasOwnProperty(currPart)) {
                    member = member[currPart];
                } else {
                    Y.log('Error resolving path: ' + path + ' at ' + currPart, 'warn', NAME);
                    return { error: 'Could not resolve path: ' + path };
                }

            }

            return member;
        },

        /**
         *  Method to clean single-line (//) comments from JSON files before parsing them
         *
         *  To allow comments in reduced schema, since their relationships can be complex and change over time.
         *
         *  @param rawJSON
         *  @returns {string}
         */

        cleanJSONComments: function(rawJSON) {

            var
                lines = rawJSON.split("\n"),
                cleanJSON = '',
                i;

            for (i = 0; i < lines.length; i++) {
                if ( ('' !== lines[i].trim()) && ('//' !== lines[i].trim().substring(0, 2)) ) {
                    cleanJSON = cleanJSON + lines[i];
                }
            }

            return cleanJSON;
        }

    };

},
    '0.0.1',
    {
        requires: ['dcschemaloader']
    }
);
