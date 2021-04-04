/**
 * User: pi
 * Date: 23.05.18  17:15
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { registerMasterTab, onMasterTabData } from '../../../../client/react/actions/masterTab';
import { unregisterWebSocketListener } from '../../../../client/react/actions/utils';

class AppAccessManager extends Component {
    static propTypes = {
        Y: PropTypes.object,
        masterTabData: PropTypes.object,
        NAME: PropTypes.string,
        systemNumber: PropTypes.string,
        registerMasterTab: PropTypes.func,
        onMasterTabData: PropTypes.func,
        unregisterWebSocketListener: PropTypes.func,
        masterTabUrlError: PropTypes.object
    };

    constructor( props ) {
        super( props );
        this.iFrameRef = React.createRef();
        this.state = {
            frameUrl: ''
        };
    }

    componentDidMount() {
        this.setState( {
            iframeHeight: window.innerHeight
        } );
        setTimeout( () => {
            this.props.registerMasterTab( this.props.systemNumber );
            this.onMasterTabDataListener = this.props.onMasterTabData();
        }, 100 );

    }

    componentWillUnmount() {
        this.props.unregisterWebSocketListener( this.onMasterTabDataListener );
    }

    showError() {
        const masterTabUrlError = this.props.masterTabUrlError;
        this.modal = this.props.Y.doccirrus.DCWindow.notice( {
            message: this.props.Y.doccirrus.i18n( 'IncaseAdminMojit.masterTab.IFRAME_CAN_NOT_BE_LOADED', { data: { link: `<a href="${masterTabUrlError.data.url}" target="_blank">${masterTabUrlError.data.url}</a>` } } ),
            window: {
                width: this.props.Y.doccirrus.DCWindow.SIZE_LARGE
            }
        } );
    }

    renderFrame( frameUrl ) {
        return <div>
            <iframe id="maserTabIFrame"
                    ref={this.iFrameRef}
                    style={{ width: '100%', border: 'none', height: `${this.state.iframeHeight}px` }}
                    src={frameUrl}
            />
        </div>;
    }

    closeModal() {
        if( this.modal ) {
            this.modal.close();
            this.modal = null;
        }
    }

    render() {
        const frameUrl = this.props.masterTabData.url;
        this.closeModal();
        if( this.props.masterTabUrlError ) {
            this.showError();
        }
        if( this.props.masterTabData.title ) {
            document.title = this.props.masterTabData.title;
        }
        return (
            <React.Fragment>
                <div className="container container-fullscreen">
                    {frameUrl ? this.renderFrame( frameUrl ) : ''}
                </div>
            </React.Fragment>
        );
    }
}

const getMapStateToProps = ( /* Y */ ) => state => ({
    masterTabData: state.masterTab.masterTabData,
    masterTabUrlError: state.masterTab.masterTabUrlError
});

const getMapDispatchToProps = Y => dispatch => ({
    registerMasterTab: ( systemNumber ) => dispatch( registerMasterTab( Y, systemNumber ) ),
    onMasterTabData: () => dispatch( onMasterTabData( Y ) ),
    unregisterWebSocketListener: () => dispatch( unregisterWebSocketListener( Y ) )
});

export default ( Y ) => connect( getMapStateToProps( Y ), getMapDispatchToProps( Y ) )( AppAccessManager );