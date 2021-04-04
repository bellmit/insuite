/*
 @author: dd
 @date: 2014/1/22
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'dcglobalviewmodel', function( Y ) {


        var GlobalViewModel;
        /**
         *  Model for common values and functions that all ko views can/should make use of.
         *  It is attached to the property "_globals" in a ViewModel therefor it is
         *  available to all models that inherit the ViewModel
         *
         * @class GlobalViewModel
         */
        GlobalViewModel = function () {
            var
                self = this;

            self.auth = {
                validProduct :  Y.doccirrus.auth.validProduct // @ /autoload/dcauth.client.js
            };
        };

        //expose the class
        Y.namespace( 'doccirrus.uam' ).GlobalViewModel = GlobalViewModel;

    },
    '0.0.1', {requires: []}
);