/**
 * User: nicolas.pettican
 * Date: 23.01.20  15:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/**
 * User: nicolas.pettican
 * Date: 15.01.20  14:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
export const actionList = {
    CHANGE_CURRENT_APP_TAB: 'CHANGE_CURRENT_APP_TAB'
};

export function changeAppTab( newTabName ) {
    return function( dispatch ) {
        dispatch( {
            type: actionList.CHANGE_CURRENT_APP_TAB,
            payload: {newTabName}
        } );
    };
}
