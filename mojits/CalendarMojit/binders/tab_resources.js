/*global ko, $, fun:true */
/*exported fun*/
'use strict';

fun = function _fn( Y, NAME ) {

    var
        binder = Y.doccirrus.utils.getMojitBinderByType( 'CalendarMojit' ),
        binderViewModel = binder.binderViewModel,
        KoViewModel = Y.doccirrus.KoViewModel,
        viewModel = null;

    /**
     * This views TabResourcesViewModel
     * @constructor
     */
    function TabResourcesViewModel() {
        TabResourcesViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( TabResourcesViewModel, KoViewModel.getDisposable(), {
        /**
         * A name to identify this view model by
         * @property {String} viewName
         */
        viewName: 'tab_resources',

        /** @protected */
        initializer: function TabResourcesViewModel_initializer() {
            Y.log( NAME + 'Initialized', 'info', NAME );
            $('#resourcesCalendarMain').click(function () {
                $('#resourcesCalendarLeftBar').toggleClass('opened');
            });
        },
        /** @protected */
        destructor: function TabResourcesViewModel_destructor() {
        }
    } );

    return {
        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node   NB: The node MUST have an   id   attribute.
         */
        registerNode: function tab_resources_registerNode( node ) {
            viewModel = new TabResourcesViewModel();

            ko.applyBindings( viewModel, node.getDOMNode() );
            binderViewModel.currentView( viewModel );
        },

        deregisterNode: function tab_resources_deregisterNode( node ) {
            ko.cleanNode( node.getDOMNode() );
            //  clean up viewmodel, unsubscribe hotkeys, MOJ-7531
            viewModel.destroy();
        }
    };
};
