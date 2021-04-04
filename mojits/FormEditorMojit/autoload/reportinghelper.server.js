/**
 *  Maintain a list of custom reporting fields defined by users in InCase forms for InSight2
 *
 *  @author: strix
 *  @date: 2017 August
 */

/*jslint anon:true, nomen:true, latedef:false */
/*global YUI*/



YUI.add( 'dcforms-reportinghelper', function( Y , NAME ) {

        /**
         *  Load the latest version for all forms for which Doquvide/inSight2 reporting options are enabled
         *
         *  @param  args
         *  @param  args.user
         *  @param  args.callback
         */

        function getUserReportingFields( args ) {
            var
                async = require( 'async' ),
                formVersionIds = [],
                reportingFields = [];

            async.series( [ listCanonicalVersions, getLatestFieldSets ], onAllDone );

            //  1. Get list of forms where 'useReporting' option is true
            function listCanonicalVersions( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'formtemplate',
                    'query': { 'jsonTemplate.useReporting': true },
                    'callback': onListCanonicalForms
                } );

                function onListCanonicalForms( err, result ) {
                    if ( err ) {
                        Y.log( 'Could not query form templates: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    var i;
                    for ( i = 0; i < result.length; i++ ) {
                        formVersionIds.push( result[i].latestVersionId );
                    }

                    itcb( null );
                }
            }

            function getLatestFieldSets( itcb ) {
                async.eachSeries( formVersionIds, addFormVersion, itcb );
            }

            function addFormVersion( formVersionId, itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'formtemplateversion',
                    'query': { '_id': formVersionId },
                    'callback': onFormVersionLoaded
                } );

                function onFormVersionLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    //  not found, but not an error
                    if ( !result || 0 === result.length ) { return itcb( null ); }

                    var
                        jT = result[0].jsonTemplate,
                        page, elem,
                        i, j;

                    for ( i = 0; i < jT.pages.length; i++ ) {
                        page = jT.pages[i];
                        for ( j = 0; j < page.elements.length; j++ ) {
                            elem = page.elements[j];
                            if ( elem.useInReporting ) {

                                //  match formatting in InfoTabViewModel.client.js
                                reportingFields.push( {
                                    'key': elem.id,
                                    'keyName': elem.id,
                                    'label': elem.reportingLabel,
                                    'modelText': 'Formular: ' + jT.name.de,           //  form name here?
                                    'type': elem.reportingType,
                                    'insight2': true,
                                    'text': jT.name.de + ': ' + elem.reportingLabel.de
                                } );

                            }
                        }
                    }

                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not load custom reporting fields from form templates.', 'warn', NAME );
                    return args.callback( err );
                }

                args.callback( null, reportingFields );
            }

        }

        /*
         *  Share this with the rest of mojito - renamed from Y.docirrus.forms.config due to strange YUI namespace issue
         */

        Y.namespace( 'doccirrus' ).formsReportingHelper = {
            'getUserReportingFields': getUserReportingFields
        };

    },
    '0.0.1',
    {
        requires: []
    }
);