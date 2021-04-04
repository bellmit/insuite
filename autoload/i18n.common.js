/* global YUI */
YUI.add( 'i18n',
    function( Y, NAME ) {
        'use strict';

        /**
         * Create basic facade for YUI Intl
         *
         * @param {string} namespace
         * @param {string} language
         * @param {Function} backend
         */
        function I18n( namespace, language, backend ) {
            if ( !namespace ) {
                throw new Error( 'Missing namespace' );
            }
            if ( !language ) {
                throw new Error( 'Missing language' );
            }
            if ( !backend ) {
                throw new Error( 'Missing i18n backend' );
            }

            Object.defineProperty( this, 'language', {
                get: function() {
                    return Y.Intl.getLang( this.namespace );
                },
                set: function( language ) {
                    if ( !language ) {
                        throw new Error( 'Unpexpected language' );
                    }
                    if( !(language in Y.Intl._mod( this.namespace )) ) {
                        this.load( language );
                    }
                    Y.Intl.setLang( this.namespace, language || Y.config.lang );
                }.bind( this )
            } );

            this.namespace = namespace;
            this.backend = backend;
            this.language = language || Y.config.lang;
        }

        /**
         * Load the resource
         *
         * @param {string} language
         * @return {void}
         */
        I18n.prototype.load = function( language ) {
            if ( language in Y.Intl._mod( this.namespace ) ) {
                return;
            }

            this.backend( this.namespace, language, function( resource ) {
                Y.Intl.add( this.namespace, language, resource );
            }.bind( this ) );
        };

        /**
         * Translate given key
         *
         * @param {string} key
         * @param {object} data
         * @return {string}
         */
        I18n.prototype.translate = function( key, data ) {
            const resource = Y.Intl._mod( this.namespace );

            if( !(this.language in resource) ) {
                throw new Error( 'Missing ' + this.language + ' resource for ' + this.namespace );
            }

            const label = Y.Object.getValue( resource[this.language], key.split( '.' ) );

            if ( label === undefined ) {
                Y.log( 'could not find ' + key, 'debug', NAME );
                return key;
            }

            if ( data ) {
                return Y.Lang.sub( label, data );
            }

            return label;
        };

        /**
         * Create a i18n wrapper
         *
         * @param {I18n} i18n
         * @return {Function}
         */
        I18n.wrap = function( i18n ) {
            const translator = function( key, options ) {
                return i18n.translate( key, options && options.data );
            };

            Object.defineProperty( translator, 'language', {
                get: function() {
                    return i18n.language;
                },
                set: function( language ) {
                    i18n.language = language;
                }
            } );

            return translator;
        };

        Y.namespace( 'doccirrus.intl' ).I18n = I18n;
    },
    '1.0.0', {
    requires: [
        'intl'
    ]
} );