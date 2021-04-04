/**
 * User: nicolas.pettican
 * Date: 15.01.20  13:56
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
// /*global ko*/
import React, {PureComponent} from 'react';
import {connect} from 'react-redux';
import ReactMarkdown from 'react-markdown/with-html';
import PropTypes from 'prop-types';
import {getDocsForApp, changeView} from '../../../../client/react/actions/appDocs';
import {onToggleFullScreenView} from "../../../../client/react/actions/masterTab";
import BaseLoadingSpinner from './BaseLoadingSpinner';

const
    CONFIGURATION = 'configuration',
    DOCUMENTATION = 'documentation',
    CHANGELOG = 'changelog';

/**
 * Renders the documentation components
 * @param props
 * @returns {DocumentationWrapper.props.mdChangelog|*}
 * @constructor
 */
function DocumentationRouter( props ) {
    const
        {mdDoc, mdChangelog, currentTabName, configurationURL} = props,
        minHeight = `${window.innerHeight * 0.75}px`;

    switch( currentTabName ) {
        case DOCUMENTATION:
            return (
                <div className='container' id='solDocumentation'>
                    <ReactMarkdown
                        source={mdDoc}
                        escapeHtml={true}
                    />
                </div>
            );
        case CHANGELOG:
            return (
                <div className='container' id='solDocumentation'>
                    <ReactMarkdown
                        id='solDocumentation'
                        source={mdChangelog}
                        escapeHtml={true}
                    />
                </div>
            );
        case CONFIGURATION:
            return (
                <iframe src={configurationURL} id="iframe"
                        style={{width: '100%', border: 'none', minHeight}}/>
            );
        default:
            return BaseLoadingSpinner();
    }
}

DocumentationRouter.propTypes = {
    mdDoc: PropTypes.string,
    mdChangelog: PropTypes.string,
    currentTabName: PropTypes.string
};

function NavPill( props ) {
    const
        {currentTabName, id, title, onClick, hidden, isFullScreenView} = props,
        active = (currentTabName === id);

    return !hidden && (
        <li onClick={onClick} className={active && 'active' || ''}>
            <a href="#" onClick={( e ) => e.preventDefault()}>
                {isFullScreenView ? <NavPillIcon currentTabName={id}/> : title}
            </a>
        </li>
    );
}

NavPill.propTypes = {
    onClick: PropTypes.func,
    currentTabName: PropTypes.string,
    id: PropTypes.string,
    title: PropTypes.string,
    hidden: PropTypes.bool,
    isFullScreenView: PropTypes.bool
};

function DocsIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24">
            <g>
                <rect fill="none" height="24" width="24"/>
                <path className="nav-pill-icon" d="M20.41,8.41l-4.83-4.83C15.21,3.21,14.7,3,14.17,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V9.83 C21,9.3,20.79,8.79,20.41,8.41z M7,7h7v2H7V7z M17,17H7v-2h10V17z M17,13H7v-2h10V13z"/>
            </g>
        </svg>
    );
}

function AdminIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24">
            <g>
                <path d="M0,0h24v24H0V0z" fill="none"/>
                <path className="nav-pill-icon" d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </g>
        </svg>
    );
}

function ChangeLogIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
            <path d="M0 0h24v24H0z" fill="none"/>
            <path className="nav-pill-icon" d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
        </svg>
    );
}

function NavPillIcon( props ) {
    const {currentTabName} = props;
    switch( currentTabName ) {
        case DOCUMENTATION:
            return (
                <DocsIcon/>
            );
        case CHANGELOG:
            return (
                <ChangeLogIcon/>
            );
        case CONFIGURATION:
            return (
                <AdminIcon/>
            );
        default:
            return (
                <DocsIcon/>
            );
    }
}

NavPillIcon.propTypes = {
    currentTabName: PropTypes.string
};

function NavPillColumn( props ) {
    if( props.isFullScreenView ) {
        return (
            <div style={{float: 'left'}}>
                {props.children}
            </div>
        );
    }
    return (
        <div className='col-xs-2'>
            {props.children}
        </div>
    );
}

NavPillColumn.propTypes = {
    isFullScreenView: PropTypes.bool,
    children: PropTypes.object
};

function MainColumn( props ) {
    if( props.isFullScreenView ) {
        return (
            <div className='col-xs-11' style={{width: '95%', paddingLeft: '1%'}}>
                {props.children}
            </div>
        );
    }
    return (
        <div className='col-xs-10'>
            {props.children}
        </div>
    );
}

MainColumn.propTypes = {
    isFullScreenView: PropTypes.bool,
    children: PropTypes.object
};

class AppDocs extends PureComponent {
    static propTypes = {
        solNames: PropTypes.array,
        activeAppTab: PropTypes.string,
        i18n: PropTypes.func,
        NAME: PropTypes.string,
        setGetDocsForApp: PropTypes.func,
        setChangeView: PropTypes.func,
        solDocs: PropTypes.object,
        obtainedDocs: PropTypes.array,
        isFullScreenView: PropTypes.bool,
        reduxToggleFullScreenView: PropTypes.func
    };

    async componentDidMount() {
        if( !this.props.obtainedDocs.includes( this.props.activeAppTab ) ) {
            await this.props.setGetDocsForApp( this.props.activeAppTab );
        }
        this.props.reduxToggleFullScreenView();
        // ko.applyBindings( this.props.viewModel, document.querySelector( '#viewModel' ) );
    }

    componentDidUpdate() {
        this.props.reduxToggleFullScreenView();
    }

    render() {
        const
            {solDocs, activeAppTab, isFullScreenView} = this.props,
            {isLoading, currentTabName, mdDoc, mdChangelog, configurationURL} = solDocs[activeAppTab] || {},
            i18n = this.props.i18n;

        return (
            <React.Fragment>
                <div className='container' id='solDocumentationWrapper'>
                    <div className='row'>
                        <NavPillColumn isFullScreenView={isFullScreenView}>
                            <ul className='nav nav-pills nav-stacked'>
                                <NavPill
                                    hidden={false}
                                    id={DOCUMENTATION}
                                    currentTabName={currentTabName}
                                    title={i18n( 'AppTokenMojit.AppAccessManager.subTabs.DOCUMENTATION' )}
                                    isFullScreenView={isFullScreenView}
                                    onClick={() => this.props.setChangeView( {
                                        tabId: DOCUMENTATION,
                                        solName: activeAppTab
                                    } )}/>
                                <NavPill
                                    hidden={false}
                                    id={CHANGELOG}
                                    currentTabName={currentTabName}
                                    title={i18n( 'AppTokenMojit.AppAccessManager.subTabs.CHANGELOG' )}
                                    isFullScreenView={isFullScreenView}
                                    onClick={() => this.props.setChangeView( {
                                        tabId: CHANGELOG,
                                        solName: activeAppTab
                                    } )}/>
                                <NavPill
                                    hidden={!(configurationURL)}
                                    id={CONFIGURATION}
                                    currentTabName={currentTabName}
                                    title={i18n( 'AppTokenMojit.AppAccessManager.subTabs.CONFIGURATION' )}
                                    isFullScreenView={isFullScreenView}
                                    onClick={() => this.props.setChangeView( {
                                        tabId: CONFIGURATION,
                                        solName: activeAppTab
                                    } )}/>
                            </ul>
                        </NavPillColumn>
                        <MainColumn isFullScreenView={isFullScreenView}>
                            {isLoading ? (
                                <BaseLoadingSpinner/>
                            ) : (
                                <DocumentationRouter
                                    currentTabName={currentTabName}
                                    mdDoc={mdDoc}
                                    mdChangelog={mdChangelog}
                                    configurationURL={configurationURL}/>
                            )}
                        </MainColumn>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

const getMapStateToProps = ( Y ) => ( state ) => ({
    i18n: Y.doccirrus.i18n,
    isFullScreenView: state.masterTab.isFullScreenView,
    solDocs: state.appDocs.sols,
    solNames: state.appDocs.solNames,
    obtainedDocs: state.appDocs.obtainedDocs
});

const getMapDispatchToProps = ( Y ) => ( dispatch ) => ({
    setGetDocsForApp: ( solName ) => dispatch( getDocsForApp( {Y, solName} ) ),
    setChangeView: ( args ) => dispatch( changeView( args ) ),
    reduxToggleFullScreenView: () => dispatch( onToggleFullScreenView( Y ) )
});

export default ( Y ) =>
    connect(
        getMapStateToProps( Y ),
        getMapDispatchToProps( Y ) )( AppDocs );