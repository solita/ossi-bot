import { talk } from './talk-handler';
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

describe('help-handler.ts', () => {

    it('Should return 401 when authentication fails', async () => {
        auth.verifySignature = jest.fn(() => false);
        auth.getSecret = jest.fn(() => 'secret');
        await expect(talk(testEvent({ }))).resolves.toMatchObject({
            statusCode: 401,
            body: expect.any(String)
        });
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:{}');
    });

    xit('Should return 200 OK when event contains challenge', async () => {
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        await expect(talk(testEvent({ challenge: 'hiholetsqo' }))).resolves.toMatchObject({
            statusCode: 200,
            body: 'hiholetsgo'
        });
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:{}');
    });


});