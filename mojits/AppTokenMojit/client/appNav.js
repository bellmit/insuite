/**
 * User: pi
 * Date: 17.01.18  08:47
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko*/
import 'babel-polyfill';
import '../models/apptoken-schema.common';
import '../../../autoload/KoViewModel/KoViewModel.client';
import '../../../autoload/KoUI/KoComponentManager/KoComponentManager.client';
import '../../../autoload/dcauth-obfuscated.client';
import '../../../autoload/YUI/DCRouter/DCRouter.client';
import '../../../autoload/KoUI/KoNav/KoNav.client';
import React from 'react';
import ReactDOM from 'react-dom';
import store from '../../../client/react/store';
import { Provider } from 'react-redux';
import appNavFabric from './components/AppNav';
import { setAppRegs } from '../../../client/react/actions/auth';
// eslint-disable-next-line no-native-reassign
Promise = window.bluebirdPromise;

YUI.add( 'AppNavEntryPoint', function( Y, NAME ) {
    const
        Disposable = Y.doccirrus.KoViewModel.getDisposable();

    class ViewModel extends Disposable {
        initializer() {
            this.initViewModel();
        }

        initViewModel() {
            this.appIFrameUrl = ko.observable();
        }

        setContainerHeight( element ) {
            setTimeout( function() {
                if( element.parentNode ) {
                    element.style.height = (window.innerHeight - element.parentNode.offsetHeight).toString() + 'px';
                }
            }, 100 );
        }
    }

    /**
     * @module AppTokensEntryPoint
     *
     */
    /**
     * @property appTokenEntryPoint
     */
    Y.namespace( 'doccirrus.entryPoints' ).AppNavEntryPoint = {

        jaderef: 'AppTokenMojit',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        bind: function() {
            const
                viewModel = new ViewModel(),
                appRegs = Y.doccirrus.auth.getAppRegs() || [],
                AppNav = appNavFabric( Y, viewModel );
            store.dispatch( setAppRegs( JSON.parse(JSON.stringify(appRegs)) ) );

            ReactDOM.render(
                <Provider store={store}>
                    <AppNav viewModel={viewModel} Y={Y} NAME={NAME}/>
                </Provider>,
                document.getElementById( 'appNavRoot' ) );
        }
    };
}, '0.0.1', {
    requires: [
        'DCBinder',
        'KoViewModel',
        'KoComponentManager',
        'JsonRpc',
        'apptoken-schema',
        'dcauth',
        'DCRouter',
        'KoNav'
    ]
} );