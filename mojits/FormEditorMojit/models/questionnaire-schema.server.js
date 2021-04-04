/**
 *  DEPRECATED: this is not a document type
 *
 * User: Richard Strickland
 * Date: 01/02/2013  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

YUI.add( 'questionnaire-schema', function( Y, NAME ) {

    
    Y.log( 'Loading Model ' + NAME, 'info', NAME );

    /**
     * The FormsEditorMojit data schema for completed forms for aggregation and analysis / schemas.
     *
     * @module FormsEditorMojit
     */

    var
    /*
     *  Schema definitions
     *  note: this is a very rough guess at what will be needed, and is likely to change
     */
        i18n = Y.doccirrus.i18n,
        types = {
            root: {
                "instanceId": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'questionnaire-schema.root.instanceId' ),
                    "-en": "instanceId",
                    "-de": "instanceId"
                },
                "fileName": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'formtemplateversion-schema.root.fileName' ),
                    "-en": "fileName",
                    "-de": "fileName"
                },
                "userId": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'formtemplateversion-schema.root.userId' ),
                    "-en": "userId",
                    "-de": "userId"
                },
                "fieldsJson": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'formtemplateversion-schema.root.fieldsJson' ),
                    "-en": "fieldsJson",
                    "-de": "fieldsJson"
                },
                "tCreated": {
                    "type": "date",
                    i18n: i18n( 'formtemplateversion-schema.root.tCreated' ),
                    "-en": "tCreated",
                    "-de": "tCreated"
                },
                "tModified": {
                    "type": "date",
                    i18n: i18n( 'formtemplateversion-schema.root.tModified' ),
                    "-en": "tModified",
                    "-de": "tModified"
                }
            }
            /*
             {
             instanceId: { 'type': 'string', 'required': true },       //_ userid_fileName
             fileName:   { 'type': 'string', 'required': true },       //_ disk location of unmodified template
             userId:     { 'type': 'string', 'required': true },       //_ ID of user who submitted this questionnaire
             fieldsJson: { 'type': 'string', 'required': true },       //_ content of submitted form
             tCreated: { 'type': 'date' },                                             //_ creation date
             tModified: { 'type': 'date' }                                             //_ last modification date
             }
             */
        },
        indexes = [
            { key: {'instanceId':1} }
        ];

    NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

    Y.namespace( 'doccirrus.schemas' )[NAME] = {


        name: NAME,

        /* MANDATORY */
        db: Y.doccirrus.schemaloader.MONGO_CLOUD_DATABASE_NAME,

        /* MANDATORY */
        types: types,

        /* OPTIONAL -- if there is no index, then key field searches cannot be carried out on this schema. */
        indexes: indexes

    };

    Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
}, '0.0.1', {
    requires: [
        'doccirrus',
        'dcschemaloader'
    ]
} );
