/*jslint anon:true, sloppy:true, nomen:true*/
/* global YUI */
YUI.add( 'TaskMojit', function( Y, NAME ) {

    /**
     * The TaskMojit module.
     *
     * @module TaskMojit
     */

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.namespace( 'mojito.controllers' )[NAME] = {

        tasks_nav: function( ac ) {
            ac.assets.addCss( './css/TaskMojit.css' );
            ac.assets.addCss( '/static/dcbaseapp/assets/lib/jquery/minicolors/2.2.6/jquery.minicolors.css' );
            ac.assets.addJs( Y.doccirrus.utils.getWorkaroundPath(), 'bottom' );
            ac.assets.addJs( Y.doccirrus.utils.getBundlePath( 'tasksNav.bundle.js' ), 'bottom' );
            ac.assets.addJs( '/static/dcbaseapp/assets/lib/jquery/minicolors/2.2.6/jquery.minicolors.js', 'bottom' );
            ac.assets.addJs( '/static/dcbaseapp/assets/lib/jquery/jquery-sortable/0.9.13/source/js/jquery-sortable.js', 'bottom' );
            ac.done( {}, { isd: Y.doccirrus.auth.isISD(), title: Y.doccirrus.i18n( 'top_menu.LBL_MENU_TASKS' ) } );
        }

    };

}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-assets-addon',
        'mojito-models-addon']
} );
