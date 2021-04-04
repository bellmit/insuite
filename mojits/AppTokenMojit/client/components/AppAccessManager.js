/**
 * User: pi
 * Date: 06.02.18  09:03
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global ko */
import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { onAppRegChanges } from '../../../../client/react/actions/auth';
import { changeAppTab } from '../../../../client/react/actions/navigation';
import { initSolsDocs, addIFrameURLToSol } from '../../../../client/react/actions/appDocs';
import { appRegContainsConfigurationURL } from '../../../../client/react/actions/utils';
import AppDocsFabric from './AppDocs';
import {onToggleFullScreenView} from "../../../../client/react/actions/masterTab";
import BaseLoadingSpinner from "./BaseLoadingSpinner";

const
    DC_PAGE = 'DC_PAGE';

class AppAccessManager extends Component {
    static propTypes = {
        appRegs: PropTypes.array,
        viewModel: PropTypes.object,
        activeAppTab: PropTypes.string,
        Y: PropTypes.object,
        NAME: PropTypes.string,
        setOnAppRegChanges: PropTypes.func,
        setChangeAppTab: PropTypes.func,
        setInitSolsDocs: PropTypes.func,
        setAddIFrameURLToSol: PropTypes.func,
        isSolDocsLoading: PropTypes.bool,
        reduxToggleFullScreenView: PropTypes.func,
        isCheckingForNewVersions: PropTypes.bool,
        versionCheckErrorMessage: PropTypes.string
    };



    handleIFrameTab( params ) {
        const
            viewModel = this.props.viewModel,
            navigationModel = this.aSubNavigationModel,
            { tabName, url } = params,
            tab = navigationModel && navigationModel.getItemByName( tabName );
        if( url === DC_PAGE ) {
            viewModel.appIFrameUrl( null );
        } else {
            viewModel.appIFrameUrl( url );
        }
        if( tab ) {
            tab.active( true );
        }
    }

    handleTab( params ) {
        const
            viewModel = this.props.viewModel,
            navigationModel = this.aSubNavigationModel,
            { tabName } = params,
            tab = navigationModel && navigationModel.getItemByName( tabName );

        if( tabName === DC_PAGE ) {
            viewModel.docsVisible( null );
            this.props.setChangeAppTab( null );
        } else {
            viewModel.docsVisible( tabName );
            this.props.setChangeAppTab( tabName.toLowerCase() );
        }

        if( tab && tab.active ) {
            tab.active( true );
        }
    }

    _addAppTabs( params ) {
        const
            Y = this.props.Y,
            self = this,
            NAME = this.props.NAME,
            {appRegs, routes, rootPath, navItems} = params;

        for( const appReg of appRegs ) {
            if( !appReg.hasAccess ) {
                continue;
            }

            routes.push( {
                path: `/${appReg.appName}`,
                callbacks: function( req ) {
                    if( Y.config.debug ) {
                        Y.log( `Follow access manager route / ${JSON.stringify( req.params )}`, 'debug', NAME );
                    }
                    self.handleTab( {
                        tabName: appReg.appName
                    } );
                }
            } );

            navItems.push( {
                name: appReg.appName,
                href: `${rootPath}#/${appReg.appName}`,
                text: appReg.title || appReg.appName
            } );

            if( !appRegContainsConfigurationURL( {appReg, Y} ) ) {
                continue;
            }

            const
                testLicense = Y.doccirrus.auth.hasSupportLevel( Y.doccirrus.schemas.settings.supportLevels.TEST );
            let
                url,
                config,
                elem;

            config = appReg.uiConfiguration.find( ( config ) => (config.type === Y.doccirrus.schemas.appreg.uiConfigurationTypes.CONFIGURATION) );

            url = config.targetUrl;

            if( Y.doccirrus.schemas.apptoken.appTokenTypes.LOCAL === appReg.type || Y.doccirrus.schemas.apptoken.appTokenTypes.BUILTIN === appReg.type ) {
                elem = document.createElement( "a" );
                elem.href = url;

                if( !testLicense || location.host === elem.host ) {
                    url = Y.doccirrus.infras.getPrivateURL( elem.pathname + (elem.hash || '') );
                }
            }

            this.props.setAddIFrameURLToSol( {url, solName: appReg.appName.toLowerCase()} );
        }
    }

    initYUIRouter() {
        const
            Y = this.props.Y,
            i18n = Y.doccirrus.i18n,
            self = this,
            KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
            appRegs = this.props.appRegs || [],
            NAME = this.props.NAME,
            isSolsSupported = this.props.viewModel.isSolsSupported;

        let
            routeTo,
            rootPath = Y.doccirrus.utils.getUrl( 'appAccessManager' ),
            router,
            aSubNavigationModel, fullScreenToggleMainPage,
            routes = [
                {
                    path: '/',
                    callbacks: function( req ) {
                        if( Y.config.debug ) {
                            Y.log( `Follow access manager route / ${JSON.stringify( req.params )}`, 'debug', NAME );
                        }
                        self.handleTab( {
                            tabName: DC_PAGE
                        } );
                    }
                }
            ],
            navItems = [
                {
                    name: DC_PAGE,
                    href: `${rootPath}#/`,
                    text: i18n('AppTokenMojit.AppAccessManager.title.APP_ACTIVATION'),
                    hasDanger : false
                }
            ];
        if( self.router ) {
            self.router.destroy();
            self.router = null;
        }
        if( self.aSubNavigationModel ) {
            self.aSubNavigationModel.dispose();
            ko.cleanNode( document.querySelector( '#mainPageNavigation' ) );
        }

        if( self.fullScreenToggleMainPage ) {
            ko.cleanNode( document.querySelector( '#fullScreenToggleInMainPage' ) );
        }

        if( isSolsSupported ) {
            self._addAppTabs({ appRegs, routes, rootPath, navItems});
        }

        aSubNavigationModel = KoComponentManager.createComponent( {
            componentType: 'KoNav',
            componentConfig: {
                items: navItems,
                hasDanger: false
            }
        } );
        self.aSubNavigationModel = aSubNavigationModel;

        fullScreenToggleMainPage = {
            toggleFullScreenHandler() {
                Y.doccirrus.DCBinder.toggleFullScreen();
            },
            viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n
        };
        self.fullScreenToggleMainPage = fullScreenToggleMainPage;

        ko.applyBindings( aSubNavigationModel, document.querySelector( '#mainPageNavigation' ) );
        ko.applyBindings( fullScreenToggleMainPage, document.querySelector( '#fullScreenToggleInMainPage' ) );

        router = new Y.doccirrus.DCRouter( {
            root: rootPath,
            routes: routes
        } );
        self.router = router;
        //  Set the default hash fragment, or action the route if one is given

        routeTo = location.href.split( `${rootPath.replace( /^\//, '' )}#` );
        routeTo = (routeTo.length < 2) ? '/' : routeTo[ 1 ];

        Y.log( `Initial YUI router path: ${routeTo}`, 'debug', NAME );
        router.save( routeTo );

        //  update - YUI router may have refused the route which was set
        routeTo = router.getPath();
        Y.log( `Parsed router path: ${routeTo}`, 'debug', NAME );
    }

    initSolsDocs() {
        const
            isSolsSupported = this.props.viewModel.isSolsSupported,
            appRegs = this.props.appRegs || [];

        if( isSolsSupported ) {
            let solsList = appRegs.reduce( ( list, appReg ) => {
                if( appReg.hasAccess ) {
                    list.push( appReg.appName );
                }
                return list;
            }, [] );
            this.props.setInitSolsDocs( solsList );
        }
    }

    initAppVersionUpdateTable() {
        const
            appVersionUpdateTableVisible = this.props.viewModel.appVersionUpdateTableVisible,
            appRegs = this.props.appRegs || [];

        if( appRegs.length ) {
            if( appRegs.some( ( appReg ) => appReg.versionIsOutdated ) ) {
                return appVersionUpdateTableVisible( true );
            }
            appVersionUpdateTableVisible( false );
        }
    }

    componentDidMount() {
        this.props.setOnAppRegChanges();
        this.props.Y.doccirrus.DCBinder.initToggleFullScreen();
        this.initYUIRouter();
        this.initSolsDocs();
        this.initAppVersionUpdateTable();
        ko.applyBindings( this.props.viewModel, document.querySelector( '#viewModel' ) );

    }

    componentWillUnmount() {
        if( self.aSubNavigationModel ) {
            self.aSubNavigationModel.dispose();
            ko.cleanNode( document.querySelector( '#mainPageNavigation' ) );
        }

        if( self.fullScreenToggleMainPage ) {
            ko.cleanNode( document.querySelector( '#fullScreenToggleInMainPage' ) );
        }
        if( this.props.viewModel ) {
            this.props.viewModel.dispose();
            ko.cleanNode( document.querySelector( '#viewModel' ) );
        }
    }

    componentDidUpdate() {
        this.initYUIRouter();
    }
    render() {
        const AppDocs = AppDocsFabric( this.props.Y, this.props.viewModel );

        return (
            <React.Fragment>
                {/* main page navigation */}
                <div className="container">
                    <div style={{ position: 'relative' }}>
                        <div id="mainPageNavigation" data-bind="template: template" style={{ marginBottom: '10px' }}/>
                        <div id="fullScreenToggleInMainPage" style={{ position: 'absolute', right: 0, top: 0 }}>
                            <button className="btn btn-sm btn-default" name="toggleFullScreen" type="button"
                                    data-bind="click: toggleFullScreenHandler, attr: { title: viewPortBtnI18n }"
                                    style={{ marginTop: '6px' }} onClick={this.props.reduxToggleFullScreenView}>
                                <span className="fa fa-arrows-alt"/>
                            </button>
                        </div>
                    </div>
                </div>
                {/* main container for appreg table */}
                <div className="container" id="viewModel">
                    <div data-bind="if: !isSolsSupported">
                        <h3 data-bind="text: solsNotSupportedTextI18n"/>
                    </div>
                    <div data-bind="if: isSolsSupported">
                        {/* display Sol docs */}
                        <div
                            style={{width: '100%', display: 'none', border: 'none'}}
                            data-bind="notifyBind: { method: setContainerHeight }, style: {display: docsVisible()?'inline':'none'}">
                            {!this.props.isSolDocsLoading
                                ? <AppDocs activeAppTab={this.props.activeAppTab}/>
                                : <BaseLoadingSpinner />}
                        </div>
                        {/* display appreg tables */}
                        <div data-bind="ifnot: docsVisible">
                            {/*<div data-bind="if: isSolsSupported">*/}
                                <h1 data-bind="text: pageHeader"/>
                                {/* display app version update table */}
                                <div data-bind="if: appVersionUpdateTableVisible">
                                    <div className="card appVersionUpdateTableWrapper">
                                        <div className="card-content">
                                            <h3 data-bind="text: appVersionUpdateTableTitleI18n"/>
                                            <div data-bind="if: isDev" style={{marginBottom: '10px'}}>
                                                <em className="dc-red" data-bind="text: isDevUpdateAppWarningI18n"/>
                                            </div>
                                            <div id="appVersionUpdateTable"
                                                 data-bind="template: appVersionUpdateTable.template"/>
                                        </div>
                                    </div>
                                </div>
                                {/* display main appreg table */}
                                <div id="appRegTable"
                                     data-bind="template: appRegTable.template"/>
                                {/* display RPM uploader */}
                                <div data-bind="if: showRPMUploader">
                                    <h3 data-bind="text: fileUploaderI18n"/>
                                    <div id="appAccessManagerFileUploader"
                                         data-bind="template: fileUploader.template"/>
                                    <p data-bind="text: lastUploaded"/>
                                </div>
                            {/*</div>*/}
                        </div>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

const getMapStateToProps = ( /* Y */ ) => state => ({
    appRegs: state.auth.appRegs,
    activeAppTab: state.navigation.activeAppTab,
    isSolDocsLoading: state.appDocs.isLoading
});

const getMapDispatchToProps = Y => dispatch => ({
    setInitSolsDocs: ( solsList ) => dispatch( initSolsDocs( {solsList, Y} ) ),
    setChangeAppTab: ( newTabName ) => dispatch( changeAppTab( newTabName ) ),
    setOnAppRegChanges: () => dispatch( onAppRegChanges( Y ) ),
    setAddIFrameURLToSol: ( {url, solName} ) => dispatch( addIFrameURLToSol( {url, solName} ) ),
    reduxToggleFullScreenView: () => dispatch( onToggleFullScreenView( Y ) )
});

export default ( Y ) => connect( getMapStateToProps( Y ), getMapDispatchToProps( Y ) )( AppAccessManager );