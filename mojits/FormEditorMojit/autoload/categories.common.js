/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Simple YUI module, replacement for static JSON file containing category data
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-categories',

    /* Module code */
    function(Y) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         *
         *  The paper name is that used in the forms dialogs, the hpdf property is the paper geometry name used by the
         *  libharu PDF library
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        Y.dcforms.categories = [
            {
                "canonical": "BG",
                "en": "BG",
                "de": "BG"
            },
            {
                "canonical": "Briefvorlagen",
                "en": "Form Letters",
                "de": "Briefvorlagen"
            },
            {
                "canonical": "Envelopes",
                "en": "Envelopes",
                "de": "Briefumschläge"
            },
            {
                "canonical": "eDMP",
                "en": "eDMP",
                "de": "eDMP"
            },
            {
                "canonical": "QM-Frageboegen",
                "en": "Questionnaire",
                "de": "Frageboegen"
            },
            {
                "canonical": "Rezept",
                "en": "Prescription Forms",
                "de": "Rezepte Formulare"
            },
            {
                "canonical": "Standard Formulare",
                "en": "Standard Forms",
                "de": "Standard Formulare"
            },
            {
                "canonical": "Archiv",
                "en": "Archived forms",
                "de": "Archiv"
            },
            {
                "canonical": "GHD",
                "en": "Care",
                "de": "Care"
            },
            {
                "canonical": "Briefkopf",
                "en": "Letterhead",
                "de": "Briefkopf"
            },
            {
                "canonical": "inGyn",
                "en": "inGyn",
                "de": "inGyn"
            },
            {
                "canonical": "inPedia",
                "en": "inPedia",
                "de": "inPedia"
            },
            {
                "canonical": "inSight2",
                "en": "inSight",
                "de": "inSight"
            },
            {
                "canonical": "Telekardio",
                "en": "Telecardio",
                "de": "Telecardio"
            },
            {
                "canonical": "DOQUVIDE",
                "en": "DOQUVIDE",
                "de": "DOQUVIDE"
            },
            {
                "canonical": "DQS",
                "en": "DQS / DQS RS",
                "de": "DQS / DQS RS"
            }

        ];

        /**
         *
         *
         *  @param  {Object}    options
         *  @param  {Boolean}   options.withArchiv
         *  @param  {Boolean}   options.withGHD
         *  @param  {Boolean}   options.withInSight2
         *  @param  {Boolean}   options.withEDMP
         *  @param  {Boolean}   options.withEnvelopes
         *  @param  {Boolean}   options.withTelekardio
         *  @param  {Boolean}   options.withDOQUVIDE
         *  @param  {Boolean}   options.withInGyn
         *  @param  {Boolean}   options.withDQS
         *  @return {Array.<T>}
         */

        Y.dcforms.getCategories = function( options ) {
            function removeItem( canonical, catSet ) {
                var newSet = [];
                catSet.forEach( function( item ) {
                    if ( item.canonical !== canonical ) {
                        newSet.push( item );
                    }
                } );
                return newSet;
            }

            //  TODO: get current language after dcforms translations are ported to new system
            function sortAlphabetically( a, b ) {
                var
                    nameA = a.de.toLowerCase(),
                    nameB = b.de.toLowerCase();

                if ( nameA < nameB ) { return -1; }
                if ( nameA > nameB ) { return 1; }
                return 0;
            }

            var copySet = Y.dcforms.categories.slice( 0 );

            if ( !options.withArchiv ) { copySet = removeItem( 'Archiv', copySet ); }
            if ( !options.withGHD ) { copySet = removeItem( 'GHD', copySet ); }
            if ( !options.withInSight2 ) { copySet = removeItem( 'inSight2', copySet ); }
            if ( !options.withEDMP ) { copySet = removeItem( 'eDMP', copySet ); }
            if ( !options.withEnvelopes ) { copySet = removeItem( 'Envelopes', copySet ); }
            if ( !options.withTelekardio ) { copySet = removeItem( 'Telekardio', copySet ); }
            if ( !options.withDOQUVIDE ) { copySet = removeItem( 'DOQUVIDE', copySet ); }
            if ( !options.withInGyn ) { copySet = removeItem( 'inGyn', copySet ); }
            if ( !options.withInPedia ) { copySet = removeItem( 'inPedia', copySet ); }
            if ( !options.withDQS ) { copySet = removeItem( 'DQS', copySet ); }

            copySet.sort( sortAlphabetically );
            return copySet;
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);