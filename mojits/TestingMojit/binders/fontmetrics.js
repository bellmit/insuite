/*
 *  Binder for test form load without REST calls
 *
 *  In this test all form dependencies should be packaged and sent along with the page
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */
/*global YUI, $ */

'use strict';

YUI.add('TestingMojitBinderFontMetrics', function(Y, NAME) {
        /**
         * The TestingMojitBinderFontMetrics module.
         *
         * @module TestingMojitBinderFontMetrics
         */


        Y.log('YUI.add TestingMojitBinderFontMetrics with NAMEs ' + NAME, 'info');

        /**
         * Constructor for the TestingMojitBinderFontMetrics class.
         *
         * @class testingMojitBinderIndex
         * @constructor
         */

        Y.namespace('mojito.binders')[NAME] = {

            //  Form properties

            charset: '' +
                'abcdefghijklmnopqrstuvwxyz' +
                'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
                '1234567890 ' +
                '!@#$%^&*()-_=+[{]}\\|:;"\',<.>/?`~' +
                'äèéëïñòóôöøùúüÖÄÈÉÊËëêéèçßÄÀÁÂÒÓÔÖØÙÚÛÜÇ€',

            baseWidth: {},
            kernPairs: {},
            isBold: false,
            isItalic: false,
            cssFont: '',
            cssStyle: '',

            //fontName: 'HelveticaNeueDeskInterface-Light',
            fontName: 'HelveticaNeueDeskInterface-Thin',
            ctx: null,

            //  Cached jQuery references
            jq: null,

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function(mojitProxy) {
                this.mojitProxy = mojitProxy;
            },

            /**
             *	The binder method, invoked to allow the mojit to attach DOM event
             *	handlers.
             *
             *	@param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function(node) {
                var self = this;

                self.jq = {
                    divFontList: $( '#divFontList' ),
                    cnvMeasure: $( '#cnvMeasure' ),
                    divTestString: $( '#divTestString' ),
                    divBaseWidth: $( '#divBaseWidth' ),
                    divKerning: $( '#divKerning' ),
                    divMeasure: $( '#divMeasure' ),
                    taJSON: $( '#taJSON' )
                };

                this.node = node;

                //  check if we have a font name in the hash fragment
                if ( window.location.hash && '#family=' === window.location.hash.substr(0, 8) ) {
                    self.fontName = window.location.hash.substr( 8 );
                }

                if ( -1 !== self.fontName.indexOf( '-Bold' ) ) {
                    self.fontName = self.fontName.replace( '-Bold', '' );
                    self.isBold = true;
                }

                if ( -1 !== self.fontName.indexOf( '-Italic' ) ) {
                    self.fontName = self.fontName.replace( '-Italic', '' );
                    self.isItalic = true;
                }

                self.fontWeight = self.isBold ? 'bold' : 'normal';
                self.fontStyle = self.isItalic ? 'italic' : 'normal';
                self.cssFont = ( self.isItalic ? 'italic ' : '' )  + ( self.isBold ? 'bold ' : '' ) +  '100px ' + self.fontName;

                self.fontMetricName = self.fontName + ( self.isBold ? '-Bold' : '' ) + ( self.isItalic ? '-Italic' : '' );

                self.cssStyle = '' +
                    'font-family: ' + self.fontName + '; ' +
                    'font-size: 100px; ' +
                    'font-weight: ' + self.fontWeight + '; ' +
                    'font-style: ' + self.fontStyle + '; ';

                //self.fontName = 'Helvetica';

                //  load the list of fonts form the server
                Y.doccirrus.media.fonts.loadFontList( onFontListLoaded );

                function onFontListLoaded() {
                    Y.doccirrus.media.fonts.addFontsToPage( );
                    self.showFontList();
                    window.setTimeout( function() { onFontsLoaded(); }, 1000 );
                }

                function onFontsLoaded() {
                    //  get canvas context
                    self.ctx = self.jq.cnvMeasure[0].getContext( '2d' );
                    self.ctx.font = self.cssFont;
                    self.ctx['font-weight'] = self.fontWeight;
                    self.ctx['font-style'] = self.fontStyle;

                    self.jq.divMeasure.css( 'font-weight', self.fontWeight );
                    self.jq.divMeasure.css( 'font-style', self.fontStyle );
                    self.jq.divMeasure.css( 'font-size', '100px' );
                    self.jq.divMeasure.css( 'font-family', self.fontName );

                    //  Add a string to display the web font
                    self.addTestString();

                    //  Build base width table
                    self.measureBaseWidths();
                    self.drawBaseWidths();

                    //  Build kerning table
                    self.measureKerning();
                    self.drawKerningTable();

                    //  Output JSON
                    self.renderJSON();
                }

            },

            addTestString: function() {
                var
                    self = this,
                    cssStyle = self.cssStyle,
                    html = '' +
                        '<span style="' + cssStyle + '">' +
                        'The quick brown fox jumps over the lazy dog.<br/>To AW Aw AV Av tt OX' +
                        '</span>';

                self.jq.divTestString.html( html );
            },

            measureBaseWidths: function() {
                var
                    self = this,
                    char,
                    //metrics,
                    i;

                /* - canvas is unreliable for bold / italic text
                for ( i = 0; i < self.charset.length; i++ ) {
                    char = self.charset.substr( i, 1 );
                    metrics = self.ctx.measureText( char );
                    self.baseWidth[ encodeURIComponent( char ) ] = metrics.width;
                }
                */

                for ( i = 0; i < self.charset.length; i++ ) {
                    char = self.charset.substr( i, 1 );
                    self.jq.divMeasure.text(char);
                    self.baseWidth[ encodeURIComponent( char ) ] = self.jq.divMeasure.width();
                }
            },

            drawBaseWidths: function() {
                var self = this, k, html = '';

                for ( k in self.baseWidth ) {
                    if ( self.baseWidth.hasOwnProperty( k ) ) {
                        html = html +
                            '<span class="label label-success">' +
                            self.replaceSpecial( decodeURIComponent( k ) ) + ' ' + self.baseWidth[ k ].toFixed( 4 ) +
                            '</span> ';
                    }
                }

                self.jq.divBaseWidth.html( html );
            },

            measureKerning: function() {
                var
                    self = this,
                    i, j,
                    char1, char2,
                    pair,
                    metrics,
                    kern;

                for ( i = 0; i < self.charset.length; i++  ) {
                    char1 = self.charset.substr( i, 1 );

                    for ( j = 0; j < self.charset.length; j++ ) {
                        char2 = self.charset.substr( j, 1 );
                        pair =  char1 + '' + char2 + '';

                        /* -- canvas is unreliable with bold and italic
                        metrics = self.ctx.measureText( pair );
                        kern = ( metrics.width - ( self.baseWidth[ encodeURIComponent( char1 ) ] + self.baseWidth[ encodeURIComponent( char2 ) ] ) );
                         */

                        self.jq.divMeasure.text( pair );
                        metrics = self.jq.divMeasure.width();

                        kern = ( metrics - ( self.baseWidth[ encodeURIComponent( char1 ) ] + self.baseWidth[ encodeURIComponent( char2 ) ] ) );


                        if ( 0 !== kern ) {
                            self.kernPairs[ encodeURIComponent( pair ) ] = kern;
                        }
                    }
                }
            },

            drawKerningTable: function() {
                var self = this, k, html = '';

                for ( k in self.kernPairs ) {
                    if ( self.kernPairs.hasOwnProperty( k ) ) {
                        if ( 0 !== self.kernPairs[ k ] ) {
                            html = html +
                                '<span class="label label-success">' +
                                self.replaceSpecial( decodeURIComponent( k ) ) + ' ' + self.kernPairs[ k ].toFixed( 4 ) +
                                '</span> ';
                        }
                    }
                }

                self.jq.divKerning.html( html );
            },

            replaceSpecial: function( txt ) {
                txt = txt.replace( '<', '&lt;' );
                txt = txt.replace( '>', '&gt;' );
                txt = txt.replace( '<', '&lt;' );
                txt = txt.replace( '>', '&gt;' );
                txt = txt.replace( '"', '&quot;' );

                return txt;
            },

            showFontList: function() {
                var
                    pdfFonts = [ 'Helvetica', 'Courier', 'Times New Roman' ],
                    self = this,
                    ttf = Y.doccirrus.media.fonts.ttf,
                    html = '',
                    i;

                for (i = 0; i < pdfFonts.length; i++ ) {
                    html = html + '<a href="/fontmetrics?x=' + i + '#family=' + pdfFonts[i] + '">' + pdfFonts[i] + '</a><br/>';
                }

                for (i = 0; i < ttf.length; i++ ) {
                    html = html + '<a href="/fontmetrics?x=' + i + '#family=' + ttf[i].name + '">' + ttf[i].name + '</a><br/>';
                }


                self.jq.divFontList.html( html );
            },

            renderJSON: function() {
                var
                    self = this,
                    jsonStr = 'Y.doccirrus.media.fontmetrics["' + self.fontMetricName + '"] = {\n',
                    currLine = '',
                    perLine = 4,
                    i = 4, k;

                //  add char base width

                jsonStr = jsonStr + '\tbaseWidth: {\n';

                for ( k in self.baseWidth ) {
                    if ( self.baseWidth.hasOwnProperty( k ) ) {
                        if ( 0 === i ) {
                            i = perLine;
                            jsonStr = jsonStr + '\t\t' + currLine + '\n';
                            currLine = '';
                        }

                        currLine = currLine + '"' + k + '": ' + self.baseWidth[ k].toFixed( 4 ) + ',\t';
                        i = i - 1;
                    }
                }

                jsonStr = jsonStr + '\t\t' + currLine + '\n';
                currLine = '';
                i = perLine;

                jsonStr = jsonStr + '\t},\n';

                //  add kerning pairs

                jsonStr = jsonStr + '\tkernPairs: {\n';

                for ( k in self.kernPairs ) {
                    if ( self.kernPairs.hasOwnProperty( k ) ) {
                        if ( 0 === i ) {
                            i = perLine;
                            jsonStr = jsonStr + '\t\t' + currLine + '\n';
                            currLine = '';
                        }
                        currLine = currLine + '"' + k + '": ' + self.kernPairs[k].toFixed( 4 ) + ',\t';
                        i = i - 1;
                    }
                }

                jsonStr = jsonStr + '\t}\n';

                jsonStr = jsonStr + '}\n';

                console.log( 'jsonStr', jsonStr );  //jshint ignore:line
                self.jq.taJSON.val( jsonStr );
            }

        };

    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib',

            'dcmedia-fonts',

            'JsonRpcReflection-doccirrus',
            'dcutils'
        ]
    }
);