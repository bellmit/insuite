/**
 * User: Richard Strickland
 * Date: 19/03/2013  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

YUI.add( 'formimage-schema', function( Y, NAME ) {

    'use strict';
    Y.log( 'Loading Model ' + NAME, 'info', NAME );

    /**
     * The FormsEditorMojit data schema / mongoose Schemas.
     *
     * @module FormsEditorMojit
     */

    var
    /*
     *  Schema definitions
     */
        i18n = Y.doccirrus.i18n,
        types = {
            root: {
                "instanceId": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'formimage-schema.root.instanceId' ),
                    "-en": "instanceId",
                    "-de": "instanceId"
                },
                "fileName": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'formimage-schema.Lablog_T.fileName.i18n' ),
                    "-en": "fileName",
                    "-de": "fileName"
                },
                "userId": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'formimage-schema.root.userId' ),
                    "-en": "userId",
                    "-de": "userId"
                },
                "image": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'formimage-schema.root.image' ),
                    "-en": "image",
                    "-de": "image"
                },
                "imageType": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'formimage-schema.root.imageType' ),
                    "-en": "imageType",
                    "-de": "imageType"
                },
                "category": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'formimage-schema.root.category' ),
                    "-en": "category",
                    "-de": "category"
                },
                "tCreated": {
                    "type": "date",
                    i18n: i18n( 'lablog-schema.Lablog_T.created.i18n' ),
                    "-en": "tCreated",
                    "-de": "tCreated"
                },
                "tModified": {
                    "type": "date",
                    i18n: i18n( 'lablog-schema.Lablog_T.timestamp.i18n' ),
                    "-en": "tModified",
                    "-de": "tModified"
                }
            }
            /**
             {
             instanceId:        //_ userid_fileName
             fileName:          //_ disk location of unmodified image
             userId:            //_ ID of user who modified this image
             image:             //_ base64 encoded image
             imageType:         //_ mime type
             category:          //_ 'form'|'panel'|'item'
             tCreated:          //_ creation date
             tModified:         //_ last modification date
             }
             */
        },
        indexes = [
            { key: {'instanceId':1} }
        ];

    NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

    Y.namespace( 'doccirrus.schemas' )[NAME] = {

        // Given the following parameters, the DB Layer set up
        // the schema with default methods (get, put, post, delete, count)
        // and populates these with standard code.

        /* MANDATORY */
        // the schema name of the actual mongoose schema (i.e. mongodb schema - 's' )
        // does not need to correspond to the file name, this could be an obfuscated
        // name too.

        name: NAME,

        /* MANDATORY */
        db: Y.doccirrus.schemaloader.MONGO_CLOUD_DATABASE_NAME,

        /* MANDATORY */
        types: types,

        /* OPTIONAL -- if there is no index, then key field searches cannot be carried out on this schema. */
        indexes: indexes,

        isInitialized: false                       //_ set to true when setup has been run

    };

    Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
}, '0.0.1', {
    requires: [
        'doccirrus',
        'dcschemaloader'
    ]
} );
