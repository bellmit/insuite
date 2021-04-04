/**
 * User: pi
 * Date: 06.02.18  08:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
import { combineReducers } from 'redux';
import authReducer from './auth';
import masterTabReducer from './masterTab';
import appDocsReducer from './appDocs';
import navigationReducer from './navigation';

export default combineReducers( {
    auth: authReducer,
    masterTab: masterTabReducer,
    appDocs: appDocsReducer,
    navigation: navigationReducer
} );