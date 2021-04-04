/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  Generic event handlers to move and resize elements on the canvas when editing forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-canvas-box',

    /* Module code */
    function(Y, NAME) {
        

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.handle) { Y.dcforms.handle = {}; }

        /**
         *  Get the (x, y) position of a mouse or touch event relative to keyboard, and any element of subelement
         *  Not used on server
         */

        Y.dcforms.handle.localizeEventAbstract = function() {
            Y.log('Unimplemented on server: Y.dcforms.handle.localizeEventAbstract()', 'warn', NAME);
            return {};
        };

        /**
         *  Get the (x, y) position of a mouse or touch event relative to keyboard, and any element of subelement
         *  Not used on server
         */

        Y.dcforms.handle.localizeEventFixed = function() {
            Y.log('Unimplemented on server: Y.dcforms.handle.localizeEventFixed()', 'warn', NAME);
            return null;
        };

        /**
         *  Start drag/move of element in edit mode
         *  Not used on server
         */

        Y.dcforms.handle.startDragFixed = function() {
            Y.log('Unimplemented on server: Y.dcforms.handle.startDragFixed()', 'warn', NAME);
        };

        /**
         *  Drag a form element around and between pages
         */

        Y.dcforms.handle.moveElem = function() {
            Y.log('Unimplemented on server: Y.dcforms.handle.moveElem()', 'warn', NAME);
        };

        Y.dcforms.snapToGrid = function(gridSize, feature) {
            Y.log('Unimplemented on server: Y.dcforms.handle.snapToGrid() gridSize: ' + gridSize, 'warn', NAME);
            return feature;

            /*
            var
                halfGrid = gridSize / 2,
                remainder = (feature % gridSize);

            feature = feature - remainder;

            if (halfGrid < remainder) {
                feature = feature + gridSize;
            }

            return parseInt(Math.abs(feature), 10);
            */
        };

        /**
         *  Start resize of element in edit mode
         *  Not used on server
         */

        Y.dcforms.handle.startResizeFixed = function() {
            Y.log('Unimplemented on server: Y.dcforms.handle.startResizeFixed()', 'warn', NAME);
        };

        /**
         *  Resize a form element within a single abstract page
         *  Not used on server
         */

        Y.dcforms.handle.resizeElemFixed = function() {
            Y.log('Unimplemented on server: Y.dcforms.handle.resizeElemFixed()', 'warn', NAME);
        };

        /**
         *  Called after user selects a new element type in the FEM menu and clicks the page
         *  Not used on server
         */

        Y.dcforms.handle.addElementToPage = function () {
            Y.log('Unimplemented on server: Y.dcforms.handle.resizeElemFixed()', 'warn', NAME);
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);