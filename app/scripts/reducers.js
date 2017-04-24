// Reducers/actions
import { combineReducers } from 'redux-immutable';
import { reducer as apiHealth } from './reducers/api-health';
import { reducer as productStatus } from './reducers/product-status';

const config = require('./config');

export default combineReducers({
  config: _ => config,
  apiHealth,
  productStatus
});
