/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  Simple YUI module, utilities for working with form categories, helper object
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-categoriesselect',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        Y.log('Add form category select box.', 'info', NAME);

        Y.dcforms.categoriesselect =  {

            /**
             *  Load the set of categories from the server
             *
             *  @param callback     {function}  Of the form fn(err, data)
             */

            'load': function(callback) {
                Y.dcforms.getFormCategories(false, callback);
            },

            /**
             *  Render an HTML select element for choosing a form category into the div specified
             *
             *  @param  elementName     {string}    Name for the new select element
             *  @param  elementId       {string}    DOM ID for the new select element
             */

            'renderSelectBoxSync': function(elementName, elementId, callback) {
                Y.doccirrus.jsonrpc.api.formfolder.getFolders()
                    .then( function( res ) {
                        var folders = Y.dcforms.categories || [];
                        if( res.data ) {
                            res.data.forEach( function( item ) {
                                if( item ) {
                                    folders.push( item );
                                }
                            });
                        }
                        var
                            cats = folders,
                            html = '',
                            userLang = Y.dcforms.getUserLang(), i;

                        html = html + '<select class="form-control" name="' + elementName + '" id="' + elementId + '">';

                        for (i = 0; i < cats.length; i++) {
                            html = html + '<option value="' + cats[i].canonical + '">' + cats[i][userLang] + '</option>';
                        }

                        html = html + '</select>';
                        if(callback) {
                            callback(html);
                        }

                    } ).fail( function( err ) {
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        } );

            }

        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);
