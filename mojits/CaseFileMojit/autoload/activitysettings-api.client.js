/**
 * User: rrrw
 * Date: 13/01/15  10:36
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * Client side activity-settings manager component
 *
 * Offers   get()   and   isReady()   methods.
 *
 * get()   returns a activitysettings Viewmodel, or null
 *         depending on whether isReady() or not.
 */

/*global YUI, async */
/*eslint prefer-template:0 strict:0 */

'use strict';
YUI.add( 'activitysettings-api', function( Y, NAME ) {

        var activitysettings = null;

        /**
         *  Load activity actType settings from server and instantiate as KO ActivitySettingsModel
         *
         *  @param  {Function}  callback    Of the form fn( err, activitysettings )
         */

        function getActTypeSettings( callback ) {
            var
                actTypes = Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs,
                id = Y.doccirrus.schemas.activitysettings.getId(),
                actTypesMap = actTypes.reduce( function( result, item ) {
                    result[item.val] = item;
                    return result;
                }, {} );

            callback = callback || onMissingCallback;

            Y.doccirrus.jsonrpc.api.activitysettings
                .read( { query: { _id: id } } )
                .done( onActTypeSettingsLoaded )
                .fail( callback );

            function onActTypeSettingsLoaded( res ) {
                var
                    filtered,
                    items = res.data[0].settings;

                //  copy translations for the act type names
                items.forEach( function( item ) {
                    if( item.actType in actTypesMap ) {
                        item.en = actTypesMap[item.actType].i18n;
                        item.de = actTypesMap[item.actType].i18n;
                    }

                    //  do not use the WYSWYG editor by default
                    if ( !item.useWYSWYG ) {
                        item.useWYSWYG = false;
                    }
                } );

                // filter bad entries out
                filtered = Y.Array.filter( items, checkActTypeItem );
                activitysettings = new Y.doccirrus.uam.ActivitySettingsModel( { settings: filtered } );
                activitysettings.makeSettings( actTypes );

                //  done
                Y.log( 'Loaded activity settings model', 'debug', NAME );
                callback( null, activitysettings );
            }

            function onMissingCallback() {
                Y.log( 'No Callback passed to getActTypeSettings.', 'warn', NAME );
            }

            function checkActTypeItem( item ) {
                var found = false;
                actTypes.forEach( function( type ) {
                    if( type.val === item.actType ) {
                        found = true;
                    }
                } );
                return found;
            }

        }

        /**
         *  Extends the actType settings with details of root doctree entries, used to highlight entries in
         *  activities tab of inCaseAdmin configuraion.
         *
         *  @param  {Function}  callback    Of the form fn( err, activitysettings );
         */

        function getDocTreeRootsForActTypes( callback ) {
            var docTree;

            async.series( [ doDefaultInit, getDocTree, mergeDocTree ], onAllDone );

            //  1.  Get activity settings from server
            function doDefaultInit( itcb ) {
                //  if already loaded then we can skip this
                if ( activitysettings ) { return itcb( null ); }
                getActTypeSettings( itcb );
            }

            //  2.  Get documentation tree from server
            function getDocTree( itcb ) {
                Y.doccirrus.jsonrpc.api.documentationtree.read( {} ).then( onDocTreeLoaded ).fail( itcb );
                function onDocTreeLoaded( result ) {
                    docTree = result.data ? result.data : result;
                    itcb( null );
                }
            }

            //  3.  Add doctree entries to actType settings where available
            function mergeDocTree( itcb ) {
                var
                    settings = activitysettings.settings(),
                    i, j;

                for ( i = 0; i < settings.length; i++ ) {
                    settings[i].__docTree = null;
                    for ( j = 0; j < docTree.length; j++ ) {
                        if ( settings[i].actType === docTree[j].actType ) {
                            settings[i].__docTree = docTree[j];
                        }
                    }

                }

                itcb( null );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not initialize activity settings with docTree roots: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }
                callback( null, activitysettings );
            }
        }

        Y.namespace( 'doccirrus.api' ).activitysettings = {
            init: getActTypeSettings,
            initWithDocTree: getDocTreeRootsForActTypes,
            reset: getActTypeSettings,
            get: function __get() { return activitysettings; },
            isReady: function __isReady() { return activitysettings !== null; }
        };

    },
    '0.0.1', {requires: [
        'activity-schema',
        'activitysettings-schema',
        'dcactivitysettingsmodel'
    ]}
);
