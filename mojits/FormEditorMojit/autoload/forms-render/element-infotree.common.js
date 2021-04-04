/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render infotree elements
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-infotree',

    /* Module code */
    function( Y, NAME ) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if( !Y.dcforms ) {
            Y.dcforms = {};
        }
        if( !Y.dcforms.elements ) {
            Y.dcforms.elements = {};
        }

        Y.log( 'Adding renderer for infotree element.', 'debug', NAME );

        /**
         *  Render a infotree element onto canvas or PDF
         *
         *  @param  element             {object}    A dcforms-element
         *  @param  creationCallback    {Function}  Of the form fn(err)
         */

        Y.dcforms.elements.makeInfoTreeRenderer = function( element, creationCallback ) {

            var
                NO_ENTRY = Y.doccirrus.i18n( 'treeItem.noEntriesText' ),
                pubMethods;

            function initialize() {
            }

            /**
             *  This should only apply to radio groups not bound to an enum type
             *
             *  @param  newValue    {String}    Legacy list serialization
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function setValue( newValue, callback ) {
                if( element.value !== newValue ) {
                    element.page.isDirty = true;
                }

                element.value = newValue;

                //  prevent overly narrow render
                if( element.mm.width < element.mm.lineHeight ) {
                    element.mm.width = element.mm.lineHeight;
                }
                generateSubElements();
                callback( null );
            }

            /**
             *  Current value of infotree
             *
             *  @returns    {String}    Full legacy serialization
             */

            function getValue() {
                return element.value;
            }

            /**
             *  Should now be synchronous and avoid canvas tainting complication of cross-domain assets/images
             *
             *  @param voffset
             *  @param callback
             */

            function renderAbstract( voffset, callback ) {
                var
                    zoom = element.page.form.zoom,
                    ctx = element.page.canvasElastic.getContext( '2d' ),
                    drawBg,
                    i;

                generateSubElements();

                for( i = 0; i < element.subElements.length; i++ ) {
                    drawBg = element.subElements[i].hasOwnProperty( 'noncontent' );
                    element.subElements[i].renderToCanvas( ctx, zoom, element.mm.left, element.mm.top, voffset, drawBg, 'abstract' );
                }

                callback( null );
            }

            /**
             *  Lay out caretdown images and labels
             */
            function generateSubElements() {

                //console.log( '(****) enter generateSubElements' );
                element.subElements = [];

                //console.log( '(****) have value: ', element.value );
                //console.log( '(****) have display value: ', element.display );

                addNodesRecursive( 0, element.display );
            }

            //  Add subelements

            function addNodesRecursive( indent, nodes ) {
                var
                    nextIndent = indent + (element.mm.lineHeight * 1.2),
                    tempButton,
                    node, offsetTop, newElements, i;
                for( i = 0; i < nodes.length; i++ ) {

                    node = nodes[i];
                    offsetTop = element.getContentHeight();

                    //console.log( '(****) adding node ' + i + ': ', nodes[i], offsetTop );

                    //  label
                    newElements = Y.dcforms.markdownToSubElements(
                        Y.dcforms.htmlToMarkdown( node.name || NO_ENTRY ),              //  markdown text
                        element.font,                                       //  typeface name
                        element.mm.lineHeight,                              //  line height
                        parseFloat( element.mm.lineSpace ),                   //  leading factor
                        indent,                                             //  x offset (mm)
                        offsetTop,                                          //  y offset (mm)
                        element.align,                                      //  text alignment (left / right / center)
                        element.mm.width - (element.mm.lineHeight * 1.2),   //  wrapping width (mm)
                        element.isBold,                                     //  make bold
                        element.isItalic,                                   //  make italic
                        element.isUnderline                                 //  make underlined
                    );

                    if( node.id ) {
                        //  caretDown icon (skip for node on last level)
                        tempButton = Y.dcforms.createSubElement(
                            indent - (element.mm.lineHeight * 1.2),
                            offsetTop,     //  + (element.mm.lineHeight * (1 / 16))
                            element.mm.lineHeight,      //  square
                            element.mm.lineHeight,
                            element.mm.lineHeight,
                            '',
                            Y.dcforms.assets.caretdown
                        );

                        //  point PDF renderer to this asset
                        tempButton.imgId = ':caretdown.png';
                        tempButton.cursor = 'pointer';
                        tempButton.isButton = true;

                        //  add image
                        newElements.push( tempButton );
                    }

                    element.subElements = element.subElements.concat( newElements );

                    if( node.expandedChildren ) {
                        addNodesRecursive( nextIndent, node.expandedChildren );
                    } else {
                        if( node.id ) {
                            addNodesRecursive( nextIndent, [{parent: node.id}] );
                        }
                    }

                }
            }

            function update( callback ) {
                generateSubElements();
                if( callback ) {
                    return callback( null );
                }
            }

            /**
             *  Returns the lowest point of the lowest subelement relative to element (mm)
             */

            function getContentHeight() {
                var i, subElem, curr, max = 0;
                if( !element.subElements ) {
                    return max;
                }
                for( i = 0; i < element.subElements.length; i++ ) {
                    subElem = element.subElements[i];
                    curr = subElem.top + subElem.height;
                    if( curr > max ) {
                        max = curr;
                    }
                }
                return max;
            }

            function createValueEditor() {
                Y.log( 'Infotree has no value editor.', 'warn', NAME );
            }

            function destroy() {
                if( Y.dcforms.isOnServer ) {
                    return;
                }
                var jqMe = element.jqSelf();
                jqMe.html();
            }

            function map( newValue, callback ) {
                if( element.display !== newValue ) {
                    element.page.isDirty = true;
                }

                element.display = newValue;
                //console.log( '(****) set new value for infoTree: ', newValue );
                generateSubElements();
                callback( null );
            }

            function unmap() {
                return element.display;
            }

            /**
             *  This element type no longer has any special mode sensitive behaviour
             *
             *  @param  newMode     {String}    Mode name
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function setMode( newMode, callback ) {
                //  mode has no effect on this element
                callback( null );
            }

            /**
             *  Elements may have a variable number of tab stops
             *
             *  @returns {number}
             */

            function countTabStops() {
                return element.canEdit() ? 1 : 0;
            }

            /**
             *  Simple form element validation, EXTMOJ-861
             */

            function isValid() {
                if( !element.validate.notEmpty ) {
                    return true;
                }
                if( element.display.trim && '' === element.display.trim() ) {
                    return false;
                }
                return true;
            }

            //  SET UP AND RETURN THE NEW RENDERER
            initialize();
            pubMethods = {
                'renderAbstract': renderAbstract,
                'setMode': setMode,
                'destroy': destroy,
                'setValue': setValue,
                'getValue': getValue,
                'update': update,
                'getContentHeight': getContentHeight,
                'createValueEditor': createValueEditor,
                'isValid': isValid,
                'map': map,
                'unmap': unmap,
                'countTabStops': countTabStops
            };

            creationCallback( null, pubMethods );
        };

        if( !Y.dcforms.assets ) {
            Y.dcforms.assets = {};
        }

        Y.dcforms.assets.caretdown = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAABHNCSVQICAgIf' +
            'AhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAA4hJREFUeJzt3U3IpWMYB/C/z9coytjMICQpZaGQmtKkNFhJ' +
            '1jY2vkrRlJ1Y2ypfpQZFsqZkwUaaSJKFmoUJ08jIR2QGg8WdDeftfc859/Nc5z3P71f//XVfXdf7nPOcc54' +
            '3AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAkyf' +
            'VJnkvydZK/d3hOJHkjyZ1dO8QkXZTkldQP9VD5IMm13brFpFyd5Ejqh3jo/BJXE+a0J8nR1A/vWDmZZF+Xz' +
            'jEJ76R+aMfOV0ku6NE81ttdqR/WqjzVoX+sufdTP6hV+S7JOcu3kHW1J8lfqR/Uyuxfuotr4MzqAlbUzUnO' +
            'qC6i2I3VBawCCzLbFdUFrIBLqgtYBRZkto3qAlbA1K+gSSzIZr6vLmAFHK8uYBVYkNk+ry5gBXxUXcAqcBm' +
            'd7ewk3ybZXV1IkR/S7uT9Xl1INVeQ2f5M8nJ1EYVeiOVgC3uT/Jz6zyPGzvG0by/Dlu5L/cCOmdNJDnTpHJ' +
            'PxfOoHd6w80alnTMi5aT8oqh7eofNW3LRhQXuTHEv9EA+VLzPdO3Z0si/JqdQPc++cjO9d0ckDqR/o3rm/a' +
            '4eYvBdTP9S9cqhzbyAbST5M/XAvm0+T7OrcG0iSXJr2gVr1kC+aH9Oe1gKDuSXt6xjVw75I7h6gH/A/D6d+' +
            '2OfN04N0AjbxUuqHfrt5L8lZg3QBNrGR5HDqh3+rHEv7CjuM7rK0349UL8Fm+SPtPROU2Z82iNXLMCsHBzw' +
            '3bNsjqV+G/+bNQU8MczqU+qX4N18kuXDY48J8zkvyceqX49ck1w18VljI5WnPt61ckHsHPyUs4da0hz9ULM' +
            'ezI5wPlvZoxl+Ow2m/goQd4dWMtxwn0l7ewY6xK8knGX45Tie5faQzQVdXpv11H3JBnhzpLDCI2zLcm/a34' +
            'ymZrIGD6b8cR5NcPOYhYEivpd9ynEpy07jlw7DOT/s9eI8FeXDk2mEUV6X9k55llmPKT59nAg6k3ZpdZDk+' +
            'S7sSwVp7PPMvx09JrqkoFio8k+0vx29J7qgpE+o8lHZl2Opl1Q1VBUK13UkeS/Jukm/SHu52JMnrSe6JDwI' +
            'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6Osf6y' +
            'u4xikwnvMAAAAASUVORK5CYII='
        );
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);