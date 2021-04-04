/*
 *  Copyright DocCirrus GmbH 2016
 *
 *  YUI module to manage custom fonts for forms and PDFs, loading TTF into compatible browsers
 *
 *  see: http://caniuse.com/#feat=ttf
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, $ */
'use strict';

YUI.add(
    /* YUI module name */
    'dcmedia-fonts',

    /* Module code */
    function( Y, NAME ) {

        /**
         *  Read available fonts from server
         */

        function loadFontList( callback ) {
            //  may not have been initialized on this instance
            if ( 0 === Y.doccirrus.media.fonts.ttf.length ) {
                return reloadFontList( callback );
            }


            Y.doccirrus.comctl.privatePost( '/1/media/:listfonts', {}, onFontsListed );
            function onFontsListed( err, response ) {
                if ( err ) {
                    Y.log( 'Error loading custom fonts: ' + JSON.stringify( err ), 'warn', NAME );
                    Y.doccirrus.media.fonts.ttf = [];
                    //  continue despite error
                    return callback( err );
                }

                response = response.data ? response.data : response;

                Y.doccirrus.media.fonts.ttf = response;
                Y.log( 'Loaded list of custom fonts: ' + JSON.stringify( response ), 'debug', NAME );
                callback( null );
            }
        }

        /**
         *  Read available fonts from GridFS
         */

        function reloadFontList( callback ) {
            Y.doccirrus.comctl.privatePost( '/1/media/:reloadfonts', {}, onFontsReListed );
            function onFontsReListed( err, response ) {
                if ( err ) {
                    Y.log( 'Error loading custom fonts: ' + JSON.stringify( err ), 'warn', NAME );
                    Y.doccirrus.media.fonts.ttf = [];
                    //  continue despite error
                    return callback( err );
                }

                response = response.data ? response.data : response;

                Y.doccirrus.media.fonts.ttf = response;
                Y.log( 'Reloaded list of custom fonts: ' + JSON.stringify( response ), 'debug', NAME );
                callback( null );
            }
        }

        /**
         *  Add fonts to page style
         *  credit: http://stackoverflow.com/questions/7282151/load-external-font-with-javascript-and-jquery
         */

        function addFontsToPage() {
            var
                ttfFonts = Y.doccirrus.media.fonts.ttf,
                css = '',
                html = '',
                fontUrl,
                i;

            for ( i = 0; i < ttfFonts.length; i++ ) {

                fontUrl = '/fonts/' + ttfFonts[i].name + '.ttf';

                fontUrl = Y.doccirrus.infras.getPrivateURL( fontUrl );

                css = css +
                    '@font-face {\n' +
                    '    font-family: "' + ttfFonts[i].name + '";\n' +
                    '    src: url("' + fontUrl + '") format("truetype");\n' +
                    '}\n';

                html = html + '<small style="font-family: ' + ttfFonts[i].name + '; color: white;">.</small>';
            }

            Y.doccirrus.media.fonts.initialized = true;

            //  add CSS declarations for fonts.  This will not cause the browser to load fonts on its own
            //  we must use them in the page before they will be downloaded

            //  see: http://www.paulirish.com/2009/fighting-the-font-face-fout/

            $("head").prepend( '<style type="text/css">' + css + '</style>' );
            $(document.body).append( '<div id="divFontPuller">' + html + '</div>' );
        }

        /**
         *  Given a font name, return true if this is ont of the default PostScript type2 fonts, or a TTF we must load
         *
         *  @param  fontName    {String}
         *  @return             {Boolean}
         */

        function isType2( fontName ) {
            var type2 = Y.doccirrus.media.fonts.type2, i;
            for ( i = 0; i < type2.length; i++ ) {
                if ( fontName.toLowerCase() === type2[i].toLowerCase() ) {
                    return true;
                }
            }
            return false;
        }

        /**
         *  Populate a select box with available fonts
         *
         *  TODO: convert to Bootstrap dropdown
         */

        function addToSelect( jqElement, defaultValue ) {
            var
                type2 = Y.doccirrus.media.fonts.type2,
                ttf = Y.doccirrus.media.fonts.ttf,
                html = '<option value=""></option>',
                faFont = ' *TTF',    //' <i class="fa fa-font"></i>',
                selected = '',
                i;

            for ( i = 0; i < type2.length; i++ ) {
                selected = ( defaultValue === type2[i] ) ? ' selected="selected"' : '';
                html = html + '<option value="' + type2[i] + '"' + selected + '>' + type2[i] + '</option>';
            }

            for ( i = 0; i < ttf.length; i++ ) {
                selected = ( defaultValue === ttf[i].name ) ? ' selected="selected"' : '';
                html = html + '<option value="' + ttf[i].name + '"' + selected + '>' + ttf[i].name + faFont + '</option>';
            }

            jqElement.html( html );
        }


        /**
         *  Check whether we have kerning information for this font
         */

        function hasFontMetrics( fontName ) {
            return Y.doccirrus.media.fontmetrics.hasOwnProperty( fontName );
        }

        /**
         *  Extend YUI object with a method to instantiate these
         */

        Y.namespace( 'doccirrus.media' ).fonts = {
            initialized: false,
            type2: [ 'Courier', 'Times New Roman', 'Helvetica' ],
            ttf: [],

            //  public methods
            loadFontList: loadFontList,
            reloadFontList: reloadFontList,
            addFontsToPage: addFontsToPage,
            isType2: isType2,
            addToSelect: addToSelect,
            hasFontMetrics: hasFontMetrics
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [
            'dcmedia-fontmetrics'
        ]
    }
);