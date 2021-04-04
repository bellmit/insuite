/*
 *  Copyright DocCirrus GmbH 2017
 *  Common methods for checkbox grouping
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-checkbox-groups',

    /* Module code */
    function( Y ) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        /**
         *  Check whether a checkbox group is valid (has a value if one is required)
         *  Used to add hasError highlight
         */

        function checkGroupValid( element, isChecked ) {
            var
                hasGroupCheck = groupIsChecked( element, isChecked ),
                otherElem,
                i;

            for ( i = 0; i < element.page.elements.length; i++ ) {
                otherElem = element.page.elements[i];

                if (
                    ( 'checkbox' === otherElem.elemType || 'checkboxtrans' === otherElem.elemType )  &&
                    ( '' !== otherElem.extra ) &&
                    ( otherElem.extra === element.extra ) &&
                    ( otherElem.validate.notEmpty )
                ) {
                    otherElem.renderer.setInvalid( !hasGroupCheck );
                }
            }
        }

        /**
         *  Check if any other checkbox in the group is set
         *  TODO: DRY this up
         */

        function groupIsChecked( element, isChecked ) {
            var
                otherElem,
                isBooleanType,
                i;

            if ( isChecked ) {
                //  at least one
                return true;
            }

            if ( !element.extra || '' === element.extra ) {
                //  always false, but no need to check for other elements
                return isChecked;
            }

            for ( i = 0; i < element.page.elements.length; i++ ) {
                otherElem = element.page.elements[i];
                isBooleanType = (
                    ( 'checkbox' === otherElem.elemType ) ||
                    ( 'checkboxtrans' === otherElem.elemType ) ||
                    ( 'togglebox' === otherElem.elemType )
                );

                if (
                    ( true === isBooleanType ) &&
                    ( '' !== otherElem.extra ) &&
                    ( otherElem.extra === element.extra ) &&
                    ( otherElem.elemId !== element.elemId ) &&
                    ( true === otherElem.unmap() )
                ) {
                    return true;
                }
            }

            return false;
        }

        /**
         *  Unset any other checkboxes in the same group on the same page
         *
         *  Special semantic of element.maxLen property - if 0 then
         */

        function unsetFromGroup( element, isChecked ) {
            var
                otherElem,
                isBooleanType,
                i;

            // other element sof the group are not unset if element.maxLen !== 0, MOJ-8710)
            if ( element.maxLen !== 0 ) {
                //Y.log( 'Not unchecking other members, group: ' + element.extra + ' maxLen: ' + element.maxLen, 'debug', NAME );
                return;
            }

            if ( !isChecked ) {
                return;
            }

            for ( i = 0; i < element.page.elements.length; i++ ) {
                otherElem = element.page.elements[i];
                isBooleanType = (
                    ( 'checkbox' === otherElem.elemType ) ||
                    ( 'checkboxtrans' === otherElem.elemType ) ||
                    ( 'togglebox' === otherElem.elemType )
                );

                if (
                    ( true === isBooleanType )  &&
                    ( '' !== otherElem.extra ) &&
                    ( otherElem.extra === element.extra ) &&
                    ( otherElem.elemId !== element.elemId )
                ) {
                    otherElem.map( false );
                }
            }

        }

        Y.dcforms.elements.checkboxUtils = {
            checkGroupValid: checkGroupValid,
            groupIsChecked: groupIsChecked,
            unsetFromGroup: unsetFromGroup
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);