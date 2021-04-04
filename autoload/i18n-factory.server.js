/*global YUI */
YUI.add( 'i18n-factory', function( Y, NAME ) {

    /**
     * A helper to set up i18n function
     *
     * Must be "call"-ed with the context of the YUI.add callback function and optional with a module name to bind that
     * name to the returned function. If not provided the name of the module called in will be used.
     * In that moment the module's available lang modules will be checked,
     * if none are found it tries to use them by YUI lang module convention.
     *
     * The returned function parameters are a key to look up from module's lang module and optional, a configuration object (to set module name or substitution data).
     *
     * @method createTranslator
     * @param {string} [name]
     * @returns {Function}
     *
     * -    ** `key` ** String
     *
     *      dot-delimited string
     *
     * -    ** `[config.name]` ** String
     *
     *      a moduleName which is already used by YUI
     *
     * -    ** `[config.data]` ** Object
     *
     *      a data object to use with Y.Lang.sub
     *
     * @example
     * var _i18n = Y.doccirrus.intl.createTranslator.call(this),
     * i18n = _i18n('foo.bar'),
     * i18nOtherModule = _i18n('foo.bar', { name: 'BazModule' });
     * @example
     * var _i18n = Y.doccirrus.intl.createTranslator.call(this),
     * i18n = _i18n('foo.bar'), // e.g.: references "foo {baz} bar"
     * i18nSubstitution = _i18n('foo.bar', { data: { baz: 2 } }); // gives then "foo 2 bar"
     */
    Y.namespace( 'doccirrus.intl' ).createTranslator = function( name ) {
        const details = this.details || {};

        if( !details.lang ) {
            Y.log( `Missing property lang in configuration of module ${name || this.name}`, 'warn', NAME );
        }

        const i18n = new Y.doccirrus.intl.I18n(
            name || this.name,
            Y.Intl.lookupBestLang( Y.config.lang, details.lang || [] ),
            function( namespace, language, callback ) {
                try {
                    return callback( require( `../lang/${namespace}/${language}.json` ) );
                } catch ( error ) {
                    return callback( {} );
                }
            }
        );

        return Y.doccirrus.intl.I18n.wrap( i18n );
    };

}, '3.16.0', {
    requires: [
        'intl',
        'i18n'
    ]
} );
