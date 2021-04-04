/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'ko-template', function( Y, NAME ) {
    'use strict';
    /**
     * @module ko-template
     */
    if( !window.ko ) {
        Y.log( 'yui: NOT loaded: ko', 'warn', NAME );
        return;
    }

    ko.doccirrusTemplateEngine = function() {
    };
    ko.doccirrusTemplateEngine.prototype = ko.utils.extend( new ko.nativeTemplateEngine(), {
        makeTemplateSource: function( template, doc ) {
            doc = doc || document;
            var elem;
            if( Y.Lang.isString( template ) && !doc.getElementById( template ) ) {
                if( Y.Object.owns( ko.templates, template ) ) {
                    if( Y.Lang.isString( ko.templates[template] ) ) {
                        elem = ko.templates[template] = Y.DOM.create( '<script type="text/html" id="' + template + '">' + ko.templates[template] + '</script>', doc );
                    }
                    else {
                        elem = ko.templates[template];
                    }
                    return new ko.templateSources.domElement( elem );
                }
            }
            return ko.nativeTemplateEngine.prototype.makeTemplateSource.apply( this, arguments );
        }
    } );
    ko.setTemplateEngine( new ko.doccirrusTemplateEngine() );

}, '3.16.0', {
    requires: []
} );
