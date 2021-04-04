/**
 * User: pi
 * Date: 06.02.18  09:03
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global ko, document, location */
// eslint-disable-next-line no-unused-vars
import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { onAppRegChanges } from '../../../../client/react/actions/auth';

class AppNav extends Component {
    static propTypes = {
        appRegs: PropTypes.array,
        viewModel: PropTypes.object,
        Y: PropTypes.object,
        NAME: PropTypes.string,
        setOnAppRegChanges: PropTypes.func
    };

    handleTab( params ) {
        const
            viewModel = this.props.viewModel,
            navigationModel = this.aSubNavigationModel,
            { tabName, url } = params,
            tab = navigationModel && navigationModel.getItemByName( tabName );
        viewModel.appIFrameUrl( url );

        if( tab ) {
            tab.active( true );
        }
    }

    initYUIRouter() {
        const
            Y = this.props.Y,
            self = this,
            KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
            appRegs = this.props.appRegs || [],
            NAME = this.props.NAME;
        let
            routeTo,
            rootPath = Y.doccirrus.utils.getUrl( 'appNav' ),
            router,
            aSubNavigationModel, fullScreenToggleMainPage,
            routes = [],
            navItems = [];
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
        appRegs.forEach( function( appReg ) {
            appReg.uiConfiguration.some( function( config ) {
                let
                    url,
                    elem,
                    testLicense = Y.doccirrus.auth.hasSupportLevel( Y.doccirrus.schemas.settings.supportLevels.TEST );

                if( config.type === Y.doccirrus.schemas.appreg.uiConfigurationTypes.MAIN ) {
                    url = config.targetUrl;
                    if( Y.doccirrus.schemas.apptoken.appTokenTypes.LOCAL === appReg.type || Y.doccirrus.schemas.apptoken.appTokenTypes.BUILTIN === appReg.type ) {
                        elem = document.createElement( "a" );
                        elem.href = url;

                        if( !testLicense || location.host === elem.host ) {
                            url = Y.doccirrus.infras.getPrivateURL( elem.pathname + (elem.hash || '') );
                        }
                    }
                    routes.push( {
                        path: `/${appReg.appName}`,
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( `Follow app nav route / ${JSON.stringify( req.params )}`, 'debug', NAME );
                            }
                            self.handleTab( {
                                tabName: appReg.appName,
                                url: url
                            } );
                        }
                    } );
                    navItems.push( {
                        name: appReg.appName,
                        href: `${rootPath}#/${appReg.appName}`,
                        text: appReg.title || appReg.appName
                    } );
                    return true;
                }
            } );
        } );

        aSubNavigationModel = KoComponentManager.createComponent( {
            componentType: 'KoNav',
            componentConfig: {
                items: navItems
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

    componentDidMount() {
        this.props.setOnAppRegChanges();
        this.initYUIRouter();
        ko.applyBindings( this.props.viewModel, document.querySelector( '#viewModel' ) );
    }

    componentWillUnmount() {
        if( this.aSubNavigationModel ) {
            this.aSubNavigationModel.dispose();
            ko.cleanNode( document.querySelector( '#mainPageNavigation' ) );
        }

        if( this.fullScreenToggleMainPage ) {
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
        return (
            <React.Fragment>
                <div className="container">
                    <div style={{ position: 'relative' }}>
                        <div id="mainPageNavigation" data-bind="template: template" style={{ marginBottom: '10px' }}/>
                        <div id="fullScreenToggleInMainPage" style={{ position: 'absolute', right: 0, top: 0 }}>
                            <button className="btn btn-sm btn-default" name="toggleFullScreen" type="button"
                                    data-bind="click: toggleFullScreenHandler, attr: { title: viewPortBtnI18n }"
                                    style={{ marginTop: '6px' }}>
                                <span className="fa fa-arrows-alt"/>
                            </button>
                        </div>
                    </div>


                </div>
                <div className="container" id="viewModel" data-bind="if: appIFrameUrl">
                    <iframe src="" id="iframe"
                            style={{ width: '100%', display: 'none', border: 'none' }}
                            data-bind="notifyBind: { method: setContainerHeight }, attr: { src: appIFrameUrl }, style: {display: appIFrameUrl()?'inline':'none'}"/>
                </div>
            </React.Fragment>
        );
    }
}

const getMapStateToProps = ( /* Y */ ) => state => ({ appRegs: state.auth.appRegs });

const getMapDispatchToProps = Y => dispatch => ({
    setOnAppRegChanges: () => dispatch( onAppRegChanges( Y ) )
});

export default ( Y ) => connect( getMapStateToProps( Y ), getMapDispatchToProps( Y ) )( AppNav );