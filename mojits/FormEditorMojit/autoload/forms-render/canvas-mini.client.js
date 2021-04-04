/*
 *  Copyright DocCirrus GmbH 2017
 *
 *  Minimal view of form outline to show element position
 */

/*jslint anon:true, sloppy:true, nomen:true */
/*jshint latedef:false */

/*global YUI, $ */

YUI.add(
    /* YUI module name */
    'dcforms-canvas-mini',

    /* Module code */
    function( Y /*, NAME */ ) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }

        Y.dcforms.createCanvasMini = function( template, renderWidth, divId ) {
            var
                aspect = ( template.paper.width / template.paper.height ),
                self = {
                    'jqDiv': $( '#' + divId ),
                    'jqCnv': [],
                    'widthPx': renderWidth,
                    'heightPx': ( renderWidth / aspect ),
                    'scale': ( renderWidth / template.paper.width )
                };

            self.init = function() {
                var
                    cnvProps = ' ' +
                        'width="' + self.widthPx + '" ' +
                        'height="' + self.heightPx + '" ' +
                        'style="border-color: #000000; border: 1px solid;"',
                    i;

                self.jqDiv.html( '' );

                for ( i = 0; i < template.pages.length; i++ ) {
                    self.jqDiv.append( '<canvas id="cnvMiniPg' + i + '" ' + cnvProps + '></canvas>' );
                    self.jqCnv[i] = $( '#cnvMiniPg' + i );
                }
            };

            self.redraw = function( elemId ) {
                var
                    page, elem, ctx,
                    i, j;
                for ( i = 0; i < template.pages.length; i++ ) {
                    page = template.pages[i];
                    ctx = self.jqCnv[i][0].getContext( '2d' );

                    //  clear the canvas
                    ctx.fillStyle = 'rgb( 200, 200, 200 )';
                    ctx.fillRect( 0, 0, self.widthPx, self.heightPx );

                    for ( j = 0; j < page.elements.length; j++ ) {
                        elem = page.elements[j];        //--

                        ctx.fillStyle = 'rgb( 255, 255, 255 )';
                        ctx.fillRect( self.scale * elem.mm.left, self.scale * elem.mm.top, self.scale * elem.mm.width, self.scale * elem.mm.height );

                        if ( elemId === elem.elemId ) {
                            ctx.fillStyle = 'rgb( 100, 100, 255 )';
                            ctx.fillRect( self.scale * elem.mm.left, self.scale * elem.mm.top, self.scale * elem.mm.width, self.scale * elem.mm.height );
                        }

                    }
                }
            };

            self.init();
            self.redraw();

            return self;
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ 'dcforms-utils' ]
    }
);