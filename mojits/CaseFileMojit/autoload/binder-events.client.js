/*
 *  This defines a central place for JadeLoaded views to register singleton event handlers, to prevent the
 *  need for more complex registration and passing models when separate views relating to the same object need to
 *  update each other without dirtying the models.
 *
 *  This is mostly for when JadeLoaded views need to inform each other about changes in state not alreay encapsualted
 *  in a ko viewModel - such as imported MediaMojit and FEM views, and should only be used where there will only be a
 *  single listener for an event (one nav controller, one open CaseFile, one currentActivity's attachments, etc)
 *
 *  Pattern for event calls is:
 *
 *      onEventName(
 *          appliesTo   -   _id of the object concerned, should be checked
 *          ... params ...
 *          ... callback if appropriate ...
 *      );
 *
 *  @author: strix
 *  @date: 2014/05/15
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

/**
 * @module caseFile
 * @class DCCaseFileBinderEvents
 */

YUI.add(
    'dccasefilebinderevents',
    function( Y, NAME ) {
        Y.log('Adding binding point for CaseFile view events.', 'info', NAME);
        Y.namespace( 'doccirrus.uam' ).events = {};
    },
    '0.0.1', {requires: [ 'dcviewmodel' ] }
);