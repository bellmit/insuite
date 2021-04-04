/**
 *
 *  Infrastructure Aware Code library to encapsulate high-level routing info.
 *  Used on client.
 *
 */

/*global YUI */
YUI.add( 'dcinfrastructs', function( Y, NAME ) {
        'use strict';

        var
            prc = '',
            privateCloud = '',
            publicCloud = '',
            country = '',
            infrastructLibrary;

        function DCInfrastructure() {

        }

        /**
         * Loads the infrastructure information out of a node (HTML Page).
         * This is transparently handled by the DocCirrus mojit for all
         * pages.
         *
         *
         * @param node
         */
        DCInfrastructure.prototype.init = function() {
            var
                i,
                env = Y.Object.getValue( Y, 'config.doccirrus.Env'.split( '.' ) ),
                textDiv = env.infra || '',
                settings;

            settings = textDiv.split( ',' );
            for( i = 0; i < settings.length; i += 2 ) {
                if( 'puc' === settings[i] ) {
                    publicCloud = settings[i + 1];
                }
                if( 'prc' === settings[i] ) {
                    prc = settings[i + 1];
                }
                if( 'PUC' === env.serverType || 'VPRC' === env.serverType ) {
                    privateCloud = prc;
                }
                if( 'country' === settings[i] ) {
                    country = settings[i + 1];
                }
            }
            Y.log( 'LOADED Infrastructure.', 'debug', NAME );
        };

        function addPath( str, path ) {
            var result = str;
            if( path ) {
                if( '/' === path[0] ) {
                    result = result + path;
                }
                else {
                    result = result + '/' + path;
                }
            }
            return result;
        }

        /**
         * Builds the URL for the private cloud given a path.
         *
         * @param path  e.g. /calendar or /1/patient/726534faa23
         * @return {String}
         */
        DCInfrastructure.prototype.getPrivateURL = function( path ) {
            var
                result;
            result = privateCloud;
            result = addPath( result, path );
            return result;
        };

        /**
         * Builds the URL for the public cloud given a path.
         * @param path
         * @return {String}
         */
        DCInfrastructure.prototype.getPublicURL = function( path ) {
            var
                result;
            result = publicCloud;
            return addPath( result, path );
        };


        /**
         * Gets the URL for the call in the MVVM world.
         *
         * @param serverType {String}  puc, vprc, prc, dcprc, [curendo, portal, etc.]
         * @param path {String}  /path
         */
        DCInfrastructure.prototype.getURLforServer = function( serverType, path ) {
            switch( serverType ) {
                case 'puc':  return infrastructLibrary.getPublicURL( path );
                case 'isd':  return infrastructLibrary.getPrivateURL( path );
                case 'prc':  return infrastructLibrary.getPrivateURL( path );
                case  'current':
                    return path;
                default:  return  path;
            }
        };

        /**
         * Return the Country Code stored in infra tag.
         * @deprecated
         *
         * Old code - do not use this, instead use countryMode (array)
         *
         * @returns {string}
         */
        DCInfrastructure.prototype.getCountry = function() {
            return country;
        };

        infrastructLibrary = new DCInfrastructure();
        infrastructLibrary.init();

        Y.namespace( 'doccirrus' ).infras = infrastructLibrary;

    },
    '0.0.1', {requires: []}
);
