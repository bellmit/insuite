/*
 * Copyright 2012 Doc Cirrus GmbH, Berlin
 * Date: 20.12.2012
 */

/*global jQuery */

"use strict";

/* jshint unused:false */
function dcChangeTab( param ) {

    jQuery( '#container' ).find( '.toplevel' ).each( function() {
        jQuery( this ).removeClass( 'active' );
    } );

    jQuery( param ).addClass( 'active' );
}

/**
 * Viewport switching between normal (bootstrap container) and wide (resolution dependent)
 * use normal, for normal forms and content
 * use wide, for large forms and datatables
 *
 * @wide Boolean, true means wide, false means normal (default)
 */
// TODO: MOJ-3142
function setViewportWide( wide ) {
    var
        $containers = jQuery( '.container' ),
        body = document.body;
    if( wide ) {
        $containers.addClass( 'container-fullscreen' );
        body.classList.add( 'content-fullscreen' );
    } else {
        $containers.removeClass( 'container-fullscreen' );
        body.classList.remove( 'content-fullscreen' );
    }
}
