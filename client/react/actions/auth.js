/**
 * User: pi
 * Date: 27.02.18  15:22
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
export const actionList = {
    SET_APP_REGS: 'SET_APP_REGS'
};

export function setAppRegs( payload ) {
    return {
        type: actionList.SET_APP_REGS,
        payload
    };
}

export function onAppRegChanges( Y ) {
    return ( dispatch, getState ) => {
        Y.doccirrus.communication.on( {
            event: 'system.changedAppReg',
            done: function( response ) {
                const
                    data = response.data,
                    state = getState(),
                    appRegs = state && state.auth && state.auth.appRegs || [];

                dispatch( setAppRegs( appRegs.map( function( appReg ) {
                    if( data.appName === appReg.appName ) {
                        appReg.uiConfiguration = data.uiConfiguration || [];
                        appReg.routeOverrideConfiguration = data.routeOverrideConfiguration || [];
                        appReg.hasAccess = data.hasAccess;
                    }
                    return appReg;
                } ) ) );
            }
        } );
    };
}