/**
 * User: do
 * Date: 09/05/14  13:27
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, $ */
'use strict';

YUI.add( 'kbv-api', function( Y, NAME ) {

        var defaultParams = { action : 'kbvapi' },
            API = {
                name: NAME,
                url: '/r/kbvapi/',
                description: [
                    { name: 'tagtrennung', defaultParams: Y.merge( {}, defaultParams ) }, // -
                    { name: 'dkm', defaultParams: Y.merge( {}, defaultParams ) }, // T9401
                    { name: 'pseudognr', defaultParams: Y.merge( {}, defaultParams ) }, // -
                    { name: 'ktabs', defaultParams: Y.merge( {}, defaultParams ) }, // -
                    { name: 'scheinunterarten', defaultParams: Y.merge( {}, defaultParams ) }, // -
                    { name: 'abrechnungsgebiete', defaultParams: Y.merge( {}, defaultParams ) }, // abrechnungsgebiet
                    { name: 'personenkreis', defaultParams: Y.merge( {}, defaultParams ) }, // T9402
                    { name: 'sktzusatz', defaultParams: Y.merge( {}, defaultParams ) }, // T9403
                    { name: 'sktinfo', defaultParams: Y.merge( {}, defaultParams ) }, // - (// T9404 zusatzangaben) abrechnungsinfo (skt)
                    { name: 'scheinarten', defaultParams: Y.merge( {}, defaultParams ) }, // scheinarten (T9406)
                    { name: 'versichertenarten', defaultParams: Y.merge( {}, defaultParams ) }, // T9407
                    { name: 'fachgruppe', defaultParams: Y.merge( {}, defaultParams ) }, // -
                    { name: 'gebuehrenordnung', defaultParams: Y.merge( {}, defaultParams ) } // -
                ]
            };

        /**
         * finds a description in API by name
         * @param {String} name
         * @returns {Object|null}
         */
        function findDescription( name ) {

            return Y.Array.find( API.description, function( config ) {
                return name === config.name;
            } );

        }

        /**
         * @param {Object} params
         * @returns {String} complete url
         */
        function createURL( params ) {

            var url = API.url + '?' + Y.QueryString.stringify( params );
            return Y.doccirrus.infras.getPrivateURL( url );

        }

        /**
         * @param {Object} params
         * @param {Object|String} description the config object or the name of config
         * @returns {Object}
         */
        function createParams( params, description ) {

            params = params || {};
            description = description || {};

            if( Y.Lang.isString( description ) ) {
                description = findDescription( description );
            }

            var result = {},
                defaultParams = description.defaultParams || {},
                method = { method: description.name };

            result = Y.merge( result, defaultParams, params, method );

            return result;
        }

        /**
         * attaches, based on API.description, methods to the API
         */
        function generateMethods() {
            Y.Array.each( API.description, function( config ) {
                API[config.name] = function( params, callback ) {
                    return $.ajax( {
                        type: 'GET',
                        dataType: 'json',
                        xhrFields: { withCredentials: true },
                        url: createURL( createParams(params, config) ),
                        complete: callback
                    } );
                };
            } );
        }

        /**
         * creates an url for the given description name and parameters
         * @param {String} name
         * @param {Object} params
         * @returns {String|undefined}
         */
        API.description.getURL = function(name, params){
            var result,
                description = findDescription(name);
            if (null !== description) {
                result = createURL( createParams(params, description) );
            }
            return result;
        };

        generateMethods();

        Y.namespace( 'doccirrus.api' ).kbv = API;

    },
    '0.0.1', {requires: []}
);
