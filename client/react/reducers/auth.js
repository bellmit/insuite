/**
 * User: pi
 * Date: 07.02.18  10:47
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
import { actionList } from '../actions/auth';

const
    initialState = {
        appRegs: []
    };

export default function authReducer( state = initialState, action ) {
    switch( action.type ) {
        case actionList.SET_APP_REGS:
            return { ...state, appRegs: [ ...action.payload ] };
        default:
            return state;
    }
}