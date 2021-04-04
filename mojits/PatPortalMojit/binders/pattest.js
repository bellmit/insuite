/**
 * User: martinpaul
 * Date: 21.06.13  11:56
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, $ */

"use strict";

YUI.add( 'PatTestBinder', function( Y, NAME ) {

        var
            myNode,
            patientReg,
            formCategories,
            jqCache = {};

        function onPatientRegLoaded(err, data) {
            if (err) {
                jqCache.divPatientReg.html('<pre>' + JSON.stringify(err) + '</pre>');
                return;
            }
            jqCache.divPatientReg.html('<pre>' + JSON.stringify(data) + '</pre>');
            patientReg = data;

            //  next load the form categories
            Y.doccirrus.blindproxy.getSingle(
                patientReg[0]._id,
                '/1/formtemplate/:getcategories',
                {},
                onFormCategoriesLoaded
            );
        }

        function onFormCategoriesLoaded(err, data) {

            if (err) {
                jqCache.divFormCategories.html('<pre>' + JSON.stringify(err) + '</pre>');
                return;
            }

            jqCache.divFormCategories.html('<pre>' + JSON.stringify(data) + '</pre>');
            formCategories = data;
        }

        /**
         * Constructor for the PatTestBinder class.
         *
         * @class PatTestBinder
         * @constructor
         */

        Y.namespace( 'mojito.binders' )[NAME] = {

            /** using client side Jade so we need to announce who we are. */
            jaderef: 'PatPortalMojit',

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function( mojitProxy ) {
                this.mojitProxy = mojitProxy;
            },

            /**
             * The binder method, invoked to allow the mojit to attach DOM event
             * handlers.
             *
             * @param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function( node ) {

                myNode = node;

                jqCache = {
                    'divPatientReg': $('#divPatientReg'),
                    'divFormCategories': $('#divFormCategories')
                };

                Y.doccirrus.comctl.pucGet('/r/patientreg/', { 'action': 'listpatientreg' }, onPatientRegLoaded);

            }
        };

    }, '0.0.1',
    {requires: [
        'event-mouseenter',
        'mojito-client',
        'mojito-rest-lib',
        'dcutils',
        'dcschemaloader',
        'dcvalidations',
        'dcblindproxy',
        'dc-comctl',
        'slider-base',
        'PatientAlertBinderMain'
    ]}
);
