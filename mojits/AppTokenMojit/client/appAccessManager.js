/**
 * User: pi
 * Date: 17.01.18  08:47
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

// eslint-disable-next-line no-redeclare
/*global YUI, ko, Promise:true*/
import 'babel-polyfill';
import '../models/apptoken-schema.common';
import '../../../autoload/KoUI/KoTable/KoTable.client';
// import '../../../autoload/KoUI/KoButton/KoButton.client';
import '../../../autoload/KoViewModel/KoViewModel.client';
import '../../../autoload/jsonrpc/JsonRpc.client';
import '../../../autoload/KoUI/KoComponentManager/KoComponentManager.client';
import '../../../autoload/KoUI/KoFileUploader/KoFileUploader.client';
import '../../../autoload/dcauth-obfuscated.client';
import '../../../models/settings-schema.common';
import '../../../autoload/YUI/DCRouter/DCRouter.client';
import '../../../autoload/KoUI/KoNav/KoNav.client';
import '../../../autoload/doccirrus.common';
import React from 'react';
import {Provider} from 'react-redux';
import {setAppRegs} from '../../../client/react/actions/auth';
import appAccessManagerFabric from './components/AppAccessManager';
import store from '../../../client/react/store';
import ReactDOM from 'react-dom';

Promise = window.bluebirdPromise;

YUI.add( 'AppAccessManagerEntryPoint', function( Y, NAME ) {
    const
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n;

    /**
     * Shows error message in a Popup on UI
     *
     * @param {Object} error
     *    @param {number} error.code - ex: -32500
     *    @param {string} error.message - "application error"
     *    @param {Object[]} error.data
     *        @param {string} error.data[].message - If present then "code" and "data" will not be present
     *        @param {string} [error.data[].code] - If present then "message" will not be present
     *        @param {Object} [error.data[].data] - Will be only present if "code" is passed ex. {$randomkey: "value to replace $randomkey"}
     *
     * @returns undefined
     */
    function onFail( error ) {
        let errorData;

        if( error && error.data && error.data[0] && Object.keys(error.data[0]) ) {
            errorData = error.data[0];
        } else if( error && error.message ) {
            errorData = {message: error.message};
        }

        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( errorData ), 'display' );
    }

    class ViewModel extends Disposable {
        initializer() {
            this.initViewModel();
        }

        initViewModel() {
            this.appVersionUpdateTableVisible = ko.observable();
            this.isSolsSupported = Y.doccirrus.auth.isSolsSupported();
            this.isDev = Y.config.doccirrus.Env.isDev;
            this.solsNotSupportedTextI18n = i18n( 'AppTokenMojit.AppAccessManager.text.SOLS_NOT_SUPPORTED' );
            this.appVersionUpdateTableTitleI18n = i18n( 'AppTokenMojit.AppAccessManager.title.UPDATE_SOL_VERSION' );
            this.isDevUpdateAppWarningI18n = i18n( 'AppTokenMojit.AppAccessManager.title.DEV_SYSTEM_UPDATE_SOL_WARNING' );
            this.appIFrameUrl = ko.observable(); // DEPRECATED
            this.docsVisible = ko.observable();
            this.pageHeader = i18n( 'AppTokenMojit.AppAccessManager.PAGE_TITLE' );
            this.initAppRegTable();
            this.initVersionUpdateTable();
            this.initFileUploader();
        }

        setContainerHeight( element ) {
            setTimeout( function() {
                if( element.parentNode ) {
                    element.style.height = `${(window.innerHeight - element.parentNode.offsetHeight).toString()}px`;
                }
            }, 100 );
        }

        changeAccess( params ) {
            let { query } = params;
            const
                self = this,
                { deny, appHostType } = params,
                apiCallProm = Promise.promisify( Y.doccirrus.communication.apiCall.bind(Y.doccirrus.communication) ),
                rootNode = document.getElementById('appAccessManagerRoot');

            query.appHostType = appHostType;
            query.appIsRemote = (appHostType === 'REMOTE');

            let
                promise;
            if( deny ) {
                promise = apiCallProm( {query, method: "appreg.denyAccess"} );
            } else {
                promise = apiCallProm( {query, method: "appreg.giveAccess"} );
            }

            Y.doccirrus.utils.showLoadingMask( rootNode );

            return promise
                    .then( () => {
                        Y.doccirrus.utils.hideLoadingMask( rootNode );
                        self.appRegTable.reload();
                        self.appVersionUpdateTable.reload();
                    } )
                    .catch( (error) => {
                        Y.doccirrus.utils.hideLoadingMask( rootNode );
                        onFail(error);
                    } );
        }

        giveAccess( data ) {
            const
                self = this;
            Promise.resolve( Y.doccirrus.jsonrpc.api.appreg.giveAccess( {
                query: {
                    _id: data._id
                }
            } ) )
                .then( () => {
                    self.appRegTable.reload();
                    self.appVersionUpdateTable.reload();
                } )
                .catch( error => {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
        }

        denyAccess( data ) {
            const
                self = this;
            Promise.resolve( Y.doccirrus.jsonrpc.api.appreg.denyAccess( {
                query: {
                    _id: data._id
                }
            } ) )
                .then( () => {
                    self.appRegTable.reload();
                    self.appVersionUpdateTable.reload();
                } )
                .catch( error => {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
        }

        updateAppVersion( args ) {
            const
                self = this,
                { query } = args,
                rootNode = document.getElementById('appAccessManagerRoot'),
                _updateAppVersion = Y.doccirrus.jsonrpc.api.appreg.updateAppVersion( { query } );

            query.appIsRemote = (query.appHostType === 'REMOTE');

            Y.doccirrus.utils.showLoadingMask( rootNode );

            return _updateAppVersion
                .then( () => {
                    Y.doccirrus.utils.hideLoadingMask( rootNode );
                    self.appRegTable.reload();
                    self.appVersionUpdateTable.reload();
                } )
                .fail( (error) => {
                    Y.doccirrus.utils.hideLoadingMask( rootNode );
                    onFail(error);
                } );
        }

        initAppRegTable() {
            const
                self = this,
                testLicense = Y.doccirrus.auth.hasSupportLevel( Y.doccirrus.schemas.settings.supportLevels.TEST ),
                allColumns = {
                    appName: {
                        forPropertyName: 'appName',
                        label: i18n( 'AppTokenMojit.AppAccessManager.title.NAME' ),
                        width: '15%',
                        isSortable: true,
                        sortInitialIndex: 0,
                        renderer: function( meta ) {
                            let
                                hasAccess = meta.row.hasAccess;
                            return `<span class="${hasAccess ? 'dc-green' : 'dc-red'}">${meta.value}</span>`;
                        }
                    },
                    appTitle: {
                        forPropertyName: 'title',
                        label: i18n( 'AppTokenMojit.AppAccessManager.title.TITLE' ),
                        width: '15%',
                        renderer: function( meta ) {
                            let
                                hasAccess = meta.row.hasAccess;
                            return `<span class="${hasAccess ? 'dc-green' : 'dc-red'}">${meta.value || ''}</span>`;
                        }
                    },
                    appDescription: {
                        forPropertyName: 'description',
                        label: i18n( 'AppTokenMojit.AppAccessManager.title.DESCRIPTION' ),
                        width: testLicense ? '15%' : '25%'
                    },
                    appVersion: {
                        forPropertyName: 'appVersion',
                        label: i18n( 'AppTokenMojit.AppAccessManager.title.VERSION' ),
                        width: testLicense ? '10%' : '20%'
                    },
                    changeAccessButton: {
                        forPropertyName: 'hasAccess',
                        label: i18n( 'AppTokenMojit.AppAccessManager.title.HAS_ACCESS' ),
                        width: '120px',
                        renderer: function( meta ) {
                            let
                                value = meta.value;
                            if( value ) {
                                return `<div class="text-center">
                                            <button class="denyAccess btn btn-default"><span class="denyAccess dc-red">${i18n( 'AppTokenMojit.AppAccessManager.title.DEACTIVATE' )}</span></button>
                                        </div>`;
                            }
                            return `<div class="text-center">
                                        <button class="giveAccess btn btn-default"><span class="giveAccess dc-green">${i18n( 'AppTokenMojit.AppAccessManager.title.ACTIVATE' )}</span></button>
                                    </div>`;
                        },
                        onCellClick: function( meta, event ) {
                            const
                                giveAccess = event.target.classList.contains( 'giveAccess' ),
                                denyAccess = event.target.classList.contains( 'denyAccess' ),
                                checkbox = document.querySelector(`input[name='${meta.row.appName}']#solHostSwitch`),
                                appHostType = (testLicense && checkbox && checkbox.value) || 'LOCAL';

                            if( giveAccess || denyAccess ) {
                                self.changeAccess( {
                                    query: {
                                        _id: meta.row._id
                                    },
                                    appHostType,
                                    deny: denyAccess
                                } );
                                return false;
                            }

                        }
                    },
                    changeHostTypeSwitch: {
                        forPropertyName: 'solHostSwitch',
                        label: i18n( 'AppTokenMojit.AppAccessManager.title.SOL_HOST' ),
                        width: '170px',
                        renderer: function( meta ) {
                            let
                                appHostType = meta.row.appHostType || 'LOCAL',
                                appName = meta.row.appName,
                                isRemote = (appHostType === 'REMOTE');
                            return `<div class="text-center">
                                        <div class="btn">
                                            <span data-toggle="tooltip" data-placement="top"
                                                title="${i18n( 'AppTokenMojit.AppAccessManager.tooltip.SOL_LOCAL' )}"
                                                class="${!isRemote ? 'dc-green' : 'dc-red'}">${i18n('AppTokenMojit.AppAccessManager.text.SOL_LOCAL')} </span>
                                            <label class="switch">
                                                <input value="${appHostType}" name="${appName}" id="solHostSwitch" type="checkbox" ${isRemote ? "checked" : ""
                                                                    }>
                                                <span class="slider round"></span>
                                            </label>
                                            <span data-toggle="tooltip" data-placement="top"
                                                title="${i18n( 'AppTokenMojit.AppAccessManager.tooltip.SOL_REMOTE' )}"
                                                class="${isRemote ? 'dc-green' : 'dc-red'}"> ${i18n('AppTokenMojit.AppAccessManager.text.SOL_REMOTE')}</span>
                                            <script>
                                                jQuery(function ($) {
                                                    $('[data-toggle="tooltip"]').tooltip();
                                                });
                                            </script>
                                        </div>
                                    </div>`;
                        },
                        onCellClick: function( meta, event ) {
                            if( event.target.id === 'solHostSwitch' ) {
                                event.preventDefault();
                                if( meta.row.hasAccess ) {
                                    Y.doccirrus.DCWindow.notice( {
                                        type: 'warn',
                                        window: {
                                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM
                                        },
                                        message: `<p style="word-break: break-all;">Sol ${meta.row.appName} ${i18n( 'AppTokenMojit.AppAccessManager.text.IS_ACTIVE' )}</p>
                                                    <p style="word-break: break-all;">${i18n( 'AppTokenMojit.AppAccessManager.text.MUST_DEACTIVATE_SOL' )}</p>`
                                    } );
                                    return false;
                                }
                                let
                                    appHostType = event.target.value,
                                    isRemote = (appHostType === 'REMOTE');

                                setTimeout(function switchCheckbox() {
                                    event.target.value = (isRemote) ? 'LOCAL' : 'REMOTE';
                                    event.target.checked = !isRemote;
                                }, 0 );
                                return false;
                            }
                        }
                    },
                    solToken: {
                        forPropertyName: 'solToken',
                        label: i18n( 'AppTokenMojit.AppAccessManager.title.APP_ACCESS_TOKEN' ),
                        width: '80px',
                        renderer: function() {
                            return `<button class="showAppAccessToken btn btn-default"><span class="showAppAccessToken">${i18n( 'AppTokenMojit.AppAccessManager.title.APP_ACCESS_TOKEN' )}</span></button>`;
                        },
                        onCellClick: function( meta, event ) {
                            const
                                showToken = event.target.classList.contains( 'showAppAccessToken' );
                            if( showToken ) {
                                Y.doccirrus.DCWindow.notice( {
                                    window: {
                                        width: Y.doccirrus.DCWindow.SIZE_LARGE
                                    },
                                    message: `<p style="word-break: break-all;">${meta.value}</p>`
                                } );
                            }

                        }
                    },
                    inSuiteToken: {
                        forPropertyName: 'inSuiteToken',
                        label: i18n( 'AppTokenMojit.AppAccessManager.title.TOKEN' ),
                        width: '80px',
                        renderer: function() {
                            return `<button class="showToken btn btn-default"><span class="showToken">${i18n( 'AppTokenMojit.AppAccessManager.title.TOKEN' )}</span></button>`;
                        },
                        onCellClick: function( meta, event ) {
                            const
                                showToken = event.target.classList.contains( 'showToken' );
                            if( showToken ) {
                                Y.doccirrus.DCWindow.notice( {
                                    window: {
                                        width: Y.doccirrus.DCWindow.SIZE_LARGE
                                    },
                                    message: `<p style="word-break: break-all;">${meta.value}</p><br/><p>${i18n( 'AppTokenMojit.AppAccessManager.text.TOKEN' )}</p>`
                                } );
                            }

                        }
                    }
                };

            const columns = [
                allColumns.appName,
                allColumns.appTitle,
                allColumns.appDescription,
                allColumns.appVersion,
                allColumns.changeAccessButton,
                testLicense && allColumns.changeHostTypeSwitch,
                allColumns.solToken,
                testLicense && allColumns.inSuiteToken
            ];

            this.appRegTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: testLicense ? 'AppReg-appRegTable-test' : 'AppReg-appRegTable',
                    states: [ 'limit' ],
                    fillRowsToLimit: false,
                    proxy: Y.doccirrus.jsonrpc.api.appreg.populateAppAccessManagerTable,
                    remote: true,
                    columns: columns.filter( Boolean )
                }
            } );
        }

        initVersionUpdateTable() {
            const
                self = this,
                testLicense = Y.doccirrus.auth.hasSupportLevel( Y.doccirrus.schemas.settings.supportLevels.TEST ),
                allColumns = {
                    appName: {
                        forPropertyName: 'appName',
                        label: i18n( 'AppTokenMojit.AppAccessManager.title.NAME' ),
                        width: '20%',
                        isSortable: true,
                        sortInitialIndex: 0
                    },
                    appTitle: {
                        forPropertyName: 'title',
                        label: i18n( 'AppTokenMojit.AppAccessManager.title.TITLE' ),
                        width: '20%'
                    },
                    appVersion: {
                        forPropertyName: 'appVersion',
                        label: i18n( 'AppTokenMojit.AppAccessManager.title.VERSION' ),
                        width: '20%',
                        renderer: function( meta ) {
                            return `<span class="dc-red">${meta.value || ''}</span>`;
                        }
                    },
                    storeVersion: {
                        forPropertyName: 'storeVersion',
                        label: i18n( 'AppTokenMojit.AppAccessManager.title.STORE_VERSION' ),
                        width:'20%'
                    },
                    updateAppButton: {
                        forPropertyName: 'updateAppButton',
                        label: i18n( 'AppTokenMojit.AppAccessManager.title.UPDATE_APP' ),
                        width: '150px',
                        renderer: function() {
                            return `<div class="text-center">
                                        <button class="btn btn-default"><span class="dc-green">${i18n( 'AppTokenMojit.AppAccessManager.title.UPDATE_APP' )}</span></button>
                                    </div>`;
                        },
                        onCellClick: function( meta ) {
                            return self.updateAppVersion( {
                                query: {
                                    _id: meta.row._id,
                                    appName: meta.row.appName,
                                    appHostType: (testLicense && meta.row.appHostType) || 'LOCAL'
                                }
                            } );
                        }
                    }
                };

            const columns = [
                allColumns.appName,
                allColumns.appTitle,
                allColumns.appVersion,
                allColumns.storeVersion,
                allColumns.updateAppButton
            ];

            self.appVersionUpdateTableVisible( false );

            this.appVersionUpdateTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'AppReg-VersionUpdateTable',
                    states: [ 'limit' ],
                    fillRowsToLimit: false,
                    proxy: Y.doccirrus.jsonrpc.api.appreg.populateVersionUpdateTable,
                    remote: true,
                    columns: columns.filter( Boolean )
                }
            } );

            this.appVersionUpdateTable.data.subscribe(function(newData) {
                self.appVersionUpdateTableVisible( !!newData.length );
            });
        }

        initFileUploader() {
            this.showRPMUploader = Y.doccirrus.auth.hasSupportLevel( Y.doccirrus.schemas.settings.supportLevels.TEST );
            this.fileUploader = KoComponentManager.createComponent( {
                componentType: 'KoFileUploader',
                componentConfig: {
                    fileTypes: [ 'rpm', 'jpg' ],
                    acceptFiles: '',
                    uploadUrl: '/1/appreg/:uploadRPM',
                    callbacks: {
                        onComplete: function( meta ) {
                            const
                                response = JSON.parse( meta.xhr.responseText ),
                                errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );
                            if( errors.length ) {
                                Y.Array.invoke( errors, 'display' );
                            }
                            /* bcs of slowdownloads the completion is handled in sio event listeners */
                        },
                        onError: function( meta ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: meta.reason,
                                window: {
                                    width: Y.doccirrus.DCWindow.SIZE_LARGE
                                }
                            } );
                            meta.element.value = '';
                        }
                    }
                }
            } );
            this.lastUploaded = ko.observable();
            this.fileUploaderI18n = i18n( 'AppTokenMojit.AppAccessManager.title.RPM_UPLOADER' );
        }
    }

    /**
     * @module AppTokensEntryPoint
     *
     */
    /**
     * @property appTokenEntryPoint
     */
    Y.namespace( 'doccirrus.entryPoints' ).appAccessManagerEntryPoint = {

        jaderef: 'AppTokenMojit',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        bind: function() {
            const
                viewModel = new ViewModel(),
                appRegs = Y.doccirrus.auth.getAppRegs() || [],
                AppAccessManager = appAccessManagerFabric( Y, viewModel );
            store.dispatch( setAppRegs( JSON.parse(JSON.stringify(appRegs)) ) );

            Y.doccirrus.communication.on( {
                event: 'APPREG_MSG_UPLOAD_COMPLETE',
                done: function( message ) {
                    var msg = `${i18n( 'AppTokenMojit.AppAccessManager.msgs.MSG_UPLOAD_COMPLETE' )} (${message.data && message.data[0] && message.data[0].filename})`;
                    Y.doccirrus.DCSystemMessages.removeMessage( msg );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: msg,
                        content: msg
                    } );
                }
            } );
            Y.doccirrus.communication.on( {
                event: 'APPREG_MSG_INSTALL_COMPLETE',
                done: function( message ) {
                    var msg = `${i18n( 'AppTokenMojit.AppAccessManager.msgs.MSG_INSTALL_COMPLETE' )} (${message.data && message.data[0] && message.data[0].filename})`;
                    Y.doccirrus.DCSystemMessages.removeMessage( msg );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: msg,
                        content: msg
                    } );
                    viewModel.appRegTable.reload();
                    viewModel.appVersionUpdateTable.reload();
                }
            } );
            Y.doccirrus.communication.on( {
                event: 'APPREG_MSG_INSTALL_DEV',
                done: function( message ) {
                    var msg = `${i18n( 'AppTokenMojit.AppAccessManager.msgs.MSG_INSTALL_DEV' )} (${message.data && message.data[0] && message.data[0].filename})`;
                    Y.doccirrus.DCSystemMessages.removeMessage( msg );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: msg,
                        content: msg
                    } );
                }
            } );
            Y.doccirrus.communication.on( {
                event: 'APPREG_MSG_INSTALL_FAILED',
                done: function( message ) {
                    var msg = `${i18n( 'AppTokenMojit.AppAccessManager.msgs.MSG_INSTALL_FAILED' )} ${JSON.stringify(message.data)}`;
                    Y.doccirrus.DCSystemMessages.removeMessage( msg );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: msg,
                        content: msg,
                        level: 'ERROR'
                    } );
                }
            } );
            Y.doccirrus.communication.on( {
                event: 'APPREG_MSG_UPLOAD_FAILED',
                done: function( message ) {
                    var msg = `${i18n( 'AppTokenMojit.AppAccessManager.msgs.MSG_UPLOAD_FAILED' )} ${JSON.stringify(message.data)}`;
                    Y.doccirrus.DCSystemMessages.removeMessage( msg );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: msg,
                        content: msg,
                        level: 'ERROR'
                    } );
                }
            } );

            ReactDOM.render(
                <Provider store={store}>
                    <AppAccessManager viewModel={viewModel} Y={Y} NAME={NAME}/>
                </Provider>,
                document.getElementById( 'appAccessManagerRoot' ) );

        }

    };
}, '0.0.1', {
    requires: [
        'DCBinder',
        'KoTable',
        // 'KoButton',
        'KoViewModel',
        'KoFileUploader',
        'KoComponentManager',
        'JsonRpc',
        'apptoken-schema',
        'settings-schema',
        'dcauth',
        'DCRouter',
        'KoNav',
        'doccirrus'
    ]
} );
