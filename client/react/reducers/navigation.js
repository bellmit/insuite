/**
 * User: nicolas.pettican
 * Date: 23.01.20  15:30
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

import {actionList} from '../actions/navigation';

const
    initialState = {
        activeAppTab: ''
    };

export default function appDocsReducer( state = initialState, action ) {
    // console.log(action);
    let payload;
    switch( action.type ) {

        case actionList.CHANGE_CURRENT_APP_TAB:
            payload = action.payload || {};
            if( payload.newTabName ) {
                return {
                    ...state,
                    activeAppTab: payload.newTabName
                };
            }

        default:
            return state;
    }
}
