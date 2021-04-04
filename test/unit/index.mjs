import chai from 'chai';
import sinon from 'sinon';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use( chaiAsPromised );
chai.use( sinonChai );

global.chai = chai;
global.expect = chai.expect;
global.sinon = sinon;
