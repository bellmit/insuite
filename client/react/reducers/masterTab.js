/**
 * User: pi
 * Date: 07.02.18  10:47
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
import { actionList } from '../actions/masterTab';

const
    initialState = {
        masterTabData: {},
        isFullScreenView: false
    };

export default function masterTabReducer( state = initialState, action ) {
    switch( action.type ) {
        case actionList.SET_MASTER_TAB_DATA:
            return { ...state, masterTabData: action.payload, masterTabUrlError: undefined };
        case actionList.MASTER_TAB_URL_ERROR:
            return { ...state, masterTabUrlError: action.payload, masterTabData: { url: undefined } };
        case actionList.TOGGLE_FULL_SCREEN_VIEW:
            return { ...state, isFullScreenView: action.payload };
        default:
            return state;
    }
}