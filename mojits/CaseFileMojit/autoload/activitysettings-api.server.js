/**
 * User: rw
 * Date: 15/02/2015  13:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'activitysettings-api', function( Y ) {

        var
            NAME = 'activitysettings';

        function updateActivitySettings( args ) {
            Y.log('Entering Y.doccirrus.api.NAME.updateActivitySettings', 'info', NAME);
            if (args.callback) {
                args.callback = require('../../../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.NAME.updateActivitySettings');
            }
            var
                settings = [],
                callback = args.callback;
            function lazyMigrateBool( data ) {
                if( data && data.settings && Array.isArray( data.settings ) ) {
                    data.settings.forEach( function( item ) {
                        var setting = {};
                        /*MOJ-3474 requires this lazy migration*/
                        if( 'true' === item.isVisible ) {
                            setting.isVisible = true;
                        } else if( 'false' === item.isVisible ) {
                            setting.isVisible = false;
                        } else {
                            setting.isVisible = item.isVisible;
                        }
                        setting.functionality = item.functionality;
                        setting.color = item.color;
                        setting.en = item.en;
                        setting.de = item.de;
                        setting.actType = item.actType;
                        settings.push( setting );
                    } );
                }
            }

            if( args.data ) {
                lazyMigrateBool( args.data );
                settings = {settings: settings};
                Y.doccirrus.filters.cleanDbObject( settings );
                if( !settings.settings.length ) {
                    return callback( null, [] );
                } else {
                    /* do the write */
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'activitysettings',
                        action: 'put',
                        query: {_id: Y.doccirrus.schemas.activitysettings.getId()},
                        fields: ['settings'],
                        data: settings
                    }, callback );
                }
            }
        }

        /**
         *  Load activity settings from database
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Function}  args.callback
         */

        function loadActivitySettings( args ) {
            Y.log('Entering Y.doccirrus.api.NAME.loadActivitySettings', 'info', NAME);
            if (args.callback) {
                args.callback = require('../../../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.NAME.loadActivitySettings');
            }
            var settingsId = Y.doccirrus.schemas.activitysettings.getId();

            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'activitysettings',
                action: 'get',
                query: {_id: settingsId },
                callback: onSettingsLoaded
            } );

            function onSettingsLoaded( err, result ) {
                if ( !err && !result[0] && !result[0].settings ) { err = Y.doccirrus.errors.rest( 404, 'Can not load activity settings' ); }
                if ( err ) { return args.callback( err ); }
                args.callback( null, result[0] );
            }
        }

        /**
         *  Find the default userContent value, if any, for the given activity type
         *
         *  @param  {Object}    user        REST user or equivalent
         *  @param  {String}    actType     Activity type
         *  @param  {Function}  callback    Calls back with default userContent or the empty string if not available
         */

        function getDefaultUserContent( user, actType, callback ) {

            Y.doccirrus.api.activitysettings.loadActivitySettings( {
                'user': user,
                'callback': onActivitySettingsLoaded
            } );

            function onActivitySettingsLoaded( err, actSettings ) {
                if ( err ) { return callback( err ); }
                if ( !actSettings || !actSettings.settings ) { return callback( null, '' ); }

                var item, i;
                for ( i = 0; i < actSettings.settings.length; i++ ) {
                    item = actSettings.settings[i];
                    if (
                        ( item.actType === actType ) &&
                        ( item.userContent ) &&
                        ( item.userContent !== '' )
                    ) {
                        return callback( null, item.userContent );
                    }
                }

                callback( null, '' );
            }

        }

        Y.namespace( 'doccirrus.api' )[NAME] = {

            loadActivitySettings: loadActivitySettings,
            updateActivitySettings: updateActivitySettings,
            getDefaultUserContent: getDefaultUserContent,

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
