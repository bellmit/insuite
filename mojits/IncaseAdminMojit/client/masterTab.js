/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, Promise:true */

import 'babel-polyfill';
import ReactDOM from 'react-dom';
import store from '../../../client/react/store';
import React from 'react';
import { Provider } from 'react-redux';
import masterTabFabric from './components/MasterTab';

Promise = window.bluebirdPromise;

YUI.add( 'InCaseAdminMasterTabEntryPoint', function( Y, NAME ) {

    /**
     * @module IncaseAdminMasterTabBinderIndex
     */
    /**
     * @class IncaseAdminMasterTabBinderIndex
     * @constructor
     */
    Y.namespace( 'doccirrus.entryPoints' ).inCaseAdminMasterTab = {

        jaderef: 'IncaseAdminMojit',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        bind: function() {
            const
                MasterTab = masterTabFabric( Y );
            const query = location.search.slice( 1 ).split( '&' )
                .map( item => item ? item.split( '=' ) : item )
                .filter( item => item )
                .reduce( ( obj, item ) => {
                    obj[ item[ 0 ] ] = item[ 1 ];
                    return obj;
                }, {} );
            ReactDOM.render(
                <Provider store={store}>
                    <MasterTab Y={Y} NAME={NAME} systemNumber={query.systemNumber}/>
                </Provider>,
                document.getElementById( 'masterTabRoot' ) );
        }
    };
}, '0.0.1', {
    requires: []
} );