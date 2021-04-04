/**
 * User: pi
 * Date: 06.02.18  09:00
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
import { createStore, applyMiddleware } from 'redux';
import reducers from './reducers/index';

const initialState = {};
const thunk = store => next => action => {
    if( 'function' === typeof action ) {
        return action( store.dispatch, store.getState );
    } else {
        return next( action );
    }
};

export default createStore( reducers, initialState, applyMiddleware( thunk ) );