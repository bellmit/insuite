YUI.add( //eslint-disable-line no-undef
    'jade-api',
    function( Y, NAME ) {
        'use strict';

        var
            path = require( 'path' ),
            jade = require( 'pug' ),
            PATH_MOJITS = path.join( process.cwd(), '/mojits/' );

        /**
         * @method renderFile
         * @param {Object} parameters
         * @param {Object} parameters.originalParams
         * @param {String} parameters.originalParams.path path relative to "/mojits/" without ".jade" (default extension)
         * @param {Object} [parameters.originalParams.data] optional data to use with rendering
         */
        function renderFile( parameters ) {
            Y.log('Entering Y.doccirrus.api.jade.renderFile', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.jade.renderFile');
            }
            var
                params = parameters.originalParams,
                callback = parameters.callback,
                filePath = path.join( PATH_MOJITS, params.path + '.pug' ),
                data = Y.merge( params.data );

            if( 0 !== filePath.indexOf( PATH_MOJITS ) ) {
                return callback( Y.doccirrus.errors.rest( 400, `Invalid path: (${params.path})` ) );
            }

            Y.Intl.setLang( 'doccirrus', parameters.lang );
            Y.use( 'lang/' + 'doccirrus' + '_' + parameters.lang );

            data.__i18n = Y.doccirrus.i18n;

            jade.renderFile( filePath, data, callback );

        }

        Y.namespace( 'doccirrus.api' ).jade = {
            name: NAME,
            renderFile: renderFile
        };

    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'dcerror'
        ]
    }
);
