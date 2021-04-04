/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
'use strict';
YUI.add( 'IncaseAdminMasterTabBinderIndex', function( Y, NAME ) {

    /**
     * The IncaseAdminMasterTabBinderIndex module.
     *
     * @module IncaseAdminMasterTabBinderIndex
     */

    /**
     * Constructor for the IncaseAdminMasterTabBinderIndex class.
     *
     * @class IncaseAdminMasterTabBinderIndex
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[NAME] = Y.doccirrus.entryPoints.inCaseAdminMasterTab;

}, '0.0.1', {
    requires: [
        'InCaseAdminMasterTabEntryPoint',
        'promise'
    ]} );
