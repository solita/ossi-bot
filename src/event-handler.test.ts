require('./test-utils');
import { handleEvent } from './event-handler';
const auth = require('./slack-auth');

const testEvent = (body: any) => {
    return {
        headers: {
            'X-Slack-Signature': 'v0=stub-signature',
            'X-Slack-Request-Timestamp': 12345,
        },
        body: JSON.stringify(body)
    };
};


describe('event-handler.ts', () => {

    it('Should return 401 when authentication fails', async () => {
        auth.verifySignature = jest.fn(() => false);
        auth.getSecret = jest.fn(() => 'secret');
        await expect(handleEvent(testEvent({ })))
            .resolves.lambdaResponseWithStatusAndBodyContaining(401,{message: 'Invalid signature'});
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:{}');
    });

    it('Should return 200 OK with given challenge when received event contains challenge', () => {
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        return expect(handleEvent(testEvent({ challenge: 'hiholetsgo' })))
            .resolves.lambdaResponseWithStatusAndBodyContaining(200, { challenge: "hiholetsgo" });
    });


});