/*
 *  Copyright DocCirrus GmbH 2016
 *
 *  Utility methods to fetch data for table forms (printing casefolders, labdata, etc)
 *
 *  These methods read and write config.formData properties
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*jshint latedef:false */
/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-datatables',

    /* Module code */
    function( Y, NAME ) {
        

        /**
         *  casefolder: Load and format a casefolder into a data table
         *
         *  @param  config              {Object}
         *  @param  config.user         {Object}    REST user or equivalent
         *  @param  config.formData     {Object}    Will be given labdataTable property
         *  @param  config.activityId   {String}    LABDATA activity _id
         *  @param  callback            {Function}  Of the form fn( err )
         */

        function getCasefolderTable( config, callback ) {
            Y.doccirrus.api.activity.getCaseFileLight( {
                'user': config.user,
                'options': config.options || { sort: { timestamp: -1 } },
                'query': config.query,
                'callback': onCaseFolderLoaded
            } );

            function onCaseFolderLoaded( err, result ) {
                if ( err ) { return callback( err ); }

                result = result.data? result.data : result;
                config.formData.dataTable = result;
                callback( null );
            }
        }

        /**
         *  medicationplan: Apply any necessary formatting to medication activities for table
         *
         *  @param  config                      {Object}
         *  @param  config.user                 {Object}    REST user or equivalent
         *  @param  config.formData             {Object}    Will be given labdataTable property
         *  @param  config.formData.dataTable   {Object}    Table data / linked activities passed from client
         *  @param  callback                    {Function}  Of the form fn( err )
         */

        function getMedicationPlanTable( config, callback ) {
            Y.log( 'Medication table data passed from client: ' + config.formData.dataTable.length, 'debug', NAME );

            //  TODO: any reformatting here

            callback( null );
        }


        Y.namespace( 'dcforms' ).datatables = {
            'getCasefolderTable': getCasefolderTable,
            'getMedicationPlanTable': getMedicationPlanTable
        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);