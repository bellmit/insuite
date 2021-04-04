/**
 * User: pi
 * Date: 27.02.18  15:22
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
export const actionList = {
    SET_MASTER_TAB_DATA: 'SET_MASTER_TAB_DATA',
    REGISTER_MASTER_TAB: 'REGISTER_MASTER_TAB',
    MASTER_TAB_URL_ERROR: 'MASTER_TAB_URL_ERROR',
    TOGGLE_FULL_SCREEN_VIEW: 'TOGGLE_FULL_SCREEN_VIEW'
};

export function setMasterTabData( payload ) {
    return {
        type: actionList.SET_MASTER_TAB_DATA,
        payload
    };
}

export function setMasterTabUrlError( payload ) {
    return {
        type: actionList.MASTER_TAB_URL_ERROR,
        payload
    };
}

export function registerMasterTab( Y, systemNumber ) {
    return ( dispatch ) => {
        Y.doccirrus.communication.emit( 'masterTab.registerMasterTab', { systemNumber }, null, ( err, message = {} ) => {
            if( err ) {
                dispatch( setMasterTabUrlError( err ) );
            } else {
                dispatch( setMasterTabData( message.masterTabData ) );
            }
        } );
    };
}

export function onMasterTabData( Y ) {
    return ( dispatch ) => {
        return Y.doccirrus.communication.on( {
            event: 'masterTab.masterTabData',
            done( response ) {
                const
                    data = response.data;

                dispatch( setMasterTabData( data ) );
            },
            fail( error ) {
                dispatch( setMasterTabUrlError( error ) );
            }
        } );
    };
}

export function onToggleFullScreenView( Y ) {
    return function( dispatch ) {
        let viewportIsWide = Y.doccirrus.utils.localValueGet( 'appAccessManager_viewportIsWide' ) === 'true';
        // let viewportIsWide = Y.doccirrus.utils.localValueGet( 'appNav_viewportIsWide' ) === 'true';
        dispatch( {
            type: actionList.TOGGLE_FULL_SCREEN_VIEW,
            payload: viewportIsWide
        } );
    };
}