require('./test-utils');
import { handleSlashCommand } from './slash-command-handler';
const auth = require('./slack-auth');
const { stringify } = require('querystring');


const testEvent = (body: any) => {
    return {
        headers: {
            'X-Slack-Signature': 'v0=stub-signature',
            'X-Slack-Request-Timestamp': 12345,
        },
        body: stringify(body)
    };
};

describe('slash-command-handler.ts', () => {

    it('Should auth and return 200 with successful auth', async () => {
        auth.verifySignature = jest.fn(() => true);
        auth.getSecret = jest.fn(() => 'secret');
        await expect(handleSlashCommand(testEvent({ text: 'eventbody' })))
            .resolves.lambdaResponseWithStatusAndBodyContaining(200, {});
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:text=eventbody');
    });

    it('Should auth and return 401 with invalid auth', async () => {
        auth.verifySignature = jest.fn(() => false);
        auth.getSecret = jest.fn(() => 'secret');
        await expect(handleSlashCommand(testEvent({ text: 'eventbody' })))
            .resolves.lambdaResponseWithStatusAndBodyContaining(401, {});
        expect(auth.verifySignature)
            .toBeCalledWith(
                'v0=stub-signature',
                'secret',
                'v0:12345:text=eventbody');
    });


});