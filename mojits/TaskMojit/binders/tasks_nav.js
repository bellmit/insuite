/*jslint anon:true, sloppy:true, nomen:true*/

/* global YUI */
YUI.add( 'TaskMojitBinder', function( Y, NAME ) {

    Y.namespace( 'mojito.binders' )[NAME] = Y.doccirrus.entryPoints.TasksNavEntryPoint;

}, '0.0.1', {
    requires: [ 'TasksNavEntryPoint' ]
} );
