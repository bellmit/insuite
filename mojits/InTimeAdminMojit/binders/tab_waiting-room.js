/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko, jQuery */
fun = function _fn( Y/*, NAME*/ ) {
    'use strict';
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        viewModel;

    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, KoViewModel.getDisposable(), {
        initializer: function() {
            var
                self = this;
            self.initViewModel();

        },
        destructor: function() {
        },
        initViewModel: function() {
            var
                self = this;
            self.waitingRoomTitleI18n = i18n('InTimeAdminMojit.tab_waiting-room.headline');
        }
    }, {
        ATTRS: {}
    } );

    return {

        registerNode: function( node ) {
            var
                $iframe = jQuery( 'iframe.waitingroom', node.getDOMNode() ),
                space = 10,

                MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver,
                observer;

            $iframe.load( function( load ) {

                $iframe.height( load.target.contentDocument.body.scrollHeight + space );

                jQuery( load.target.contentWindow ).unload( function() {
                    if( observer ) {
                        observer.disconnect();
                    }
                } );

                if( MutationObserver ) {
                    observer = new MutationObserver( function( mutations ) {
                        mutations.forEach( function( mutation ) {
                            Y.each( mutation.addedNodes, function( node ) {
                                if( 'IMG' === node.tagName ) {
                                    jQuery( node ).load( function() {
                                        $iframe.height( load.target.contentDocument.body.scrollHeight + space );
                                    } );
                                }
                            } );
                            Y.each( mutation.removedNodes, function( node ) {
                                if( 'IMG' === node.tagName ) {
                                    $iframe.height( load.target.contentDocument.body.scrollHeight + space );
                                }
                            } );
                        } );
                    } );

                    observer.observe( load.target.contentDocument.body, {
                        childList: true,
                        subtree: true
                    } );
                }

            } );

            // set viewModel
            viewModel = new ViewModel( { node: node.getDOMNode() } );

            ko.applyBindings( viewModel, node.getDOMNode() );

            $iframe.attr( 'src', Y.doccirrus.utils.getUrl( 'waitingroom' ) );

        },

        deregisterNode: function( /*node*/ ) {

        }
    };
};
