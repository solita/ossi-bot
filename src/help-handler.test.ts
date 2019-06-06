import { help } from './help-handler';
const auth = require('./slack-auth');

const testEvent = () => {
    return {
        headers: {
            'X-Slack-Signature': 'v0=stub-signature',
            'X-Slack-Request-Timestamp': 12345,
        },
        body: 'eventbody'
    };
};

describe('help-handler.ts', () => {

    it('Should auth and return 200 with successful auth', () => {
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        expect(help(testEvent())).resolves.toMatchObject({
            statusCode: 200,
            body: expect.any(String)
        });
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:eventbody');
    });

    it('Should auth and return 401 with invalid auth', () => {
        auth.verifySignature = jest.fn(() => false);
        auth.getSecret = jest.fn(() => 'secret');
        expect(help(testEvent())).resolves.toMatchObject({
            statusCode: 401,
            body: expect.any(String)
        });
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:eventbody');
    });


});